// Symbolic repeated subprocess connector. Each tooth represents one repeat up to
// a legibility limit; the ×N label always preserves the exact configured count.
// The collapsed group is an edge symbol, not a numbered process step.
export function zigzagPoints(x,y,repeats,{width=90,amplitude=11,maxTeeth=12}={}){
 const count=Math.max(1,Math.min(maxTeeth,Math.floor(Number(repeats)||1)));
 const points=[{x:x-width/2,y}];
 for(let i=0;i<count;i++){
  const left=x-width/2+(i/count)*width;
  const right=x-width/2+((i+1)/count)*width;
  points.push({x:(left+right)/2,y:y-amplitude});
  points.push({x:right,y});
 }
 return points;
}
export function zigzagPath(x,y,repeats,options){
 return zigzagPoints(x,y,repeats,options).map((p,i)=>(i?'L ':'M ')+p.x+' '+p.y).join(' ');
}
export function zigzagDescription(repeats,count){
 return 'Repeated '+repeats+' times'+(count?' · '+count+' original steps':'');
}
