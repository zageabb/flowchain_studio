// Named browser-local snapshots. Export JSON for portable backups.
const STORAGE_KEY='flowchain-snapshots-v1';
export function listSnapshots(){
 try{const items=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(items)?items.filter(v=>v&&typeof v.name==='string'&&v.project):[]}catch{return []}
}
export function saveSnapshot(name,project){
 const clean=String(name||'').trim();
 if(!clean)throw Error('A snapshot name is required.');
 const entries=listSnapshots().filter(x=>x.name!==clean);
 entries.unshift({name:clean,createdAt:new Date().toISOString(),project:structuredClone(project)});
 // Restrict growth; localStorage is not a safe backup destination for arbitrary files.
 localStorage.setItem(STORAGE_KEY,JSON.stringify(entries.slice(0,12)));
 return entries.slice(0,12);
}
export function deleteSnapshot(name){
 const entries=listSnapshots().filter(x=>x.name!==name);
 localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));
 return entries;
}
