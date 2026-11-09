// Compare TODAY and TOMORROW by stable step identity, then by unique step name.
const key=s=>String(s.name||'').toLowerCase().trim().replace(/\s+/g,' ');
function matchSteps(today,tomorrow){
 const matches=new Map(),used=new Set(),byId=new Map(today.map(s=>[s.id,s]));
 for(const after of tomorrow){
  if(byId.has(after.id)){matches.set(after.id,byId.get(after.id));used.add(after.id)}
 }
 const left=today.filter(s=>!used.has(s.id));
 const unmatched=tomorrow.filter(s=>!matches.has(s.id));
 for(const after of unmatched){
  const group=left.filter(s=>!used.has(s.id)&&key(s)&&key(s)===key(after));
  if(group.length===1){matches.set(after.id,group[0]);used.add(group[0].id)}
 }
 return matches;
}
export function compareFlows(project){
 const today=project.flows.today.steps,tomorrow=project.flows.tomorrow.steps;
 const matches=matchSteps(today,tomorrow);
 const pairedToday=new Set([...matches.values()].map(s=>s.id));
 const added=tomorrow.filter(s=>!matches.has(s.id));
 const removed=today.filter(s=>!pairedToday.has(s.id));
 const moved=[],updated=[],dependencyChanged=[];
 const todayIndex=new Map(today.map((s,i)=>[s.id,i]));
 const tomorrowIndex=new Map(tomorrow.map((s,i)=>[s.id,i]));
 const forward=new Map([...matches].map(([afterId,before])=>[before.id,afterId]));
 for(const [afterId,before] of matches){
  const after=tomorrow.find(s=>s.id===afterId);
  if(before.departmentId!==after.departmentId||todayIndex.get(before.id)!==tomorrowIndex.get(after.id)){
   moved.push({before,after});
  }
  if(before.name!==after.name||String(before.description||'')!==String(after.description||'')){
   updated.push({before,after});
  }
  const earlier=(before.dependsOn||[]).map(id=>forward.get(id)||'missing:'+id).sort();
  const later=[...(after.dependsOn||[])].sort();
  if(JSON.stringify(earlier)!==JSON.stringify(later))dependencyChanged.push({before,after});
 }
 return {
  added,removed,moved,updated,dependencyChanged,
  counts:{today:today.length,tomorrow:tomorrow.length,added:added.length,removed:removed.length,moved:moved.length,updated:updated.length,dependencies:dependencyChanged.length},
  matches
 };
}
