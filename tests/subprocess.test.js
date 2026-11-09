import test from 'node:test';
import assert from 'node:assert/strict';
import {collapsedFlow,expandedTimingSteps,groupStepDuration,normalizeGroups,validateGroupBoundary} from '../src/subprocess.js';
import {processMetrics} from '../src/metrics.js';
import {insertTemplate,saveTemplate,readTemplates} from '../src/subprocess-templates.js';
import {validateProject} from '../src/sample.js';
const step=(id,dependsOn=[],hours=1)=>({id,name:id,departmentId:'scm',dependsOn,durationHours:hours,waitHours:0});
const steps=[step('a',[],2),step('b',['a'],3),step('c',['b'],4),step('d',['c'],5)];
const group={id:'review',name:'Review again',stepIds:['b','c'],repeats:3,collapsed:true};
test('collapsed graph has one UNNUMBERED repeat object and no duplicated source steps',()=>{
 const nodes=collapsedFlow(steps,[group]);
 assert.equal(nodes.length,3);
 assert.deepEqual(nodes.map(s=>s.id),['a','group:review','d']);
 assert.equal(nodes[1].isGroup,true);
 assert.equal(nodes[1].originalNumber,undefined);
 assert.equal(nodes[1].repeats,3);
 assert.deepEqual(nodes[1].dependsOn,['a']);
 assert.deepEqual(nodes[2].dependsOn,['group:review']);
 assert.equal(nodes[2].originalNumber,4);
});
test('repeat duration uses critical path within the group and impacts elapsed total',()=>{
 assert.equal(groupStepDuration(steps,group),7);
 const timing=expandedTimingSteps(steps,[group]);
 assert.equal(timing[1].durationHours,21);
 assert.equal(processMetrics(timing).hours,28);
 assert.equal(processMetrics(steps).hours,14);
});
test('parallel branches within one repeat group are not incorrectly summed',()=>{
 const parallel=[step('a',[],1),step('b',['a'],3),step('c',['a'],5),step('d',['b','c'],1),step('e',['d'],2)];
 const g={id:'parallel',name:'Parallel review',stepIds:['b','c','d'],repeats:2,collapsed:true};
 assert.equal(groupStepDuration(parallel,g),6);
 assert.equal(processMetrics(expandedTimingSteps(parallel,[g])).hours,15);
});
test('noncontiguous dependency groups are rejected before collapse',()=>{
 const flow=[step('a'),step('b',['a']),step('c',['b']),step('d',['c'])];
 assert.throws(()=>validateGroupBoundary(flow,['a','c']),/contiguous/);
 assert.equal(collapsedFlow(flow,[{...group,stepIds:['a','c']}]).length,4);
});
test('legacy JSON and grouped JSON remain compatible',()=>{
 const data={title:'Test',departments:[{id:'scm',name:'SCM'}],
 flows:{today:{steps,groups:[group]},tomorrow:{steps,groups:[]}}};
 const out=validateProject(data);
 assert.equal(out.flows.today.groups[0].repeats,3);
 assert.equal(out.flows.tomorrow.groups.length,0);
 assert.equal(validateProject({...data,flows:{today:{steps},tomorrow:{steps}}}).flows.today.groups.length,0);
});
test('templates regenerate IDs and preserve internal dependency structure',()=>{
 const storage={data:new Map(),getItem(k){return this.data.get(k)},setItem(k,v){this.data.set(k,v)}};
 saveTemplate(storage,'Review',steps,group);
 const list=readTemplates(storage);
 assert.equal(list.length,1);
 let i=0;
 const result=insertTemplate(list[0],[step('start')],[{id:'scm',name:'SCM'}],()=>String(++i));
 assert.deepEqual(result.steps.map(s=>s.id),['start','1','2']);
 assert.deepEqual(result.steps[1].dependsOn,['start']);
 assert.deepEqual(result.steps[2].dependsOn,['1']);
 assert.equal(result.group.repeats,3);
 assert.equal(result.group.stepIds.length,2);
});
