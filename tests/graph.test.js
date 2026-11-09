import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSteps,assertGraph,graphLayout,graphEdges,graphSegments,mergeOrthogonalSegments,insertStep,removeStep,canDependOn,graphDiagnostics} from '../src/graph.js';
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

test('parallel branches share exactly one drawn trunk around steps 8, 9, 10 and 11',()=>{
 const steps=[
  deps('8'),deps('9',['8']),deps('10',['8']),deps('11',['8','9','10'])
 ];
 const positions=new Map([
  ['8',{x:300,y:100}],
  ['9',{x:420,y:80}],
  ['10',{x:420,y:160}],
  ['11',{x:540,y:120}]
 ]);
 const segments=graphSegments(steps,positions);
 const shared=segments.filter(s=>s.x1===360&&s.x2===360);
 assert.equal(shared.length,1,'shared vertical trunk must render once');
 assert.deepEqual(shared[0],{x1:360,y1:80,x2:360,y2:160});
 // Previously the three individual edges produced overlapping dotted strokes.
 assert.equal(graphEdges(steps,positions).length,5);
});
test('overlapping and touching orthogonal segments merge, gaps and axes stay separate',()=>{
 const merged=mergeOrthogonalSegments([
  {x1:10,y1:0,x2:10,y2:15},
  {x1:10,y1:8,x2:10,y2:20},
  {x1:10,y1:20,x2:10,y2:25},
  {x1:10,y1:30,x2:10,y2:35},
  {x1:0,y1:10,x2:10,y2:10},
  {x1:5,y1:10,x2:15,y2:10},
 ]);
 assert.deepEqual(merged,[
  {x1:10,y1:0,x2:10,y2:25},
  {x1:10,y1:30,x2:10,y2:35},
  {x1:0,y1:10,x2:15,y2:10}
 ]);
});

test('diagnostics flag isolated steps and distinguish split/join nodes',()=>{
 const steps=[deps('a'),deps('b',['a']),deps('c',['a']),deps('d',['b','c']),deps('isolated')];
 const out=graphDiagnostics(steps);
 assert.equal(out.splits,1);
 assert.equal(out.joins,1);
 assert.equal(out.isolated,1);
 assert.ok(out.warnings.some(w=>w.includes('disconnected')));
});
