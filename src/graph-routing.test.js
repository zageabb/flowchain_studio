import test from 'node:test';
import assert from 'node:assert/strict';
import {graphLayout,graphSegments,assertGraph} from './graph.js';

test('shortcut 1 -> 4 joins the 3 -> 4 vertical after step 3',()=>{
 const departments=[
  {id:'tender',name:'Tender'},{id:'scm',name:'SCM'},
  {id:'engineering',name:'Engineering'}
 ];
 const steps=[
  {id:'1',departmentId:'tender',name:'1',dependsOn:[]},
  {id:'2',departmentId:'scm',name:'2',dependsOn:['1']},
  {id:'3',departmentId:'scm',name:'3',dependsOn:['2']},
  {id:'4',departmentId:'engineering',name:'4',dependsOn:['3','1']}
 ];
 assertGraph(steps);
 const {positions}=graphLayout(steps,departments);
 const segments=graphSegments(steps,positions);
 const p1=positions.get('1'),p3=positions.get('3'),p4=positions.get('4');
 const join=(p3.x+p4.x)/2;
 // There must be a continuous vertical joining the shortcut and last
 // prerequisite at the common destination, not a misleading mid-span drop.
 assert(segments.some(s=>s.x1===join&&s.x2===join&&s.y1<=p1.y&&s.y2>=p4.y));
 assert(!segments.some(s=>s.x1===(p1.x+p4.x)/2&&s.x2===s.x1));
});

test('shortcut does not run through an intervening node in its lane',()=>{
 const departments=[{id:'a',name:'A'},{id:'b',name:'B'}];
 const steps=[
  {id:'1',departmentId:'a',dependsOn:[]},
  {id:'2',departmentId:'a',dependsOn:['1']},
  {id:'3',departmentId:'b',dependsOn:['2']},
  {id:'4',departmentId:'b',dependsOn:['3','1']}
 ];
 const {positions}=graphLayout(steps,departments);
 const segments=graphSegments(steps,positions);
 const p2=positions.get('2');
 assert(!segments.some(s=>s.y1===p2.y&&s.y2===p2.y&&
    Math.min(s.x1,s.x2)<p2.x-16&&Math.max(s.x1,s.x2)>p2.x+16));
});
