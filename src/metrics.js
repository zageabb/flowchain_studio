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
 const manual=steps.filter(s=>(s.activityType||'manual')==='manual').length;
 const automated=steps.filter(s=>s.activityType==='automated').length;
 const assisted=steps.filter(s=>s.activityType==='ai-assisted').length;
 return {steps:steps.length,hours,criticalPath:path,manual,automated,assisted,starts,finish};
}
