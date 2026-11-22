/* Bounded watercolor tap-to-fill. Independent from original packed renderer.
 * Reads only original reference/paint canvases. The audited narrow bridge
 * registers paint changes in native Undo/Redo before patch pixels are written.
 */
(() => {
  'use strict';
  function initialize(){
  const W=720,H=1280,PIX=W*H;
  const app=document.querySelector('#app');
  const stage=app?.querySelector('.viewport');
  const paint=app?.querySelector('#paint');
  const reference=app?.querySelector('#reference');
  const board=app?.querySelector('#board');
  const area=app?.querySelector('#canvasArea');
  const left=app?.querySelector('#zshell-left-panel');
  const bridge=window.__ZGEN_FILL_BRIDGE;
  if(!stage||!paint||!reference||!board||!area||!left||!bridge)return false;
  let active=false, pending=null, busy=false, wasMulti=false;
  const group=document.createElement('div');group.className='zgen-fill-group';
  const button=document.createElement('button');
  button.type='button';button.className='zgen-fill-toggle';
  button.setAttribute('aria-label','Fill a closed drawing area with light watercolor');
  button.setAttribute('aria-pressed','false');
  button.textContent='▨ Light Watercolor Fill';
  const note=document.createElement('small');
  note.textContent='Choose Fill, then tap INSIDE a closed outline. Open shapes are safely refused.';
  group.append(button,note);
  left.insertBefore(group,left.querySelector('.zshell-favorites') || null);
  function status(message){const e=document.querySelector('#status');if(e)e.textContent=message}
  function setActive(value){
    active=!!value;pending=null;wasMulti=false;
    button.setAttribute('aria-pressed',String(active));
    button.textContent=active?'▨ Fill ACTIVE · tap inside':'▨ Light Watercolor Fill';
    if(active)window.__ZGEN_THREE_SHELL?.closeAll?.();
    document.dispatchEvent(new Event('zgen-fill-mode-change'));
    status(active?'Light Fill: tap inside a closed outline.':'Fill closed. Normal brushes active.');
  }
  button.addEventListener('click',()=>setActive(!active));
  document.addEventListener('click',e=>{
    if(active&&e.target.closest('[data-brush],[data-act=pan]'))setActive(false);
  });
  function mapTap(x,y) {
    const r=area.getBoundingClientRect();
    const width=board.offsetWidth,height=board.offsetHeight;
    if(!width||!height)return null;
    // CSS transforms are around the board center; invert the existing
    // pan/rotate/zoom transform instead of trusting its bounding rectangle.
    let p={x:x-(r.left+r.width/2),y:y-(r.top+r.height/2)};
    try{
      const transform=getComputedStyle(board).transform;
      if(transform&&transform!=='none')p=new DOMPoint(p.x,p.y).matrixTransform(new DOMMatrixReadOnly(transform).inverse());
    }catch{return null}
    const bx=(p.x+width/2)*W/width,by=(p.y+height/2)*H/height;
    if(bx<0||by<0||bx>=W||by>=H)return null;
    return {x:Math.floor(bx),y:Math.floor(by)};
  }
  function pixelDark(a,idx,referenceLayer){
    const off=idx*4,alpha=a[off+3];
    if(alpha<48)return false;
    const v=(a[off]*.3+a[off+1]*.59+a[off+2]*.11);
    // A dark, visible outline is the only acceptable fill boundary.
    // Light paper/white JPEG backgrounds and translucent washes are ignored.
    return (referenceLayer ? v<178 : v<126) && alpha>65;
  }
  function identifyRegion(ref,ink,seedX,seedY,options={}){
    const referencePixels=ref.data,paintPixels=ink.data;
    const raw=new Uint8Array(PIX);
    let lineCount=0;
    for(let n=0;n<PIX;n++){
      if(pixelDark(referencePixels,n,true)||pixelDark(paintPixels,n,false)){
        raw[n]=1;lineCount++;
      }
    }
    if(lineCount<50)return {ok:false,reason:'No clear outline found. Import or draw a closed cartoon first.'};
    // Seal small anti-aliased gaps and keep wash OFF the line pixels.
    const walls=new Uint8Array(PIX);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const n=y*W+x;if(!raw[n])continue;
      for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)
        for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++)walls[yy*W+xx]=1;
    }
    const seed=seedY*W+seedX;
    if(walls[seed])return {ok:false,reason:'Tap inside the shape, away from the graphite line.'};
    const seen=new Uint8Array(PIX),queue=new Int32Array(PIX);
    const max=Math.floor(PIX*.48);
    let head=0,tail=0,touchesBorder=false,minX=W,minY=H,maxX=0,maxY=0;
    queue[tail++]=seed;seen[seed]=1;
    while(head<tail){
      const n=queue[head++],y=(n/W)|0,x=n-y*W;
      if(x<=1||x>=W-2||y<=1||y>=H-2){touchesBorder=true;break}
      if(x<minX)minX=x;if(x>maxX)maxX=x;
      if(y<minY)minY=y;if(y>maxY)maxY=y;
      if(tail>max)return {ok:false,reason:'This region is too large or the outline is open. No pigment applied.'};
      const around=[n-1,n+1,n-W,n+W];
      for(let k=0;k<4;k++){const next=around[k];if(!seen[next]&&!walls[next]){seen[next]=1;queue[tail++]=next}}
    }
    if(touchesBorder)return {ok:false,reason:'Open outline reaches paper edge. Close the shape before Fill.'};
    if(tail<64)return {ok:false,reason:'This enclosed area is too small for safe watercolor Fill.'};
    return {ok:true,seen,queue,length:tail,box:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
  }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function colorRgb(input){
    const m=/^#([0-9a-f]{6})$/i.exec(String(input));
    if(!m)return [89,130,158];
    return [0,2,4].map(n=>parseInt(m[1].slice(n,n+2),16));
  }
  function makePatch(region,paintImage,color,options={}){
    const {seen,queue,length,box}=region;
    const {x,y,w,h}=box;
    const full=paintImage.data;
    const patch=new Uint8ClampedArray(w*h*4);
    for(let row=0;row<h;row++){
      const from=((y+row)*W+x)*4;
      patch.set(full.subarray(from,from+w*4),row*w*4);
    }
    const coverage=clamp(Number(options.coverage??88),0,100)/100;
    const water=clamp(Number(options.soft??55),0,100)/100;
    const strength=clamp(Number(options.strength??32),0,100)/100;
    const [red,green,blue]=colorRgb(color);
    // Coverage determines fractional dry-pigment deposits INSIDE the mask.
    // Soft controls bounded feather and gentle capillary edge pooling.
    // Strength remains translucent enough to preserve graphite underneath.
    for(let i=0;i<length;i++){
      const n=queue[i],py=(n/W)|0,px=n-py*W,local=((py-y)*w+(px-x))*4;
      const noise=((px*73856093)^(py*19349663))>>>0;
      const jitter=(noise%1000)/1000;
      if(jitter>coverage*.98+.02)continue;
      let edge=0;
      if(!seen[n-1]||!seen[n+1]||!seen[n-W]||!seen[n+W])edge=1;
      const grain=.58+.42*((noise>>>11)%997)/997;
      const density=(.06+.35*strength)*grain*(edge?(1+.30*water):1);
      const alpha=clamp(density,0,.43);
      const da=patch[local+3]/255,combined=alpha+da*(1-alpha);
      if(combined<=0)continue;
      patch[local]=Math.round((red*alpha+patch[local]*da*(1-alpha))/combined);
      patch[local+1]=Math.round((green*alpha+patch[local+1]*da*(1-alpha))/combined);
      patch[local+2]=Math.round((blue*alpha+patch[local+2]*da*(1-alpha))/combined);
      patch[local+3]=Math.round(combined*255);
    }
    return new ImageData(patch,w,h);
  }
  function applyAt(clientX,clientY){
    if(busy)return {ok:false,reason:'Fill busy'};
    const tap=mapTap(clientX,clientY);
    if(!tap)return {ok:false,reason:'Tap inside the visible paper.'};
    busy=true;
    try{
      const refCtx=reference.getContext('2d',{willReadFrequently:true});
      const ctx=paint.getContext('2d',{willReadFrequently:true});
      if(!refCtx||!ctx)return {ok:false,reason:'Canvas renderer unavailable.'};
      const ref=refCtx.getImageData(0,0,W,H);
      const ink=ctx.getImageData(0,0,W,H);
      const region=identifyRegion(ref,ink,tap.x,tap.y);
      if(!region.ok){status(region.reason);return region;}
      const options=window.__ZGEN_BRUSH_CONTROLS?.fillSettings||{};
      const patch=makePatch(region,ink,bridge.selectedPigment(),options);
      const result=bridge.applyPatch(patch,region.box.x,region.box.y,region.length);
      if(!result.ok)status(result.reason);
      return result;
    }catch(err){
      status('Fill refused safely: '+String(err?.message||err));
      return {ok:false,reason:String(err?.message||err)};
    }finally{busy=false}
  }
  function cancelEvent(ev){ev.preventDefault();ev.stopImmediatePropagation()}
  paint.addEventListener('pointerdown',ev=>{
    if(!active)return;
    cancelEvent(ev);
    if(pending){wasMulti=true;return}
    pending={id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false};
    try{paint.setPointerCapture(ev.pointerId)}catch{}
  },true);
  paint.addEventListener('pointermove',ev=>{
    if(!active||!pending||ev.pointerId!==pending.id)return;
    cancelEvent(ev);
    if(Math.hypot(ev.clientX-pending.x,ev.clientY-pending.y)>12)pending.moved=true;
  },true);
  paint.addEventListener('pointerup',ev=>{
    if(!active)return;
    cancelEvent(ev);
    if(pending?.id===ev.pointerId){
      if(!pending.moved&&!wasMulti)applyAt(ev.clientX,ev.clientY);
      pending=null;wasMulti=false;
    }
  },true);
  for(const type of ['pointercancel','lostpointercapture']){
    paint.addEventListener(type,ev=>{
      if(!active)return;
      cancelEvent(ev);
      if(pending?.id===ev.pointerId){pending=null;wasMulti=false}
    },true);
  }
  window.__ZGEN_FILL={
    get active(){return active},
    toggle:()=>setActive(!active),
    applyAt,
    identifyRegion,
    makePatch,
    mapTap
  };
  return true;
  }
  // The original packed renderer is imported asynchronously from a module
  // in the HTML head. Wait for that real module, never replace its engine.
  let frames=0;
  function waitForRealPainter(){
    if(initialize())return;
    if(++frames<180)requestAnimationFrame(waitForRealPainter);
  }
  waitForRealPainter();
})();
