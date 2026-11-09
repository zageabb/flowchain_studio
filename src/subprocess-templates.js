// Browser-local reusable process fragments. IDs are always regenerated on insert.
export const TEMPLATE_KEY='flowchain-subprocess-templates-v1';
export function readTemplates(storage=localStorage){
 try{const values=JSON.parse(storage.getItem(TEMPLATE_KEY)||'[]');return Array.isArray(values)?values.filter(t=>t&&t.name&&Array.isArray(t.steps)).slice(0,40):[]}catch{return []}
}
export function saveTemplate(storage,name,steps,group){
 const set=new Set(group.stepIds),members=steps.filter(s=>set.has(s.id));
 if(!members.length)throw Error('Subprocess has no steps.');
 const template={name:String(name||group.name).trim()||'Subprocess',steps:structuredClone(members),repeats:group.repeats};
 const list=readTemplates(storage).filter(t=>t.name!==template.name);
 list.unshift(template);
 storage.setItem(TEMPLATE_KEY,JSON.stringify(list.slice(0,40)));
 return list.slice(0,40);
}
export function insertTemplate(template,steps,departments,idFactory){
 if(!template?.steps?.length)throw Error('Choose a saved subprocess template.');
 const map=new Map(template.steps.map(s=>[s.id,idFactory()]));
 const existing=new Set(departments.map(d=>d.id));
 const previous=steps.at(-1);
 const copied=template.steps.map(s=>({
  ...structuredClone(s),id:map.get(s.id),
  departmentId:existing.has(s.departmentId)?s.departmentId:departments[0].id,
  dependsOn:(s.dependsOn||[]).filter(id=>map.has(id)).map(id=>map.get(id))
 }));
 // One entry edge from the existing process into each root of the template.
 if(previous)for(const step of copied)if(!step.dependsOn.length)step.dependsOn=[previous.id];
 const group={id:idFactory(),name:template.name,repeats:template.repeats||1,
  collapsed:true,stepIds:copied.map(s=>s.id)};
 return {steps:[...steps,...copied],group};
}
