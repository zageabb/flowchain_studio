// Browser-only export: high-resolution combined PNG and editable two-slide PowerPoint.
const safeFile=name=>(name||'flowchain').replace(/[^a-z0-9_-]+/gi,'-');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function geometry(project,flow){
 const steps=project.flows[flow].steps,departments=project.departments;
 const lane=76,left=215,gap=100;
 const width=Math.max(1050,left+(Math.max(steps.length-1,0))*gap+65),height=105+departments.length*lane;
 return {steps,departments,lane,left,gap,width,height,points:steps.map((s,i)=>({x:left+i*gap,y:95+departments.findIndex(d=>d.id===s.departmentId)*lane+lane/2}))};
}
function svgFor(project,flow){
 const g=geometry(project,flow),height=g.height+58;
 const rows=g.departments.map((d,i)=>`<rect x="8" y="${145+i*g.lane}" width="${g.width-16}" height="${g.lane-6}" rx="7" fill="${i%2?'#e9eef4':'#f3f6fa'}"/><text x="20" y="${185+i*g.lane}" fill="#273747" font-family="Arial" font-weight="bold" font-size="13">${esc(d.name)}</text>`).join('');
 const path=g.points.map((p,i)=>{const y=p.y+50;if(!i)return `M ${p.x} ${y}`;const prev=g.points[i-1];return ` H ${(prev.x+p.x)/2} V ${y} H ${p.x}`}).join('');
 const nodes=g.points.map((p,i)=>`<circle cx="${p.x}" cy="${p.y+50}" r="16" fill="#d91a48" stroke="white" stroke-width="3"/><text x="${p.x}" y="${p.y+54}" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">${i+1}</text>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${height}" viewBox="0 0 ${g.width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><text x="20" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#d91a48">${flow.toUpperCase()}</text><text x="20" y="58" font-family="Arial" font-size="13" fill="#435066">${esc(project.title)} — ${esc(project.subtitle)}</text><text x="20" y="125" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">DEPARTMENT</text><text x="${g.left}" y="125" font-family="Arial" font-size="12" font-weight="bold" fill="#728099">PROCESS SEQUENCE →</text>${rows}<path d="${path}" fill="none" stroke="#d91a48" stroke-width="3" stroke-linejoin="round"/>${nodes}</svg>`;
}
function saveBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function rasterize(project,flow,scale){
 const markup=svgFor(project,flow),g=geometry(project,flow);
 const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
 try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not render SVG'));img.src=url});
 const canvas=document.createElement('canvas');canvas.width=g.width*scale;canvas.height=(g.height+58)*scale;
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
 const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author='FlowChain Studio';pptx.subject='TODAY and TOMORROW process swimlanes';pptx.title=project.title;
 const S=pptx.ShapeType;
 for(const flow of ['today','tomorrow']){
  const slide=pptx.addSlide(),g=geometry(project,flow);
  slide.background={color:'FFFFFF'};
  slide.addText(flow.toUpperCase()+' — '+project.title,{x:.25,y:.2,w:12.8,h:.45,bold:true,color:flow==='today'?'46556A':'CD1745',fontSize:21,margin:0});
  const left=2.45,right=13.08,top=1.1,row=Math.min(.88,5.55/g.departments.length),interval=g.steps.length>1?(right-left)/(g.steps.length-1):0;
  g.departments.forEach((d,i)=>{const y=top+i*row;
   slide.addShape(S.roundRect,{x:.25,y,w:12.85,h:row-.06,rectRadius:.06,line:{color:'E4E9F0',transparency:100},fill:{color:i%2?'E9EEF4':'F3F6FA'}});
   slide.addText(d.name,{x:.38,y:y+row*.2,w:1.9,h:row*.58,fontSize:11,bold:true,color:'29384B',margin:0,breakLine:false});
  });
  const pts=g.steps.map((s,i)=>({x:left+i*interval,y:top+g.departments.findIndex(d=>d.id===s.departmentId)*row+row/2}));
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],mid=(a.x+b.x)/2;const ln=(x1,y1,x2,y2)=>slide.addShape(S.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color:'D91A48',width:2,beginArrowType:'none',endArrowType:'none'}});ln(a.x,a.y,mid,a.y);ln(mid,a.y,mid,b.y);ln(mid,b.y,b.x,b.y)}
  pts.forEach((p,i)=>{const r=.13;slide.addShape(S.ellipse,{x:p.x-r,y:p.y-r,w:r*2,h:r*2,fill:{color:'D91A48'},line:{color:'FFFFFF',width:1.5}});slide.addText(String(i+1),{x:p.x-r,y:p.y-r+.005,w:r*2,h:r*2-0.005,fontSize:8,color:'FFFFFF',align:'center',valign:'mid',bold:true,margin:0})});
  slide.addText('FlowChain Studio • '+g.steps.length+' steps • '+g.departments.length+' departments',{x:.3,y:7.1,w:12.5,h:.23,fontSize:9,color:'8591A2',margin:0});
 }
 await pptx.writeFile({fileName:safeFile(project.title)+'-today-tomorrow.pptx'});
}
