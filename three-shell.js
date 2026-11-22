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
  if(!viewport||!paint||!drawing||!canvasTools||!topActions||!brushShelf) return;

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
  fitPaper.type='button';fitPaper.textContent='⛶ Fit Paper';
  fitPaper.setAttribute('aria-label','Show the complete paper');
  const fillWidth=document.createElement('button');
  fillWidth.type='button';fillWidth.textContent='↔ Fill Width';
  fillWidth.setAttribute('aria-label','Fill screen width; move to see paper edges');
  viewBar.append(fitPaper,fillWidth);
  right.panel.append(viewBar);
  let viewMode='fill';
  try{
    const saved=localStorage.getItem('zgen-paper-view-v1');
    if(saved==='fit'||saved==='fill')viewMode=saved;
  }catch{}
  function setPaperView(mode,reset=false){
    if(mode!=='fit'&&mode!=='fill')return;
    viewMode=mode;
    viewport.classList.toggle('zgen-paper-fill',mode==='fill');
    fitPaper.setAttribute('aria-pressed',String(mode==='fit'));
    fillWidth.setAttribute('aria-pressed',String(mode==='fill'));
    try{localStorage.setItem('zgen-paper-view-v1',mode)}catch{}
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
  window.__ZGEN_THREE_SHELL={version:'2026-11-22',paintingModuleModified:false,closeAll};
})();
