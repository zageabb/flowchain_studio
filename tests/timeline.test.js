import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineGeometry,timelineSvg} from '../src/timeline.js';
import {buildInteractiveHtml} from '../src/interactive-export.js';

const p={title:'Timeline',subtitle:'',departments:[{id:'scm',name:'SCM'}],flows:{
 today:{lineStyle:'solid',steps:[
  {id:'a',name:'Start',departmentId:'scm',dependsOn:[],durationHours:2,waitHours:0},
  {id:'b',name:'Fast',departmentId:'scm',dependsOn:['a'],durationHours:3,waitHours:0},
  {id:'c',name:'Slow',departmentId:'scm',dependsOn:['a'],durationHours:6,waitHours:0},
  {id:'d',name:'Finish',departmentId:'scm',dependsOn:['b','c'],durationHours:1,waitHours:0}
 ]},
 tomorrow:{lineStyle:'dotted',steps:[{id:'t',name:'New',departmentId:'scm',dependsOn:[],durationHours:3,waitHours:1}]}
}};
test('timeline geometry positions parallel bars from their predecessor finish and identifies zero float',()=>{
 const t=timelineGeometry(p.flows.today.steps);
 assert.equal(t.metrics.hours,9);
 assert.equal(t.rows.find(r=>r.id==='b').start,2);
 assert.equal(t.rows.find(r=>r.id==='c').start,2);
 assert.equal(t.rows.find(r=>r.id==='b').float,3);
 assert.equal(t.rows.find(r=>r.id==='c').critical,true);
 assert.ok(t.rows.every(r=>r.w>0));
});
test('SVG timeline labels and escapes user-supplied step text',()=>{
 const steps=[{id:'bad',name:'<script>x</script>',dependsOn:[],durationHours:2,waitHours:0}];
 const html=timelineSvg(steps,'today');
 assert.match(html,/data-flow="today"/);
 assert.match(html,/timeline-step/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
});
test('standalone HTML contains two embedded timelines and critical metrics',()=>{
 const html=buildInteractiveHtml(p);
 assert.doesNotMatch(html,/__TIMELINE_TODAY__/);
 assert.match(html,/data-flow="tomorrow"/);
 assert.match(html,/class="panel timeline-view"/);
 assert.match(html,/Earliest start/);
 assert.match(html,/Latest finish/);
 assert.match(html,/Total float/);
 assert.match(html,/Critical path/);
 assert.match(html,/timeline-contents/);
});
