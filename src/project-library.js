// Local-only named project snapshots. No server or account required.
// The active editor document remains in flowchain-v2; snapshots are independent.
export const LIBRARY_KEY='flowchain-project-library-v1';
export const MAX_PROJECTS=40;
export function readLibrary(storage){
 try{
  const data=JSON.parse(storage.getItem(LIBRARY_KEY)||'[]');
  return Array.isArray(data)?data.filter(x=>x&&typeof x.id==='string'&&x.project&&typeof x.name==='string').slice(0,MAX_PROJECTS):[];
 }catch{return []}
}
export function writeLibrary(storage,items){
 if(items.length>MAX_PROJECTS)throw Error('Library limit reached ('+MAX_PROJECTS+' projects).');
 storage.setItem(LIBRARY_KEY,JSON.stringify(items));
 return items;
}
export function createSnapshot(items,project,name,id,now=new Date().toISOString()){
 if(!name||!name.trim())throw Error('Project name is required.');
 if(items.length>=MAX_PROJECTS)throw Error('Library limit reached ('+MAX_PROJECTS+' projects).');
 const snapshot=JSON.parse(JSON.stringify(project));
 const entry={id,name:name.trim(),savedAt:now,project:snapshot};
 return [entry,...items];
}
export function replaceSnapshot(items,id,project,now=new Date().toISOString()){
 if(!items.some(x=>x.id===id))throw Error('Project not found in library.');
 return items.map(x=>x.id===id?{...x,savedAt:now,project:JSON.parse(JSON.stringify(project))}:x);
}
export function deleteSnapshot(items,id){return items.filter(x=>x.id!==id)}
