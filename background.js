let starting=false;
chrome.runtime.onMessage.addListener((m,s,reply)=>{
  if(s.id!==chrome.runtime.id||m.type!=='start')return;
  start(m).then(reply,e=>reply({error:e.message}));return true;
});
async function start({tabId,options}){
  if(starting)throw new Error('A capture is already starting.');starting=true;
  try{
    const {activeCapture}=await chrome.storage.session.get('activeCapture');
    if(activeCapture&&await chrome.tabs.get(activeCapture.editorId).catch(()=>null))throw new Error('A capture is running. Stop it from the popup first.');
    const source=await chrome.tabs.get(tabId);
    if(!/^(https?:|file:)/.test(source.url||'')||/https:\/\/chromewebstore.google.com\//.test(source.url))throw new Error('Open a regular webpage first. Chrome internal pages and the Web Store are restricted.');
    const id=crypto.randomUUID();await chrome.storage.session.set({['job:'+id]:{tabId,windowId:source.windowId,options}});
    const editor=await chrome.tabs.create({url:chrome.runtime.getURL('editor.html')+'?job='+id,active:false,windowId:source.windowId});
    await chrome.storage.session.set({activeCapture:{id,editorId:editor.id,tabId}});return {ok:true};
  }finally{starting=false;}
}
