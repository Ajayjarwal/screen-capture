export async function pageAgent(command,options={}){
  const key='__pyqCaptureV1',sleep=ms=>new Promise(r=>setTimeout(r,ms));let state=globalThis[key];
  if(command==='begin'){
    if(state)state.restore();
    let doc=document,view=window,frame=null;
    const published=location.hostname==='docs.google.com'&&/\/spreadsheets\/.*\/pubhtml(?:\/sheet)?$/.test(location.pathname);
    const sheet=options.mode==='sheet'||(options.mode==='auto'&&published);
    if(sheet){
      // Published Sheets embeds its grid in a same-origin iframe. No permanent
      // host access or injection into unrelated frames is needed.
      for(let attempt=0;attempt<40;attempt++){
        const frames=[...document.querySelectorAll('#sheets-viewport iframe')];
        frame=frames.find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;})||null;
        if(!frame&&document.querySelector('#sheets-viewport table.waffle'))break;
        if(frame){
          try{if(frame.contentDocument?.querySelector('#sheets-viewport table.waffle')){doc=frame.contentDocument;view=doc.defaultView;break;}}
          catch{throw new Error('This embedded sheet is on another origin. Open the sheet frame in its own tab and capture there.');}
        }
        if(attempt===39)throw new Error('The published sheet has not loaded. Wait for the table to appear and capture again.');
        await sleep(250);
      }
    }
    const root=doc.scrollingElement;let target=sheet?doc.querySelector('#sheets-viewport'):root;
    if(!target)throw new Error('No published spreadsheet grid was found.');
    if(!sheet&&options.mode==='selector'){target=doc.querySelector(options.selector);if(!target)throw new Error('No panel matches that selector.');}
    else if(!sheet&&options.mode==='auto'){
      let score=0;for(const el of doc.querySelectorAll('body *')){if(el===root||el===document.body)continue;const r=el.getBoundingClientRect();if(r.width<innerWidth*.35||r.height<innerHeight*.3||r.height>innerHeight||el.scrollHeight<el.clientHeight+150)continue;if(!/(auto|scroll)/.test(getComputedStyle(el).overflowY))continue;const s=r.width*r.height*Math.min(8,el.scrollHeight/el.clientHeight);if(s>score&&(root.scrollHeight<innerHeight*1.5||el.scrollHeight>root.scrollHeight*1.5)){score=s;target=el;}}
    }
    const isPage=target===root||target===doc.body||target===doc.documentElement;if(isPage)target=root;
    const changes=[],style=doc.createElement('style');style.textContent='html,body,*{scroll-behavior:auto!important;scroll-snap-type:none!important;overflow-anchor:none!important;animation:none!important;transition:none!important;caret-color:transparent!important}*::-webkit-scrollbar{display:none!important}';(doc.head||doc.documentElement).append(style);
    state={target,isPage,doc,view,frame,sheet,outerX:scrollX,outerY:scrollY,originalX:view.scrollX,originalY:view.scrollY,originalTop:target.scrollTop,originalLeft:target.scrollLeft,last:Date.now(),token:options.token,mode:options.mode,delay:options.delay};
    state.restore=()=>{clearInterval(state.watchdog);style.remove();for(const [el,p,v,priority]of changes.reverse()){if(v)el.style.setProperty(p,v,priority);else el.style.removeProperty(p);}if(!isPage)target.scrollTo({top:state.originalTop,left:state.originalLeft,behavior:'instant'});view.scrollTo({top:state.originalY,left:state.originalX,behavior:'instant'});if(frame)window.scrollTo({top:state.outerY,left:state.outerX,behavior:'instant'});delete globalThis[key];};
    globalThis[key]=state;state.watchdog=setInterval(()=>{if(Date.now()-state.last>30000)state.restore();},3000);
    try{
      if(frame)frame.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
      if(!isPage){target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});if(target.clientHeight>view.innerHeight+1)throw new Error('This panel is taller than the window. Zoom out or select Entire webpage.');}
      if(options.mode!=='visible'){if(isPage)view.scrollTo({top:0,left:0,behavior:'instant'});else target.scrollTo({top:0,left:0,behavior:'instant'});}
      if(options.hide)for(const el of doc.querySelectorAll('body *')){if(el===target||el.contains(target))continue;const p=getComputedStyle(el).position;if(p!=='fixed'&&p!=='sticky')continue;if(el.getBoundingClientRect().height<innerHeight*.55){changes.push([el,'visibility',el.style.getPropertyValue('visibility'),el.style.getPropertyPriority('visibility')]);el.style.setProperty('visibility','hidden','important');}}
      await Promise.race([doc.fonts.ready,sleep(2500)]);
    }catch(e){state.restore();throw e;}
  }
  state=globalThis[key];if(!state)throw new Error('The page changed or capture timed out. Start again.');if(options.token&&state.token!==options.token)throw new Error('Capture session changed.');state.last=Date.now();
  if(command==='restore'){state.restore();return {ok:true};}
  if(command==='pace'&&Number.isFinite(options.waitMs)&&options.waitMs>0)await sleep(Math.min(650,options.waitMs));
  if(command==='move'){const x=Number.isFinite(options.x)?options.x:0;if(state.isPage)state.view.scrollTo({top:options.y,left:x,behavior:'instant'});else state.target.scrollTo({top:options.y,left:x,behavior:'instant'});}
  if(['begin','move','settle'].includes(command)){
    const delay=Number.isFinite(state.delay)?Math.max(0,state.delay):250;await sleep(command==='settle'?Math.max(900,delay):delay);
    const images=[...state.doc.images].filter(im=>{const r=im.getBoundingClientRect();return !im.complete&&r.bottom>0&&r.top<innerHeight;});await Promise.race([Promise.all(images.map(im=>new Promise(r=>{im.addEventListener('load',r,{once:true});im.addEventListener('error',r,{once:true});}))),sleep(2000)]);await sleep(100);
  }
  const t=state.target;if(!t.isConnected)throw new Error('The sheet or page changed during capture. Start again.');let box;const frameRect=state.frame?.getBoundingClientRect();const offsetX=frameRect?frameRect.left+state.frame.clientLeft:0,offsetY=frameRect?frameRect.top+state.frame.clientTop:0;
  if(state.isPage)box={x:offsetX,y:offsetY,width:state.doc.documentElement.clientWidth,height:state.view.innerHeight};
  else{const r=t.getBoundingClientRect(),x=offsetX+r.left+t.clientLeft,y=offsetY+r.top+t.clientTop;if(x<0||y<0||y+t.clientHeight>innerHeight+1)throw new Error('The panel moved outside the window. Try Entire webpage.');box={x,y,width:Math.min(t.clientWidth,innerWidth-x),height:t.clientHeight};}
  if(box.width<1||box.height<1)throw new Error('The capture area is not visible.');
  return {box,position:state.mode==='visible'?0:(state.isPage?state.view.scrollY:t.scrollTop),positionX:state.sheet?(state.isPage?state.view.scrollX:t.scrollLeft):0,totalWidth:state.sheet?t.scrollWidth:box.width,sheet:state.sheet,total:state.mode==='visible'?box.height:t.scrollHeight,viewport:{width:innerWidth,height:innerHeight},title:document.title,url:location.href,horizontalOverflow:t.scrollWidth>t.clientWidth+2};
}
