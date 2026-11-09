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
