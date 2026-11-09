// Process metrics are estimates and do not account for resource constraints.
import {assertGraph} from './graph';
export function processMetrics(steps){
 assertGraph(steps);
 const byId=new Map(steps.map(s=>[s.id,s]));
 const finish=new Map(),starts=new Map();
 function end(id){
  if(finish.has(id))return finish.get(id);
  const s=byId.get(id);
  const start=s.dependsOn.length?Math.max(...s.dependsOn.map(end)):0;
  const dur=Math.max(0,Number(s.durationHours)||0);
  const waiting=Math.max(0,Number(s.waitHours)||0);
  starts.set(id,start);
  const value=start+dur+waiting;finish.set(id,value);return value;
 }
 steps.forEach(s=>end(s.id));
 let hours=0,lastStep=null;
 for(const s of steps){const val=finish.get(s.id);if(val>hours){hours=val;lastStep=s.id}}
 const path=[];
 let current=lastStep;
 while(current){
  path.unshift(current);
  const s=byId.get(current);
  current=s.dependsOn.length?s.dependsOn.reduce((a,b)=>finish.get(a)>=finish.get(b)?a:b):null;
 }
 // Backward pass: latest start/finish and total float for each DAG step.
 // Multiple final nodes all share the same process end deadline.
 const successors=new Map(steps.map(s=>[s.id,[]]));
 for(const s of steps)for(const parent of s.dependsOn)successors.get(parent).push(s.id);
 const latestStarts=new Map(),latestFinish=new Map(),floatHours=new Map();
 function latest(id){
  if(latestStarts.has(id))return latestStarts.get(id);
  const next=successors.get(id);
  const lf=next.length?Math.min(...next.map(child=>latest(child))):hours;
  const s=byId.get(id);
  const duration=Math.max(0,Number(s.durationHours)||0)+Math.max(0,Number(s.waitHours)||0);
  const ls=lf-duration;
  latestFinish.set(id,lf);
  latestStarts.set(id,ls);
  // Clamp rounding residue in floating-point durations.
  floatHours.set(id,Math.max(0,Number((ls-starts.get(id)).toFixed(9))));
  return ls;
 }
 steps.forEach(s=>latest(s.id));
 const criticalSteps=steps.filter(s=>floatHours.get(s.id)<=1e-7).map(s=>s.id);
 const totalWorkHours=steps.reduce((sum,s)=>sum+Math.max(0,Number(s.durationHours)||0),0);
 const totalWaitHours=steps.reduce((sum,s)=>sum+Math.max(0,Number(s.waitHours)||0),0);
 const totalEffortHours=totalWorkHours+totalWaitHours;
 const manual=steps.filter(s=>(s.activityType||'manual')==='manual').length;
 const automated=steps.filter(s=>s.activityType==='automated').length;
 const assisted=steps.filter(s=>s.activityType==='ai-assisted').length;
 return {steps:steps.length,hours,totalWorkHours,totalWaitHours,totalEffortHours,criticalPath:path,criticalSteps,manual,automated,assisted,starts,finish,latestStarts,latestFinish,floatHours};
}
