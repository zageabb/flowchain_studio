// Dependency-aware timeline geometry used in React and the offline HTML export.
import {processMetrics} from './metrics';

export function timelineGeometry(steps,{labelWidth=205,pixelsPerHour=3,minWidth=950,rowHeight=32,top=54}={}){
 const m=processMetrics(steps);
 const scale=m.hours>0?Math.min(14,Math.max(.65,(minWidth-labelWidth-70)/m.hours)):1;
 const width=Math.max(minWidth,labelWidth+m.hours*scale+70);
 const rows=steps.map((s,i)=>{
  const start=m.starts.get(s.id)||0,finish=m.finish.get(s.id)||0;
  const duration=Math.max(0,finish-start);
  return {id:s.id,name:s.name,number:s.originalNumber||i+1,isGroup:!!s.isGroup,repeats:s.repeats||1,start,finish,duration,latestStart:m.latestStarts.get(s.id)||0,
   latestFinish:m.latestFinish.get(s.id)||0,float:m.floatHours.get(s.id)||0,critical:m.criticalSteps.includes(s.id),
   x:labelWidth+start*scale,w:Math.max(duration*scale,2),y:top+i*rowHeight};
 });
 return {metrics:m,rows,scale,labelWidth,rowHeight,top,width,height:top+steps.length*rowHeight+30};
}
const escapeSvg=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function timelineSvg(steps,flow,opts={}){
 const layout=timelineGeometry(steps,opts),m=layout.metrics;
 const {rows,width,height,labelWidth,rowHeight,top,scale}=layout;
 const ticks=5;
 let grid='';
 for(let i=0;i<=ticks;i++){
  const hours=m.hours*i/ticks,x=labelWidth+hours*scale;
  grid+='<line x1="'+x+'" y1="'+(top-20)+'" x2="'+x+'" y2="'+(height-16)+'" stroke="#dbe3ed"/>'+
        '<text x="'+x+'" y="'+(top-28)+'" text-anchor="middle" fill="#748196" font-size="11">'+Number(hours.toFixed(2))+' h</text>';
 }
 const bars=rows.map(r=>{
  const color=r.critical?'#d91a48':'#7f95ab';
  const label=r.isGroup?'↻ ×'+r.repeats+' '+r.name:r.number+'. '+r.name;
  return '<g class="timeline-step" role="button" tabindex="0" data-flow="'+escapeSvg(flow)+'" data-id="'+escapeSvg(r.id)+'" aria-label="'+escapeSvg(label)+'">'+
   '<text x="10" y="'+(r.y+14)+'" fill="#28384b" font-size="11">'+escapeSvg(label.length>29?label.slice(0,28)+'…':label)+'</text>'+
   '<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="19" rx="4" fill="'+color+'"/>'+
   '<title>'+escapeSvg(label+' · earliest '+r.start.toFixed(2)+'h to '+r.finish.toFixed(2)+'h · float '+r.float.toFixed(2)+'h')+'</title></g>';
 }).join('');
 return '<svg class="timeline-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" width="'+width+'" height="'+height+'" role="img" aria-label="'+escapeSvg(flow.toUpperCase())+' estimated process timeline">'+grid+bars+'</svg>';
}
