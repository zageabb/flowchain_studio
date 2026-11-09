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
