import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationSummary} from '../src/presentation-summary.js';
const step=(id,name,dependsOn=[],durationHours=0,activityType='manual')=>({id,name,departmentId:'ops',dependsOn,durationHours,waitHours:0,activityType});
const input={
 title:'Procurement',
 departments:[{id:'ops',name:'Operations'}],
 flows:{
  today:{steps:[step('1','Request',[],2),step('2','Manual approval',['1'],3)]},
  tomorrow:{steps:[step('1','Request',[],1,'automated'),step('3','Auto approval',['1'],1,'automated')]}
 }
};
test('summary calculates material changes and quantified estimates without inventing benefits',()=>{
 const result=presentationSummary(input);
 assert.equal(result.diff.counts.added,1);
 assert.equal(result.diff.counts.removed,1);
 assert.equal(result.metrics.today.hours,5);
 assert.equal(result.metrics.tomorrow.hours,2);
 assert.equal(result.timeDeltaHours,3);
 assert.equal(result.timeComparable,true);
});
test('timing comparison requires estimates in both flows',()=>{
 const noTiming=structuredClone(input);
 noTiming.flows.tomorrow.steps.forEach(s=>s.durationHours=0);
 const result=presentationSummary(noTiming);
 assert.equal(result.timeComparable,false);
 assert.equal(result.timeDeltaHours,null);
});
test('change pages use step names rather than matching IDs',()=>{
 const r=presentationSummary(input);
 assert.deepEqual(r.changes.find(x=>x.title==='Added in TOMORROW').items,['Auto approval']);
 assert.deepEqual(r.changes.find(x=>x.title==='Removed from TODAY').items,['Manual approval']);
});
