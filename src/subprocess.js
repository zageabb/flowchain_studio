import {processMetrics} from './metrics.js';
// Reusable subprocess groups (metadata only) and an acyclic collapsed graph.
// A repeated group remains ONE set of numbered activities in the source.
// Repeats specify how often that same action/set occurs; no duplicated nodes.
export const GROUP_LIMIT=50;
export function normalizeGroups(groups,steps){
 const ids=new Set(steps.map(s=>s.id)),seen=new Set(),occupied=new Set();
 if(!Array.isArray(groups))return [];
 return groups.slice(0,GROUP_LIMIT).map(g=>{
  const members=[...new Set(Array.isArray(g.stepIds)?g.stepIds:[])].filter(id=>ids.has(id)&&!occupied.has(id));
  if(!members.length||!g.id||seen.has(g.id))return null;
  members.forEach(id=>occupied.add(id));seen.add(g.id);
  return {id:String(g.id),name:String(g.name||'Subprocess'),stepIds:members,
   repeats:Math.min(1000,Math.max(1,Math.floor(Number(g.repeats)||1))),collapsed:g.collapsed!==false};
 }).filter(Boolean);
}
export function validateGroupBoundary(steps,ids){
 const selected=new Set(ids),members=steps.filter(s=>selected.has(s.id));
 if(!members.length)throw Error('Choose at least one step.');
 // Do not allow an outside dependency to lead back to an earlier member,
 // which would become a self-cycle when the group is collapsed.
 const downstream=new Map(steps.map(s=>[s.id,[]]));
 for(const s of steps)for(const parent of s.dependsOn||[])downstream.get(parent)?.push(s.id);
 for(const member of members){
  const visit=(id,passedOutside,visited)=>{
   const key=id+'|'+passedOutside;if(visited.has(key))return;visited.add(key);
   if(passedOutside&&selected.has(id))throw Error('The group has an external dependency between members. Select a contiguous dependency region.');
   for(const next of downstream.get(id)||[])visit(next,passedOutside||!selected.has(next),visited);
  };
  for(const child of downstream.get(member.id)||[])visit(child,!selected.has(child),new Set());
 }
 return true;
}
export function collapsedFlow(steps,groups){
 const valid=normalizeGroups(groups,steps).filter(g=>g.collapsed);
 // Collapsing groups with external interleaving may introduce cycles.
 // Keep such groups expanded instead of breaking the process.
 const accepted=[];
 for(const g of valid){
  try{validateGroupBoundary(steps,g.stepIds);accepted.push(g)}catch{}
 }
 const membership=new Map(accepted.flatMap(g=>g.stepIds.map(id=>[id,g.id])));
 const groupById=new Map(accepted.map(g=>[g.id,g]));
 const original=new Map(steps.map(s=>[s.id,s]));
 const nodes=[],created=new Set();
 for(const [originalIndex,s] of steps.entries()){
  const groupId=membership.get(s.id);
  if(!groupId){nodes.push({...s,originalNumber:originalIndex+1,dependsOn:[...s.dependsOn]});continue}
  if(created.has(groupId))continue;created.add(groupId);
  const g=groupById.get(groupId),members=g.stepIds.map(id=>original.get(id));
  nodes.push({id:'group:'+groupId,name:g.name,departmentId:members[0].departmentId,
   dependsOn:[],isGroup:true,groupId:g.id,repeats:g.repeats,memberCount:members.length,
   memberIds:g.stepIds});
 }
 for(const node of nodes){
  const members=node.isGroup?node.memberIds.map(id=>original.get(id)):[original.get(node.id)];
  const outside=new Set();
  for(const s of members)for(const parent of s.dependsOn){
   const upstream=membership.get(parent)?'group:'+membership.get(parent):parent;
   if(upstream!==node.id)outside.add(upstream);
  }
  node.dependsOn=[...outside];
 }
 return nodes;
}
export function groupStepDuration(steps,group){
 const members=new Set(group.stepIds);
 // A repeated region's duration is the longest dependency chain inside it,
 // not the sum of all parallel activities.
 const byId=new Map(steps.map(s=>[s.id,s])),memo=new Map();
 function end(id){
  if(memo.has(id))return memo.get(id);
  const s=byId.get(id);
  const start=Math.max(0,...s.dependsOn.filter(p=>members.has(p)).map(end));
  const hours=start+Math.max(0,Number(s.durationHours)||0)+Math.max(0,Number(s.waitHours)||0);
  memo.set(id,hours);return hours;
 }
 return Math.max(0,...group.stepIds.map(end));
}
export function expandedTimingSteps(steps,groups){
 const valid=normalizeGroups(groups,steps);
 const extra=new Map();
 for(const g of valid){
  try{validateGroupBoundary(steps,g.stepIds)}catch{continue}
  const duration=groupStepDuration(steps,g)*(g.repeats-1);
  if(duration<=0)continue;
  const selected=new Set(g.stepIds);
  const exits=steps.filter(s=>selected.has(s.id)&&!steps.some(child=>selected.has(child.id)&&child.dependsOn.includes(s.id)));
  // Additional iterations are charged once at the group exit boundary,
  // split across exits only if needed; for multiple parallel exit nodes,
  // apply it to one artificial join to avoid double-counting.
  extra.set(g.id,{duration,exits:exits.map(s=>s.id)});
 }
 // Use a group-level DAG for exact repeated-region timing when repetitions exist.
 if(!extra.size)return steps;
 const projection=collapsedFlow(steps,valid.map(g=>({...g,collapsed:true})));
 const groupsById=new Map(valid.map(g=>[g.id,g]));
 return projection.map(node=>{
  if(node.isGroup){
   const g=groupsById.get(node.groupId);
   return {...node,durationHours:groupStepDuration(steps,g)*g.repeats,waitHours:0};
  }
  return node;
 });
}

