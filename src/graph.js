// Directed acyclic process graph. Array order controls numbering, not connectivity.
// A missing dependsOn field in legacy files implies the previous step.
export function normalizeSteps(steps){
 return steps.map((s,i)=>({
  ...s,
  dependsOn: Array.isArray(s.dependsOn)?[...new Set(s.dependsOn)]:i?[steps[i-1].id]:[]
 }));
}
export function assertGraph(steps){
 const ids=new Set(steps.map(s=>s.id));
 const state=new Map(),byId=new Map(steps.map(s=>[s.id,s]));
 for(const step of steps){
  if(!Array.isArray(step.dependsOn))throw Error('Step '+step.name+' has invalid prerequisites.');
  if(step.dependsOn.some(id=>!ids.has(id)||id===step.id))throw Error('Step '+step.name+' references a missing or identical prerequisite.');
 }
 function visit(id){
  if(state.get(id)===1)throw Error('Circular process dependency detected.');
  if(state.get(id)===2)return;
  state.set(id,1);
  byId.get(id).dependsOn.forEach(visit);
  state.set(id,2);
 }
 steps.forEach(s=>visit(s.id));
 return true;
}
export function canDependOn(steps,stepId,candidateId){
 if(stepId===candidateId)return false;
 try{
  assertGraph(steps.map(s=>s.id===stepId?{...s,dependsOn:[...new Set([...(s.dependsOn||[]),candidateId])]}:s));
  return true;
 }catch{return false}
}
export function removeStep(steps,id){
 const old=steps.find(s=>s.id===id);
 if(!old)return steps;
 const parents=old.dependsOn||[];
 return steps.filter(s=>s.id!==id).map(s=>({
  ...s,
  dependsOn:s.dependsOn.includes(id)?[...new Set(s.dependsOn.filter(x=>x!==id).concat(parents.filter(p=>p!==s.id)))]:s.dependsOn
 }));
}
export function insertStep(steps,index,newStep,{parallel=false}={}){
 const result=steps.map(s=>({...s,dependsOn:[...s.dependsOn]}));
 const next=result[index],previous=result[index-1];
 if(parallel){
  newStep.dependsOn=previous?[...previous.dependsOn]:[];
 }else{
  newStep.dependsOn=previous?[previous.id]:[];
  // Insert in a sequential link when present; never rewrite unrelated branches.
  if(next&&previous&&next.dependsOn.includes(previous.id)){
   next.dependsOn=next.dependsOn.map(x=>x===previous.id?newStep.id:x);
  }else if(next&&!previous&&next.dependsOn.length===0)next.dependsOn=[newStep.id];
 }
 result.splice(index,0,newStep);
 assertGraph(result);
 return result;
}
export function graphLayout(steps,departments,{left=210,top=94,lane=84,gap=125}={}){
 assertGraph(steps);
 const byId=new Map(steps.map(s=>[s.id,s])),levels=new Map();
 function level(s){
  if(levels.has(s.id))return levels.get(s.id);
  const v=s.dependsOn.length?1+Math.max(...s.dependsOn.map(id=>level(byId.get(id)))):0;
  levels.set(s.id,v);return v;
 }
 steps.forEach(level);
 // A lane can contain multiple concurrent nodes. Give each a separate subrow.
 const laneCounts=new Map();
 for(const s of steps){
  const k=s.departmentId+'|'+levels.get(s.id);
  laneCounts.set(k,(laneCounts.get(k)||0)+1);
 }
 const laneHeights=departments.map(d=>Math.max(lane,...Array.from(levels.entries()).map(([id,n])=>laneCounts.get(d.id+'|'+n)||0).map(count=>count>1?count*39+24:lane)));
 const laneStarts=[];let y=top;
 for(const h of laneHeights){laneStarts.push(y);y+=h}
 // Order competing nodes within the same lane and dependency layer by the
 // barycentre of their prerequisites. This reduces avoidable edge crossings
 // while keeping departments and all process dependencies unchanged.
 const positions=new Map(),groups=new Map(),stepIndex=new Map(steps.map((s,i)=>[s.id,i]));
 for(const s of steps){
  const k=s.departmentId+'|'+levels.get(s.id);
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(s);
 }
 const maxLevel=Math.max(0,...levels.values());
 for(let col=0;col<=maxLevel;col++){
  departments.forEach((department,row)=>{
   const key=department.id+'|'+col,group=groups.get(key)||[];
   const centre=laneStarts[row]+laneHeights[row]/2;
   const score=s=>{
    const parentYs=s.dependsOn.map(id=>positions.get(id)?.y).filter(Number.isFinite);
    if(parentYs.length)return parentYs.reduce((a,b)=>a+b,0)/parentYs.length;
    // For independent roots, order toward the lane containing their children.
    const childRows=steps.filter(t=>t.dependsOn.includes(s.id)).map(t=>departments.findIndex(d=>d.id===t.departmentId));
    return childRows.length?childRows.reduce((sum,r)=>sum+laneStarts[r]+laneHeights[r]/2,0)/childRows.length:centre;
   };
   group.sort((a,b)=>score(a)-score(b)||stepIndex.get(a.id)-stepIndex.get(b.id));
   group.forEach((s,index)=>{
    const yPos=centre+(index-(group.length-1)/2)*39;
    positions.set(s.id,{x:left+col*gap,y:yPos,index:stepIndex.get(s.id),level:col});
   });
  });
 }

 return {positions,laneStarts,laneHeights,width:Math.max(1000,left+maxLevel*gap+90),height:y+16,departments,steps};
}
export function graphEdges(steps,positions){
 return steps.flatMap(s=>s.dependsOn.map(id=>({source:id,target:s.id,a:positions.get(id),b:positions.get(s.id)})));
}
export function edgePath(a,b){
 const mid=(a.x+b.x)/2;
 return 'M '+a.x+' '+a.y+' H '+mid+' V '+b.y+' H '+b.x;
}

