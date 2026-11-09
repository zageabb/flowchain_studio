// ELK.js layered ordering, projected back into FlowChain's fixed department lanes.
// This preserves department ownership while using ELK to optimise DAG ordering.
// Import on demand so ordinary diagrams need no ELK runtime cost.
import {assertGraph} from './graph.js';

export function makeElkGraph(steps){
 assertGraph(steps);
 return {
  id:'root',
  layoutOptions:{
   'elk.algorithm':'layered',
   'elk.direction':'RIGHT',
   'elk.edgeRouting':'ORTHOGONAL',
   'elk.layered.nodePlacement.strategy':'NETWORK_SIMPLEX',
   'elk.layered.spacing.nodeNodeBetweenLayers':'90',
   'elk.spacing.nodeNode':'35',
   'elk.layered.considerModelOrder.strategy':'NODES_AND_EDGES'
  },
  children:steps.map(s=>({id:s.id,width:34,height:34})),
  edges:steps.flatMap(s=>s.dependsOn.map(id=>({
   id:'edge-'+encodeURIComponent(id)+'-'+encodeURIComponent(s.id),
   sources:[id],targets:[s.id]
  })))
 };
}
export function elkOrderingFromResult(result,steps){
 const byId=new Map((result.children||[]).map(n=>[n.id,n]));
 return Object.fromEntries(steps.map((s,i)=>{
  const node=byId.get(s.id);
  // Unknown nodes remain stable in the existing order.
  return [s.id,node&&Number.isFinite(node.y)?node.y+node.height/2:i*100];
 }));
}
export async function computeElkOrdering(steps,elkFactory){
 if(!steps.length)return {};
 const elk=elkFactory?(typeof elkFactory==='function'?elkFactory():elkFactory):new (await import('elkjs/lib/elk.bundled.js')).default();
 const result=await elk.layout(makeElkGraph(steps));
 return elkOrderingFromResult(result,steps);
}
export async function computeProjectElkOrdering(project,elkFactory){
 const [today,tomorrow]=await Promise.all(['today','tomorrow'].map(flow=>computeElkOrdering(project.flows[flow].steps,elkFactory)));
 return {today,tomorrow};
}
