export const uid=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
export const sample={
 version:1,title:"Supply Chain Data Flow",subtitle:"Tender to Delivery",
 departments:[
 {id:"tender",name:"Tender Management"},{id:"scm",name:"SCM Management"},
 {id:"eng",name:"Engineering Management"},{id:"project",name:"Project Management"},
 {id:"site",name:"Site Management"}],
 steps:[
 ["Tender Kick-off","tender"],["Tender Sourcing Strategy","scm"],["Tender Sourcing Plan","scm"],
 ["Technical Requirements","eng"],["Supplier RFQ","scm"],["Technical Offer Validation","eng"],
 ["Supplier Offer Evaluation","scm"],["FCM Preparation","scm"],["Risk Review","project"],
 ["Supplier Offer Update","scm"],["Project Award","project"],["Project Hand-over","project"],
 ["Supplier Critical Orders","scm"],["Technical Specifications","eng"],["Technical Clarifications","eng"],
 ["Main Equipment Orders","scm"],["Technical Documentation","eng"],["Orders Expediting","scm"],
 ["Transport Release","project"],["Material Reception at Site","site"],["Project Delivered","site"]
 ].map(([name,departmentId],i)=>({id:"step-"+(i+1),name,departmentId,description:""}))
};
export function validateDocument(doc){
 if(!doc||!Array.isArray(doc.departments)||!Array.isArray(doc.steps)||!doc.departments.length)throw Error("JSON must contain nonempty departments and steps arrays.");
 if(doc.departments.some(d=>!d.id||typeof d.name!=="string"))throw Error("Invalid departments.");
 if(new Set(doc.departments.map(d=>d.id)).size!==doc.departments.length)throw Error("Duplicate department IDs.");
 if(doc.steps.some(s=>!s.id||typeof s.name!=="string"||!doc.departments.some(d=>d.id===s.departmentId)))throw Error("Invalid steps or missing department.");
 if(new Set(doc.steps.map(s=>s.id)).size!==doc.steps.length)throw Error("Duplicate step IDs.");
 return {version:1,title:String(doc.title||"Untitled Flow"),subtitle:String(doc.subtitle||""),departments:doc.departments.map(d=>({id:String(d.id),name:d.name})),steps:doc.steps.map(s=>({id:String(s.id),name:s.name,departmentId:s.departmentId,description:String(s.description||"")}))};
}

export function validateProject(data){
 if(data?.flows){
  const today=validateDocument({...data,steps:data.flows.today?.steps||[]});
  const tomorrow=validateDocument({...data,steps:data.flows.tomorrow?.steps||[]});
  return {version:2,title:today.title,subtitle:today.subtitle,departments:today.departments,flows:{today:{steps:today.steps},tomorrow:{steps:tomorrow.steps}}};
 }
 const old=validateDocument(data);
 return {version:2,title:old.title,subtitle:old.subtitle,departments:old.departments,flows:{today:{steps:old.steps},tomorrow:{steps:structuredClone(old.steps)}}};
}
export const sampleProject=validateProject(sample);
