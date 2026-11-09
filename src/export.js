// Browser-only export: three separate high-resolution PNGs and editable PowerPoint with a step-list slide.
import {graphLayout,graphEdges,graphSegments} from './graph';
import {presentationSummary} from './presentation-summary';
import {stepExportDetails,stepDetailPages} from './step-export-details';
const safeFile=name=>(name||'flowchain').replace(/[^a-z0-9_-]+/gi,'-');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function geometry(project,flow,elkOrders=null){
 const g=graphLayout(project.flows[flow].steps,project.departments,{left:215,top:140,lane:76,gap:100,elkOrder:elkOrders?.[flow]||null});
 return {...g,height:g.height+38};
}
function svgFor(project,flow,elkOrders=null){
 const g=geometry(project,flow,elkOrders);
 const rows=g.departments.map((d,i)=>`<rect x="8" y="${g.laneStarts[i]}" width="${g.width-16}" height="${g.laneHeights[i]-6}" rx="7" fill="${i%2?'#e9eef4':'#f3f6fa'}"/><text x="20" y="${g.laneStarts[i]+g.laneHeights[i]/2+4}" fill="#273747" font-family="Arial" font-weight="bold" font-size="13">${esc(d.name)}</text>`).join('');
 const dash=project.flows[flow].lineStyle==='dotted'?'stroke-dasharray="2 9"':'';
 const segments=graphSegments(g.steps,g.positions).map(({x1,y1,x2,y2})=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d91a48" stroke-width="3" stroke-linecap="round" ${dash}/>`).join('');
 const nodes=g.steps.map((s,i)=>{const p=g.positions.get(s.id);return `<circle cx="${p.x}" cy="${p.y}" r="16" fill="#d91a48" stroke="white" stroke-width="3"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${i+1}</text>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}"><rect width="100%" height="100%" fill="#ffffff"/><text x="20" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#d91a48">${flow.toUpperCase()}</text><text x="20" y="58" font-family="Arial" font-size="13" fill="#435066">${esc(project.title)} — ${esc(project.subtitle)}</text><text x="20" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPARTMENT</text><text x="215" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPENDENCY FLOW →</text>${rows}${segments}${nodes}</svg>`;
}
function saveBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function rasterize(project,flow,scale,elkOrders=null){
 const markup=svgFor(project,flow,elkOrders),g=geometry(project,flow,elkOrders);
 const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not render SVG'));img.src=url});
 const canvas=document.createElement('canvas');canvas.width=g.width*scale;canvas.height=g.height*scale;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
 return canvas;
 }finally{URL.revokeObjectURL(url)}
}
// PNG files are intentionally separate so presentation authors can use each independently.
async function pngBlob(canvas){
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(!blob)throw Error('Unable to create PNG');return blob;
}
function stepListCanvas(project){
 const flows=['today','tomorrow'];
 const widest=Math.max(...flows.map(f=>project.flows[f].steps.length));
 const scale=2,column=760,pad=48,row=35,header=125;
 const height=Math.max(460,header+widest*row+pad);
 const canvas=document.createElement('canvas');canvas.width=column*2*scale;canvas.height=height*scale;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 ctx.scale(scale,scale);ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,column*2,height);
 ctx.fillStyle='#24334B';ctx.font='bold 28px Arial';ctx.fillText('PROCESS STEP LIST',pad,45);
 ctx.fillStyle='#657389';ctx.font='17px Arial';ctx.fillText(project.title||'FlowChain Studio',pad,77);
 flows.forEach((flow,group)=>{
  const x=group*column+pad,steps=project.flows[flow].steps;
  ctx.fillStyle=flow==='today'?'#46556A':'#CD1745';ctx.font='bold 23px Arial';ctx.fillText(flow.toUpperCase()+' ('+steps.length+' steps)',x,header-20);
  steps.forEach((step,i)=>{
   const y=header+i*row;
   if(i%2===0){ctx.fillStyle='#F3F6FA';ctx.fillRect(x-10,y-23,column-pad*2+12,row)}
   ctx.fillStyle='#D91A48';ctx.font='bold 15px Arial';ctx.fillText(String(i+1).padStart(2,'0'),x,y);
   ctx.fillStyle='#24334B';ctx.font='16px Arial';
   const dept=project.departments.find(d=>d.id===step.departmentId)?.name||'';
   const name=step.name||'Untitled step';
   // Keep names legible without spilling into the other column.
   const trim=(value,max)=>value.length>max?value.slice(0,max-1)+'…':value;
   ctx.fillText(trim(name,43),x+40,y);
   ctx.fillStyle='#8290A3';ctx.font='12px Arial';ctx.fillText(trim(dept,26),x+490,y);
  });
 });
 return canvas;
}
export async function exportPng(project,elkOrders=null){
 const filename=safeFile(project.title);
 // Trigger each download directly; some browsers may request permission for multiple downloads.
 for(const flow of ['today','tomorrow']){
  saveBlob(await pngBlob(await rasterize(project,flow,2,elkOrders)),filename+'-'+flow+'.png');
 }
 saveBlob(await pngBlob(stepListCanvas(project)),filename+'-step-list.png');
}
export async function exportPptx(project,elkOrders=null){
 const {default:PptxGenJS}=await import('pptxgenjs');
 const pptx=new PptxGenJS();
 pptx.layout='LAYOUT_WIDE';
 pptx.author='FlowChain Studio';
 pptx.subject='Parallel dependency process flows';
 pptx.title=project.title;
 const S=pptx.ShapeType;
 for(const flow of ['today','tomorrow']){
  const slide=pptx.addSlide(),g=geometry(project,flow,elkOrders);
  slide.background={color:'FFFFFF'};
  slide.addText(flow.toUpperCase()+' — '+project.title,{x:.25,y:.2,w:12.8,h:.48,bold:true,color:flow==='today'?'46556A':'CD1745',fontSize:21,margin:0});
  const horizontal=Math.max(1,Math.max(...Array.from(g.positions.values()).map(p=>p.x))-215);
  const vertical=Math.max(1,g.laneStarts.at(-1)+g.laneHeights.at(-1)-g.laneStarts[0]);
  const xMap=x=>2.4+(x-215)/horizontal*10.3;
  const yMap=y=>1.15+(y-g.laneStarts[0])/vertical*5.5;
  const rowY=i=>yMap(g.laneStarts[i]);
  for(let i=0;i<g.departments.length;i++){
   const y=rowY(i),bottom=yMap(g.laneStarts[i]+g.laneHeights[i]-6);
   slide.addShape(S.rect,{x:.25,y,w:12.8,h:Math.max(.07,bottom-y),line:{color:'E5EAF0',transparency:100},fill:{color:i%2?'E9EEF4':'F3F6FA'}});
   slide.addText(g.departments[i].name,{x:.38,y:y+Math.max(0,(bottom-y-.25)/2),w:1.85,h:.25,fontSize:10,bold:true,color:'29384B',margin:0});
  }
  const lineStyle={color:'D91A48',width:2,dashType:project.flows[flow].lineStyle==='dotted'?'sysDot':'solid'};
  const drawLine=(x1,y1,x2,y2)=>{
   const x=Math.min(x1,x2),y=Math.min(y1,y2);
   slide.addShape(S.line,{x,y,w:Math.max(0,Math.abs(x2-x1)),h:Math.max(0,Math.abs(y2-y1)),
    flipV:(x2-x1)*(y2-y1)<0,line:{...lineStyle}});
  };
  for(const {x1,y1,x2,y2} of graphSegments(g.steps,g.positions)){
   drawLine(xMap(x1),yMap(y1),xMap(x2),yMap(y2));
  }
  g.steps.forEach((step,i)=>{
   const p=g.positions.get(step.id),x=xMap(p.x),y=yMap(p.y),r=.13;
   slide.addShape(S.ellipse,{x:x-r,y:y-r,w:2*r,h:2*r,fill:{color:'D91A48'},line:{color:'FFFFFF',width:1.5}});
   slide.addText(String(i+1),{x:x-r,y:y-r,w:2*r,h:2*r,fontSize:8,color:'FFFFFF',align:'center',valign:'mid',bold:true,margin:0});
  });
  slide.addText('FlowChain Studio • '+g.steps.length+' steps • '+graphEdges(g.steps,g.positions).length+' dependencies',{x:.3,y:7.12,w:12.5,h:.2,fontSize:9,color:'8591A2',margin:0});
 }
 // Third slide: a numbered legend for BOTH diagrams. Numbers are independent by flow.
 // Long processes automatically continue onto additional legend slides.
 const entriesPerColumn=26;
 const totalPages=Math.max(1,...['today','tomorrow'].map(f=>Math.ceil(project.flows[f].steps.length/entriesPerColumn)));
 for(let page=0;page<totalPages;page++){
  const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
  slide.addText('Process step list'+(totalPages>1?' ('+(page+1)+'/'+totalPages+')':''),{x:.35,y:.2,w:12.6,h:.45,fontSize:22,bold:true,color:'29384B',margin:0});
  for(const [index,flow] of ['today','tomorrow'].entries()){
   const left=.38+index*6.48;
   slide.addText(flow.toUpperCase(),{x:left,y:.88,w:5.95,h:.35,bold:true,fontSize:16,color:flow==='today'?'46556A':'CD1745',margin:0});
   project.flows[flow].steps.slice(page*entriesPerColumn,(page+1)*entriesPerColumn).forEach((step,i)=>{
    const number=page*entriesPerColumn+i+1,y=1.35+i*.215;
    if(i%2===0)slide.addShape(S.rect,{x:left-.06,y:y-.01,w:6.15,h:.215,line:{color:'F1F4F8',transparency:100},fill:{color:'F1F4F8'}});
    slide.addText(String(number),{x:left,y,w:.33,h:.18,fontSize:9,bold:true,color:'D91A48',margin:0});
    slide.addText(String(step.name||'Untitled step'),{x:left+.38,y,w:4.02,h:.18,fontSize:9,color:'29384B',margin:0,breakLine:false});
    const department=project.departments.find(d=>d.id===step.departmentId)?.name||'';
    slide.addText(department,{x:left+4.5,y,w:1.5,h:.18,fontSize:7.5,color:'738096',margin:0,breakLine:false});
   });
  }
  slide.addText('Numbers refer to the corresponding TODAY or TOMORROW flow diagram.',{x:.38,y:7.13,w:12.3,h:.18,fontSize:9,color:'7A8598',margin:0});
 }
 // Preserve slide 1 TODAY, slide 2 TOMORROW and the numbered step list next.
 // Executive summary follows the step list, keeping existing presentation order.
 const summary=presentationSummary(project);
 {
  const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
  slide.addText('Process improvement overview',{x:.38,y:.28,w:12.4,h:.43,fontSize:23,bold:true,color:'27384B',margin:0});
  slide.addText(project.title,{x:.38,y:.79,w:12.1,h:.25,fontSize:12,color:'78869A',margin:0});
  const columns=[
   {label:'TODAY',m:summary.metrics.today,x:.42,color:'46556A'},
   {label:'TOMORROW',m:summary.metrics.tomorrow,x:6.82,color:'C81647'}
  ];
  columns.forEach(({label,m,x,color})=>{
   slide.addShape(S.rect,{x,y:1.35,w:6.07,h:1.7,fill:{color:'F3F6FA'},line:{color:'E0E7EF',width:.5}});
   slide.addText(label,{x:x+.2,y:1.56,w:2.2,h:.28,bold:true,fontSize:15,color,margin:0});
   slide.addText(String(m.steps),{x:x+.2,y:2.02,w:1.4,h:.48,bold:true,fontSize:28,color:'27384B',margin:0});
   slide.addText('steps',{x:x+1.65,y:2.14,w:1.2,h:.25,fontSize:11,color:'63738A',margin:0});
   slide.addText(String(m.manual)+' manual  ·  '+String(m.automated)+' automated  ·  '+String(m.assisted)+' AI-assisted',
    {x:x+.2,y:2.64,w:5.66,h:.22,fontSize:10,color:'63738A',margin:0});
  });
  const counters=[
   ['Added',summary.diff.counts.added],['Removed',summary.diff.counts.removed],
   ['Moved',summary.diff.counts.moved],['Details changed',summary.diff.counts.updated],
   ['Connections changed',summary.diff.counts.dependencies]
  ];
  slide.addText('What changes',{x:.42,y:3.39,w:5.5,h:.33,fontSize:17,bold:true,color:'27384B',margin:0});
  counters.forEach(([label,count],i)=>{
   const x=.42+(i%3)*4.28,y=3.96+Math.floor(i/3)*.86;
   slide.addShape(S.rect,{x,y,w:4.07,h:.68,line:{color:'E1E7F0',width:.5},fill:{color:'FFFFFF'}});
   slide.addText(String(count),{x:x+.17,y:y+.11,w:.6,h:.3,fontSize:20,bold:true,color:'CF1748',margin:0});
   slide.addText(label,{x:x+.83,y:y+.2,w:3.0,h:.22,fontSize:11,color:'485A70',margin:0});
  });
  const tt=summary.metrics.today,tm=summary.metrics.tomorrow;
  const duration=summary.timeComparable
   ?'Estimated longest dependency path: TODAY '+tt.hours.toFixed(1)+'h → TOMORROW '+tm.hours.toFixed(1)+'h.'
   :'Process timing not compared: enter work / waiting time estimates in BOTH flows.';
  slide.addText(duration,{x:.42,y:5.98,w:12.35,h:.35,fontSize:12,bold:true,color:'29384B',margin:0});
  slide.addText('Indicative model only. Parallel branches are evaluated by longest prerequisite, without resource constraints.',
   {x:.42,y:6.43,w:12.25,h:.3,fontSize:10,color:'758398',margin:0});
  slide.addText('Source: FlowChain Studio • TODAY/TOMORROW data within this presentation',
   {x:.42,y:7.10,w:12.2,h:.2,fontSize:8,color:'8996A7',margin:0});
 }
 // Each category receives a dedicated page when it has material changes.
 // Avoid clipping long step names by using up to 16 entries per page.
 for(const category of summary.changes){
  if(!category.items.length)continue;
  const pages=Math.ceil(category.items.length/16);
  for(let page=0;page<pages;page++){
   const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
   slide.addText(category.title+(pages>1?' ('+(page+1)+'/'+pages+')':''),
    {x:.4,y:.3,w:12.4,h:.48,fontSize:22,bold:true,color:'27384B',margin:0});
   category.items.slice(page*16,(page+1)*16).forEach((label,i)=>{
    const y=1.05+i*.37;
    if(i%2===0)slide.addShape(S.rect,{x:.35,y:y-.025,w:12.6,h:.355,fill:{color:'F4F7FA'},line:{color:'F4F7FA',transparency:100}});
    slide.addText(String(page*16+i+1),{x:.58,y,w:.45,h:.24,fontSize:11,color:'C81647',bold:true,margin:0});
    slide.addText(String(label),{x:1.10,y,w:11.45,h:.25,fontSize:12,color:'29384B',margin:0,breakLine:false});
   });
   slide.addText('FlowChain Studio • automatic process change analysis',{x:.4,y:7.10,w:12.3,h:.2,fontSize:9,color:'8A95A7',margin:0});
  }
 }
 // Fully editable step-detail appendix. Every populated field is represented;
 // long descriptions/inputs/outputs continue onto further slides.
 for(const flow of ['today','tomorrow']){
  for(const [index,step] of project.flows[flow].steps.entries()){
   const details=stepExportDetails(project,flow,step,index);
   const pages=stepDetailPages(details,18);
   pages.forEach((rows,pageIndex)=>{
    const slide=pptx.addSlide();slide.background={color:'FFFFFF'};
    slide.addShape(S.rect,{x:0,y:0,w:13.333,h:.12,fill:{color:flow==='today'?'4B596D':'D91A48'},line:{color:flow==='today'?'4B596D':'D91A48',transparency:100}});
    slide.addText(details.flow+' • Step '+details.number,{x:.46,y:.32,w:4.1,h:.27,fontSize:12,bold:true,color:flow==='today'?'4B596D':'D91A48',margin:0});
    slide.addText(details.name,{x:.46,y:.73,w:12.3,h:.46,fontSize:20,bold:true,color:'29384B',margin:0,breakLine:false});
    slide.addText('Step information'+(pages.length>1?' · page '+(pageIndex+1)+' of '+pages.length:''),
     {x:.46,y:1.35,w:12,h:.3,fontSize:12,color:'6D7E94',margin:0});
    rows.forEach(({label,value},j)=>{
     const y=1.82+j*.265;
     if(j%2===0)slide.addShape(S.rect,{x:.38,y:y-.016,w:12.48,h:.254,fill:{color:'F4F7FA'},line:{color:'F4F7FA',transparency:100}});
     slide.addText(label,{x:.57,y,w:2.30,h:.225,fontSize:9.4,bold:true,color:'54657B',margin:0,breakLine:false});
     slide.addText(String(value),{x:2.90,y,w:9.67,h:.225,fontSize:10,color:'26364A',margin:0,breakLine:false});
    });
    slide.addText('FlowChain Studio · '+project.title+' · Detailed process record',
     {x:.45,y:7.12,w:12.2,h:.18,fontSize:8.5,color:'8793A5',margin:0});
   });
  }
 }
 await pptx.writeFile({fileName:safeFile(project.title)+'-today-tomorrow-steps.pptx'});
}
