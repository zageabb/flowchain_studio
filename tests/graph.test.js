import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSteps,assertGraph,graphLayout,graphEdges,insertStep,removeStep,canDependOn} from '../src/graph.js';
const deps=(id,dependsOn=[])=>({id,name:id,departmentId:id==='c'?'eng':'scm',dependsOn});
const lanes=[{id:'scm',name:'SCM'},{id:'eng',name:'Engineering'}];
test('legacy steps turn into linear dependencies',()=>{
 const steps=normalizeSteps([{id:'a'},{id:'b'},{id:'c'}]);
 assert.deepEqual(steps.map(s=>s.dependsOn),[[],['a'],['b']]);
 assertGraph(steps);
});
test('split and join share a column in both flow preview and export',()=>{
 const steps=[deps('a'),deps('b',['a']),deps('c',['a']),deps('d',['b','c'])];
 assertGraph(steps);
 const g=graphLayout(steps,lanes);
 assert.equal(g.positions.get('b').level,g.positions.get('c').level);
 assert.equal(g.positions.get('d').level,2);
 assert.equal(graphEdges(steps,g.positions).length,4);
});
test('parallel insert copies prior prerequisites',()=>{
 const steps=[deps('a'),deps('b',['a']),deps('d',['b'])];
 const updated=insertStep(steps,2,deps('c'),{parallel:true});
 assert.deepEqual(updated.find(s=>s.id==='c').dependsOn,['a']);
 assert.deepEqual(updated.find(s=>s.id==='d').dependsOn,['b']);
});
test('sequential insert replaces direct edge',()=>{
 const steps=[deps('a'),deps('b',['a'])];
 const updated=insertStep(steps,1,deps('new'));
 assert.deepEqual(updated.find(s=>s.id==='b').dependsOn,['new']);
});
test('removing step reconnects children to predecessor',()=>{
 const steps=[deps('a'),deps('b',['a']),deps('c',['b'])];
 assert.deepEqual(removeStep(steps,'b').find(s=>s.id==='c').dependsOn,['a']);
});
test('cycle prevention refuses dependency',()=>{
 const steps=[deps('a'),deps('b',['a']),deps('c',['b'])];
 assert.equal(canDependOn(steps,'a','c'),false);
 assert.equal(canDependOn(steps,'c','a'),true);
 assert.throws(()=>assertGraph([deps('a',['c']),deps('b',['a']),deps('c',['b'])]),/Circular/);
});
