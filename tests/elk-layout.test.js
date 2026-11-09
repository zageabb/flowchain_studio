import test from 'node:test';
import assert from 'node:assert/strict';
import {makeElkGraph,elkOrderingFromResult,computeElkOrdering,computeProjectElkOrdering} from '../src/elk-layout.js';
import {graphLayout} from '../src/graph.js';
const steps=[
 {id:'a',name:'A',departmentId:'top',dependsOn:[]},
 {id:'b',name:'B',departmentId:'bottom',dependsOn:[]},
 {id:'c',name:'C',departmentId:'middle',dependsOn:['b']},
 {id:'d',name:'D',departmentId:'middle',dependsOn:['a']}
];
const departments=[
 {id:'top',name:'Top'}, {id:'middle',name:'Middle'}, {id:'bottom',name:'Bottom'}
];
const fakeElk=()=>({layout:async graph=>({
 children:graph.children.map((node,i)=>({...node,x:100,y:i===2?150:i===3?10:i*45}))
})});
test('ELK graph preserves dependency links and uses layered rightward orthogonal routing',()=>{
 const graph=makeElkGraph(steps);
 assert.equal(graph.edges.length,2);
 assert.equal(graph.layoutOptions['elk.direction'],'RIGHT');
 assert.equal(graph.layoutOptions['elk.edgeRouting'],'ORTHOGONAL');
 assert.deepEqual(graph.edges[0].sources,['b']);
});
test('ELK result changes ordering within a department but never moves nodes between lanes',async()=>{
 const order=await computeElkOrdering(steps,fakeElk);
 const layout=graphLayout(steps,departments,{elkOrder:order});
 assert.ok(layout.positions.get('d').y<layout.positions.get('c').y);
 assert.equal(layout.positions.get('c').level,layout.positions.get('d').level);
 assert.ok(layout.positions.get('c').y>=layout.laneStarts[1]);
 assert.ok(layout.positions.get('d').y>=layout.laneStarts[1]);
});
test('ELK can process empty projects without calling the library',async()=>{
 assert.deepEqual(await computeElkOrdering([],()=>{throw Error('should not instantiate')}),{});
 const project={flows:{today:{steps:[]},tomorrow:{steps}}};
 const result=await computeProjectElkOrdering(project,fakeElk);
 assert.deepEqual(result.today,{});
 assert.ok(Number.isFinite(result.tomorrow.c));
});
test('ELK ordering falls back to stable index when coordinates unavailable',()=>{
 const result=elkOrderingFromResult({children:[{id:'a',y:5,height:20}]},steps);
 assert.equal(result.a,15);
 assert.equal(result.c,200);
});
