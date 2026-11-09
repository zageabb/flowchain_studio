import test from 'node:test';
import assert from 'node:assert/strict';
import {diagramSvg,buildInteractiveHtml} from '../src/interactive-export.js';
import {presentationSummary} from '../src/presentation-summary.js';
import {timelineGeometry} from '../src/timeline.js';
import {expandedTimingSteps} from '../src/subprocess.js';
const steps=[
 {id:'a',name:'Start',departmentId:'ops',dependsOn:[],durationHours:2,waitHours:0},
 {id:'b',name:'Validate',departmentId:'ops',dependsOn:['a'],durationHours:3,waitHours:1},
 {id:'c',name:'Correct',departmentId:'ops',dependsOn:['b'],durationHours:4,waitHours:0},
 {id:'d',name:'Finish',departmentId:'ops',dependsOn:['c'],durationHours:1,waitHours:0}
];
const group={id:'loop',name:'Repeat supplier check',stepIds:['b','c'],repeats:3,collapsed:true};
const project={title:'Repeat',subtitle:'',departments:[{id:'ops',name:'Operations'}],
 flows:{today:{steps,groups:[group],lineStyle:'solid'},tomorrow:{steps,groups:[],lineStyle:'dotted'}}};
test('collapsed HTML diagram renders one unnumbered loop and preserves other step numbers',()=>{
 const svg=diagramSvg(project,'today');
 assert.match(svg,/data-id="group:loop"/);
 assert.match(svg,/×3/);
 assert.match(svg,/class="node repeat-zigzag"/);
 assert.match(svg,/<path d="M [^"]+" stroke="#d91a48"/);
 assert.doesNotMatch(svg,/<rect[^>]*fill="#334e72"/);
 assert.doesNotMatch(svg,/data-id="b"/);
 assert.doesNotMatch(svg,/data-id="c"/);
 assert.match(svg,/data-id="d"/);
 assert.match(svg,/>4<\/text>/);
});
test('expanded HTML still includes original members in its searchable step list',()=>{
 const html=buildInteractiveHtml(project,null,'1.12.0');
 const payload=JSON.parse(html.match(/<script type="application\/json" id="flow-data">([^<]+)<\/script>/)[1]);
 assert.equal(payload.flows.today.steps.length,4);
 assert.equal(payload.flows.today.groups[0].repeats,3);
 assert.match(html,/function lookupGroup/);
 assert.match(html,/group:loop/);
 const timing=JSON.parse(html.match(/<script type="application\/json" id="flow-times">([^<]+)<\/script>/)[1]);
 assert.equal(timing.today.hours,2+3*(3+1+4)+1);
});
test('PowerPoint process summary uses repeated elapsed hours without inflating source step count',()=>{
 const summary=presentationSummary(project);
 assert.equal(summary.metrics.today.hours,27);
 assert.equal(summary.metrics.today.steps,4);
 assert.equal(summary.metrics.tomorrow.hours,11);
});
test('repeat block has one unnumbered timeline row with serial repeated duration',()=>{
 const t=timelineGeometry(expandedTimingSteps(steps,[group]));
 const row=t.rows.find(r=>r.isGroup);
 assert.ok(row);
 assert.equal(row.number,t.rows.indexOf(row)+1); // internal only, display is unnumbered
 assert.equal(row.repeats,3);
 assert.equal(row.duration,24);
});

test('square-wave repeat connector has full-height vertical runs and stepped horizontal joins',async()=>{
 const {repeatSquareWavePoints,repeatSquareWavePath,repeatWaveGeometry}=await import('../src/repeat-zigzag.js');
 const pts=repeatSquareWavePoints(200,100,320,3,{width:90});
 const tall=pts.slice(1).filter((p,i)=>p.x===pts[i].x&&Math.abs(p.y-pts[i].y)===220);
 assert.equal(tall.length,3);
 assert.equal(pts[0].x,155);
 assert.equal(pts.at(-1).x,245);
 assert.equal(pts.at(-1).y,320);
 assert.match(repeatSquareWavePath(200,100,320,3),/^M /);
 assert.ok(pts.some((p,i)=>i>0&&p.y===pts[i-1].y&&p.x!==pts[i-1].x));
 assert.ok(repeatSquareWavePoints(200,100,320,1000).length<30);
 const flow=[{id:'a',dependsOn:[]},{id:'g',isGroup:true,dependsOn:['a'],repeats:3},{id:'b',dependsOn:['g']}];
 const positions=new Map([['a',{x:100,y:100}],['g',{x:200,y:100}],['b',{x:300,y:320}]]);
 const geom=repeatWaveGeometry(flow,positions,flow[1]);
 assert.equal(geom.startY,100);
 assert.equal(geom.endY,320);
 assert.equal(geom.links.length,2);
});
test('dotted flow has matching dotted square wave, and solid flow has no dashed strokes',()=>{
 const dotted=structuredClone(project);
 dotted.flows.today.lineStyle='dotted';
 const dottedSvg=diagramSvg(dotted,'today');
 const solidSvg=diagramSvg(project,'today');
 assert.match(dottedSvg,/stroke-dasharray="2 9"/);
 assert.match(dottedSvg,/<path[^>]*stroke-dasharray="2 9"/);
 assert.doesNotMatch(solidSvg,/stroke-dasharray/);
});
