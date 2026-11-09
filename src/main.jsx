import React,{useEffect,useRef,useState} from 'react';
import {version as appVersion} from '../package.json';
import {createRoot} from 'react-dom/client';
import {sampleProject,uid,validateProject} from './sample.js';
import {exportPng,exportPptx} from './export.js';
import {exportInteractiveHtml} from './interactive-export.js';
import {compareFlows} from './compare.js';
import {processMetrics} from './metrics.js';
import {timelineGeometry} from './timeline.js';
import {collapsedFlow,validateGroupBoundary,normalizeGroups,expandedTimingSteps,processMetricsWithGroups,repeatedStepTimeline} from './subprocess.js';
import {repeatConnectionAnnotations,graphSegmentsWithoutRepeatEdges,svgPointPath} from './repeat-zigzag.js';
import {readTemplates,saveTemplate,insertTemplate} from './subprocess-templates.js';
import {computeProjectElkOrdering} from './elk-layout.js';
import {listSnapshots,saveSnapshot,deleteSnapshot} from './snapshots.js';
import {graphLayout,graphSegments,graphDiagnostics,canDependOn,removeStep as removeGraphStep,insertStep} from './graph.js';
import './style.css';
const copy=x=>structuredClone(x);
function load(){try{const data=localStorage.getItem('flowchain-v2')||localStorage.getItem('flowchain-v1');return data?validateProject(JSON.parse(data)):copy(sampleProject)}catch{return copy(sampleProject)}}
function Diagram({doc,chosen,onChoose,onChooseGroup,lineStyle='solid',zoom=1,statusById={},elkOrder=null}){
 const visible=doc.steps;
 const g=graphLayout(visible,doc.departments,{elkOrder});
 const repeats=repeatConnectionAnnotations(visible,doc.groups||[],g.positions);
 const segments=graphSegmentsWithoutRepeatEdges(visible,g.positions,repeats,graphSegments);
 const numberById=new Map(visible.map((step,i)=>[step.id,i+1]));
 return <div className="diagram-scroll"><svg viewBox={`0 0 ${g.width} ${g.height}`} width={zoom==="fit"?"100%":g.width*zoom} height={zoom==="fit"?undefined:g.height*zoom} aria-label="Interactive parallel process swimlane diagram" role="img">
 <text x="18" y="45" fontSize="12" fontWeight="bold" fill="#66758b">DEPARTMENT</text><text x="210" y="45" fontSize="12" fontWeight="bold" fill="#66758b">DEPENDENCY FLOW →</text>
 {doc.departments.map((d,i)=><g key={d.id}><rect x="5" y={g.laneStarts[i]} width={g.width-10} height={g.laneHeights[i]-8} fill={i%2?'#e9eef4':'#f3f6fa'} rx="8"/><text x="17" y={g.laneStarts[i]+g.laneHeights[i]/2+4} fontSize="13" fontWeight="bold" fill="#29384b">{d.name}</text></g>)}
 {segments.map((seg,i)=><line key={i} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2} stroke="#e01949" strokeWidth="3" strokeDasharray={lineStyle==='dotted'?'2 9':undefined} strokeLinecap="round"/>)}
 {repeats.map(group=><g key={'repeat-'+group.id} className="repeat-connector" role="button" tabIndex={0} aria-label={group.name+', '+group.repeats+' repetitions'} onClick={()=>onChooseGroup(group.id)}
 onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onChooseGroup(group.id)}}}>
 <g fill="none" stroke="#e01949" strokeWidth="3" strokeDasharray={lineStyle==='dotted'?'2 9':undefined} strokeLinejoin="round" strokeLinecap="round">
 {[...group.links,group.points].map((points,i)=><path key={i} d={svgPointPath(points)}/>)}
 </g>
 <text x={group.x} y={group.labelY} textAnchor="middle" fill="#334E72" fontSize="12" fontWeight="bold">×{group.repeats}</text>
 <path d={svgPointPath(group.points)} fill="none" stroke="transparent" strokeWidth="16"/>
 <title>{group.name+' • '+group.repeats+' repetitions • '+group.members.map(id=>numberById.get(id)).join(', ')+' original numbered steps. Passes: '+group.examplePasses}</title>
 </g>)}
 {visible.map(step=>{const p=g.positions.get(step.id);return <g key={step.id} role="button" tabIndex={0} aria-label={'Edit '+step.name} onClick={()=>onChoose(step.id)}
 onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onChoose(step.id)}}} className="node">
 <circle cx={p.x} cy={p.y} r={chosen===step.id?20:16} fill={chosen===step.id?'#960d37':statusById[step.id]==='added'?'#19805b':statusById[step.id]==='removed'?'#748499':statusById[step.id]==='changed'?'#d38d16':'#df1949'} stroke="white" strokeWidth="3"/>
 <text x={p.x} y={p.y+4} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{numberById.get(step.id)}</text><title>{step.name}</title></g>})}
 </svg></div>
}
function Timeline({steps,flow,onChoose}){
 const t=timelineGeometry(steps),m=t.metrics;
 return <div className="timeline-scroll"><svg viewBox={`0 0 ${t.width} ${t.height}`} width={t.width} height={t.height} role="img" aria-label={flow.toUpperCase()+" process timeline"}>
 {Array.from({length:6},(_,i)=>{const hour=m.hours*i/5,x=t.labelWidth+hour*t.scale;return <g key={i}><line x1={x} x2={x} y1={t.top-20} y2={t.height-15} stroke="#dae3ed"/><text x={x} y={t.top-28} textAnchor="middle" fontSize="11" fill="#718198">{Number(hour.toFixed(2))} h</text></g>})}
 {t.rows.map(r=><g key={r.id} role="button" tabIndex={0} className="timeline-node" onClick={()=>onChoose(r.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onChoose(r.id)}}} aria-label={r.number+'. '+r.name}>
 <text x="10" y={r.y+14} fontSize="11" fill="#28384b">{(r.isGroup?'↻ ×'+r.repeats+' '+r.name:r.number+'. '+r.name).slice(0,29)}</text>
 <rect x={r.x} y={r.y} width={r.w} height="19" rx="4" fill={r.critical?'#d91a48':'#7f95ab'}/>
 <title>{r.name+' · ES '+r.start.toFixed(2)+' h · EF '+r.finish.toFixed(2)+' h · Float '+r.float.toFixed(2)+' h'}</title>
 </g>)}
 </svg></div>
}
function App(){
 useEffect(()=>{document.title='FlowChain Studio v'+appVersion},[]);
 const [project,setProject]=useState(load),[mode,setMode]=useState('today'),[chosen,setChosen]=useState(null),[tab,setTab]=useState('steps'),[message,setMessage]=useState(''),[collapsed,setCollapsed]=useState({today:false,tomorrow:false}),[zoom,setZoom]=useState(1),[showComparison,setShowComparison]=useState(false),[connectionStart,setConnectionStart]=useState(null),[snapshots,setSnapshots]=useState(()=>listSnapshots()),[selectedSnapshot,setSelectedSnapshot]=useState(''),[layoutEngine,setLayoutEngine]=useState('standard'),[elkOrders,setElkOrders]=useState(null),[elkLoading,setElkLoading]=useState(false),[showTimeline,setShowTimeline]=useState(false),[templates,setTemplates]=useState(()=>readTemplates());
 const doc={...project,steps:project.flows[mode].steps,groups:project.flows[mode].groups||[]};
 const file=useRef(null),drag=useRef(null),history=useRef({undo:[],redo:[]});
 const comparison=compareFlows(project);
 const statusByFlow={today:Object.fromEntries(comparison.removed.map(s=>[s.id,'removed'])),tomorrow:Object.fromEntries([...comparison.moved,...comparison.updated,...comparison.dependencyChanged].map(x=>[x.after.id,'changed']).concat(comparison.added.map(s=>[s.id,'added'])))};
 const metrics={today:processMetricsWithGroups(project.flows.today.steps,project.flows.today.groups||[]),tomorrow:processMetricsWithGroups(project.flows.tomorrow.steps,project.flows.tomorrow.groups||[])};
 const diagnostics={today:graphDiagnostics(project.flows.today.steps),tomorrow:graphDiagnostics(project.flows.tomorrow.steps)};
 useEffect(()=>{localStorage.setItem('flowchain-v2',JSON.stringify(project))},[project]);
 useEffect(()=>{
  if(layoutEngine!=='elk'){setElkLoading(false);setElkOrders(null);return}
  let active=true;
  setElkLoading(true);
  computeProjectElkOrdering(project).then(order=>{
   if(active){setElkOrders(order);setElkLoading(false)}
  }).catch(err=>{
   if(active){setElkOrders(null);setElkLoading(false);setMessage('ELK layout unavailable; standard layout is shown. '+err.message)}
  });
  return ()=>{active=false};
 },[project,layoutEngine]);
 const selected=doc.steps.find(s=>s.id===chosen)||doc.steps[0],ix=doc.steps.findIndex(s=>s.id===selected?.id);
 useEffect(()=>{
  function onKey(e){
   if(!(e.ctrlKey||e.metaKey)||e.altKey||!['z','y'].includes(e.key.toLowerCase()))return;
   if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
   e.preventDefault();
   if(e.key.toLowerCase()==='y'||e.shiftKey)redo();
   else undo();
  }
  window.addEventListener('keydown',onKey);
  return ()=>window.removeEventListener('keydown',onKey);
 },[project]);
 function commitProject(transform){
  const next=transform(copy(project));
  history.current.undo.push(copy(project));
  if(history.current.undo.length>80)history.current.undo.shift();
  history.current.redo=[];
  setProject(next);
 }
 function undo(){if(!history.current.undo.length)return;const old=history.current.undo.pop();history.current.redo.push(copy(project));setProject(old);setChosen(null)}
 function redo(){if(!history.current.redo.length)return;const next=history.current.redo.pop();history.current.undo.push(copy(project));setProject(next);setChosen(null)}
 function change(fn){commitProject(p=>{const view={...p,steps:p.flows[mode].steps,groups:p.flows[mode].groups||[]};const out=fn(view);p.title=out.title;p.subtitle=out.subtitle;p.departments=out.departments;p.flows[mode].steps=out.steps;p.flows[mode].groups=normalizeGroups(out.groups,out.steps);return p})}
 function switchMode(next){setMode(next);setChosen(null);setConnectionStart(null)}
 function selectNode(flow,id){
  if(connectionStart){
   if(connectionStart.flow!==flow){setConnectionStart({flow,id});setMode(flow);setChosen(id);return}
   if(connectionStart.id!==id){
    const steps=project.flows[flow].steps;
    if(canDependOn(steps,id,connectionStart.id)){
     commitProject(p=>{
      const target=p.flows[flow].steps.find(s=>s.id===id);
      target.dependsOn=[...new Set([...target.dependsOn,connectionStart.id])];
      return p;
     });
     setMessage('Connected steps '+(steps.findIndex(s=>s.id===connectionStart.id)+1)+' → '+(steps.findIndex(s=>s.id===id)+1));
    }else setMessage('Cannot connect these steps: it would create a circular dependency.');
   }
   setConnectionStart(null);
  }
  setMode(flow);setChosen(id);setTab('steps');
 }
 function saveNamedSnapshot(){
  const name=prompt('Name this process snapshot (stored in this browser):',project.title+' '+new Date().toISOString().slice(0,10));
  if(name===null)return;
  try{setSnapshots(saveSnapshot(name,project));setSelectedSnapshot(name.trim());setMessage('Snapshot saved locally. Export JSON for a transferable backup.')}catch(err){setMessage('Snapshot save failed: '+err.message)}
 }
 function newBlankProject(){
  if(!confirm('Start a new blank process? Save a named snapshot or export JSON first if you need the current design.'))return;
  const title=prompt('New process name:','Untitled process');
  if(title===null)return;
  const name=title.trim()||'Untitled process';
  // Keep a single department for a valid, editable starting point.
  const blank=validateProject({version:2,title:name,subtitle:'',departments:[{id:'dept-1',name:'Department 1'}],flows:{today:{steps:[],lineStyle:'solid'},tomorrow:{steps:[],lineStyle:'solid'}}});
  commitProject(()=>blank);
  setMode('today');setChosen(null);setConnectionStart(null);
  setMessage('Blank project created. Save a named snapshot or export JSON to keep a separate copy.');
 }
 function restoreSnapshot(){
  const found=snapshots.find(x=>x.name===selectedSnapshot);if(!found)return;
  if(!confirm('Restore '+found.name+'? Current edits can be recovered with Undo or from a JSON export.'))return;
  try{commitProject(()=>validateProject(found.project));setMode('today');setChosen(null);setMessage('Restored snapshot '+found.name)}catch(err){setMessage('Snapshot invalid: '+err.message)}
 }
 function removeSnapshot(){
  if(!selectedSnapshot||!confirm('Delete saved snapshot '+selectedSnapshot+'?'))return;
  setSnapshots(deleteSnapshot(selectedSnapshot));setSelectedSnapshot('');
 }
 function toggleCollapsed(flow){setCollapsed(prev=>({...prev,[flow]:!prev[flow]}))}
 function setLineStyle(flow,lineStyle){commitProject(p=>({...p,flows:{...p.flows,[flow]:{...p.flows[flow],lineStyle}}}))}
 function copyToday(){if(!confirm('Replace TOMORROW with a copy of TODAY?'))return;commitProject(p=>({...p,flows:{...p.flows,tomorrow:{...p.flows.tomorrow,steps:copy(p.flows.today.steps),groups:copy(p.flows.today.groups||[])}}}));setMode('tomorrow');setChosen(null)}
 async function exportGraphic(kind){
  try{
   setMessage('Generating '+kind.toUpperCase()+'…');
   // Await a fresh ELK result so the export matches the current project.
   const order=layoutEngine==='elk'?await computeProjectElkOrdering(project):null;
   if(kind==='png')await exportPng(project,order);
   else if(kind==='pptx')await exportPptx(project,order,appVersion);
   else exportInteractiveHtml(project,order,appVersion);
   setMessage(kind==='png'?'Three PNG exports started: TODAY, TOMORROW, step list. Allow multiple downloads if prompted.':kind==='pptx'?'PowerPoint exported: TODAY, TOMORROW, step lists and summary slides.':'Offline interactive HTML document exported.');
  }catch(err){setMessage('Export failed: '+err.message)}
 }
 function move(from,to){if(from<0||to<0||to>=doc.steps.length)return;change(d=>{let [s]=d.steps.splice(from,1);d.steps.splice(to,0,s);return d})}
 function add(at=doc.steps.length,parallel=false){const id=uid();change(d=>{d.steps=insertStep(d.steps,at,{id,name:parallel?'Parallel Step':'New Step',description:'',departmentId:selected?.departmentId||d.departments[0].id,dependsOn:[]},{parallel});return d});setChosen(id);setTab('steps')}
 function createGroup(){
  if(!doc.steps.length){setMessage('Add some steps first.');return}
  const begin=prompt('First step number to group (1-'+doc.steps.length+'):',String(Math.max(1,ix+1)));
  if(begin===null)return;
  const end=prompt('Last step number in this group:',begin);if(end===null)return;
  const first=Number(begin),last=Number(end);
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first||last>doc.steps.length){setMessage('Choose a valid ascending range of step numbers.');return}
  const ids=doc.steps.slice(first-1,last).map(s=>s.id);
  try{validateGroupBoundary(doc.steps,ids)}catch(err){setMessage('Cannot collapse group: '+err.message);return}
  if(doc.groups?.some(g=>g.stepIds.some(id=>ids.includes(id)))){setMessage('These steps already belong to a group.');return}
  const name=prompt('Subprocess name:','Repeated review');if(name===null)return;
  const countText=prompt('Repeat count (1–1000):','2');if(countText===null)return;
  const repeats=Number(countText);
  if(!Number.isInteger(repeats)||repeats<1||repeats>1000){setMessage('Repeat count must be an integer from 1 to 1000.');return}
  const group={id:uid(),name:name.trim()||'Subprocess',stepIds:ids,repeats,collapsed:true};
  change(d=>{d.groups=[...(d.groups||[]),group];return d});
  setMessage('Created repeat '+group.name+' (×'+repeats+') for steps '+first+'–'+last+'. Use Repeat groups to edit or remove it.');
 }
 function editGroup(id,changeSet){change(d=>{d.groups=(d.groups||[]).map(g=>g.id===id?{...g,...changeSet}:g);return d})}
 function removeGroup(id){
  const group=(doc.groups||[]).find(g=>g.id===id);
  if(!group)return;
  if(!confirm('Remove repeat group "'+group.name+'"? The original numbered steps and connections will remain unchanged.'))return;
  change(d=>{d.groups=(d.groups||[]).filter(g=>g.id!==id);return d});
  setMessage('Removed repeat group "'+group.name+'". The original steps are unchanged.');
 }
 function expandGroup(flow,id){const group=(project.flows[flow].groups||[]).find(g=>g.id===id);setMode(flow);setChosen(group?.stepIds[0]||null);setTab('steps');setMessage(group?group.name+': '+group.repeats+' passes through steps '+group.stepIds.map(stepId=>project.flows[flow].steps.findIndex(s=>s.id===stepId)+1).join(' → ')+'. All original steps stay numbered.':'Repeat information unavailable.');}
 function saveGroupTemplate(group){try{const saved=saveTemplate(localStorage,group.name,doc.steps,group);setTemplates(saved);setMessage('Reusable template saved: '+group.name)}catch(err){setMessage('Template save failed: '+err.message)}}
 function addTemplate(){if(!templates.length){setMessage('Save a subprocess template first.');return}const name=prompt('Insert which template?\n'+templates.map(t=>t.name).join('\n'),templates[0].name);if(name===null)return;const template=templates.find(t=>t.name===name.trim());if(!template){setMessage('Template not found.');return}try{change(d=>{const out=insertTemplate(template,d.steps,d.departments,uid);d.steps=out.steps;d.groups=[...(d.groups||[]),out.group];return d});setMessage('Inserted template '+template.name+' as a collapsed subprocess.')}catch(err){setMessage('Insert failed: '+err.message)}}
 function togglePredecessor(id,checked){change(d=>{const s=d.steps.find(x=>x.id===selected.id);if(!s)return d;s.dependsOn=checked?[...new Set([...s.dependsOn,id])]:s.dependsOn.filter(v=>v!==id);return d})}
 function update(field,val){change(d=>{const s=d.steps.find(x=>x.id===selected.id);if(s)s[field]=val;return d})}
 function moveLane(delta){const i=doc.departments.findIndex(d=>d.id===selected.departmentId),target=doc.departments[i+delta];if(target)update('departmentId',target.id)}
 function removeStep(){
  if(!selected)return;
  const children=doc.steps.filter(s=>s.dependsOn.includes(selected.id));
  const warning=children.length?'\nDownstream dependencies for '+children.map(s=>s.name).join(', ')+' will be reconnected to this step’s prerequisites.':'';
  if(!confirm('Delete step '+(ix+1)+': '+selected.name+'?'+warning))return;
  change(d=>{d.steps=removeGraphStep(d.steps,selected.id);return d});
  setChosen(doc.steps[ix+1]?.id||doc.steps[ix-1]?.id||null);
 }
 function removeLane(id){
  if(project.departments.length<2)return;
  const n=['today','tomorrow'].reduce((total,flow)=>total+project.flows[flow].steps.filter(s=>s.departmentId===id).length,0);
  if(!confirm('Remove this department? '+n+' affected step(s) across BOTH flows will move to the first remaining department.'))return;
  commitProject(p=>{
   p.departments=p.departments.filter(x=>x.id!==id);
   for(const flow of ['today','tomorrow']){
    p.flows[flow].steps.forEach(step=>{if(step.departmentId===id)step.departmentId=p.departments[0].id});
   }
   return p;
  });
 }
 function shiftLane(i,delta){const to=i+delta;if(to<0||to>=doc.departments.length)return;change(d=>{const [x]=d.departments.splice(i,1);d.departments.splice(to,0,x);return d})}
 function exportJson(){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}));a.href=url;a.download=(doc.title.replace(/[^\w-]+/g,'-')||'flow')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('JSON exported')}
 async function importJson(e){const f=e.target.files?.[0];if(!f)return;try{const d=validateProject(JSON.parse(await f.text()));commitProject(()=>d);setMode('today');setChosen(null);setMessage('Imported TODAY and TOMORROW flows')}catch(err){setMessage('Import failed: '+err.message)}finally{e.target.value=''}}
 return <div className="app"><header><div className="brand"><span className="logo">F</span><div><strong>FlowChain <em>Studio</em></strong><span className="app-version" title="Installed application version">v{appVersion}</span><small>PROCESS FLOW DESIGNER</small></div></div><div className="header-actions"><span>Saved locally</span><input hidden type="file" accept=".json,application/json" ref={file} onChange={importJson}/><button onClick={()=>file.current?.click()}>Import JSON</button><button onClick={()=>exportGraphic("html")}>Export Interactive HTML</button><button onClick={()=>exportGraphic("png")}>Export PNG</button><button onClick={()=>exportGraphic("pptx")}>Export PPTX</button><button className="primary" onClick={exportJson}>Export JSON</button></div></header><div className="workspace"><aside><div className="aside-title">Flow editor</div><div className="mode-tabs"><button className={mode==="today"?"active":""} onClick={()=>switchMode("today")}>TODAY</button><button className={mode==="tomorrow"?"active":""} onClick={()=>switchMode("tomorrow")}>TOMORROW</button></div><div className="tabs"><button className={tab==='steps'?'active':''} onClick={()=>setTab('steps')}>Steps ({doc.steps.length})</button><button className={tab==='departments'?'active':''} onClick={()=>setTab('departments')}>Departments ({doc.departments.length})</button></div>{tab==='steps'?<><div className="list-head"><b>PROCESS ORDER</b><button onClick={()=>add()}>+ Add step</button></div><section className="group-controls" aria-label="Repeat groups">
 <div className="group-heading"><strong>REPEAT GROUPS ({doc.groups.length})</strong><button type="button" onClick={createGroup}>+ Add repeat</button></div>
 <p className="group-help">Square-wave repeat connections retain the original step numbers.</p>
 {doc.groups.length===0?<p className="group-empty">No repeats in {mode.toUpperCase()} yet.</p>:doc.groups.map(g=>{
  const numbers=g.stepIds.map(id=>doc.steps.findIndex(step=>step.id===id)+1).filter(n=>n>0);
  const members=new Set(g.stepIds);
  const hasEdge=doc.steps.some(step=>members.has(step.id)&&step.dependsOn.some(id=>members.has(id)));
  return <div className="group-editor" key={g.id}>
   <input aria-label={"Repeat group name"} value={g.name} onChange={e=>editGroup(g.id,{name:e.target.value})}/>
   <small className="group-range">Steps {numbers.join(" → ")||"Unavailable"} {hasEdge?"":"· No internal dependency"}</small>
   <label>× <input aria-label={"Repetitions for "+g.name} type="number" min="1" max="1000" value={g.repeats} onChange={e=>editGroup(g.id,{repeats:Math.max(1,Math.min(1000,Math.floor(Number(e.target.value)||1)))})}/></label>
   <div className="group-buttons">
    <button type="button" onClick={()=>expandGroup(mode,g.id)}>Locate</button>
    <button type="button" onClick={()=>editGroup(g.id,{collapsed:!g.collapsed})}>{g.collapsed?"Hide wave":"Show wave"}</button>
    <button type="button" onClick={()=>saveGroupTemplate(g)}>Save template</button>
    <button type="button" className="danger" onClick={()=>removeGroup(g.id)}>Remove</button>
   </div>
  </div>;
 })}
 <button type="button" onClick={addTemplate} disabled={!templates.length}>+ Insert saved template ({templates.length})</button>
 </section><p className="hint">Drag to renumber. Connections are controlled by prerequisites, not list order.</p><div className="step-list">{doc.steps.map((s,i)=><button draggable onDragStart={e=>{drag.current=i;e.dataTransfer.setData('text/plain',String(i))}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();move(drag.current,i)}} className={'step '+(selected?.id===s.id?'selected':'')} key={s.id} onClick={()=>setChosen(s.id)}><span className="number">{i+1}</span><span><strong>{s.name}</strong><small>{doc.departments.find(d=>d.id===s.departmentId)?.name}</small></span><span className="grip">⋮⋮</span></button>)}</div></>:<><div className="list-head"><b>SWIMLANES</b><button onClick={()=>change(d=>{d.departments.push({id:uid(),name:'New Department'});return d})}>+ Add</button></div><div className="dept-list">{doc.departments.map((d,i)=><div className="dept" key={d.id}><input aria-label="Department name" value={d.name} onChange={e=>change(v=>{v.departments[i].name=e.target.value;return v})}/><div><button disabled={i===0} onClick={()=>shiftLane(i,-1)}>↑</button><button disabled={i===doc.departments.length-1} onClick={()=>shiftLane(i,1)}>↓</button><button disabled={doc.departments.length===1} onClick={()=>removeLane(d.id)}>×</button></div></div>)}</div></>}<div className="sidebar-footer"><div className="snapshot-actions"><strong>Named projects / snapshots</strong><button type="button" onClick={newBlankProject}>+ New blank process</button><select aria-label="Saved snapshots" value={selectedSnapshot} onChange={e=>setSelectedSnapshot(e.target.value)}><option value="">Choose snapshot…</option>{snapshots.map(entry=><option key={entry.name} value={entry.name}>{entry.name}</option>)}</select><div><button onClick={saveNamedSnapshot}>Save snapshot</button><button disabled={!selectedSnapshot} onClick={restoreSnapshot}>Restore</button><button disabled={!selectedSnapshot} onClick={removeSnapshot}>Delete</button></div></div><button onClick={()=>{if(confirm('Restore example? Export your current flow first if needed.')){commitProject(()=>copy(sampleProject));setMode('today');setChosen(null)}}}>Restore example</button></div></aside><main><div className="page-title"><div><div className="eyebrow">DESIGN CANVAS / LIVE PREVIEW</div><input className="title" aria-label="Process title" value={doc.title} onChange={e=>change(d=>{d.title=e.target.value;return d})}/><input className="subtitle" aria-label="Process subtitle" value={doc.subtitle} onChange={e=>change(d=>{d.subtitle=e.target.value;return d})}/></div><div className="stats"><b>{doc.departments.length}<small>Departments</small></b><b>{doc.steps.length}<small>Steps</small></b></div></div>{message&&<div className="notice" role="status">{message} <button onClick={()=>setMessage('')}>×</button></div>}{showTimeline&&<section className="panel timeline-panel"><div className="panel-head"><b>Process timeline · critical path analysis</b><span>Red = zero float · Slate = float available · Estimated hours</span></div>
 <div className="timeline-stat-grid">{['today','tomorrow'].map(flow=><div key={flow}><b>{flow.toUpperCase()}</b><strong>{Number(metrics[flow].hours.toFixed(2))} h</strong><small>Elapsed · {metrics[flow].criticalSteps.length} critical activities · {Number(metrics[flow].totalWorkHours.toFixed(2))} work hours</small></div>)}</div>
 {['today','tomorrow'].map(flow=><div key={flow} className="timeline-group"><h3>{flow.toUpperCase()} · {project.flows[flow].steps.length} activities</h3><Timeline flow={flow} steps={repeatedStepTimeline(project.flows[flow].steps,project.flows[flow].groups||[])} onChoose={id=>{if(id.startsWith('group:'))expandGroup(flow,id.slice(6));else{setMode(flow);setChosen(id);setTab('steps')}}}/></div>)}
 <div className="timeline-comparison">Elapsed estimate: TODAY <b>{Number(metrics.today.hours.toFixed(2))} h</b> → TOMORROW <b>{Number(metrics.tomorrow.hours.toFixed(2))} h</b> · Change <b>{Number((metrics.tomorrow.hours-metrics.today.hours).toFixed(2))} h</b>. Estimates require complete step timings; resource capacity is not modelled.</div>
 </section>}
 <section className="panel metrics-panel"><div className="panel-head"><b>Process analysis · Indicative estimates</b><span>Durations include configured waiting time; parallel paths counted once</span></div><div className="comparison-stats">{["today","tomorrow"].map(flow=><div key={flow}><small>{flow.toUpperCase()}</small><strong>{metrics[flow].hours.toFixed(1)}h</strong><small>Critical-path estimate · {metrics[flow].manual} manual · {metrics[flow].automated} automated · {metrics[flow].assisted} AI-assisted</small></div>)}</div><div className="diagnostics">{["today","tomorrow"].map(flow=><div key={flow}><strong>{flow.toUpperCase()}:</strong> {diagnostics[flow].splits} splits · {diagnostics[flow].joins} joins · {diagnostics[flow].warnings.length?diagnostics[flow].warnings.join(' '):'No structural warnings'}</div>)}</div></section><div className="view-toolbar"><strong>Editing {mode.toUpperCase()}</strong><div className="editor-toolbar"><label className="layout-select">Layout <select aria-label="Diagram layout engine" value={layoutEngine} onChange={e=>setLayoutEngine(e.target.value)}><option value="standard">Standard</option><option value="elk">ELK automatic</option></select></label>{elkLoading&&<span className="layout-loading" role="status">Arranging…</span>}<button onClick={undo} disabled={!history.current.undo.length}>↶ Undo</button><button onClick={redo} disabled={!history.current.redo.length}>↷ Redo</button><button onClick={()=>setZoom(z=>z==="fit"?1:Math.max(.4,+(z/1.25).toFixed(2)))}>−</button><button onClick={()=>setZoom(z=>z==="fit"?1.25:Math.min(3,+(z*1.25).toFixed(2)))}>+</button><button onClick={()=>setZoom("fit")}>Fit width</button><button aria-pressed={!!connectionStart} onClick={()=>{setConnectionStart(connectionStart?null:{flow:mode,id:selected?.id||doc.steps[0]?.id});setMessage("Connection mode: select a source step, then click its destination.")}}>{connectionStart?"Cancel connection":"Connect steps"}</button><button onClick={()=>setShowTimeline(v=>!v)}>{showTimeline?"Hide timeline":"Show timeline"}</button><button onClick={()=>setShowComparison(v=>!v)}>{showComparison?"Hide changes":"Compare flows"}</button><button onClick={copyToday}>Copy TODAY → TOMORROW</button></div></div>
 {showComparison&&<section className="panel comparison-panel"><div className="panel-head"><b>TODAY / TOMORROW — Change summary</b></div><div className="comparison-stats">{[["Today",comparison.counts.today],["Tomorrow",comparison.counts.tomorrow],["Added",comparison.counts.added],["Removed",comparison.counts.removed],["Moved",comparison.counts.moved],["Edited",comparison.counts.updated],["Dependencies",comparison.counts.dependencies]].map(([name,count])=><div key={name}><strong>{count}</strong><small>{name}</small></div>)}</div><div className="comparison-legend"><span><i className="compare-added"/> Added</span><span><i className="compare-removed"/> Removed</span><span><i className="compare-changed"/> Changed</span></div><div className="comparison-lists">{[["Added in TOMORROW",comparison.added.map(s=>s.name)],["Removed from TODAY",comparison.removed.map(s=>s.name)],["Changed department/order",comparison.moved.map(x=>x.after.name)],["Changed details",comparison.updated.map(x=>x.after.name)],["Changed prerequisites",comparison.dependencyChanged.map(x=>x.after.name)]].map(([label,items])=><div key={label}><b>{label}</b><p>{items.length?items.join(" · "):"None"}</p></div>)}</div></section>}{['today','tomorrow'].map(flow=><section className={'panel flow-panel '+(flow===mode?'flow-active':'')} key={flow}><div className="panel-head"><b>{flow.toUpperCase()} — End-to-end process flow</b><div className="flow-controls"><span>{project.flows[flow].steps.length} steps</span><label>Connections <select aria-label={flow.toUpperCase()+" connection line style"} value={project.flows[flow].lineStyle||"solid"} onChange={e=>setLineStyle(flow,e.target.value)}><option value="solid">Solid</option><option value="dotted">Dotted</option></select></label><button type="button" aria-expanded={!collapsed[flow]} onClick={()=>toggleCollapsed(flow)}>{collapsed[flow]?"Expand ▾":"Minimise ▴"}</button></div></div>{!collapsed[flow]&&<Diagram doc={{...project,steps:project.flows[flow].steps,groups:project.flows[flow].groups||[]}} lineStyle={project.flows[flow].lineStyle} zoom={zoom} statusById={showComparison?statusByFlow[flow]:{}} elkOrder={layoutEngine==="elk"?elkOrders?.[flow]:null} onChooseGroup={id=>expandGroup(flow,id)} chosen={flow===mode?(connectionStart?.flow===flow?connectionStart.id:selected?.id):null} onChoose={id=>selectNode(flow,id)}/>}</section>)}<section className="panel editor"><div className="panel-head"><b>{selected?'Step '+(ix+1)+': '+selected.name:'No steps yet'}</b>{selected&&<button className="danger" onClick={removeStep}>Delete step</button>}</div>{selected?<><div className="fields"><label>Step name<input value={selected.name} onChange={e=>update('name',e.target.value)}/></label><label>Department<select value={selected.departmentId} onChange={e=>update('departmentId',e.target.value)}>{doc.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="full">Description<textarea rows="2" value={selected.description} onChange={e=>update('description',e.target.value)}/></label>
 <label>Responsible role<input value={selected.owner||""} onChange={e=>update('owner',e.target.value)} placeholder="e.g. Category Manager"/></label>
 <label>System/application<input value={selected.system||""} onChange={e=>update('system',e.target.value)} placeholder="e.g. TAIJU, SAP, Excel"/></label>
 <label>Activity type<select value={selected.activityType||"manual"} onChange={e=>update('activityType',e.target.value)}>{["manual","automated","ai-assisted","approval","decision"].map(type=><option key={type} value={type}>{type}</option>)}</select></label>
 <label>Estimated work (hours)<input type="number" min="0" step="0.25" value={selected.durationHours??0} onChange={e=>update('durationHours',Math.max(0,Number(e.target.value)||0))}/></label>
 <label>Wait before completion (hours)<input type="number" min="0" step="0.25" value={selected.waitHours??0} onChange={e=>update('waitHours',Math.max(0,Number(e.target.value)||0))}/></label>
 <label className="full">Inputs<textarea rows="2" value={selected.inputs||""} onChange={e=>update('inputs',e.target.value)}/></label>
 <label className="full">Outputs<textarea rows="2" value={selected.outputs||""} onChange={e=>update('outputs',e.target.value)}/></label><div className="full dependency-editor"><strong>Prerequisites — steps that must finish before this one</strong><p>Choose multiple predecessors to join branches. Choose the same predecessor for two steps to make them run in parallel. Uncheck all to make a starting step.</p><div className="dependency-options">{doc.steps.filter(s=>s.id!==selected.id).map(s=>{const checked=selected.dependsOn.includes(s.id);return <label key={s.id} className={checked?'checked':''}><input type="checkbox" checked={checked} disabled={!checked&&!canDependOn(doc.steps,selected.id,s.id)} onChange={e=>togglePredecessor(s.id,e.target.checked)}/><span>{doc.steps.findIndex(a=>a.id===s.id)+1}. {s.name}</span></label>})}</div></div></div><div className="actions"><div><b>Sequence position</b><button disabled={ix===0} onClick={()=>move(ix,ix-1)}>← Earlier</button><button disabled={ix===doc.steps.length-1} onClick={()=>move(ix,ix+1)}>Later →</button></div><div><b>Department lane</b><button disabled={selected.departmentId===doc.departments[0].id} onClick={()=>moveLane(-1)}>↑ Up</button><button disabled={selected.departmentId===doc.departments.at(-1).id} onClick={()=>moveLane(1)}>↓ Down</button></div><div><b>Insert step</b><button onClick={()=>add(ix)}>+ Before</button><button onClick={()=>add(ix+1)}>+ After</button><button onClick={()=>add(ix+1,true)}>+ Parallel branch</button></div></div></>:<button onClick={()=>add()}>+ Add first step</button>}</section><p className="foot">Changes autosave in this browser. Export JSON to back up or share, and import JSON to restore.</p></main></div></div>
}
createRoot(document.getElementById('root')).render(<App/>);
