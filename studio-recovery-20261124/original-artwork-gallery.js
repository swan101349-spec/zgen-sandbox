/* ZGenArtStudio | authentic original-24 reference selector for the EXISTING Three-Shell.
 * Derived from the owner-approved private PR #82 gallery contract.
 * The two original source sheets stay PRIVATE. Public candidate has NO binary art.
 * Gate UI on BOTH same-origin 1448x1086 sheets. No placeholders or fake art.
 * Reuses the ORIGINAL native #file import, #reference paint separation, native history.
 * This adds NO new painter, canvas, storage, event owner, shortcut, or WordPress page.
 */
(() => {
  'use strict';
  const packs=Object.freeze([
    {id:'graphite',name:'Original Sketchbook'},
    {id:'rascal',name:'Ms. Rascal + Rascal Cat'}
  ]);
  const items=packs.flatMap(pack=>Array.from({length:12},(_,index)=>({
    pack,index,url:'./assets/gallery24/'+pack.id+'-'+String(index+1).padStart(2,'0')+'.png',
    title:pack.name+' '+String(index+1).padStart(2,'0')
  })));
  const byId=id=>document.getElementById(id);
  const originals=new Map();
  const status=()=>byId('status');
  const notify=message=>{const s=status();if(s)s.textContent=message;};
  function loadOriginal(item){
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>image.naturalWidth===362&&image.naturalHeight===362
        ?resolve(image):reject(Error('Original individual crop dimensions changed'));
      image.onerror=()=>reject(Error('Original approved crop is unavailable on this origin'));
      // No authentication token or cross-origin private URL exposed.
      image.src=new URL(item.url,document.baseURI).href;
    });
  }
  let startupChecks=0;
  async function init(){
    const panel=byId('zshell-bottom-panel'),file=byId('file');
    const paint=byId('paint'),reference=byId('reference');
    if(!panel||!file||!paint||!reference)return;
    if(!window.__ZGEN_BETA_26){
      // The verified native WebGL2/Canvas painter module can finish AFTER DOM ready.
      // Reuse its single original instance, never initialize a replacement.
      if(startupChecks++<80)setTimeout(init,100);
      else window.__ZGEN_ORIGINAL24_GATE='NATIVE_PAINTER_NOT_READY';
      return;
    }
    if(byId('zgen-original-gallery24'))return;
    if(paint.width!==720||paint.height!==1280||reference.width!==720||reference.height!==1280)return;
    try{
      const images=await Promise.all(items.map(loadOriginal));
      images.forEach((image,index)=>originals.set(items[index].url,image));
    }catch{
      // PRIVATE original sheets are not present in a public branch.
      // Fail closed: do not display empty/fake artwork buttons or touch user's painting.
      window.__ZGEN_ORIGINAL24_GATE='APPROVED_CROP_ASSETS_NOT_PRESENT';
      return;
    }
    const style=document.createElement('style');
    style.textContent=[
      '#zgen-original-gallery24{margin:6px 0;border-top:1px solid #9b865f;padding-top:7px;color:#ffe9bd}',
      '#zgen-original-gallery24 button{touch-action:manipulation}',
      '#zgen-original-gallery24 [hidden]{display:none!important}',
      '#zgen-original24-toggle{width:100%;min-height:36px;font:700 12px system-ui;background:#293b48;color:#fff0c7;border:1px solid #bea26e;border-radius:7px}',
      '#zgen-original24-body{margin-top:7px}',
      '#zgen-original24-body input{width:100%;min-height:34px;box-sizing:border-box;background:#fffefa;color:#15232a;border:1px solid #a88e61;border-radius:6px;padding:6px;font:12px system-ui}',
      '#zgen-original24-controls{display:flex;justify-content:space-between;align-items:center;gap:6px;margin:5px 0}',
      '#zgen-original24-controls span{font:600 11px system-ui}',
      '#zgen-original24-controls button{width:29px;height:30px;background:#284553;color:#fff;border:1px solid #bb9d68;border-radius:6px}',
      '#zgen-original24-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--tile,58px),1fr));gap:5px;max-height:min(37dvh,280px);overflow:auto;touch-action:pan-y}',
      '#zgen-original24-grid strong{grid-column:1/-1;font:700 11px system-ui;color:#ffe1aa}',
      '#zgen-original24-grid .zgen-original24-tile{width:100%;min-width:0;aspect-ratio:1;border:1px solid #c3aa80;border-radius:5px;background-color:#ede5d8;background-repeat:no-repeat;outline-offset:1px}',
      '#zgen-original24-grid .zgen-original24-tile:focus-visible{outline:3px solid white}',
      '#zgen-original24-message{font:11px/1.35 system-ui;margin:6px 0 2px}'
    ].join('\n');
    document.head.appendChild(style);
    const root=document.createElement('section');root.id='zgen-original-gallery24';
    root.innerHTML=
      '<button type="button" id="zgen-original24-toggle" aria-expanded="false" aria-controls="zgen-original24-body">▦ Original Illustrations · 24</button>'+
      '<div id="zgen-original24-body" hidden>'+
      '<input type="search" aria-label="Search original cartoons and stencils" placeholder="Search Sketchbook or Rascal">'+
      '<div id="zgen-original24-controls"><span>Tap an original to trace</span><div>'+
      '<button type="button" data-tile-size="-1" aria-label="Smaller illustration thumbnails">−</button> '+
      '<button type="button" data-tile-size="1" aria-label="Larger illustration thumbnails">＋</button></div></div>'+
      '<div id="zgen-original24-grid" role="group" aria-label="24 authentic illustrations"></div>'+
      '<p id="zgen-original24-message" role="status">Pinch thumbnails to enlarge. Painting stays intact.</p>'+
      '</div>';
    const note=panel.querySelector('.zshell-note');
    panel.insertBefore(root,note||null);
    const toggle=byId('zgen-original24-toggle'),body=byId('zgen-original24-body');
    const grid=byId('zgen-original24-grid'),input=root.querySelector('input');
    const message=byId('zgen-original24-message');
    let tileSize=58;const pointers=new Map();let pinch=null;
    function size(n){tileSize=Math.max(50,Math.min(120,Math.round(n)));
      grid.style.setProperty('--tile',tileSize+'px');}
    function opened(v){body.hidden=!v;toggle.setAttribute('aria-expanded',String(v));}
    toggle.addEventListener('click',()=>opened(body.hidden));
    root.querySelectorAll('[data-tile-size]').forEach(button=>button.addEventListener('click',
      ()=>size(tileSize+Number(button.dataset.tileSize)*14)));
    function hasReference(){
      const data=reference.getContext('2d',{willReadFrequently:true})
        .getImageData(0,0,reference.width,reference.height).data;
      for(let i=3;i<data.length;i+=4)if(data[i])return true;
      return false;
    }
    async function select(item){
      if(window.__C4?.active||window.__ZGEN_ART_RECOVERY?.status?.().blocked){
        message.textContent='Finish the current mark before importing a reference.';return;
      }
      if(hasReference()&&!window.confirm('Replace the tracing reference with '+item.title+'? Your painting will stay intact.'))return;
      message.textContent='Preparing '+item.title+'…';
      try{
        const source=originals.get(item.url);
        if(!source)throw Error('Original artist crop unavailable');
        const tile=document.createElement('canvas');tile.width=362;tile.height=362;
        tile.getContext('2d').drawImage(source,0,0,362,362);
        const blob=await new Promise((resolve,reject)=>tile.toBlob(
          b=>b?resolve(b):reject(Error('Reference crop could not become PNG')),'image/png'));
        const transfer=new DataTransfer();
        transfer.items.add(new File([blob],item.pack.id+'-'+String(item.index+1).padStart(2,'0')+'.png',{type:'image/png'}));
        file.files=transfer.files;
        file.dispatchEvent(new Event('change',{bubbles:true}));
        message.textContent=item.title+' sent to original tracing importer.';
        notify(item.title+' selected as tracing reference. Existing painting preserved.');
        opened(false);
      }catch(error){message.textContent='Import not applied: '+String(error.message||error);}
    }
    function render(){
      const query=input.value.trim().toLowerCase();
      grid.replaceChildren();let last=null,count=0;
      for(const item of items){
        if(query&&!item.title.toLowerCase().includes(query))continue;
        if(item.pack.id!==last){last=item.pack.id;
          const caption=document.createElement('strong');
          caption.textContent=item.pack.name+' · 12 originals';grid.appendChild(caption);}
        const button=document.createElement('button');button.type='button';
        button.className='zgen-original24-tile';
        button.setAttribute('aria-label','Import original '+item.title);
        button.title=item.title;
        button.style.backgroundImage='url("'+new URL(item.url,document.baseURI).href+'")';
        button.style.backgroundSize='cover';
        button.style.backgroundPosition='center';
        button.addEventListener('click',()=>select(item));
        grid.appendChild(button);count++;
      }
      if(!count){const empty=document.createElement('p');empty.textContent='No original matches that search.';grid.appendChild(empty);}
    }
    input.addEventListener('input',render);
    const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
    grid.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch')return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pointers.size===2)pinch={start:distance(),size:tileSize};
    });
    grid.addEventListener('pointermove',event=>{
      if(!pointers.has(event.pointerId))return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pinch&&pointers.size===2){size(pinch.size*distance()/Math.max(1,pinch.start));event.preventDefault();}
    },{passive:false});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])
      grid.addEventListener(type,event=>{pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;});
    render();
    window.__ZGEN_ORIGINAL24=Object.freeze({installed:24,capacity:120,
      source:'24-owner-approved-original-crops',open:()=>opened(true),close:()=>opened(false)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init()},{once:true});
  else init();
})();
