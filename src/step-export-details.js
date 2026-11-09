// Shared read-only field formatting for HTML and PowerPoint process exports.
// Work/wait durations are per-step estimates, not elapsed process totals.
export const textValue=value=>value===null||value===undefined||String(value).trim()===''?'Not specified':String(value);
export const durationValue=value=>value===null||value===undefined||String(value).trim()===''?'Not specified':Number.isFinite(Number(value))&&Number(value)>=0?Number(value)+' h':'Not specified';
export function stepExportDetails(project,flow,step,index){
 const flowSteps=project.flows[flow].steps;
 const dept=project.departments.find(d=>d.id===step.departmentId)?.name||'Unknown department';
 const prev=(step.dependsOn||[]).map(id=>{
  const position=flowSteps.findIndex(s=>s.id===id);
  return position>=0?(position+1)+'. '+flowSteps[position].name:'Unknown step ('+id+')';
 }).join(', ')||'None';
 const work=durationValue(step.durationHours);
 const wait=durationValue(step.waitHours);
 const known=work!=='Not specified'&&wait!=='Not specified';
 return {
  number:index+1,
  name:textValue(step.name),
  flow:flow.toUpperCase(),
  fields:[
   ['Department',dept],
   ['Responsible role',textValue(step.owner)],
   ['System / application',textValue(step.system)],
   ['Activity type',textValue(step.activityType)],
   ['Work hours',work],
   ['Waiting hours',wait],
   ['Combined work + wait',known?(Number(step.durationHours)+Number(step.waitHours))+' h':'Not specified'],
   ['Inputs',textValue(step.inputs)],
   ['Outputs',textValue(step.outputs)],
   ['Description',textValue(step.description)],
   ['Prerequisites',prev]
  ]
 };
}

// Presentation appendix rows use finite slices so no description/IO text is silently discarded.
// Each fragment retains a field label and may continue onto subsequent slides.
export function splitFieldText(value,maxChars=94){
 const result=[];
 for(const line of String(value??'').split(/\r?\n/)){
  const parts=line.match(new RegExp('.{1,'+maxChars+'}','g'))||[''];
  result.push(...parts);
 }
 return result.length?result:[''];
}
export function stepDetailPages(details,maxLines=18){
 const entries=[];
 for(const [label,value] of details.fields){
  const lines=splitFieldText(value);
  lines.forEach((text,i)=>entries.push({label:i===0?label:label+' (cont.)',value:text}));
 }
 const pages=[];
 for(let i=0;i<entries.length;i+=maxLines)pages.push(entries.slice(i,i+maxLines));
 return pages.length?pages:[[]];
}
