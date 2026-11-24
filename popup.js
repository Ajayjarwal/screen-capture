const $=id=>document.getElementById(id);
$('saved').onclick=async()=>{await chrome.tabs.create({url:chrome.runtime.getURL('editor.html')});window.close();};
const saved=(await chrome.storage.local.get('options')).options;
if(saved){$('mode').value=saved.mode;$('delay').value=String(saved.delay);$('hide').checked=saved.hide;$('selector').value=saved.selector||'';}
const update=()=>{$('selectorWrap').hidden=$('mode').value!=='selector';$('capture').textContent=$('mode').value==='visible'?'Capture visible area ↗':'Capture full page ↗';};$('mode').onchange=update;update();
const {activeCapture}=await chrome.storage.session.get('activeCapture');
if(activeCapture&&await chrome.tabs.get(activeCapture.editorId).catch(()=>null)){$('stop').hidden=false;$('capture').disabled=true;$('status').textContent='Capture in progress. Keep the source tab selected.';}
$('stop').onclick=async()=>{await chrome.storage.session.set({['cancel:'+activeCapture.id]:true});$('status').textContent='Stopping after this section…';};
$('capture').onclick=async()=>{
  $('capture').disabled=true;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const options={mode:$('mode').value,delay:Number($('delay').value),hide:$('hide').checked,selector:$('selector').value.trim()};
    if(options.mode==='selector'&&!options.selector)throw new Error('Enter a scrolling panel CSS selector.');
    await chrome.storage.local.set({options});const r=await chrome.runtime.sendMessage({type:'start',tabId:tab.id,options});if(r.error)throw new Error(r.error);window.close();
  }catch(e){$('status').textContent=e.message;$('capture').disabled=false;}
};