/**
 * Repeat-aware process totals. Groups are serial repetitions of one source
 * region, never cloned steps. Elapsed time uses its critical dependency path;
 * work and wait are accumulated independently across ALL repetitions.
 */
// Keep timing keyed by the ORIGINAL numbered steps for the HTML hover panel.
// Serial repeated passes add elapsed time at the exit of each selected region.
export function repeatAwareNumberedMetrics(steps,groups=[]){
 const transformed=steps.map(s=>({...s}));
 for(const group of normalizeGroups(groups,steps)){
  try{validateGroupBoundary(steps,group.stepIds)}catch{continue}
  const extra=groupStepDuration(steps,group)*(group.repeats-1);
  if(extra<=0)continue;
  const ids=new Set(group.stepIds);
  const exits=transformed.filter(s=>ids.has(s.id)&&!transformed.some(child=>ids.has(child.id)&&(child.dependsOn||[]).includes(s.id)));
  for(const step of exits)step.durationHours=(Number(step.durationHours)||0)+extra;
 }
 return processMetrics(transformed);
}
export function processMetricsWithGroups(steps,groups=[]){
 const base=processMetrics(steps);
 const projected=expandedTimingSteps(steps,groups);
 const m=projected===steps?base:repeatAwareNumberedMetrics(steps,groups);
 const byId=new Map(steps.map(s=>[s.id,s]));
 let work=base.totalWorkHours,wait=base.totalWaitHours;
 for(const group of normalizeGroups(groups,steps)){
  try{validateGroupBoundary(steps,group.stepIds)}catch{continue}
  const extra=group.repeats-1;if(extra<=0)continue;
  for(const id of group.stepIds){
   const s=byId.get(id);
   work+=extra*Math.max(0,Number(s.durationHours)||0);
   wait+=extra*Math.max(0,Number(s.waitHours)||0);
  }
 }
 return {...m,steps:base.steps,manual:base.manual,automated:base.automated,assisted:base.assisted,
  totalWorkHours:work,totalWaitHours:wait,totalEffortHours:work+wait};
}
