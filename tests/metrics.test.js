import test from 'node:test';
import assert from 'node:assert/strict';
import {processMetrics} from '../src/metrics.js';
import {validateProject} from '../src/sample.js';
const s=(id,dependsOn,durationHours,waitHours=0,activityType='manual')=>({id,dependsOn,durationHours,waitHours,activityType,name:id,departmentId:'ops'});
test('critical path uses maximum of parallel branches, not sum',()=>{
 const steps=[s('a',[],2),s('b',['a'],4),s('c',['a'],7),s('d',['b','c'],3,1)];
 const out=processMetrics(steps);
 assert.equal(out.hours,13);
 assert.deepEqual(out.criticalPath,['a','c','d']);
});
test('empty process and unset durations are valid estimates',()=>{
 assert.equal(processMetrics([]).hours,0);
 assert.equal(processMetrics([s('a',[],undefined)]).hours,0);
});
test('JSON validation preserves expanded step details',()=>{
 const data={title:'Test',departments:[{id:'ops',name:'Operations'}],
  flows:{today:{steps:[{...s('a',[],2),owner:'SCM',system:'SAP',inputs:'PR',outputs:'PO'}]},
         tomorrow:{steps:[{...s('a',[],1,0,'automated'),owner:'Bot'}]}}};
 const validated=validateProject(data);
 assert.equal(validated.flows.today.steps[0].owner,'SCM');
 assert.equal(validated.flows.today.steps[0].system,'SAP');
 assert.equal(validated.flows.today.steps[0].inputs,'PR');
 assert.equal(validated.flows.tomorrow.steps[0].activityType,'automated');
 assert.equal(validated.flows.today.steps[0].durationHours,2);
});

test('parallel branch elapsed progression uses longest predecessor rather than sum of branches',()=>{
 const steps=[s('a',[],100),s('b',['a'],20),s('c',['a'],40),s('d',['b','c'],15.2)];
 const m=processMetrics(steps);
 assert.equal(m.finish.get('b'),120);
 assert.equal(m.finish.get('c'),140);
 assert.equal(m.finish.get('d'),155.2);
 assert.equal(m.hours,155.2);
 assert.equal(m.totalWorkHours,175.2);
 assert.equal(m.totalWaitHours,0);
 assert.equal(m.totalEffortHours,175.2);
});
test('process totals account for waiting independently of work',()=>{
 const steps=[s('a',[],2,3),s('b',['a'],1.2,4)];
 const m=processMetrics(steps);
 assert.equal(m.totalWorkHours,3.2);
 assert.equal(m.totalWaitHours,7);
 assert.equal(m.hours,10.2);
});

test('CPM latest dates, float and critical activities respect parallel branches',()=>{
 const steps=[s('a',[],2),s('b',['a'],3),s('c',['a'],6),s('d',['b','c'],2)];
 const m=processMetrics(steps);
 assert.equal(m.hours,10);
 assert.equal(m.starts.get('b'),2);
 assert.equal(m.finish.get('c'),8);
 assert.equal(m.latestStarts.get('b'),5);
 assert.equal(m.latestFinish.get('b'),8);
 assert.equal(m.floatHours.get('b'),3);
 assert.equal(m.floatHours.get('c'),0);
 assert.equal(m.floatHours.get('a'),0);
 assert.deepEqual(m.criticalSteps,['a','c','d']);
});
test('independent terminal branches get float relative to overall completion',()=>{
 const m=processMetrics([s('short',[],2),s('long',[],5)]);
 assert.equal(m.hours,5);
 assert.equal(m.floatHours.get('short'),3);
 assert.equal(m.floatHours.get('long'),0);
});
test('both equally long branches can be critical',()=>{
 const m=processMetrics([s('root',[],1),s('left',['root'],3),s('right',['root'],3),s('join',['left','right'],2)]);
 assert.deepEqual(m.criticalSteps,['root','left','right','join']);
 assert.equal(m.hours,6);
});
