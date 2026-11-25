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
  // Premier Lyrical #1 uses the SAME native delegated data-brush handler.
  // Keep a compact lead-in button, not a second painter or overlay.
  const lyricalLead=document.createElement('button');
  lyricalLead.type='button';
  lyricalLead.dataset.brush='lyrical';
  lyricalLead.className='zshell-lyrical-lead';
  lyricalLead.textContent='✎ Lyrical Pencil #1 · pressure flare';
  lyricalLead.setAttribute('aria-label','Select Lyrical Pencil number one, pressure and tilt expressive graphite');
  left.panel.append(lyricalLead);
  // First native recovered atmospheric shader: the same Lyrical C1 input,
  // artwork snapshot, graphite palette, Undo/Redo and export. No faux ★ wet.
  const scrubLead=document.createElement('button');
  scrubLead.type='button';
  scrubLead.className='zshell-lyrical-lead';
  scrubLead.textContent='✎ Scrub Shader · dry texture';
  scrubLead.setAttribute('aria-label','Select dry Scrub shader pencil');
  scrubLead.addEventListener('click',()=>{
    lyricalLead.click(); // invokes the protected ORIGINAL brush selector
    window.__ZGEN_LYRICAL_ONE?.configure({mode:'scrub'});
  });
  left.panel.append(scrubLead);
  // Cross extends the same native lyrical C1 route; dry crossed hatches only.
  const crossLead=document.createElement('button');
  crossLead.type='button';
  crossLead.className='zshell-lyrical-lead';
  crossLead.textContent='✎ Cross Shader · dry crosshatch';
  crossLead.setAttribute('aria-label','Select dry Cross shader pencil');
  crossLead.addEventListener('click',()=>{
    lyricalLead.click();
    window.__ZGEN_LYRICAL_ONE?.configure({mode:'cross'});
  });
  left.panel.append(crossLead);
  // Fabric is a separate dry line-style of the ORIGINAL lyrical pencil.
  const fabricLead=document.createElement('button');
  fabricLead.type='button';
  fabricLead.className='zshell-lyrical-lead';
  fabricLead.textContent='✎ Fabric Shader · dry fibers';
  fabricLead.setAttribute('aria-label','Select dry Fabric shader pencil');
  fabricLead.addEventListener('click',()=>{
    lyricalLead.click();
    window.__ZGEN_LYRICAL_ONE?.configure({mode:'fabric'});
  });
  left.panel.append(fabricLead);
  // Cloth uses the same dry C1 pencil transaction with woven warp/weft.
  const clothLead=document.createElement('button');
  clothLead.type='button';
  clothLead.className='zshell-lyrical-lead';
  clothLead.textContent='✎ Cloth Shader · dry woven threads';
  clothLead.setAttribute('aria-label','Select dry Cloth shader pencil');
  clothLead.addEventListener('click',()=>{
    lyricalLead.click();
    window.__ZGEN_LYRICAL_ONE?.configure({mode:'cloth'});
  });
  left.panel.append(clothLead);

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
  const brushName=id=>id==='lyrical'?'Lyrical Pencil #1':id==='graphite'?'2B Graphite':
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
  // Native Undo and Redo are moved, not copied: their original delegated
  // data-act handlers and disabled state remain authoritative.
  const historyArrow=(action,side,symbol,label)=>{
    const button=canvasTools.querySelector('button[data-act="'+action+'"]');
    if(!button)return;
    button.classList.add('zshell-history-arrow','zshell-history-'+side);
    button.textContent=symbol;
    button.setAttribute('aria-label',label);
    button.title=label;
    bottom.aside.insertBefore(button,bottom.handle);
  };
  historyArrow('undo','left','↶','Undo last stroke');
  historyArrow('redo','right','↷','Redo last undone stroke');
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
      const action=ev.target.closest('button[data-act]')?.dataset.act;
      // An artist may repeatedly Undo/Redo without hunting for Tools again.
      if(action==='undo'||action==='redo')return;
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
  const sizePresets={XS:3,S:10,M:22,L:45,XL:80};
  // Owner recovery: original painter already accepts delegated data-color
  // selections. The three tones are native graphite pigments, not CSS filters.
  const graphiteTones=Object.freeze([
    {label:'Graphite',name:'Graphite Gray',hex:'#787878'},
    {label:'Dark',name:'Dark Graphite',hex:'#383838'},
    {label:'Black',name:'Deep Black',hex:'#080808'}
  ]);
  let graphiteTone='#787878';
  let watercolorColor=null;
  let lastBrush=window.__ZGEN_BETA_26?.state?.().brush||'round';
  // Read the actual native paint-color chip, rather than trusting a fake UI
  // swatch selection or modifying the packed WebGL/Canvas renderer.
  function liveHex(){
    const chip=document.querySelector('#chip');
    const raw=chip?.style.backgroundColor||chip?.style.background||'';
    const hex=raw.match(/^#([a-f0-9]{6})$/i);
    if(hex)return '#'+hex[1].toLowerCase();
    const rgb=raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if(!rgb)return null;
    return '#'+rgb.slice(1,4).map(v=>Number(v).toString(16).padStart(2,'0')).join('');
  }
  function selectNativeColor(hex){
    if(!/^#[0-9a-f]{6}$/i.test(hex))return false;
    // The protected engine's already-delegated document click listener owns
    // pigment selection. Do not add a second paint state or pointer owner.
    const relay=document.createElement('button');
    relay.type='button';relay.hidden=true;relay.dataset.color=hex;
    document.body.append(relay);
    try{relay.click()}finally{relay.remove()}
    return liveHex()===hex.toLowerCase();
  }
  function refreshToneButtons(){
    const current=liveHex();
    adjustPanel.querySelectorAll('[data-graphite-tone]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.graphiteTone===current));
    });
  }
  // Native color changes refresh the #chip style even when they originate
  // from the 44-pan palette. Observe THAT paint state, not a fake swatch model.
  const graphiteColorChip=document.querySelector('#chip');
  if(graphiteColorChip && typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{if(!adjustPanel.hidden)refreshToneButtons()})
      .observe(graphiteColorChip,{attributes:true,attributeFilter:['style']});
  }
  function syncBrushPigment(){
    const brush=currentBrush();
    if(brush===lastBrush)return;
    const previous=lastBrush;
    lastBrush=brush;
    if(brush==='graphite'||brush==='lyrical'){
      if(previous!=='graphite'&&previous!=='lyrical')watercolorColor=liveHex();
      selectNativeColor(graphiteTone);
    }else if((previous==='graphite'||previous==='lyrical') && watercolorColor){
      selectNativeColor(watercolorColor);
    }
    if(!adjustPanel.hidden)rebuildAdjustPanel();
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
    return ['ink','graphite','lyrical'].includes(currentBrush());
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
    adjustPanel.replaceChildren();
    const head=document.createElement('div');head.className='zshell-adjust-title';
    const title=document.createElement('strong');title.textContent=window.__ZGEN_FILL?.active?'Watercolor Fill settings':drawing?'Pencil / ink settings':'Watercolor settings';
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
      const letter=document.createElement('strong');letter.textContent=name;
      const number=document.createElement('small');number.textContent=String(size);
      button.append(letter,number);
      button.dataset.sizePreset=name;
      button.setAttribute('aria-label',({XS:'Extra Small',S:'Small',M:'Medium',L:'Large',XL:'Extra Large'})[name]+' brush diameter, '+size+' native size units out of 100');
      button.addEventListener('click',()=>{
        const slider=adjustPanel.querySelector('input[data-setting="size"]');
        if(!slider)return;
        slider.value=String(size);
        slider.dispatchEvent(new Event('input',{bubbles:true}));
      });
      presets.append(button);
    }
    if(!window.__ZGEN_FILL?.active)adjustPanel.append(presets);
    // Graphite only: compact, visually distinguishable light/dark/black
    // swatches INSIDE the ☷ panel. Keep pencil opacity/Lazy/Size as the
    // original three native sliders and leave the 44-color picker available.
    if(['graphite','lyrical'].includes(currentBrush())&&!window.__ZGEN_FILL?.active){
      const title=document.createElement('div');
      title.className='zshell-graphite-caption';
      title.textContent='Graphite shade';
      const swatches=document.createElement('div');
      swatches.className='zshell-graphite-swatches';
      swatches.setAttribute('role','group');
      swatches.setAttribute('aria-label','Graphite Gray, Dark Graphite, or Black');
      for(const tone of graphiteTones){
        const button=document.createElement('button');
        button.type='button';button.dataset.color=tone.hex;
        button.dataset.graphiteTone=tone.hex;
        button.setAttribute('aria-label',tone.name+' pencil shade');
        button.setAttribute('title',tone.name);
        const disc=document.createElement('span');
        disc.className='zshell-graphite-disc';
        disc.style.backgroundColor=tone.hex;
        disc.setAttribute('aria-hidden','true');
        const name=document.createElement('span');name.textContent=tone.label;
        button.append(disc,name);
        button.addEventListener('click',()=>{
          graphiteTone=tone.hex;
          // The native click bubbles after this listener. Sync from the
          // actual painter chip again at the next paint frame.
          queueMicrotask(refreshToneButtons);
          requestAnimationFrame(refreshToneButtons);
        });
        swatches.append(button);
      }
      adjustPanel.append(title,swatches);
      refreshToneButtons();
    }
    if(currentBrush()==='lyrical'&&!window.__ZGEN_FILL?.active){
      const api=window.__ZGEN_LYRICAL_ONE;
      const options=api?.getOptions?.()||{grade:'2B',size:'fine',mode:'graphite',fan:.72};
      const heading=document.createElement('div');heading.className='zshell-graphite-caption';
      heading.textContent='Lyrical #1 · pressure + curvature';
      adjustPanel.append(heading);
      const row=document.createElement('div');row.className='zshell-lyrical-controls';
      const fields=[
        ['grade','Grade',['2H','H','HB','B','2B','4B','6B','8B']],
        ['size','Point',['xs','fine','standard','wide']],
        ['mode','Line style',['graphite','harmony','sketchy','shader','scrub','cross','fabric','cloth']]
      ];
      for(const [name,label,values] of fields){
        const wrap=document.createElement('label');
        wrap.textContent=label;
        const select=document.createElement('select');
        select.setAttribute('aria-label','Lyrical '+label);
        select.dataset.lyrical=name;
        for(const value of values){
          const option=document.createElement('option');
          option.value=value;
          option.textContent=value==='xs'?'Extra Small':value==='fine'?'Fine Detail':
            value==='wide'?'Extra Wide':value==='graphite'?'Pure Graphite':
            value==='harmony'?'Harmony':value==='sketchy'?'Sketchy':value==='shader'?'Shader':value;
          select.append(option);
        }
        select.value=options[name];
        select.addEventListener('change',()=>{
          if(!api?.configure?.({[name]:select.value}))select.value=api?.getOptions?.()[name]||options[name];
        });
        wrap.append(select);row.append(wrap);
      }
      const fanWrap=document.createElement('label');fanWrap.textContent='Flare';
      const fan=document.createElement('input');fan.type='range';fan.min='0';fan.max='100';
      fan.step='5';fan.value=String(Math.round(options.fan*100));
      fan.setAttribute('aria-label','Pressure flare width');fan.dataset.lyrical='fan';
      fan.addEventListener('input',()=>api?.configure?.({fan:Number(fan.value)/100}));
      fanWrap.append(fan);row.append(fanWrap);
      adjustPanel.append(row);
      // One real C4 watercolor gate on the premier Lyrical #1 only.
      // Dry texture siblings remain available without pretending to be wet.
      const star=document.createElement('button');
      star.type='button';
      star.dataset.lyrical='medium';
      star.className='zshell-lyrical-star';
      star.style.cssText='display:block;width:100%;margin:7px 0 0;padding:7px 9px;min-height:34px;background:#263f51;color:#fff1cb;border:1px solid #d5b56f;border-radius:7px;font-size:13px;font-weight:700';
      star.setAttribute('aria-label','Toggle Lyrical pencil native C4 watercolor mode');
      const refreshStar=()=>{
        const live=api?.getOptions?.()||{};
        const enabled=live.medium==='watercolor';
        const allowed=live.mode==='graphite'&&!!window.__C4;
        star.disabled=!allowed;
        star.textContent=enabled?'★ Native C4 watercolor · ON':
          allowed?'☆ Activate native C4 watercolor':'★ Select Pure Graphite for C4 watercolor';
        star.setAttribute('aria-pressed',String(enabled));
        star.title='Uses genuine wet GPU pigment, not dry alpha; currently Lyrical #1 only';
      };
      star.addEventListener('click',()=>{
        const mode=api?.getOptions?.().medium;
        if(api?.configure?.({medium:mode==='watercolor'?'dry':'watercolor'}))refreshStar();
      });
      row.querySelector('select[data-lyrical="mode"]')?.addEventListener('change',refreshStar);
      adjustPanel.append(star);
      const wetNote=document.createElement('small');
      wetNote.textContent='★ beta: genuine wet pigment on Lyrical #1 only. Scrub, Cross, Fabric and Cloth stay dry until their own C4 tests.';
      adjustPanel.append(wetNote);
      refreshStar();
    }
    const hint=document.createElement('p');hint.className='zshell-adjust-hint';
    hint.textContent=currentBrush()==='lyrical'
      ? 'S Pen: press to widen and flare; release pressure to taper. Tilt spreads ribs. Fine loops stay responsive. Size and shade affect the next mark.'
      : 'Size numbers are native 1–100 settings, not millimetres. Changes affect the next mark.';
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
      // Runs after the protected native brush click handler. Restore the
      // previously chosen watercolor pigment when leaving graphite.
      queueMicrotask(syncBrushPigment);
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
    close:()=>setAdjustOpen(false),
    get fillSettings(){return {coverage:settings.coverage,soft:settings.soft,strength:settings.strength}},
    get graphiteShade(){return ['graphite','lyrical'].includes(currentBrush())?liveHex():graphiteTone}
  };

  window.__ZGEN_THREE_SHELL={version:'2026-11-22-auto-fit',paintingModuleModified:false,closeAll,recalculatePaperFit,get viewMode(){return viewMode}};
})();

/* P0 survival helper is isolated and additive; original painter and rails are unchanged. */
(() => {
  const script=document.createElement('script');
  script.src='./artwork-survival.js';
  script.dataset.zgenRole='artwork-recovery';
  document.head.appendChild(script);
})();
