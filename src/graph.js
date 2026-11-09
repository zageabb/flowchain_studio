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
 const positions=new Map(),counter=new Map();
 steps.forEach((s,i)=>{
  const col=levels.get(s.id),row=departments.findIndex(d=>d.id===s.departmentId),k=s.departmentId+'|'+col;
  const sub=counter.get(k)||0;counter.set(k,sub+1);
  const count=laneCounts.get(k)||1;
  const yPos=laneStarts[row]+laneHeights[row]/2+(sub-(count-1)/2)*39;
  positions.set(s.id,{x:left+col*gap,y:yPos,index:i,level:col});
 });
 const maxLevel=Math.max(0,...levels.values());
 return {positions,laneStarts,laneHeights,width:Math.max(1000,left+maxLevel*gap+90),height:y+16,departments,steps};
}
export function graphEdges(steps,positions){
 return steps.flatMap(s=>s.dependsOn.map(id=>({source:id,target:s.id,a:positions.get(id),b:positions.get(s.id)})));
}
export function edgePath(a,b){
 const mid=(a.x+b.x)/2;
 return 'M '+a.x+' '+a.y+' H '+mid+' V '+b.y+' H '+b.x;
}
