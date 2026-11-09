// Browser-only export: high-resolution combined PNG and editable two-slide PowerPoint.
import {graphLayout,graphEdges,edgePath} from './graph';
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
 const edges=graphEdges(g.steps,g.positions).map(({a,b})=>`<path d="${edgePath(a,b)}" fill="none" stroke="#d91a48" stroke-width="3" stroke-linecap="round" ${dash} stroke-linejoin="round"/>`).join('');
 const nodes=g.steps.map((s,i)=>{const p=g.positions.get(s.id);return `<circle cx="${p.x}" cy="${p.y}" r="16" fill="#d91a48" stroke="white" stroke-width="3"/><text x="${p.x}" y="${p.y+4}" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${i+1}</text>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}"><rect width="100%" height="100%" fill="#ffffff"/><text x="20" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#d91a48">${flow.toUpperCase()}</text><text x="20" y="58" font-family="Arial" font-size="13" fill="#435066">${esc(project.title)} — ${esc(project.subtitle)}</text><text x="20" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPARTMENT</text><text x="215" y="115" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPENDENCY FLOW →</text>${rows}${edges}${nodes}</svg>`;
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
export async function exportPng(project){
 const a=await rasterize(project,'today',2),b=await rasterize(project,'tomorrow',2);
 const gap=28,out=document.createElement('canvas');out.width=Math.max(a.width,b.width);out.height=a.height+b.height+gap;
 const ctx=out.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(a,0,0);ctx.drawImage(b,0,a.height+gap);
 const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw Error('Unable to create PNG');saveBlob(blob,safeFile(project.title)+'-today-tomorrow.png');
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
  for(const {a,b} of graphEdges(g.steps,g.positions)){
   const x1=xMap(a.x),y1=yMap(a.y),x2=xMap(b.x),y2=yMap(b.y),mid=(x1+x2)/2;
   drawLine(x1,y1,mid,y1);
   drawLine(mid,y1,mid,y2);
   drawLine(mid,y2,x2,y2);
  }
  g.steps.forEach((step,i)=>{
   const p=g.positions.get(step.id),x=xMap(p.x),y=yMap(p.y),r=.13;
   slide.addShape(S.ellipse,{x:x-r,y:y-r,w:2*r,h:2*r,fill:{color:'D91A48'},line:{color:'FFFFFF',width:1.5}});
   slide.addText(String(i+1),{x:x-r,y:y-r,w:2*r,h:2*r,fontSize:8,color:'FFFFFF',align:'center',valign:'mid',bold:true,margin:0});
  });
  slide.addText('FlowChain Studio • '+g.steps.length+' steps • '+graphEdges(g.steps,g.positions).length+' dependencies',{x:.3,y:7.12,w:12.5,h:.2,fontSize:9,color:'8591A2',margin:0});
 }
 await pptx.writeFile({fileName:safeFile(project.title)+'-today-tomorrow.pptx'});
}
