import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInteractiveHtml,diagramSvg} from '../src/interactive-export.js';
import {compareFlows} from '../src/compare.js';

const step=(id,name,departmentId='scm',dependsOn=[],description='')=>({id,name,departmentId,dependsOn,description});
const project={
 title:'Tender <script>alert("x")</script>',
 subtitle:'Comparison',
 departments:[{id:'scm',name:'SCM Management'},{id:'eng',name:'Engineering'}],
 flows:{
  today:{lineStyle:'solid',steps:[step('a','Kick-off'),step('b','RFQ','scm',['a'],'Request supplier offers'),step('c','Review','eng',['b'])]},
  tomorrow:{lineStyle:'dotted',steps:[step('a','Kick-off'),step('b','RFQ','eng',['a'],'Automated supplier request'),step('x','AI Assessment','eng',['b'])]}
 }
};
test('standalone HTML contains both diagrams and embedded metadata, with no external assets',()=>{
 const html=buildInteractiveHtml(project);
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/data-panel="today"/);
 assert.match(html,/data-panel="tomorrow"/);
 assert.match(html,/data-flow="today"/);
 assert.match(html,/data-flow="tomorrow"/);
 assert.match(html,/Zoom in/);
 assert.match(html,/application\/json/);
 assert.doesNotMatch(html,/<script>alert\("x"\)<\/script>/);
 assert.match(html,/\\u003cscript/);
 assert.doesNotMatch(html,/<script[^>]+src=/);
 assert.doesNotMatch(html,/<link[^>]+href=/);
});
test('SVG reflects independent dotted and solid line settings',()=>{
 assert.doesNotMatch(diagramSvg(project,'today'),/stroke-dasharray/);
 assert.match(diagramSvg(project,'tomorrow'),/stroke-dasharray="2 9"/);
});
test('comparison identifies added removed changed and moved steps',()=>{
 const results=compareFlows(project);
 assert.deepEqual(results.added.map(s=>s.id),['x']);
 assert.deepEqual(results.removed.map(s=>s.id),['c']);
 assert.equal(results.counts.updated,1);
 assert.equal(results.counts.moved,1);
 assert.equal(results.counts.dependencies,0);
});
