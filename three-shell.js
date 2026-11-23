/* Three-shell visual adapter: untouched 720x1280 painting canvas and paint module. */
(() => {
  'use strict';
  const app=document.querySelector('#app');
  const viewport=app?.querySelector('.viewport');
  const paint=app?.querySelector('#painting-rail');
  const drawing=app?.querySelector('#drawing-rail');
  const canvasTools=app?.querySelector('#canvas-rail');
  const topActions=app?.querySelector('.actions');
  const brushShelf=app?.querySelector('.shelf');
  const area=app?.querySelector('#canvasArea');
  const board=app?.querySelector('#board');
  if(!viewport||!paint||!drawing||!canvasTools||!topActions||!brushShelf||!area||!board) return;

  const make=(side,icon,title)=>{
    const aside=document.createElement('aside');
    aside.className='zshell '+side;aside.id='zshell-'+side;
    const handle=document.createElement('button');
    handle.className='zshell-handle';handle.type='button';
    handle.setAttribute('aria-label','Open '+title);
    handle.setAttribute('aria-expanded','false');
    handle.setAttribute('aria-controls','zshell-'+side+'-panel');
    handle.innerHTML='<span aria-hidden="true">'+icon+'</span><small>'+title+'</small>';
    const panel=document.createElement('section');
    panel.className='zshell-panel';panel.id='zshell-'+side+'-panel';panel.hidden=true;
    const head=document.createElement('div');head.className='zshell-title';
    const caption=document.createElement('span');caption.textContent=title;
    const close=document.createElement('button');
    close.className='zshell-close';close.type='button';close.textContent='×';
    close.setAttribute('aria-label','Close '+title);
    head.append(caption,close);panel.append(head);aside.append(handle,panel);viewport.append(aside);
    return {aside,handle,panel,close};
  };
  const left=make('left','🖌','Brushes');
  const right=make('right','⚙','Tools');
  const bottom=make('bottom','🎨','Colors & Artwork');
  const shells=[left,right,bottom];

  // View-only change: native paper drawing pixels and existing 720x1280
  // history are never resized or reallocated. CSS controls display width.
  const viewBar=document.createElement('div');
  viewBar.className='zshell-viewbar';
  const fitPaper=document.createElement('button');
  fitPaper.type='button';fitPaper.textContent='⛶ Fit Canvas';
  fitPaper.setAttribute('aria-label','Automatically fit the complete paper inside the viewing area');
  const fillWidth=document.createElement('button');
  fillWidth.type='button';fillWidth.textContent='↔ Fill Width';
  fillWidth.setAttribute('aria-label','Fill screen width; move to see paper edges');
  // 180-degree artist workspace switch: exchange left/right rail positions,
  // never rotate the actual paper or invert S Pen drawing coordinates.
  const swapRails=document.createElement('button');
  swapRails.type='button';
  swapRails.className='zshell-rail-swap';
  swapRails.textContent='⤾ Swap rails 180°';
  swapRails.setAttribute('aria-label','Swap Brushes and Tools between left and right sides');
  let railsSwapped=false;
  try{railsSwapped=localStorage.getItem('zgen-rails-swapped-v1')==='true'}catch{}
  function applyRailSwap(){
    viewport.classList.toggle('zgen-rails-swapped',railsSwapped);
    swapRails.setAttribute('aria-pressed',String(railsSwapped));
    swapRails.title=railsSwapped?'Brushes on right, Tools on left':'Brushes on left, Tools on right';
    try{localStorage.setItem('zgen-rails-swapped-v1',String(railsSwapped))}catch{}
  }
  swapRails.addEventListener('click',()=>{railsSwapped=!railsSwapped;applyRailSwap()});
  viewBar.append(fitPaper,fillWidth,swapRails);
  right.panel.append(viewBar);
  applyRailSwap();
  // v2 starts with owner-approved Fit Canvas; do not inherit old 'fill' default.
  let viewMode='fit';
  try{
    const saved=localStorage.getItem('zgen-paper-view-v2');
    if(saved==='fit'||saved==='fill')viewMode=saved;
  }catch{}
  function setPaperView(mode,reset=false){
    if(mode!=='fit'&&mode!=='fill')return;
    viewMode=mode;
    viewport.classList.toggle('zgen-paper-fit',mode==='fit');
    viewport.classList.toggle('zgen-paper-fill',mode==='fill');
    queuePaperFit();
    fitPaper.setAttribute('aria-pressed',String(mode==='fit'));
    fillWidth.setAttribute('aria-pressed',String(mode==='fill'));
    try{localStorage.setItem('zgen-paper-view-v2',mode)}catch{}
    // The original Fit action resets its existing zoom/pan state; this
    // never touches canvas.width, canvas.height, engine or undo memory.
    if(reset){
      const originalFit=canvasTools.querySelector('button[data-act="fit"]');
      if(originalFit){
        internalFit=true;
        try{originalFit.click()}finally{internalFit=false}
      }
      closeAll();
    }
  }

  // Fit Canvas is geometry-only. The original backing canvases stay 720x1280;
  // resize of the browser never reallocates pixels or resets Undo/Redo.
  // The historical engine's 470 CSS-pixel cap is bypassed by the separate
  // stylesheet, without altering the packed painting module.
  const PAPER_W=720, PAPER_H=1280, PAPER_INSET=10;
  let paperFitFrame=0;
  function recalculatePaperFit(){
    const stageWidth=area.clientWidth, stageHeight=area.clientHeight;
    if(stageWidth<=0||stageHeight<=0)return;
    const allowedWidth=Math.max(1,stageWidth-PAPER_INSET);
    const allowedHeight=Math.max(1,stageHeight-PAPER_INSET);
    const displayWidth=Math.max(1,Math.floor(
      viewMode==='fit' ? Math.min(allowedWidth,allowedHeight*PAPER_W/PAPER_H) : allowedWidth
    ));
    const displayHeight=displayWidth*PAPER_H/PAPER_W;
    viewport.style.setProperty('--zgen-paper-width',displayWidth+'px');
    viewport.style.setProperty('--zgen-paper-height',displayHeight.toFixed(3)+'px');
  }
  function queuePaperFit(){
    if(paperFitFrame)cancelAnimationFrame(paperFitFrame);
    paperFitFrame=requestAnimationFrame(()=>{
      paperFitFrame=0;
      recalculatePaperFit();
    });
  }
  if(typeof ResizeObserver!=='undefined'){
    new ResizeObserver(queuePaperFit).observe(area);
  }
  window.addEventListener('resize',queuePaperFit);
  window.visualViewport?.addEventListener('resize',queuePaperFit);
  window.addEventListener('orientationchange',queuePaperFit);
  let internalFit=false;
  fitPaper.addEventListener('click',()=>setPaperView('fit',true));
  fillWidth.addEventListener('click',()=>setPaperView('fill',true));
  document.addEventListener('click',event=>{
    if(!internalFit&&event.target.closest('button[data-act="fit"]')){
      setPaperView('fit');
    }
  },true);
  setPaperView(viewMode);
  function subhead(parent,title){
    const line=document.createElement('div');line.className='zshell-subtitle';
    line.textContent=title;parent.append(line);
  }
  function buttons(parent,pairs){
    const group=document.createElement('div');group.className='zshell-actions';
    for(const [act,title] of pairs){
      const b=document.createElement('button');
      b.type='button';b.dataset.act=act;b.textContent=title;group.append(b);
    }
    parent.append(group);
  }
  subhead(left.panel,'Watercolor & materials');left.panel.append(paint);
  subhead(left.panel,'Pencils, ink & tracing');left.panel.append(drawing);

  // Favorites are a shell feature only. Clicking a favorite uses the real
  // existing document-level data-brush handler, not a replacement painter.
  const favoritesKey='zgen-brush-favorites-v1';
  let favoriteIds=[];
  try{
    const stored=JSON.parse(localStorage.getItem(favoritesKey)||'[]');
    if(Array.isArray(stored)){
      favoriteIds=[...new Set(stored.filter(id=>typeof id==='string' && /^[a-z0-9_-]{1,40}$/.test(id)))].slice(0,24);
    }
  }catch{}
  subhead(left.panel,'★ Favorite brushes');
  const favoritesWrap=document.createElement('div');
  favoritesWrap.className='zshell-favorites';
  const starCurrent=document.createElement('button');
  starCurrent.type='button';starCurrent.className='zshell-fav-toggle';
  starCurrent.setAttribute('aria-label','Favorite the selected brush');
  const favoritesList=document.createElement('div');
  favoritesList.className='zshell-fav-list';
  favoritesList.setAttribute('aria-label','Saved brush favorites');
  favoritesWrap.append(starCurrent,favoritesList);
  left.panel.append(favoritesWrap);
  const brushName=id=>id==='graphite'?'2B Graphite':
    id==='ink'?'Indian Ink':id.replace(/[-_]/g,' ').split(' ').map(
      word=>word.charAt(0).toUpperCase()+word.slice(1)
    ).join(' ');
  function refreshFavorites(){
    const active=window.__ZGEN_BETA_26?.state?.().brush||'round';
    const saved=favoriteIds.includes(active);
    starCurrent.textContent=(saved?'★ Saved: ':'☆ Save: ')+brushName(active);
    starCurrent.setAttribute('aria-pressed',String(saved));
    favoritesList.replaceChildren();
    if(!favoriteIds.length){
      const empty=document.createElement('small');
      empty.textContent='Choose a brush, then tap ☆ to save it here.';
      favoritesList.append(empty);
    }
    for(const id of favoriteIds){
      const btn=document.createElement('button');
      btn.type='button';btn.dataset.brush=id;btn.textContent='★ '+brushName(id);
      btn.setAttribute('aria-label','Select favorite '+brushName(id));
      favoritesList.append(btn);
    }
  }
  starCurrent.addEventListener('click',()=>{
    const active=window.__ZGEN_BETA_26?.state?.().brush||'round';
    if(!/^[a-z0-9_-]{1,40}$/.test(active))return;
    if(favoriteIds.includes(active))favoriteIds=favoriteIds.filter(id=>id!==active);
    else favoriteIds=[...favoriteIds,active].slice(-24);
    try{localStorage.setItem(favoritesKey,JSON.stringify(favoriteIds))}catch{}
    refreshFavorites();
  });
  // The original click handler changes the real brush; refresh only afterward.
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-brush]'))requestAnimationFrame(refreshFavorites);
  });
  left.handle.addEventListener('click',refreshFavorites);
  refreshFavorites();
  subhead(right.panel,'Canvas operations');right.panel.append(canvasTools);
  subhead(right.panel,'STOP / GO · file controls');right.panel.append(topActions);
  // The prior "Original layout" link now pointed to the same current beta root.
  // Remove that dead-end navigation rather than pretending it changes editors.
  subhead(bottom.panel,'Selected brush');bottom.panel.append(brushShelf);
  subhead(bottom.panel,'44-pigment palette');
  buttons(bottom.panel,[['color','🎨 Choose pigments'],['water','💧 Water & pigment']]);
  subhead(bottom.panel,'Artwork · sketches · imported underlays');
  buttons(bottom.panel,[['import','⬆ Import image'],['trace','▧ Trace / underlay'],['files','▣ Files / Export PNG'],['brush','🖌 Brush picker']]);
  const note=document.createElement('p');note.className='zshell-note';
  note.textContent='Import, tracing, Fill, Undo/Redo and Export PNG use the real tools. Editable wet-project Save/Reopen and additional lyrical pencil grades are not yet connected to this beta.';
  bottom.panel.append(note);

  function closeAll(){
    for(const sh of shells){sh.panel.hidden=true;sh.handle.setAttribute('aria-expanded','false')}
  }
  for(const sh of shells){
    sh.handle.addEventListener('click',()=>{
      const open=sh.panel.hidden;closeAll();sh.panel.hidden=!open;
      sh.handle.setAttribute('aria-expanded',String(open));
    });
    sh.close.addEventListener('click',closeAll);
    sh.panel.addEventListener('click',ev=>{
      if(ev.target.closest('button[data-act],button[data-brush],a[href]')) closeAll();
    });
  }
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeAll()});
  viewport.addEventListener('pointerdown',ev=>{
    if(!ev.target.closest('.zshell,.drawer')) closeAll();
  },true);

  // Artist's contextual adjustment dock. Directly drives the original engine's
  // already-wired 'data-setting' document input handler, without touching wet
  // simulation code or painting canvas dimensions/history.
  const settings={size:22,water:68,pigment:78,opacity:96,lazy:0,coverage:88,soft:55,strength:32};
  const settingsRange={
    size:[1,100],water:[0,100],pigment:[0,100],
    opacity:[1,100],lazy:[0,70],coverage:[0,100],soft:[0,100],strength:[0,100]
  };
  // Five human-readable sizes are the only necessary everyday diameter control.
  // Values are native engine input, not millimetres. All mark-making tools share
  // this contract, while preserving independent per-tool last-used sizes.
  const sizePresets={XS:3,S:10,M:22,L:45,XL:80};
  const toolSizeStoreKey='zgen-per-brush-size-v1';
  const toolSizes=Object.create(null);
  try {
    const stored=JSON.parse(localStorage.getItem(toolSizeStoreKey)||'{}');
    if(stored&&typeof stored==='object'&&!Array.isArray(stored)){
      for(const [key,value] of Object.entries(stored).slice(0,64)){
        if(/^[a-z][a-z0-9_-]{0,48}$/i.test(key)&&Number.isInteger(value)&&value>=1&&value<=100)
          toolSizes[key]=value;
      }
    }
  }catch{} // Incognito/private storage denied: keep sizes for this session.
  function persistToolSizes(){
    try{localStorage.setItem(toolSizeStoreKey,JSON.stringify(toolSizes))}catch{}
  }
  const adjustButton=document.createElement('button');
  adjustButton.type='button';
  adjustButton.className='zshell-adjust-handle';
  adjustButton.textContent='☷';
  adjustButton.setAttribute('aria-label','Brush adjustments: three sliders');
  adjustButton.setAttribute('aria-controls','zshell-adjust-panel');
  adjustButton.setAttribute('aria-expanded','false');
  const adjustPanel=document.createElement('section');
  adjustPanel.id='zshell-adjust-panel';
  adjustPanel.className='zshell-adjust-panel';
  adjustPanel.setAttribute('aria-label','Three active brush adjustments');
  adjustPanel.hidden=true;
  viewport.append(adjustButton,adjustPanel);
  function currentBrush(){
    return window.__ZGEN_BETA_26?.state?.().brush || 'round';
  }
  function isDrawingBrush(){
    return ['ink','graphite'].includes(currentBrush());
  }
  // The native delegated data-setting input handler is the single authority
  // for real brush size. No replacement brush renderer or new pointer events.
  const sizeRelay=document.createElement('input');
  sizeRelay.type='range';sizeRelay.min='1';sizeRelay.max='100';
  sizeRelay.step='1';sizeRelay.dataset.setting='size';sizeRelay.hidden=true;
  sizeRelay.setAttribute('aria-hidden','true');
  sizeRelay.tabIndex=-1;
  viewport.append(sizeRelay);
  let activeBrush=currentBrush();
  function defaultSizeFor(brush){
    return /(?:graphite|ink|pencil|pen|rigger|liner|detail)/i.test(brush) ? sizePresets.XS : sizePresets.M;
  }
  function setNativeToolSize(size){
    if(window.__ZGEN_FILL?.active)return false; // Tap Fill is a region tool, not a diameter.
    if(!Number.isInteger(size)||size<1||size>100)return false;
    sizeRelay.value=String(size);
    sizeRelay.dispatchEvent(new Event('input',{bubbles:true}));
    const actual=Number(window.__ZGEN_BETA_26?.state?.().size);
    if(actual!==size)return false; // Fail closed instead of claiming a UI-only size.
    settings.size=size;
    toolSizes[activeBrush]=size;
    persistToolSizes();
    const shown=adjustPanel.querySelector('input[data-setting="size"]');
    if(shown){
      shown.value=String(size);
      const output=shown.closest('label')?.querySelector('output');
      if(output)output.textContent=String(size);
    }
    updatePresetState();
    return true;
  }
  function syncSelectedBrush(){
    const selected=currentBrush();
    if(selected===activeBrush)return;
    // Save the actual selected brush size before native brush selection swaps tools.
    if(Number.isInteger(settings.size)&&settings.size>=1&&settings.size<=100)
      toolSizes[activeBrush]=settings.size;
    activeBrush=selected;
    const next=toolSizes[selected]??defaultSizeFor(selected);
    setNativeToolSize(next);
    if(!adjustPanel.hidden)rebuildAdjustPanel();
  }
  // Original app can restore a selected brush before shell setup finishes.
  // Fine drawing tools always get a controlled small first mark.
  requestAnimationFrame(()=>{
    activeBrush=currentBrush();
    const stored=toolSizes[activeBrush];
    if(stored!==undefined || /(?:graphite|ink|pencil|pen|rigger|liner|detail)/i.test(activeBrush))
      setNativeToolSize(stored??defaultSizeFor(activeBrush));
  });
  function readKnownEngineState(){
    const live=window.__ZGEN_BETA_26?.state?.();
    if(live){
      if(Number.isFinite(live.size))settings.size=live.size;
      if(Number.isFinite(live.water))settings.water=live.water;
    }
    for(const key of Object.keys(settings)){
      const native=app.querySelector('#drawer input[data-setting="'+key+'"]');
      if(native&&Number.isFinite(Number(native.value)))settings[key]=Number(native.value);
    }
  }
  function contextualFields(){
    if(window.__ZGEN_FILL?.active)return [['coverage','Coverage'],['soft','Soft edge'],['strength','Pigment strength']];
    return isDrawingBrush()
      ? [['size','Size'],['opacity','Mark strength'],['lazy','Lazy']]
      : [['size','Size'],['water','Water'],['pigment','Pigment']];
  }
  function updatePresetState(){
    adjustPanel.querySelectorAll('[data-size-preset]').forEach(button=>{
      button.setAttribute('aria-pressed',String(Number(settings.size)===sizePresets[button.dataset.sizePreset]));
    });
  }
  function rebuildAdjustPanel(){
    readKnownEngineState();
    const drawing=isDrawingBrush();
    const fillActive=!!window.__ZGEN_FILL?.active;
    adjustPanel.replaceChildren();
    const head=document.createElement('div');head.className='zshell-adjust-title';
    const title=document.createElement('strong');title.textContent=window.__ZGEN_FILL?.active?'Watercolor Fill settings':drawing?'Pencil / ink settings':'Watercolor settings';
    const close=document.createElement('button');close.type='button';close.textContent='×';
    close.className='zshell-adjust-close';close.setAttribute('aria-label','Close brush adjustments');
    close.addEventListener('click',()=>setAdjustOpen(false));
    head.append(title,close);adjustPanel.append(head);
    const advanced=document.createElement('details');
    advanced.className='zshell-advanced';
    const advancedLabel=document.createElement('summary');
    advancedLabel.textContent='More controls (optional)';
    advanced.append(advancedLabel);
    for(const [key,label] of contextualFields()){
      const wrap=document.createElement('label');wrap.className='zshell-adjust-row';
      const name=document.createElement('span');name.textContent=label;
      const output=document.createElement('output');output.textContent=String(settings[key]);
      output.className='zshell-adjust-value';
      const slider=document.createElement('input');
      slider.type='range';
      slider.dataset.setting=key;
      slider.min=String(settingsRange[key][0]);
      slider.max=String(settingsRange[key][1]);
      slider.step='1';
      slider.value=String(settings[key]);
      slider.setAttribute('aria-label',label);
      slider.addEventListener('input',()=>{output.textContent=slider.value;settings[key]=Number(slider.value);updatePresetState()});
      wrap.append(name,output,slider);
      (fillActive?adjustPanel:advanced).append(wrap);
    }
    const presets=document.createElement('div');presets.className='zshell-size-presets';
    presets.setAttribute('role','group');
    presets.setAttribute('aria-label','Brush diameter presets');
    for(const [name,size] of Object.entries(sizePresets)){
      const button=document.createElement('button');
      button.type='button';
      button.textContent=name;
      button.dataset.sizePreset=name;
      button.setAttribute('aria-label',name+' brush size, '+size+' out of 100');
      button.addEventListener('click',()=>{
        const slider=adjustPanel.querySelector('input[data-setting="size"]');
        if(!slider)return;
        slider.value=String(size);
        slider.dispatchEvent(new Event('input',{bubbles:true}));
      });
      presets.append(button);
    }
    if(!fillActive)adjustPanel.append(presets,advanced);
    const hint=document.createElement('p');hint.className='zshell-adjust-hint';
    hint.textContent='Changes apply to your next real brush or pencil mark.';
    adjustPanel.append(hint);
    updatePresetState();
  }
  function setAdjustOpen(open){
    if(open){
      closeAll();
      const nativeDrawer=app.querySelector('#drawer');
      if(nativeDrawer && !nativeDrawer.hidden){
        const nativeClose=nativeDrawer.querySelector('button[data-act="close"]');
        if(nativeClose)nativeClose.click();
        else nativeDrawer.hidden=true;
      }
      rebuildAdjustPanel();
    }
    adjustPanel.hidden=!open;
    adjustButton.setAttribute('aria-expanded',String(open));
  }
  adjustButton.addEventListener('click',()=>setAdjustOpen(adjustPanel.hidden));
  document.addEventListener('zgen-fill-mode-change',()=>{if(!adjustPanel.hidden)rebuildAdjustPanel()});
  document.addEventListener('input',event=>{
    const key=event.target?.dataset?.setting;
    if(!(key in settings))return;
    const value=Number(event.target.value);
    if(Number.isFinite(value)){
      settings[key]=Math.max(settingsRange[key][0],Math.min(settingsRange[key][1],value));
      if(key==='size' && !window.__ZGEN_FILL?.active){
        toolSizes[activeBrush]=settings.size;
        persistToolSizes();
      }
      if(!adjustPanel.hidden && !adjustPanel.contains(event.target)){
        const slider=adjustPanel.querySelector('input[data-setting="'+key+'"]');
        if(slider)slider.value=String(settings[key]);
        const output=slider?.closest('label')?.querySelector('output');
        if(output)output.textContent=String(settings[key]);
        updatePresetState();
      }
    }
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-brush]')){
      // Native app registered its document click listener before this adapter.
      // It has already selected the tool, so apply its remembered size NOW,
      // not a frame later. This avoids an accidental oversized first stroke.
      syncSelectedBrush();
    }
    // Opening another existing dock or native tool picker closes adjustments.
    if(event.target.closest('.zshell-handle,[data-act]') &&
       !event.target.closest('#zshell-adjust-panel')){
      setAdjustOpen(false);
    }
  });
  viewport.addEventListener('pointerdown',event=>{
    if(!adjustPanel.hidden && !event.target.closest('#zshell-adjust-panel,.zshell-adjust-handle')){
      setAdjustOpen(false);
    }
  },true);
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!adjustPanel.hidden)setAdjustOpen(false);
  });
  window.__ZGEN_BRUSH_CONTROLS={
    version:'2026-11-23-per-tool-tap-size',
    get size(){return Number(window.__ZGEN_BETA_26?.state?.().size)||settings.size},
    get brush(){return activeBrush},
    get storedSizes(){return {...toolSizes}},
    setPreset(name){
      const key=String(name).trim().toUpperCase();
      if(!Object.prototype.hasOwnProperty.call(sizePresets,key))return false;
      return setNativeToolSize(sizePresets[key]);
    },
    stepSize(direction){
      if(window.__ZGEN_FILL?.active)return false;
      const vals=Object.values(sizePresets);
      const current=Number(window.__ZGEN_BETA_26?.state?.().size)||settings.size;
      let index=0;
      for(let n=1;n<vals.length;n++)
        if(Math.abs(vals[n]-current)<Math.abs(vals[index]-current))index=n;
      const step=Number(direction);
      if(!Number.isFinite(step)||step===0)return false;
      const next=Math.max(0,Math.min(vals.length-1,index+(step>0?1:-1)));
      return setNativeToolSize(vals[next]);
    },
    get mode(){return isDrawingBrush()?'drawing':'watercolor'},
    get open(){return !adjustPanel.hidden},
    close:()=>setAdjustOpen(false),
    get fillSettings(){return {coverage:settings.coverage,soft:settings.soft,strength:settings.strength}}
  };

  window.__ZGEN_THREE_SHELL={version:'2026-11-22-auto-fit',paintingModuleModified:false,closeAll,recalculatePaperFit,get viewMode(){return viewMode}};
})();
