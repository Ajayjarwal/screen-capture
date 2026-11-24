const ready=new Promise((resolve,reject)=>{const r=indexedDB.open('pyq-capture',1);r.onupgradeneeded=()=>{r.result.createObjectStore('captures',{keyPath:'id'});r.result.createObjectStore('tiles',{keyPath:['captureId','index']});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
async function transaction(store,mode,operation){const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);const r=operation(tx.objectStore(store));let result;r.onsuccess=()=>{result=r.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Storage operation interrupted.'));});}
export const saveCapture=r=>transaction('captures','readwrite',s=>s.put(r));
export const getCapture=id=>transaction('captures','readonly',s=>s.get(id));
export const saveTile=r=>transaction('tiles','readwrite',s=>s.put(r));
export const getTile=(id,index)=>transaction('tiles','readonly',s=>s.get([id,index]));
export const listCaptures=()=>transaction('captures','readonly',s=>s.getAll());
export async function deleteCapture(id){await transaction('tiles','readwrite',s=>s.delete(IDBKeyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER])));await transaction('captures','readwrite',s=>s.delete(id));}
