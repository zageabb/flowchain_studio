// Export a fully self-contained, read-only interactive HTML process document.
// No React, CDN, network requests, or local server required.
import {graphLayout,graphSegments} from './graph.js';
import {processMetrics} from './metrics.js';
import {timelineSvg} from './timeline.js';
import {collapsedFlow,expandedTimingSteps,processMetricsWithGroups} from './subprocess.js';

const xml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fileName=value=>(value||'flowchain').replace(/[^a-z0-9_-]+/gi,'-');
export function diagramSvg(project,flow,elkOrders=null){
 const original=project.flows[flow].steps;
 const steps=collapsedFlow(original,project.flows[flow].groups||[]);
 const originalNumbers=new Map(original.map((s,i)=>[s.id,i+1]));
 const g=graphLayout(steps,project.departments,{left:215,top:112,lane:80,gap:125,elkOrder:elkOrders?.[flow]||null});
 const stripes=project.departments.map((dept,i)=>
  '<rect x="6" y="'+g.laneStarts[i]+'" width="'+(g.width-12)+'" height="'+(g.laneHeights[i]-6)+'" rx="6" fill="'+(i%2?'#e8edf3':'#f2f5f9')+'"/>'+
  '<text x="17" y="'+(g.laneStarts[i]+g.laneHeights[i]/2+4)+'" font-size="13" font-weight="bold" fill="#26364a">'+xml(dept.name)+'</text>').join('');
 const dash=project.flows[flow].lineStyle==='dotted'?' stroke-dasharray="2 9"':'';
 const lines=graphSegments(steps,g.positions).map(s=>'<line x1="'+s.x1+'" y1="'+s.y1+'" x2="'+s.x2+'" y2="'+s.y2+'" stroke="#d91a48" stroke-width="3" stroke-linecap="round"'+dash+'/>').join('');
 const nodes=steps.map((s,i)=>{
  const p=g.positions.get(s.id);
  if(s.isGroup)return '<g class="node" data-flow="'+flow+'" data-id="'+xml(s.id)+'" tabindex="0" role="button" aria-label="'+xml('Repeat block: '+s.name)+'">'+
   '<rect x="'+(p.x-46)+'" y="'+(p.y-20)+'" width="92" height="40" rx="9" fill="#334e72"/>'+
   '<text x="'+p.x+'" y="'+(p.y+5)+'" text-anchor="middle" font-weight="bold" font-size="12" fill="white">↻ x'+s.repeats+'</text>'+
   '<title>'+xml(s.name+' repeated '+s.repeats+' times; '+s.memberCount+' original steps')+'</title></g>';
  return '<g class="node" data-flow="'+flow+'" data-id="'+xml(s.id)+'" tabindex="0" role="button" aria-label="'+xml('Step '+originalNumbers.get(s.id)+': '+s.name)+'">'+
   '<circle cx="'+p.x+'" cy="'+p.y+'" r="17" fill="#d91a48" stroke="#fff" stroke-width="3"/>'+
   '<text x="'+p.x+'" y="'+(p.y+4)+'" text-anchor="middle" font-weight="bold" font-size="12" fill="#fff" pointer-events="none">'+originalNumbers.get(s.id)+'</text>'+
   '<title>'+xml(s.name)+'</title></g>';
 }).join('');
 return '<svg class="flow-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+g.width+' '+g.height+'" data-width="'+g.width+'" data-height="'+g.height+'" aria-label="'+flow.toUpperCase()+' process diagram">'+
  '<text x="17" y="51" font-size="13" fill="#64748b" font-weight="bold">DEPARTMENT</text>'+
  '<text x="215" y="51" font-size="13" fill="#64748b" font-weight="bold">DEPENDENCY FLOW →</text>'+
  stripes+lines+nodes+'</svg>';
}
export function buildInteractiveHtml(project,elkOrders=null,appVersion=''){
 // JSON is inert inside application/json; escape '<' so it cannot end the script tag.
 const data=JSON.stringify(project).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 const today=diagramSvg(project,'today',elkOrders),tomorrow=diagramSvg(project,'tomorrow',elkOrders);
 const timeData=Object.fromEntries(['today','tomorrow'].map(flow=>{
  const m=processMetricsWithGroups(project.flows[flow].steps,project.flows[flow].groups||[]);
  return [flow,{hours:m.hours,workHours:m.totalWorkHours,waitHours:m.totalWaitHours,totalEffortHours:m.totalEffortHours,byStep:Object.fromEntries(m.finish),earlyStart:Object.fromEntries(m.starts),latestStart:Object.fromEntries(m.latestStarts),latestFinish:Object.fromEntries(m.latestFinish),float:Object.fromEntries(m.floatHours),critical:m.criticalSteps}];
 }));
 const timelineToday=timelineSvg(expandedTimingSteps(project.flows.today.steps,project.flows.today.groups||[]),'today'),timelineTomorrow=timelineSvg(expandedTimingSteps(project.flows.tomorrow.steps,project.flows.tomorrow.groups||[]),'tomorrow');
 const timeJson=JSON.stringify(timeData).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 const versionLabel=appVersion?'v'+xml(appVersion):'Version not specified';
 const html=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FlowChain Studio __APP_VERSION__ — Read-only Process Viewer</title>
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#24334b;background:#f2f5f9}
*{box-sizing:border-box}body{margin:0}header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 22px;background:white;border-bottom:1px solid #dce4ed}
h1{font-size:20px;margin:0}header small{color:#738199}button,input{font:inherit;border:1px solid #cbd5e1;border-radius:7px;padding:8px;background:#fff;color:#29384b}button{cursor:pointer}button:focus-visible,.node:focus-visible{outline:3px solid #f19db6}button[aria-pressed=true]{background:#d91a48;color:#fff}button:hover{border-color:#d91a48}main{padding:16px;max-width:1800px;margin:auto}nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.panel{background:white;border:1px solid #dce4ed;border-radius:12px;overflow:hidden;margin-bottom:15px}.panel h2{font-size:15px;margin:0}.timing{margin:0 16px 12px;padding:11px 14px;border:1px solid #d9e3ef;border-radius:8px;background:#f6f9fd;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.timing strong{font-size:20px;color:#c81647;font-variant-numeric:tabular-nums}.timing small{font-size:12px;color:#65748b}.timing .time-bar{flex:1 1 150px;height:7px;background:#e0e6ef;border-radius:9px;overflow:hidden}.timing .time-fill{height:100%;width:0;background:#d91a48;transition:width .12s}.panel-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:12px;flex-wrap:wrap}.viewport{overflow:auto;cursor:grab;max-height:66vh;min-height:220px;background:white}.viewport:active{cursor:grabbing}.flow-svg{display:block;width:100%;height:auto;min-width:650px}.node{cursor:pointer}.node:hover circle,.node.selected circle{fill:#8f1238}.details{padding:18px 20px}.details h3{margin:0 0 8px}.details dl{display:grid;grid-template-columns:140px 1fr;gap:10px;margin:10px 0}.details dt{color:#66768d;font-weight:600}.details dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.timeline-view{margin-bottom:16px}.timeline-scroll{overflow:auto;max-height:400px;padding:4px 14px 14px}.timeline-svg{display:block;max-width:none}.timeline-step{cursor:pointer}.timeline-step:hover rect{filter:brightness(.8)}.timeline-step:focus{outline:2px solid #d91a48}.timeline-legend{color:#63738a;font-size:12px;padding:0 16px 12px}.step-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.step-list section{background:#fff;border:1px solid #dce4ed;border-radius:12px;padding:16px}.step-list button{display:block;border:0;text-align:left;width:100%;padding:8px}.step-list button:hover{background:#fff1f4}.tooltip{position:fixed;z-index:99;pointer-events:none;background:#24334b;color:white;padding:9px 12px;border-radius:8px;max-width:410px;box-shadow:0 5px 15px #0003;font-size:13px}.tooltip[hidden],[hidden]{display:none!important}footer{padding:15px 20px;color:#718096;font-size:12px}@media(max-width:750px){.step-list{grid-template-columns:1fr}main{padding:10px}}
</style></head><body>
<header><div><h1 id="project-title"></h1><small>FlowChain Studio __APP_VERSION__ · Interactive read-only export · works offline</small></div>
<div><button id="fit">Fit width</button> <button id="minus" aria-label="Zoom out">−</button> <button id="plus" aria-label="Zoom in">+</button> <span id="zoom-label">100%</span></div></header>
<main><nav><button data-filter="both" aria-pressed="true">Both flows</button><button data-filter="today" aria-pressed="false">TODAY</button><button data-filter="tomorrow" aria-pressed="false">TOMORROW</button> <input id="search" type="search" aria-label="Find a step" placeholder="Find step…"/></nav>
<section class="panel" data-panel="today"><div class="panel-top"><h2>TODAY</h2><button class="collapse" aria-expanded="true">Minimise ▴</button></div><div class="timing" data-time="today"><span>Elapsed to hovered step</span><strong class="time-readout" aria-live="polite">0 / 0 h</strong><div class="time-bar"><div class="time-fill"></div></div><small class="effort-readout"></small></div><div class="viewport">__TODAY_SVG__</div></section>
<section class="panel" data-panel="tomorrow"><div class="panel-top"><h2>TOMORROW</h2><button class="collapse" aria-expanded="true">Minimise ▴</button></div><div class="timing" data-time="tomorrow"><span>Elapsed to hovered step</span><strong class="time-readout" aria-live="polite">0 / 0 h</strong><div class="time-bar"><div class="time-fill"></div></div><small class="effort-readout"></small></div><div class="viewport">__TOMORROW_SVG__</div></section>
<section class="panel timeline-view"><div class="panel-top"><h2>Process timeline and critical path</h2><button id="toggle-timelines" aria-expanded="true">Minimise ▴</button></div><div id="timeline-contents"><div class="panel-top"><strong>TODAY</strong></div><div class="timeline-scroll">__TIMELINE_TODAY__</div><div class="panel-top"><strong>TOMORROW</strong></div><div class="timeline-scroll">__TIMELINE_TOMORROW__</div><p class="timeline-legend">Red = critical (zero float). Slate = available float. Estimated hours; dependencies may execute in parallel.</p></div></section>
<section class="panel details" id="details" aria-live="polite"><h3>Select a numbered step</h3><p>Hover for a summary or click to inspect its details.</p></section>
<div class="step-list" id="step-lists"></div>
</main><div id="tooltip" class="tooltip" role="tooltip" hidden></div><footer>Data is embedded in this file; no external services or edits to the original process are possible.</footer>
<script type="application/json" id="flow-data">__PROJECT_DATA__</script><script type="application/json" id="flow-times">__FLOW_TIMES__</script>
<script>
(function(){
'use strict';
var project=JSON.parse(document.getElementById('flow-data').textContent);
var timings=JSON.parse(document.getElementById('flow-times').textContent);
var zoom=1;
var tooltip=document.getElementById('tooltip');
var details=document.getElementById('details');
var search=document.getElementById('search');
var flowList=['today','tomorrow'];
document.getElementById('project-title').textContent=project.title+(project.subtitle?' — '+project.subtitle:'');
function department(id){var found=project.departments.find(function(d){return d.id===id});return found?found.name:'Unknown';}
function lookup(flow,id){return project.flows[flow].steps.find(function(s){return s.id===id});}
function lookupGroup(flow,id){return (project.flows[flow].groups||[]).find(function(g){return 'group:'+g.id===id});}
function indexOfStep(flow,id){return project.flows[flow].steps.findIndex(function(s){return s.id===id})+1;}
function formatHours(value){return value===undefined||value===null||String(value).trim()===''?'Not specified':Number.isFinite(Number(value))&&Number(value)>=0?Number(value)+' h':'Not specified';}
function formatTotal(work,wait){var w=formatHours(work),t=formatHours(wait);return w==='Not specified'||t==='Not specified'?'Not specified':(Number(work)+Number(wait))+' h';}

function timeLabel(n){return Number((Number(n)||0).toFixed(2)).toLocaleString(undefined,{maximumFractionDigits:2});}
function updateTime(flow,id){
 var meta=timings[flow],panel=document.querySelector('[data-time="'+flow+'"]');if(!panel||!meta)return;
 var value=id==null?0:meta.byStep[id]??0;
 panel.querySelector('.time-readout').textContent=timeLabel(value)+' / '+timeLabel(meta.hours)+' h';
 panel.querySelector('.time-fill').style.width=meta.hours?Math.min(100,100*value/meta.hours)+'%':'0%';
 panel.querySelector('.effort-readout').textContent='Total work: '+timeLabel(meta.workHours)+' h · Total waiting: '+timeLabel(meta.waitHours)+' h';
}
flowList.forEach(function(flow){updateTime(flow,null)});
function clear(el){while(el.firstChild)el.removeChild(el.firstChild)}
function element(tag,parent,value){var el=document.createElement(tag);if(value!==undefined)el.textContent=value;parent.appendChild(el);return el}
function detailsFor(flow,id){
 var step=lookup(flow,id),group=lookupGroup(flow,id);if(!step&&!group)return;
 updateTime(flow,id);
 document.querySelectorAll('.node, .timeline-step').forEach(function(n){n.classList.toggle('selected',n.dataset.flow===flow&&n.dataset.id===id)});
 clear(details);
 if(group){
  element('h3',details,flow.toUpperCase()+' · Repeat block — '+group.name);
  var gd=element('dl',details);
  var gsteps=project.flows[flow].steps.filter(function(s){return group.stepIds.includes(s.id)});
  [['Repeats',String(group.repeats)+' times'],['Contains',String(gsteps.length)+' numbered source steps'],['Steps',gsteps.map(function(s){return indexOfStep(flow,s.id)+'. '+s.name}).join(', ')],['Estimated finish',formatHours(timings[flow].byStep[id])]].forEach(function(pair){element('dt',gd,pair[0]);element('dd',gd,pair[1])});
  details.scrollIntoView({behavior:'smooth',block:'nearest'});return;
 }
 element('h3',details,flow.toUpperCase()+' · Step '+indexOfStep(flow,id)+' — '+step.name);
 var dl=element('dl',details);
 [['Department',department(step.departmentId)],['Description',step.description||'No description provided'],
 ['Responsible role',step.owner||'Not specified'],['System / application',step.system||'Not specified'],['Activity type',step.activityType||'Not specified'],
 ['Work hours',formatHours(step.durationHours)],['Waiting hours',formatHours(step.waitHours)],
 ['Earliest start',formatHours(timings[flow].earlyStart[id])],['Earliest finish',formatHours(timings[flow].byStep[id])],
 ['Latest start',formatHours(timings[flow].latestStart[id])],['Latest finish',formatHours(timings[flow].latestFinish[id])],
 ['Total float',formatHours(timings[flow].float[id])],['Critical path',timings[flow].critical.includes(id)?'Yes':'No'],
 ['Combined work + wait',formatTotal(step.durationHours,step.waitHours)],
 ['Inputs',step.inputs||'Not specified'],['Outputs',step.outputs||'Not specified'],
 ['Prerequisites',(step.dependsOn||[]).map(function(pid){var parent=lookup(flow,pid);return parent?indexOfStep(flow,pid)+'. '+parent.name:pid}).join(', ')||'None']]
 .forEach(function(pair){element('dt',dl,pair[0]);element('dd',dl,pair[1])});
 details.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function openNode(node){detailsFor(node.dataset.flow,node.dataset.id)}
document.querySelectorAll('.node, .timeline-step').forEach(function(node){
 node.addEventListener('click',function(){openNode(node)});
 node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openNode(node)}});
 node.addEventListener('pointermove',function(e){
  var step=lookup(node.dataset.flow,node.dataset.id),group=lookupGroup(node.dataset.flow,node.dataset.id);if(!step&&!group)return;
  updateTime(node.dataset.flow,node.dataset.id);
  tooltip.textContent=group?(node.dataset.flow.toUpperCase()+' · '+group.name+' · Repeat ×'+group.repeats+' · '+group.stepIds.length+' source steps'):(node.dataset.flow.toUpperCase()+' · '+indexOfStep(node.dataset.flow,node.dataset.id)+'. '+step.name+' — '+department(step.departmentId)+' · Work: '+formatHours(step.durationHours)+' · Wait: '+formatHours(step.waitHours)+' · '+(step.description||'No description'));
  tooltip.hidden=false;
  tooltip.style.left=Math.min(e.clientX+15,window.innerWidth-340)+'px';
  tooltip.style.top=Math.max(5,Math.min(e.clientY+15,window.innerHeight-85))+'px';
 });
 node.addEventListener('pointerleave',function(){tooltip.hidden=true;updateTime(node.dataset.flow,null)});
 node.addEventListener('focus',function(){updateTime(node.dataset.flow,node.dataset.id)});
 node.addEventListener('blur',function(){updateTime(node.dataset.flow,null)});
});
document.getElementById('toggle-timelines').addEventListener('click',function(){
 var area=document.getElementById('timeline-contents');area.hidden=!area.hidden;
 this.textContent=area.hidden?'Expand ▾':'Minimise ▴';this.setAttribute('aria-expanded',String(!area.hidden));
});
var list=document.getElementById('step-lists');
flowList.forEach(function(flow){var section=element('section',list);section.dataset.list=flow;element('h3',section,flow.toUpperCase()+' step list');
 project.flows[flow].steps.forEach(function(step,i){
  var btn=element('button',section,(i+1)+'. '+step.name+' · '+department(step.departmentId)+' · Work '+formatHours(step.durationHours)+' · Wait '+formatHours(step.waitHours));
  btn.dataset.name=step.name.toLowerCase();btn.addEventListener('click',function(){detailsFor(flow,step.id)});
 });
});
document.querySelectorAll('[data-filter]').forEach(function(btn){btn.addEventListener('click',function(){
 var selected=btn.dataset.filter;
 document.querySelectorAll('[data-filter]').forEach(function(b){b.setAttribute('aria-pressed',String(b===btn))});
 document.querySelectorAll('[data-panel]').forEach(function(panel){panel.hidden=selected!=='both'&&panel.dataset.panel!==selected});
 document.querySelectorAll('[data-list]').forEach(function(part){part.hidden=selected!=='both'&&part.dataset.list!==selected});
})});
document.querySelectorAll('.collapse').forEach(function(btn){btn.addEventListener('click',function(){
 var viewport=btn.closest('.panel').querySelector('.viewport');viewport.hidden=!viewport.hidden;
 btn.textContent=viewport.hidden?'Expand ▾':'Minimise ▴';btn.setAttribute('aria-expanded',String(!viewport.hidden));
})});
search.addEventListener('input',function(){var q=search.value.trim().toLowerCase();document.querySelectorAll('#step-lists button').forEach(function(btn){btn.hidden=!btn.dataset.name.includes(q)})});
function setZoom(next){zoom=Math.max(.25,Math.min(3,next));document.querySelectorAll('.flow-svg').forEach(function(svg){
 svg.style.width=(zoom*100)+'%';svg.style.minWidth='0';
 });document.getElementById('zoom-label').textContent=Math.round(zoom*100)+'%';}
document.getElementById('plus').addEventListener('click',function(){setZoom(zoom*1.25)});
document.getElementById('minus').addEventListener('click',function(){setZoom(zoom/1.25)});
document.getElementById('fit').addEventListener('click',function(){setZoom(1)});
document.querySelectorAll('.viewport').forEach(function(view){
 view.addEventListener('wheel',function(e){if(!e.ctrlKey)return;e.preventDefault();setZoom(zoom*(e.deltaY<0?1.1:0.9))},{passive:false});
 var origin=null;
 view.addEventListener('pointerdown',function(e){if(e.target.closest('.node'))return;origin={x:e.clientX,y:e.clientY,left:view.scrollLeft,top:view.scrollTop};view.setPointerCapture(e.pointerId)});
 view.addEventListener('pointermove',function(e){if(origin){view.scrollLeft=origin.left+origin.x-e.clientX;view.scrollTop=origin.top+origin.y-e.clientY}});
 ['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){view.addEventListener(ev,function(){origin=null})});
});
})();
</script></body></html>`;
 return html.replaceAll('__APP_VERSION__',versionLabel).replace('__PROJECT_DATA__',data).replace('__FLOW_TIMES__',timeJson).replace('__TODAY_SVG__',today).replace('__TOMORROW_SVG__',tomorrow).replace('__TIMELINE_TODAY__',timelineToday).replace('__TIMELINE_TOMORROW__',timelineTomorrow);
}
export function exportInteractiveHtml(project,elkOrders=null,appVersion=''){
 const html=buildInteractiveHtml(project,elkOrders,appVersion);
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=fileName(project.title)+'-interactive.html';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