/**
 * Convert dependency elbows into a unique set of axis-aligned strokes.
 * Branches commonly reuse a trunk (e.g. steps 8/9/10 -> 11); drawing that
 * trunk for each edge makes dotted paths appear heavier and misaligned.
 * Merge overlapping and touching collinear intervals before rendering.
 */
export function mergeOrthogonalSegments(segments){
 const groups=new Map();
 const precision=1e6;
 for(const segment of segments){
  const {x1,y1,x2,y2}=segment;
  if(![x1,y1,x2,y2].every(Number.isFinite))throw Error('Invalid connector coordinates.');
  const vertical=Math.abs(x1-x2)<1/precision;
  const horizontal=Math.abs(y1-y2)<1/precision;
  if(!vertical&&!horizontal)throw Error('Connector segments must be orthogonal.');
  const fixed=Math.round((vertical?x1:y1)*precision)/precision;
  const start=Math.min(vertical?y1:x1,vertical?y2:x2);
  const end=Math.max(vertical?y1:x1,vertical?y2:x2);
  if(end-start<1/precision)continue;
  const key=(vertical?'v:':'h:')+fixed;
  if(!groups.has(key))groups.set(key,{vertical,fixed,ranges:[]});
  groups.get(key).ranges.push([start,end]);
 }
 const merged=[];
 for(const {vertical,fixed,ranges} of groups.values()){
  ranges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  let [start,end]=ranges[0];
  function append(){
   merged.push(vertical?{x1:fixed,y1:start,x2:fixed,y2:end}:{x1:start,y1:fixed,x2:end,y2:fixed});
  }
  for(let i=1;i<ranges.length;i++){
   const [from,to]=ranges[i];
   if(from<=end+1/precision){end=Math.max(end,to)}
   else{append();start=from;end=to}
  }
  append();
 }
 return merged;
}

export function graphSegments(steps,positions){
 const raw=[];
 for(const {a,b} of graphEdges(steps,positions)){
  const mid=(a.x+b.x)/2;
  raw.push({x1:a.x,y1:a.y,x2:mid,y2:a.y});
  raw.push({x1:mid,y1:a.y,x2:mid,y2:b.y});
  raw.push({x1:mid,y1:b.y,x2:b.x,y2:b.y});
 }
 return mergeOrthogonalSegments(raw);
}

/** Advisory validation: multiple roots or ends can be legitimate in parallel workflows. */
export function graphDiagnostics(steps){
 assertGraph(steps);
 const incoming=new Map(steps.map(s=>[s.id,s.dependsOn.length]));
 const outgoing=new Map(steps.map(s=>[s.id,0]));
 for(const s of steps)for(const id of s.dependsOn)outgoing.set(id,outgoing.get(id)+1);
 const roots=steps.filter(s=>incoming.get(s.id)===0);
 const ends=steps.filter(s=>outgoing.get(s.id)===0);
 const isolated=steps.filter(s=>incoming.get(s.id)===0&&outgoing.get(s.id)===0);
 const joins=steps.filter(s=>incoming.get(s.id)>1);
 const splits=steps.filter(s=>outgoing.get(s.id)>1);
 const warnings=[];
 if(steps.length&&!roots.length)warnings.push('No starting step detected.');
 if(roots.length>1)warnings.push(roots.length+' starting steps: confirm these are intentionally independent.');
 if(ends.length>1)warnings.push(ends.length+' ending steps: confirm every required branch reaches an intended outcome.');
 if(isolated.length)warnings.push(isolated.length+' disconnected step(s): '+isolated.map(s=>s.name).join(', '));
 return {roots:roots.length,ends:ends.length,joins:joins.length,splits:splits.length,isolated:isolated.length,warnings};
}
