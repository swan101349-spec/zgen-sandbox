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
  viewBar.append(fitPaper,fillWidth);
  right.panel.append(viewBar);
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
  subhead(right.panel,'Canvas operations');right.panel.append(canvasTools);
  subhead(right.panel,'STOP / GO · file controls');right.panel.append(topActions);
  const group=document.createElement('div');group.className='zshell-actions';
  const old=document.createElement('a');old.href='./index.html';
  old.textContent='↶ Original layout';old.setAttribute('aria-label','Return to original studio layout');
  group.append(old);right.panel.append(group);
  subhead(bottom.panel,'Selected brush');bottom.panel.append(brushShelf);
  subhead(bottom.panel,'44-pigment palette');
  buttons(bottom.panel,[['color','🎨 Choose pigments'],['water','💧 Water & pigment']]);
  subhead(bottom.panel,'Artwork · sketches · imported underlays');
  buttons(bottom.panel,[['import','⬆ Import image'],['trace','▧ Trace / underlay'],['files','▣ Save & projects'],['brush','🖌 Brush picker']]);
  const note=document.createElement('p');note.className='zshell-note';
  note.textContent='Import and tracing use the real existing tools. The persistent thumbnail gallery and stencil catalog are still on the build board.';
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
  const settings={size:22,water:68,pigment:78,opacity:96,lazy:0};
  const settingsRange={
    size:[1,100],water:[0,100],pigment:[0,100],
    opacity:[1,100],lazy:[0,70]
  };
  const sizePresets={XS:3,S:10,M:22,L:45,XL:80};
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
    adjustPanel.replaceChildren();
    const head=document.createElement('div');head.className='zshell-adjust-title';
    const title=document.createElement('strong');title.textContent=drawing?'Pencil / ink settings':'Watercolor settings';
    const close=document.createElement('button');close.type='button';close.textContent='×';
    close.className='zshell-adjust-close';close.setAttribute('aria-label','Close brush adjustments');
    close.addEventListener('click',()=>setAdjustOpen(false));
    head.append(title,close);adjustPanel.append(head);
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
      wrap.append(name,output,slider);adjustPanel.append(wrap);
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
    adjustPanel.append(presets);
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
  document.addEventListener('input',event=>{
    const key=event.target?.dataset?.setting;
    if(!(key in settings))return;
    const value=Number(event.target.value);
    if(Number.isFinite(value)){
      settings[key]=Math.max(settingsRange[key][0],Math.min(settingsRange[key][1],value));
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
    if(event.target.closest('[data-brush]')&&!adjustPanel.hidden){
      requestAnimationFrame(rebuildAdjustPanel);
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
    version:'2026-11-22-3-controls',
    get size(){return settings.size},
    get mode(){return isDrawingBrush()?'drawing':'watercolor'},
    get open(){return !adjustPanel.hidden},
    close:()=>setAdjustOpen(false)
  };

  window.__ZGEN_THREE_SHELL={version:'2026-11-22-auto-fit',paintingModuleModified:false,closeAll,recalculatePaperFit,get viewMode(){return viewMode}};
})();
