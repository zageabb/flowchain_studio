// Export a fully self-contained, read-only interactive HTML process document.
// No React, CDN, network requests, or local server required.
import {graphLayout,graphSegments} from './graph';

const xml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fileName=value=>(value||'flowchain').replace(/[^a-z0-9_-]+/gi,'-');
export function diagramSvg(project,flow){
 const steps=project.flows[flow].steps;
 const g=graphLayout(steps,project.departments,{left:215,top:112,lane:80,gap:125});
 const stripes=project.departments.map((dept,i)=>
  '<rect x="6" y="'+g.laneStarts[i]+'" width="'+(g.width-12)+'" height="'+(g.laneHeights[i]-6)+'" rx="6" fill="'+(i%2?'#e8edf3':'#f2f5f9')+'"/>'+
  '<text x="17" y="'+(g.laneStarts[i]+g.laneHeights[i]/2+4)+'" font-size="13" font-weight="bold" fill="#26364a">'+xml(dept.name)+'</text>').join('');
 const dash=project.flows[flow].lineStyle==='dotted'?' stroke-dasharray="2 9"':'';
 const lines=graphSegments(steps,g.positions).map(s=>'<line x1="'+s.x1+'" y1="'+s.y1+'" x2="'+s.x2+'" y2="'+s.y2+'" stroke="#d91a48" stroke-width="3" stroke-linecap="round"'+dash+'/>').join('');
 const nodes=steps.map((s,i)=>{
  const p=g.positions.get(s.id);
  return '<g class="node" data-flow="'+flow+'" data-id="'+xml(s.id)+'" tabindex="0" role="button" aria-label="'+xml('Step '+(i+1)+': '+s.name)+'">'+
   '<circle cx="'+p.x+'" cy="'+p.y+'" r="17" fill="#d91a48" stroke="#fff" stroke-width="3"/>'+
   '<text x="'+p.x+'" y="'+(p.y+4)+'" text-anchor="middle" font-weight="bold" font-size="12" fill="#fff" pointer-events="none">'+(i+1)+'</text>'+
   '<title>'+xml(s.name)+'</title></g>';
 }).join('');
 return '<svg class="flow-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+g.width+' '+g.height+'" data-width="'+g.width+'" data-height="'+g.height+'" aria-label="'+flow.toUpperCase()+' process diagram">'+
  '<text x="17" y="51" font-size="13" fill="#64748b" font-weight="bold">DEPARTMENT</text>'+
  '<text x="215" y="51" font-size="13" fill="#64748b" font-weight="bold">DEPENDENCY FLOW →</text>'+
  stripes+lines+nodes+'</svg>';
}
export function buildInteractiveHtml(project){
 // JSON is inert inside application/json; escape '<' so it cannot end the script tag.
 const data=JSON.stringify(project).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 const today=diagramSvg(project,'today'),tomorrow=diagramSvg(project,'tomorrow');
 const html=String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FlowChain Studio — Read-only Process Viewer</title>
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#24334b;background:#f2f5f9}
*{box-sizing:border-box}body{margin:0}header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 22px;background:white;border-bottom:1px solid #dce4ed}
h1{font-size:20px;margin:0}header small{color:#738199}button,input{font:inherit;border:1px solid #cbd5e1;border-radius:7px;padding:8px;background:#fff;color:#29384b}button{cursor:pointer}button:focus-visible,.node:focus-visible{outline:3px solid #f19db6}button[aria-pressed=true]{background:#d91a48;color:#fff}button:hover{border-color:#d91a48}main{padding:16px;max-width:1800px;margin:auto}nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.panel{background:white;border:1px solid #dce4ed;border-radius:12px;overflow:hidden;margin-bottom:15px}.panel h2{font-size:15px;margin:0}.panel-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:12px;flex-wrap:wrap}.viewport{overflow:auto;cursor:grab;max-height:66vh;min-height:220px;background:white}.viewport:active{cursor:grabbing}.flow-svg{display:block;width:100%;height:auto;min-width:650px}.node{cursor:pointer}.node:hover circle,.node.selected circle{fill:#8f1238}.details{padding:18px 20px}.details h3{margin:0 0 8px}.details dl{display:grid;grid-template-columns:140px 1fr;gap:10px;margin:10px 0}.details dt{color:#66768d;font-weight:600}.details dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.step-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.step-list section{background:#fff;border:1px solid #dce4ed;border-radius:12px;padding:16px}.step-list button{display:block;border:0;text-align:left;width:100%;padding:8px}.step-list button:hover{background:#fff1f4}.tooltip{position:fixed;z-index:99;pointer-events:none;background:#24334b;color:white;padding:9px 12px;border-radius:8px;max-width:320px;box-shadow:0 5px 15px #0003;font-size:13px}.tooltip[hidden],[hidden]{display:none!important}footer{padding:15px 20px;color:#718096;font-size:12px}@media(max-width:750px){.step-list{grid-template-columns:1fr}main{padding:10px}}
</style></head><body>
<header><div><h1 id="project-title"></h1><small>FlowChain Studio · Interactive read-only export · works offline</small></div>
<div><button id="fit">Fit width</button> <button id="minus" aria-label="Zoom out">−</button> <button id="plus" aria-label="Zoom in">+</button> <span id="zoom-label">100%</span></div></header>
<main><nav><button data-filter="both" aria-pressed="true">Both flows</button><button data-filter="today" aria-pressed="false">TODAY</button><button data-filter="tomorrow" aria-pressed="false">TOMORROW</button> <input id="search" type="search" aria-label="Find a step" placeholder="Find step…"/></nav>
<section class="panel" data-panel="today"><div class="panel-top"><h2>TODAY</h2><button class="collapse" aria-expanded="true">Minimise ▴</button></div><div class="viewport">__TODAY_SVG__</div></section>
<section class="panel" data-panel="tomorrow"><div class="panel-top"><h2>TOMORROW</h2><button class="collapse" aria-expanded="true">Minimise ▴</button></div><div class="viewport">__TOMORROW_SVG__</div></section>
<section class="panel details" id="details" aria-live="polite"><h3>Select a numbered step</h3><p>Hover for a summary or click to inspect its details.</p></section>
<div class="step-list" id="step-lists"></div>
</main><div id="tooltip" class="tooltip" role="tooltip" hidden></div><footer>Data is embedded in this file; no external services or edits to the original process are possible.</footer>
<script type="application/json" id="flow-data">__PROJECT_DATA__</script>
<script>
(function(){
'use strict';
var project=JSON.parse(document.getElementById('flow-data').textContent);
var zoom=1;
var tooltip=document.getElementById('tooltip');
var details=document.getElementById('details');
var search=document.getElementById('search');
var flowList=['today','tomorrow'];
document.getElementById('project-title').textContent=project.title+(project.subtitle?' — '+project.subtitle:'');
function department(id){var found=project.departments.find(function(d){return d.id===id});return found?found.name:'Unknown';}
function lookup(flow,id){return project.flows[flow].steps.find(function(s){return s.id===id});}
function indexOfStep(flow,id){return project.flows[flow].steps.findIndex(function(s){return s.id===id})+1;}
function clear(el){while(el.firstChild)el.removeChild(el.firstChild)}
function element(tag,parent,value){var el=document.createElement(tag);if(value!==undefined)el.textContent=value;parent.appendChild(el);return el}
function detailsFor(flow,id){
 var step=lookup(flow,id);if(!step)return;
 document.querySelectorAll('.node').forEach(function(n){n.classList.toggle('selected',n.dataset.flow===flow&&n.dataset.id===id)});
 clear(details);element('h3',details,flow.toUpperCase()+' · Step '+indexOfStep(flow,id)+' — '+step.name);
 var dl=element('dl',details);
 [['Department',department(step.departmentId)],['Description',step.description||'No description provided'],
 ['Responsible role',step.owner||'Not specified'],['System',step.system||'Not specified'],['Activity type',step.activityType||'manual'],
 ['Work / wait',String(Number(step.durationHours)||0)+'h / '+String(Number(step.waitHours)||0)+'h'],
 ['Inputs',step.inputs||'Not specified'],['Outputs',step.outputs||'Not specified'],
 ['Prerequisites',(step.dependsOn||[]).map(function(pid){var parent=lookup(flow,pid);return parent?indexOfStep(flow,pid)+'. '+parent.name:pid}).join(', ')||'None']]
 .forEach(function(pair){element('dt',dl,pair[0]);element('dd',dl,pair[1])});
 details.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function openNode(node){detailsFor(node.dataset.flow,node.dataset.id)}
document.querySelectorAll('.node').forEach(function(node){
 node.addEventListener('click',function(){openNode(node)});
 node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openNode(node)}});
 node.addEventListener('pointermove',function(e){
  var step=lookup(node.dataset.flow,node.dataset.id);if(!step)return;
  tooltip.textContent=node.dataset.flow.toUpperCase()+' · '+indexOfStep(node.dataset.flow,node.dataset.id)+'. '+step.name+' — '+(step.description||department(step.departmentId));
  tooltip.hidden=false;
  tooltip.style.left=Math.min(e.clientX+15,window.innerWidth-340)+'px';
  tooltip.style.top=Math.max(5,Math.min(e.clientY+15,window.innerHeight-85))+'px';
 });
 node.addEventListener('pointerleave',function(){tooltip.hidden=true});
});
var list=document.getElementById('step-lists');
flowList.forEach(function(flow){var section=element('section',list);section.dataset.list=flow;element('h3',section,flow.toUpperCase()+' step list');
 project.flows[flow].steps.forEach(function(step,i){
  var btn=element('button',section,(i+1)+'. '+step.name+' · '+department(step.departmentId));
  btn.dataset.name=step.name.toLowerCase();btn.addEventListener('click',function(){detailsFor(flow,step.id)});
 });
});
document.querySelectorAll('[data-filter]').forEach(function(btn){btn.addEventListener('click',function(){
 var selected=btn.dataset.filter;
 document.querySelectorAll('[data-filter]').forEach(function(b){b.setAttribute('aria-pressed',String(b===btn))});
 document.querySelectorAll('[data-panel]').forEach(function(panel){panel.hidden=selected!=='both'&&panel.dataset.panel!==selected});
 document.querySelectorAll('[data-list]').forEach(function(part){part.hidden=selected!=='both'&&part.dataset.list!==selected});
})});
document.querySelectorAll('.collapse').forEach(function(btn){btn.addEventListener('click',function(){
 var viewport=btn.closest('.panel').querySelector('.viewport');viewport.hidden=!viewport.hidden;
 btn.textContent=viewport.hidden?'Expand ▾':'Minimise ▴';btn.setAttribute('aria-expanded',String(!viewport.hidden));
})});
search.addEventListener('input',function(){var q=search.value.trim().toLowerCase();document.querySelectorAll('#step-lists button').forEach(function(btn){btn.hidden=!btn.dataset.name.includes(q)})});
function setZoom(next){zoom=Math.max(.25,Math.min(3,next));document.querySelectorAll('.flow-svg').forEach(function(svg){
 svg.style.width=(zoom*100)+'%';svg.style.minWidth='0';
 });document.getElementById('zoom-label').textContent=Math.round(zoom*100)+'%';}
document.getElementById('plus').addEventListener('click',function(){setZoom(zoom*1.25)});
document.getElementById('minus').addEventListener('click',function(){setZoom(zoom/1.25)});
document.getElementById('fit').addEventListener('click',function(){setZoom(1)});
document.querySelectorAll('.viewport').forEach(function(view){
 view.addEventListener('wheel',function(e){if(!e.ctrlKey)return;e.preventDefault();setZoom(zoom*(e.deltaY<0?1.1:0.9))},{passive:false});
 var origin=null;
 view.addEventListener('pointerdown',function(e){if(e.target.closest('.node'))return;origin={x:e.clientX,y:e.clientY,left:view.scrollLeft,top:view.scrollTop};view.setPointerCapture(e.pointerId)});
 view.addEventListener('pointermove',function(e){if(origin){view.scrollLeft=origin.left+origin.x-e.clientX;view.scrollTop=origin.top+origin.y-e.clientY}});
 ['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){view.addEventListener(ev,function(){origin=null})});
});
})();
</script></body></html>`;
 return html.replace('__PROJECT_DATA__',data).replace('__TODAY_SVG__',today).replace('__TOMORROW_SVG__',tomorrow);
}
export function exportInteractiveHtml(project){
 const html=buildInteractiveHtml(project);
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=fileName(project.title)+'-interactive.html';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
