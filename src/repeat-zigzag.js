// Orthogonal repeat notation: N full-height vertical strokes joined by
// short horizontal offsets. Unlike a small zigzag node, this spans the
// vertical gap from the preceding process step to the following step.
export function repeatSquareWavePoints(x,startY,endY,repeats,{width=90,maxColumns=12,minHeight=56}={}){
 const count=Math.max(1,Math.min(maxColumns,Math.floor(Number(repeats)||1)));
 const top=Math.abs(endY-startY)<minHeight?Math.min(startY,endY)-minHeight/2:Math.min(startY,endY);
 const bottom=Math.abs(endY-startY)<minHeight?Math.max(startY,endY)+minHeight/2:Math.max(startY,endY);
 const upper=startY<=endY;
 const firstY=upper?top:bottom, secondY=upper?bottom:top;
 const left=x-width/2,right=x+width/2;
 const points=[{x:left,y:startY}];
 if(firstY!==startY)points.push({x:left,y:firstY});
 for(let i=0;i<count;i++){
  const columnX=count===1?x:left+(right-left)*i/(count-1);
  const entrance=i%2===0?firstY:secondY;
  const exit=i%2===0?secondY:firstY;
  if(points.at(-1).x!==columnX)points.push({x:columnX,y:entrance});
  points.push({x:columnX,y:exit});
 }
 if(points.at(-1).y!==endY)points.push({x:points.at(-1).x,y:endY});
 if(points.at(-1).x!==right)points.push({x:right,y:endY});
 return points;
}
export function repeatSquareWavePath(x,startY,endY,repeats,opts){
 return repeatSquareWavePoints(x,startY,endY,repeats,opts).map((p,i)=>(i?'L ':'M ')+p.x+' '+p.y).join(' ');
}
export function repeatWaveGeometry(steps,positions,group,{width=90,maxColumns=12}={}){
 const centre=positions.get(group.id);
 const parents=group.dependsOn.map(id=>positions.get(id)).filter(Boolean);
 const children=steps.filter(s=>s.dependsOn.includes(group.id)).map(s=>positions.get(s.id)).filter(Boolean);
 const startY=parents[0]?.y??centre.y-55;
 const endY=children[0]?.y??centre.y+55;
 const left=centre.x-width/2,right=centre.x+width/2;
 const points=repeatSquareWavePoints(centre.x,startY,endY,group.repeats,{width,maxColumns});
 // Link all incoming and outgoing dependencies to the two wave endpoints.
 const links=[];
 for(const p of parents)links.push([{x:p.x,y:p.y},{x:left,y:p.y},{x:left,y:startY}]);
 for(const p of children)links.push([{x:right,y:endY},{x:right,y:p.y},{x:p.x,y:p.y}]);
 return {points,links,startY,endY,left,right,centreX:centre.x,top:Math.min(startY,endY),bottom:Math.max(startY,endY),repeats:group.repeats};
}
export function svgPointPath(points){
 return points.map((p,i)=>(i?'L ':'M ')+p.x+' '+p.y).join(' ');
}

// Render a repeat as an annotation on an EXISTING dependency edge. Source
// steps remain ordinary numbered nodes; nothing is collapsed or renumbered.
// Use the first -> last dependency of the selected region when possible.
export function repeatConnectionAnnotations(steps,groups,positions,{width=84,maxColumns=12}={}){
 const stepById=new Map(steps.map(s=>[s.id,s]));
 const annotations=[];
 for(const group of groups||[]){
  if(group.collapsed===false||!Array.isArray(group.stepIds)||!group.stepIds.length)continue;
  const selected=new Set(group.stepIds);
  const members=steps.filter(s=>selected.has(s.id));
  if(!members.length)continue;
  // Prefer the connection between the earliest and latest selected steps.
  const edges=members.flatMap(to=>(to.dependsOn||[]).filter(from=>selected.has(from)).map(from=>({from,to:to.id})));
  const edge=edges.find(e=>e.from===members[0].id&&e.to===members.at(-1).id)||edges.at(-1);
  if(!edge)continue;
  const a=positions.get(edge.from),b=positions.get(edge.to);
  if(!a||!b)continue;
  const left=Math.min(a.x,b.x)+19,right=Math.max(a.x,b.x)-19;
  const usable=Math.max(8,Math.min(width,right-left));
  const x=(a.x+b.x)/2;
  const points=repeatSquareWavePoints(x,a.y,b.y,group.repeats,{width:usable,maxColumns,minHeight:56});
  const first=points[0],last=points.at(-1);
  const links=[
   [{x:a.x,y:a.y},{x:first.x,y:a.y}],
   [{x:last.x,y:b.y},{x:b.x,y:b.y}]
  ];
  const numbered=members.map(step=>steps.indexOf(step)+1);
  const examplePasses=Array.from({length:Math.min(8,group.repeats)},(_,i)=>
   numbered.map(n=>n+'.'+(i+1)).join(' → ')).join(' | ')+(group.repeats>8?' | …':'');
  annotations.push({id:group.id,name:group.name||'Repeat',repeats:group.repeats,examplePasses,
   from:edge.from,to:edge.to,points,links,x,labelY:Math.min(a.y,b.y)-15,
   minY:Math.min(a.y,b.y),maxY:Math.max(a.y,b.y),members:members.map(s=>s.id)});
 }
 return annotations;
}
export function graphSegmentsWithoutRepeatEdges(steps,positions,annotations,graphSegments){
 const excluded=new Set(annotations.map(a=>a.from+'|'+a.to));
 return graphSegments(steps.map(s=>({...s,dependsOn:(s.dependsOn||[]).filter(id=>!excluded.has(id+'|'+s.id))})),positions);
}
