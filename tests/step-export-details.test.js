import test from 'node:test';
import assert from 'node:assert/strict';
import {stepExportDetails,stepDetailPages,splitFieldText} from '../src/step-export-details.js';
import {buildInteractiveHtml} from '../src/interactive-export.js';
const long='Description '.repeat(130);
const project={
 title:'Example',subtitle:'Supply chain',
 departments:[{id:'scm',name:'SCM'},{id:'eng',name:'Engineering'}],
 flows:{
  today:{lineStyle:'dotted',steps:[
   {id:'a',name:'RFRFQ',departmentId:'scm',dependsOn:[],owner:'Buyer',system:'TAIJU',
    activityType:'manual',durationHours:1.75,waitHours:2.25,inputs:'PR',outputs:'RFRFQ',description:long},
   {id:'b',name:'PO',departmentId:'eng',dependsOn:['a'],durationHours:0,waitHours:0}]},
  tomorrow:{lineStyle:'solid',steps:[]}
 }
};
test('step record includes all expanded fields and the exact hour values',()=>{
 const row=stepExportDetails(project,'today',project.flows.today.steps[0],0);
 const fields=Object.fromEntries(row.fields);
 assert.equal(fields['Responsible role'],'Buyer');
 assert.equal(fields['System / application'],'TAIJU');
 assert.equal(fields['Activity type'],'manual');
 assert.equal(fields['Work hours'],'1.75 h');
 assert.equal(fields['Waiting hours'],'2.25 h');
 assert.equal(fields['Combined work + wait'],'4 h');
 assert.equal(fields['Inputs'],'PR');
 assert.equal(fields['Outputs'],'RFRFQ');
 assert.equal(fields.Description,long);
});
test('missing metadata are labelled, and zero hours are meaningful',()=>{
 const fields=Object.fromEntries(stepExportDetails(project,'today',project.flows.today.steps[1],1).fields);
 assert.equal(fields['Responsible role'],'Not specified');
 assert.equal(fields['Work hours'],'0 h');
 assert.equal(fields['Waiting hours'],'0 h');
 assert.equal(fields.Prerequisites,'1. RFRFQ');
});
test('long descriptions retain every character over multiple PPTX pages',()=>{
 const row=stepExportDetails(project,'today',project.flows.today.steps[0],0);
 const pages=stepDetailPages(row,18);
 assert.ok(pages.length>=2);
 assert.ok(pages.every(p=>p.length<=18));
 const restored=pages.flat().filter(line=>line.label.startsWith('Description')).map(line=>line.value).join('');
 assert.equal(restored,long);
});
test('offline HTML viewer includes separate hours and complete detail labels',()=>{
 const html=buildInteractiveHtml(project);
 for(const label of ['Responsible role','System / application','Activity type','Work hours','Waiting hours','Combined work + wait','Inputs','Outputs','Prerequisites']){
  assert.ok(html.includes(label),'missing '+label);
 }
 assert.match(html,/Work: .*formatHours/);
 assert.match(html,/formatTotal\(step.durationHours,step.waitHours\)/);
});
