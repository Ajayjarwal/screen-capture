import {pageAgent} from './page-agent.js';
import {saveCapture,getCapture,saveTile,getTile,listCaptures,deleteCapture} from './store.js';
import {ScreenshotPDF} from './pdf.js';
import {planPages} from './pagination.js';
const $=id=>document.getElementById(id),sleep=ms=>new Promise(r=>setTimeout(r,ms));
let record,stopped=false,busy=false,observer,urls=[];
const params=new URLSearchParams(location.search),jobId=params.get('job');
const warn=text=>{$('warning').hidden=!text;$('warning').textContent=text;};
function stats(){$('sectionCount').textContent=record.tiles.length;$('dimensions').textContent=`${record.width.toLocaleString()} × ${record.height.toLocaleString()}`;}
function clearPreview(){observer?.disconnect();urls.forEach(URL.revokeObjectURL);urls=[];$('preview').replaceChildren();}
async function refreshHistory(){const items=(await listCaptures()).filter(r=>r.tiles.length).sort((a,b)=>b.created-a.created);$('history').replaceChildren(new Option('Choose a capture…',''));for(const r of items)$('history').add(new Option(`${new Date(r.created).toLocaleString()} · ${r.title}`,r.id));$('history').value=record?.id||'';}
async function showCapture(r){
  record=r;clearPreview();stats();$('sourceTitle').textContent=r.title;$('heading').textContent=r.status==='complete'?'Ready for revision.':'Partial capture saved.';$('message').textContent=r.status==='complete'?'Review the preview, then save your question bank.':'Captured sections are available. Start another capture to try again.';$('badge').textContent=r.status==='complete'?'Captured locally':'Partial capture';$('progress').hidden=true;$('stop').hidden=true;$('resume').hidden=true;$('exports').hidden=!r.tiles.length;warn(r.warning||'');
  observer=new IntersectionObserver(async entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);try{const tile=await getTile(r.id,Number(entry.target.dataset.index));if(!entry.target.isConnected)return;const url=URL.createObjectURL(tile.blob);urls.push(url);entry.target.src=url;}catch(e){warn('Could not read a saved section: '+e.message);}}},{root:$('preview'),rootMargin:'1200px'});
  for(const tile of r.tiles){const img=document.createElement('img');img.className='strip';img.width=r.width;img.height=tile.height;img.alt=`Captured section ${tile.index+1}`;img.dataset.index=tile.index;img.style.aspectRatio=`${r.width} / ${tile.height}`;$('preview').append(img);observer.observe(img);}
  if(!r.tiles.length)$('preview').textContent='No sections captured. Open the source page and start again.';await refreshHistory();
}
async function capture(job){
  let initialized=false,errorText='',complete=false,bytes=0,scale=0,geometry,lastCaptureAt=0,shots=0;
  const call=async(command,args={})=>{const [r]=await chrome.scripting.executeScript({target:{tabId:job.tabId},func:pageAgent,args:[command,{...args,token:jobId}]});if(!r?.result)throw new Error('The source page did not respond. Reload it and try again.');return r.result;};
  const cancelled=async()=>stopped||(await chrome.storage.session.get('cancel:'+jobId))['cancel:'+jobId];
  const ensureSource=async()=>{let waited=0;while(true){if(await cancelled())throw new Error('Stopped by you.');const tab=await chrome.tabs.get(job.tabId),win=await chrome.windows.get(job.windowId);if(tab.active&&win.focused){$('resume').hidden=true;return;}$('message').textContent='Paused. Return to the question tab and keep its Chrome window in front.';$('resume').hidden=false;if(initialized)await call('inspect');await sleep(1000);if(++waited>120)throw new Error('Paused for two minutes. Captured sections were kept.');}};
  $('stop').hidden=false;$('stop').onclick=()=>{stopped=true;$('message').textContent='Stopping after this section…';};$('resume').onclick=async()=>{await chrome.windows.update(job.windowId,{focused:true});await chrome.tabs.update(job.tabId,{active:true});};
  try{
    await ensureSource();let info=await call('begin',job.options);initialized=true;
    record={id:jobId,title:info.title,url:info.url,created:Date.now(),status:'capturing',width:0,height:0,tiles:[],warning:''};await saveCapture(record);geometry=info;let covered=0,stable=0;
    while(record.tiles.length<600&&covered<500000){
      await ensureSource();if(await cancelled())throw new Error('Stopped by you.');
      if(info.viewport.width!==geometry.viewport.width||info.viewport.height!==geometry.viewport.height||Math.abs(info.box.width-geometry.box.width)>1||Math.abs(info.box.height-geometry.box.height)>1)throw new Error('Window size or zoom changed. Start again at a fixed size.');
      const skip=Math.max(0,covered-info.position);if(info.position>covered+1)throw new Error('The page jumped during capture. Captured sections were kept.');const cssHeight=Math.min(info.box.height-skip,info.total-covered);
      if(cssHeight>.5){
        // Assemble one full-width strip from all horizontal spreadsheet views.
        // Ordinary webpages still need just one screenshot per strip.
        const fullWidth=info.totalWidth||info.box.width;
        let coveredX=0,canvas=null,newEnd=0,height=0;
        try{
          while(coveredX<fullWidth-.5){
            const waitMs=lastCaptureAt?Math.max(0,550-(performance.now()-lastCaptureAt)):0;if(waitMs>0)await call('pace',{waitMs});await ensureSource();
            const before=await call('inspect');
            if(Math.abs(before.position-info.position)>1||Math.abs((before.positionX||0)-(info.positionX||0))>1)throw new Error('The page was scrolled during capture. Start again and leave it untouched.');
            if(before.viewport.width!==geometry.viewport.width||before.viewport.height!==geometry.viewport.height||Math.abs(before.box.x-info.box.x)>1||Math.abs(before.box.y-info.box.y)>1||Math.abs(before.box.width-geometry.box.width)>1||Math.abs(before.box.height-geometry.box.height)>1||Math.abs((before.totalWidth||before.box.width)-fullWidth)>1)throw new Error('The sheet layout or window size changed. Start again.');
            if(++shots>1500)throw new Error('The 1,500-screenshot safety limit was reached. Export this part before continuing.');
            lastCaptureAt=performance.now();const data=await chrome.tabs.captureVisibleTab(job.windowId,{format:'png'});
            const tab=await chrome.tabs.get(job.tabId),win=await chrome.windows.get(job.windowId);if(!tab.active||!win.focused)continue;
            const after=await call('inspect');
            if(after.viewport.width!==info.viewport.width||after.viewport.height!==info.viewport.height||Math.abs(after.position-info.position)>1||Math.abs((after.positionX||0)-(info.positionX||0))>1)throw new Error('The source page moved during the screenshot. Start again.');
            const bitmap=await createImageBitmap(await(await fetch(data)).blob()),sx=bitmap.width/info.viewport.width,sy=bitmap.height/info.viewport.height;
            if(Math.abs(sx-sy)>.02){bitmap.close();throw new Error('Screenshot size differs from the page. Turn off device emulation and use a normal Chrome window.');}
            if(!scale){scale=sx;record.width=Math.round(fullWidth*scale);}if(Math.abs(sx-scale)>.01){bitmap.close();throw new Error('Display scale changed. Please try again.');}
            if(!canvas){
              newEnd=Math.round((covered+cssHeight)*scale);height=newEnd-record.height;
              if(record.width>32760||record.width*height>24000000){bitmap.close();throw new Error('This sheet is too wide at the current zoom. Zoom out before capture.');}
              canvas=document.createElement('canvas');canvas.width=record.width;canvas.height=height;
            }
            const skipX=coveredX-(info.positionX||0),cssWidth=Math.min(info.box.width-skipX,fullWidth-coveredX);
            if(skipX<-.5||cssWidth<.5){bitmap.close();throw new Error('The sheet stopped scrolling sideways before its last column.');}
            const x=Math.round(coveredX*scale),endX=Math.round((coveredX+cssWidth)*scale);
            canvas.getContext('2d').drawImage(bitmap,(info.box.x+skipX)*sx,(info.box.y+skip)*sy,cssWidth*sx,cssHeight*sy,x,0,endX-x,height);bitmap.close();coveredX+=cssWidth;
            if(coveredX<fullWidth-.5){
              const next=await call('move',{y:info.position,x:Math.max(0,coveredX-32)});
              if(Math.abs(next.position-info.position)>1)throw new Error('The sheet moved vertically while capturing columns.');info=next;
            }
          }
        }catch(e){if(canvas){canvas.width=0;canvas.height=0;}throw e;}
        const blob=await canvasBlob(canvas,'image/png');canvas.width=0;canvas.height=0;if(bytes+blob.size>300*1024*1024)throw new Error('The 300 MB safety limit was reached. Export this part before continuing.');
        const index=record.tiles.length;await saveTile({captureId:record.id,index,blob});bytes+=blob.size;record.tiles.push({index,y:record.height,height});record.height=newEnd;covered+=cssHeight;await saveCapture(record);stats();
        $('progress').value=Math.min(1,covered/info.total);$('progress').max=1;$('message').textContent=`${record.tiles.length} sections · ${Math.round(covered).toLocaleString()} of ${Math.round(info.total).toLocaleString()} page pixels`;document.title=`${Math.round(covered/info.total*100)}% · PYQ Capture`;
      }
      if(job.options.mode==='visible'){complete=true;break;}
      if(covered>=info.total-1){if(++stable>=3){complete=true;break;}info=await call('settle');continue;}
      stable=0;const next=await call('move',{y:Math.max(0,covered-32)});if(next.position+next.box.height<=covered+.5&&next.total>covered+1)throw new Error('The page stopped scrolling before the end. Try a specific scrolling panel.');info=next;
    }
    if(!complete)errorText='Capture safety limit reached (600 sections or 500,000 page pixels). Export this part before continuing.';
    if(geometry.horizontalOverflow&&!geometry.sheet)errorText+=(errorText?' ':'')+'Content extends beyond the visible width. Only visible columns were captured; zoom out for wide pages.';
  }catch(e){errorText=e.message;}
  finally{
    if(initialized)await call('restore').catch(()=>{});const {activeCapture}=await chrome.storage.session.get('activeCapture');if(activeCapture?.id===jobId)await chrome.storage.session.remove('activeCapture');await chrome.storage.session.remove(['job:'+jobId,'cancel:'+jobId]);
    if(record){record.status=complete?'complete':'partial';record.warning=errorText;await saveCapture(record);history.replaceState(null,'','?capture='+record.id);await showCapture(record);}else{$('heading').textContent='Capture could not start.';$('message').textContent=errorText;$('progress').hidden=true;$('stop').hidden=true;warn('Local HTML needs “Allow access to file URLs” in the extension settings. Browser internal pages and embedded PDF viewers are not supported.');}
    document.title='PYQ Capture — Preview & export';const self=await chrome.tabs.getCurrent();await chrome.tabs.update(self.id,{active:true}).catch(()=>{});
  }
}
function canvasBlob(canvas,type,quality=.96){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image too large for the browser. Use PDF or smaller image parts.')),type,quality));}
function crop(){const left=Number($('left').value),right=Number($('right').value);if(!Number.isInteger(left)||!Number.isInteger(right)||left<0||right<0||left+right>=record.width-20)throw new Error('Keep at least 20 pixels after trimming.');return {left,width:record.width-left-right};}
async function region(y,height,maxWidth=Infinity,keepRows=false){
  const area=crop(),factor=Math.min(1,maxWidth/area.width),vertical=keepRows?1:factor,canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(area.width*factor));canvas.height=Math.max(1,Math.round(height*vertical));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const tile of record.tiles){const start=Math.max(y,tile.y),end=Math.min(y+height,tile.y+tile.height);if(end<=start)continue;const item=await getTile(record.id,tile.index);if(!item)throw new Error('A saved section is missing. Capture the page again.');const image=await createImageBitmap(item.blob),a=Math.round((start-y)*vertical),b=Math.round((end-y)*vertical);ctx.drawImage(image,area.left,start-tile.y,area.width,end-start,0,a,canvas.width,b-a);image.close();}return canvas;
}
function baseName(){return (record.title||'PYQ').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100)+'_'+new Date(record.created).toISOString().slice(0,10);}
async function download(blob,name){const url=URL.createObjectURL(blob);try{await chrome.downloads.download({url,filename:name,saveAs:true});}finally{setTimeout(()=>URL.revokeObjectURL(url),120000);}}
async function task(action){if(busy)return;busy=true;document.querySelectorAll('#exports button,#exports select,#exports input').forEach(el=>el.disabled=true);try{await action();}catch(e){$('exportStatus').textContent=e.message;}finally{busy=false;document.querySelectorAll('#exports button,#exports select,#exports input').forEach(el=>el.disabled=false);}}
async function jpegImage(y,height,maxWidth=2400){const canvas=await region(y,height,maxWidth),blob=await canvasBlob(canvas,'image/jpeg'),image={width:canvas.width,height:canvas.height,bytes:new Uint8Array(await blob.arrayBuffer())};canvas.width=0;canvas.height=0;return image;}
async function pagePlan(pageHeight){return planPages({height:record.height,pageHeight,onProgress:i=>{$('exportStatus').textContent=`Finding a clear page break · page ${i}…`;},readRows:async(y,height)=>{const canvas=await region(y,height,1600,true),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);canvas.width=0;canvas.height=0;return pixels;}});}
$('pdf').onclick=()=>task(async()=>{
  const area=crop(),pdf=new ScreenshotPDF();let fallbacks=0;
  if($('pdfMode').value==='tall'){
    const physicalHeight=595.28*record.height/area.width,unit=Math.max(1,Math.ceil(physicalHeight/14000)),width=595.28/unit,height=physicalHeight/unit,images=[];
    const chunk=Math.max(1,Math.floor(Math.min(8000,16000000/Math.min(area.width,2400))*Math.max(1,area.width/2400)));
    for(let y=0;y<record.height;y+=chunk){const h=Math.min(chunk,record.height-y);$('exportStatus').textContent=`Preparing tall PDF · ${Math.round(y/record.height*100)}%`;const img=await jpegImage(y,h);images.push({...img,x:0,y:(record.height-y-h)*width/area.width,drawWidth:width,drawHeight:h*width/area.width});}pdf.addPage(width,height,images,unit);
  }else{
    const width=595.28,height=841.89,margin=24,drawWidth=width-margin*2,pageHeight=Math.max(1,Math.floor((height-margin*2)*area.width/drawWidth)),plan=await pagePlan(pageHeight);fallbacks=plan.fallbacks;
    for(let i=0;i<plan.pages.length;i++){const {y,height:h}=plan.pages[i];$('exportStatus').textContent=`Preparing PDF page ${i+1} of ${plan.pages.length}…`;const img=await jpegImage(y,h),dh=h*drawWidth/area.width;pdf.addPage(width,height,[{...img,x:margin,y:height-margin-dh,drawWidth,drawHeight:dh}]);}
  }
  await download(pdf.finish(),baseName()+'.pdf');$('exportStatus').textContent=fallbacks?'PDF ready. Some boundaries had no clear space, such as a tall image. Use Single tall page to avoid all page breaks.':'PDF ready. Choose a save location in Chrome.';
});
for(const format of ['png','jpeg'])$(format).onclick=()=>task(async()=>{const area=crop();if(area.width>16000)throw new Error('Image too wide. Trim the sides or use PDF.');const partHeight=Math.max(1,Math.floor(Math.min(12000,24000000/area.width))),count=Math.ceil(record.height/partHeight);for(let y=0,i=1;y<record.height;y+=partHeight,i++){const canvas=await region(y,Math.min(partHeight,record.height-y));$('exportStatus').textContent=`Preparing image ${i} of ${count}…`;const blob=await canvasBlob(canvas,'image/'+format);canvas.width=0;canvas.height=0;await download(blob,baseName()+(count>1?`_part-${String(i).padStart(3,'0')}`:'')+(format==='jpeg'?'.jpg':'.png'));}$('exportStatus').textContent=count>1?`${count} numbered image parts prepared. Approve each save dialog.`:'Image ready. Choose a save location.';});
$('copy').onclick=()=>task(async()=>{const area=crop();if(record.height>16000||area.width>16000||record.height*area.width>24000000)throw new Error('This capture exceeds the clipboard limit. Save PDF or image parts instead.');const promise=region(0,record.height).then(async c=>{const b=await canvasBlob(c,'image/png');c.width=0;return b;});await navigator.clipboard.write([new ClipboardItem({'image/png':promise})]);$('exportStatus').textContent='Copied to clipboard.';});
$('print').onclick=()=>task(async()=>{const area=crop();if(Math.min(area.width,1600)*record.height*Math.min(1,1600/area.width)>80000000)throw new Error('Save an A4 PDF and print it for this large capture.');const container=$('printArea');container.replaceChildren();const {pages,fallbacks}=await pagePlan(Math.floor(area.width*277/190));for(const {y,height}of pages){$('exportStatus').textContent='Preparing print pages…';container.append(await region(y,height,1600));}if(fallbacks)warn('Some print boundaries had no clear space. Use Single tall page PDF to avoid all page breaks.');window.print();$('exportStatus').textContent='Print preview opened.';});
window.addEventListener('afterprint',()=>{$('printArea').replaceChildren();});
$('history').onchange=async()=>{if($('history').value){const r=await getCapture($('history').value);history.replaceState(null,'','?capture='+r.id);$('left').value=0;$('right').value=0;await showCapture(r);}};
$('delete').onclick=()=>task(async()=>{if(!confirm('Delete this local capture? Exported files will stay on your computer.'))return;await deleteCapture(record.id);clearPreview();record=null;$('exports').hidden=true;history.replaceState(null,'',location.pathname);$('heading').textContent='Capture deleted.';$('message').textContent='Open a question page and click the extension to capture again.';warn('');$('sectionCount').textContent='0';$('dimensions').textContent='—';const remaining=(await listCaptures()).filter(r=>r.tiles.length).sort((a,b)=>b.created-a.created);if(remaining.length)await showCapture(remaining[0]);});
if(jobId){const job=(await chrome.storage.session.get('job:'+jobId))['job:'+jobId];if(job)await capture(job);else{const r=await getCapture(jobId);if(r)await showCapture(r);else{$('heading').textContent='Capture session expired.';$('message').textContent='Start again from the extension popup.';$('progress').hidden=true;}}}
else{const id=params.get('capture'),items=await listCaptures(),r=id?await getCapture(id):items.sort((a,b)=>b.created-a.created)[0];if(r)await showCapture(r);else{$('heading').textContent='Capture a question page.';$('message').textContent='Open your questions, then click the PYQ Capture extension.';$('progress').hidden=true;}}
