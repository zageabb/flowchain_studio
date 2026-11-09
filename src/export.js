// Browser-only export: three separate high-resolution PNGs and editable PowerPoint with a step-list slide.
import {graphLayout,graphEdges,graphSegments} from './graph';
const safeFile=name=>(name||'flowchain').replace(/[^a-z0-9_-]+/gi,'-');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function geometry(project,flow){
 const g=graphLayout(project.flows[flow].steps,project.departments,{left:215,top:140,lane:76,gap:100});
 return {...g,height:g.height+38};
}
function svgFor(project,flow){
 const g=geometry(project,flow);
 const rows=g.departments.map((d,i)=>`<rect x="8" y="${g.laneStarts[i]}" width="${g.width-16}" height="${g.laneHeights[i]-6}" rx="7" fill="${i%2?'#e9eef4':'#f3f6fa'}"/><text x="20" y="${g.laneStarts[i]+g.laneHeights[i]/2+4}" fill="#273747" font-family="Arial" font-weight="bold" font-size="13">${esc(d.name)}</text>`).join('');
 const dash=project.flows[flow].lineStyle==='dotted'?'stroke-dasharray="2 9"':'';
 const segments=graphSegments(g.steps,g.positions).map(({x1,y1,x2,y2})=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d91a48" stroke-width="3" stroke-linecap="round" ${dash}/>`).join('');
 const nodes=g.steps.map((s,i)=>{const p=g.positions.get(s.id);return `<circle cx="${p.x}" cy="${p.y}" r="16" fill="#d91a48" stroke="white" stroke-width="3"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${i+1}</text>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}"><rect width="100%" height="100%" fill="#ffffff"/><text x="20" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#d91a48">${flow.toUpperCase()}</text><text x="20" y="58" font-family="Arial" font-size="13" fill="#435066">${esc(project.title)} — ${esc(project.subtitle)}</text><text x="20" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPARTMENT</text><text x="215" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPENDENCY FLOW →</text>${rows}${segments}${nodes}</svg>`;
}
function saveBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function rasterize(project,flow,scale){
 const markup=svgFor(project,flow),g=geometry(project,flow);
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
export async function exportPng(project){
 const filename=safeFile(project.title);
 // Trigger each download directly; some browsers may request permission for multiple downloads.
 for(const flow of ['today','tomorrow']){
  saveBlob(await pngBlob(await rasterize(project,flow,2)),filename+'-'+flow+'.png');
 }
 saveBlob(await pngBlob(stepListCanvas(project)),filename+'-step-list.png');
}
export async function exportPptx(project){
 const {default:PptxGenJS}=await import('pptxgenjs');
 const pptx=new PptxGenJS();
 pptx.layout='LAYOUT_WIDE';
 pptx.author='FlowChain Studio';
 pptx.subject='Parallel dependency process flows';
 pptx.title=project.title;
 const S=pptx.ShapeType;
 for(const flow of ['today','tomorrow']){
  const slide=pptx.addSlide(),g=geometry(project,flow);
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
 await pptx.writeFile({fileName:safeFile(project.title)+'-today-tomorrow-steps.pptx'});
}
