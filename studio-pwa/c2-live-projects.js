/* ZGenArtStudio Pro | C2 named, editable projects. LOCAL only; no download or upload.
 * Direct GPT-6 writer, 24 November 2026. Protected C4 painting logic stays unchanged.
 * IndexedDB provides atomic replacement (project bytes + index) or no replacement at all.
 */
(function () {
  'use strict';
  const DB = 'ZGenArtStudio-Pro-Editable-Projects', VERSION = 1;
  const PROJECTS = 'projects', INDEX = 'index';
  const D = [720, 1280];
  let dbPromise, currentId = null, currentName = '';
  let panel = null;
  function engine() {
    const bridge = window.__ZGEN_PROJECT_BRIDGE;
    const v3 = window.ZGenC2ProjectV3;
    const codec = window.ZGenC2WetCodec;
    if (!bridge || !v3 || !codec || v3.VERSION !== 3 || codec.VERSION !== 1)
      throw Error('Editable project bridge is not ready. Existing artwork was not changed.');
    return {bridge,v3,codec};
  }
  function database() {
    if (dbPromise) return dbPromise;
    if (!('indexedDB' in window)) return Promise.reject(Error('IndexedDB unavailable. Artwork was not changed.'));
    dbPromise = new Promise((resolve,reject) => {
      let req;
      try { req = indexedDB.open(DB,VERSION); } catch(e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(PROJECTS)) d.createObjectStore(PROJECTS,{keyPath:'id'});
        if (!d.objectStoreNames.contains(INDEX)) d.createObjectStore(INDEX,{keyPath:'id'});
      };
      req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
      req.onerror = () => reject(req.error || Error('Project database failed to open.'));
      req.onblocked = () => reject(Error('Close other studio tabs and retry.'));
    }).catch(e => { dbPromise = null; throw e; });
    return dbPromise;
  }
  async function transaction(stores, mode, work) {
    const d = await database();
    return new Promise((resolve,reject) => {
      let t,req,result;
      try { t = d.transaction(stores,mode); req = work(t); }
      catch(e) { if(t) try { t.abort(); } catch {} reject(e); return; }
      if (req) {
        req.onsuccess = () => { result = req.result; };
        req.onerror = () => { try { t.abort(); } catch {} };
      }
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error || (req && req.error) || Error('Project storage failed.'));
      t.onabort = () => reject(t.error || (req && req.error) || Error('Project storage aborted.'));
    });
  }
  function list() {
    return transaction([INDEX],'readonly',t => t.objectStore(INDEX).getAll())
      .then(items => items.sort((a,b) => b.updated - a.updated));
  }
  function get(id) {
    return transaction([PROJECTS],'readonly',t => t.objectStore(PROJECTS).get(id));
  }
  function validName(value) {
    if (typeof value !== 'string') throw Error('Project name required.');
    const name = value.trim();
    if (!name || name.length > 72) throw Error('Choose a name of 1 to 72 characters.');
    return name;
  }
  function uniqueId() {
    return typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  }
  function nativeWet(w) {
    if (!w || w.version !== 'c4-webgl2/1' || !w.document ||
        !w.document.whole || !w.document.whole.layers) throw Error('Project history wet-state version invalid.');
    const a = w.document.whole.layers, wet = a.wet;
    if (!(wet instanceof Uint16Array) || wet.length > 720*1280) throw Error('Project history wet layer invalid.');
    for (const key of ['inkA','inkB','fixedA','fixedB'])
      if (!(a[key] instanceof Uint16Array) || a[key].length !== 4*wet.length)
        throw Error('Project history pigment layer invalid.');
    return w;
  }
  function historyValid(h) {
    if (!h || !Array.isArray(h.undo) || !Array.isArray(h.redo) ||
        h.undo.length > 7 || h.redo.length > 7) throw Error('Project history invalid.');
    for (const entry of [...h.undo,...h.redo]) {
      if (!entry || typeof entry.kind !== 'string' ||
          !(entry.paint instanceof ImageData) || !(entry.reference instanceof ImageData) ||
          entry.paint.width !== D[0] || entry.paint.height !== D[1] ||
          entry.reference.width !== D[0] || entry.reference.height !== D[1])
        throw Error('Project history image invalid.');
      nativeWet(entry.wet);
    }
    return h;
  }
  async function save(name) {
    name = validName(name);
    const {bridge,v3} = engine();
    // Existing image remains untouched throughout capture, validation and DB commit.
    const snapshot = bridge.capture();
    const packageData = v3.pack({
      dimension:D, paint:snapshot.paint, reference:snapshot.reference,
      controls:snapshot.controls, wetSnapshot:snapshot.wetSnapshot
    });
    historyValid(snapshot.history);
    const metadata = await list();
    const same = metadata.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (same && same.id !== currentId) {
      if (!window.confirm('Replace the saved project "' + same.name + '"? The current painting will remain open.'))
        throw Error('Replacement cancelled. Current art unchanged.');
    }
    const id = same ? same.id : (currentId && currentName === name ? currentId : uniqueId());
    const updated = Date.now();
    const record = {id,format:'ZGenArtStudio-Editable',version:1,
      data:packageData,history:snapshot.history};
    const info = {id,name,updated,version:3};
    // Both records commit together. On quota, crash or abort, previous project survives.
    await transaction([PROJECTS,INDEX],'readwrite',t => {
      t.objectStore(PROJECTS).put(record);
      return t.objectStore(INDEX).put(info);
    });
    currentId = id; currentName = name;
    scheduleRecovery(0);
    return info;
  }
  function decodePng(data) {
    return new Promise((resolve,reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth !== D[0] || img.naturalHeight !== D[1])
          reject(Error('Decoded image dimensions invalid.'));
        else resolve(img);
      };
      img.onerror = () => reject(Error('Saved PNG cannot be decoded.'));
      img.src = data;
    });
  }
  async function open(id) {
    if (typeof id !== 'string' || !id) throw Error('Choose a saved project.');
    // P0 startup recovery and an intentional named Open must never race.
    // Complete automatic unsaved recovery first, then let the artist's chosen
    // named project win with its complete Undo/Redo history preserved.
    if (!recovery.ready) await startRecovery();
    const {bridge,v3} = engine();
    const record = await get(id);
    if (!record || record.id !== id || record.format !== 'ZGenArtStudio-Editable' ||
        record.version !== 1) throw Error('Saved project is missing or corrupt.');
    // Complete validation and image decoding BEFORE touching active painter pixels.
    const decoded = v3.unpack(record.data);
    if (decoded.version !== 3 || decoded.legacy || !decoded.wetSnapshot)
      throw Error('Project is not a native editable wet-state project.');
    const history = historyValid(record.history);
    const [paint,reference] = await Promise.all([decodePng(decoded.paint),decodePng(decoded.reference)]);
    const info = (await list()).find(x => x.id === id);
    if (!info || typeof info.name !== 'string') throw Error('Project index is missing.');
    const backup = bridge.backup();
    try {
      bridge.apply(decoded,paint,reference,history);
      // C4 WebGL2 host presentation is frame-scheduled. Do not report 'Opened'
      // while the restored wet texture has not yet reached its visible canvas.
      await new Promise(resolve => {
        let done=false;
        const finish=()=>{if(!done){done=true;clearTimeout(fallback);resolve();}};
        const fallback=setTimeout(finish,500);
        requestAnimationFrame(()=>requestAnimationFrame(finish));
      });
    }
    catch (e) {
      try { bridge.rollback(backup); }
      catch (rollbackError) {
        throw Error('Open failed AND rollback failed: ' + e.message + ' / ' + rollbackError.message);
      }
      throw Error('Open failed; original painting restored: ' + e.message);
    }
    currentId = id; currentName = info.name;
    scheduleRecovery(0);
    return info;
  }
  // P0 ARTWORK SURVIVAL: an unlisted, atomic, locally editable recovery slot.
  // This is separate from intentional named Save Artwork and Export PNG.
  // The last committed copy survives a tab/editor restart without a click.
  const RECOVERY_ID = '__zgen_unsaved_current_artwork_v1__';
  const recovery = {ready:false,restored:false,lastSavedAt:null,lastError:null};
  let recoveryBoot = null, recoveryTimer = null, recoveryWriting = null, needsAnotherSave = false;
  function twoFrames() {
    return new Promise(resolve => {
      let done=false;
      const complete=()=>{if(done)return;done=true;clearTimeout(fallback);resolve();};
      const fallback=setTimeout(complete,500);
      requestAnimationFrame(()=>requestAnimationFrame(complete));
    });
  }
  async function recoveryEngineReady() {
    // The protected source is a module while the three C2 support scripts
    // are deferred. On some Chromium/Android startups, DOMContentLoaded can
    // be observed before every bridge dependency is ready. Wait for all three.
    let failure=null;
    for(let attempt=0;attempt<50;attempt++){
      try{return engine()}catch(e){failure=e;}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw Error('Recovery engine failed to initialize: '+(failure?.message||'unknown'));
  }
  async function startRecovery() {
    if(recoveryBoot)return recoveryBoot;
    recoveryBoot=(async()=>{
      try {
        const {bridge,v3}=await recoveryEngineReady();
        const record=await get(RECOVERY_ID);
        if (record) {
          if (record.id!==RECOVERY_ID ||
              record.format!=='ZGenArtStudio-Editable' || record.version!==1)
            throw Error('Unsaved recovery format invalid');
          // Refuse malformed records before touching the original painter.
          const decoded=v3.unpack(record.data);
          if(decoded.version!==3||decoded.legacy||!decoded.wetSnapshot)
            throw Error('Unsaved wet recovery invalid');
          historyValid(record.history);
          const [paint,reference]=await Promise.all([
            decodePng(decoded.paint),decodePng(decoded.reference)
          ]);
          const backup=bridge.backup();
          try {
            bridge.apply(decoded,paint,reference,record.history);
            await twoFrames();
          }catch(e){
            try{bridge.rollback(backup)}catch(rollbackError){
              throw Error('Recovery and rollback failed: '+e.message+' / '+rollbackError.message);
            }
            throw e;
          }
          recovery.restored=true;
          recovery.lastSavedAt=record.updated||null;
          status('Recovered last editable artwork. Continue painting; Save Artwork to name it.');
        }
      }catch(e){
        recovery.lastError=String(e.message||e);
        status('Artwork recovery unavailable. Existing saved projects have NOT been erased.');
      }finally{
        recovery.ready=true;
      }
      return recovery.restored;
    })();
    return recoveryBoot;
  }
  function scheduleRecovery(delay=350) {
    if(!recovery.ready)return;
    clearTimeout(recoveryTimer);
    recoveryTimer=setTimeout(()=>{flushRecovery().catch(()=>{});},Math.max(0,delay));
  }
  async function flushRecovery() {
    clearTimeout(recoveryTimer);recoveryTimer=null;
    if(!recovery.ready)await startRecovery();
    if(recoveryWriting){needsAnotherSave=true;return recoveryWriting;}
    recoveryWriting=(async()=>{
      try {
        const {bridge,v3}=engine();
        const s=bridge.capture();
        const data=v3.pack({dimension:D,paint:s.paint,reference:s.reference,
          controls:s.controls,wetSnapshot:s.wetSnapshot});
        // Emergency recovery retains editable pixel layers, C4 wet texture and
        // brush state; omit the expensive 7-step historical undo images to
        // minimize mobile IndexedDB quota pressure. Named Save keeps full history.
        const history={undo:[],redo:[]};
        const record={id:RECOVERY_ID,format:'ZGenArtStudio-Editable',
          version:1,updated:Date.now(),data,history};
        await transaction([PROJECTS],'readwrite',t=>t.objectStore(PROJECTS).put(record));
        recovery.lastSavedAt=record.updated;
        recovery.lastError=null;
        return record.updated;
      }catch(e){
        recovery.lastError=String(e.message||e);
        status('Recovery save failed; keep this page open and use Save Artwork.');
        throw e;
      }
    })().finally(()=>{
      recoveryWriting=null;
      if(needsAnotherSave){needsAnotherSave=false;scheduleRecovery(0);}
    });
    return recoveryWriting;
  }
  function watchArtwork() {
    // Native paint listener finishes before bubbling pointerup reaches document.
    document.addEventListener('pointerup',e=>{
      if(e.target && e.target.id==='paint') {
        scheduleRecovery(250);
        // C4 continues wet settling after pointerup. Persist a later snapshot.
        setTimeout(()=>scheduleRecovery(0),1900);
      }
    });
    // Original decoded PNG import publishes this status AFTER drawing the pixels.
    let lastStatus='';
    const el=document.getElementById('status');
    if(el){
      const observer=new MutationObserver(()=>{
        const now=el.textContent||'';
        if(now!==lastStatus){
          lastStatus=now;
          if(now.includes('Reference imported.'))scheduleRecovery(0);
        }
      });
      observer.observe(el,{childList:true,characterData:true,subtree:true});
    }
    document.addEventListener('click',e=>{
      const action=e.target.closest('[data-act]')?.dataset?.act;
      if(['undo','redo','clear','clearRef','dry'].includes(action))scheduleRecovery(250);
      if(e.target.closest('[data-paper]'))scheduleRecovery(250);
    });
    // Best-effort emergency flush; correctness depends on the earlier saves,
    // because browsers can cancel writes during pagehide.
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden')flushRecovery().catch(()=>{});
    });
    window.addEventListener('pagehide',()=>flushRecovery().catch(()=>{}));
  }
  function recoveryStatus(){
    return {...recovery,writing:!!recoveryWriting};
  }
  function beginRecovery() {
    startRecovery().then(watchArtwork).catch(()=>{watchArtwork();});
  }
  function status(value) {
    const el = document.getElementById('status');
    if (el) el.textContent = value;
  }
  async function renderList() {
    const host = panel.querySelector('[data-zgen-project-list]');
    host.replaceChildren();
    try {
      const items = await list();
      if (!items.length) { const p=document.createElement('p');p.textContent='No saved artworks yet.';host.append(p);return; }
      for (const item of items) {
        const btn=document.createElement('button');btn.type='button';
        btn.className='zgen-project-row';
        btn.textContent=item.name + (item.id === currentId ? '  • current' : '');
        btn.addEventListener('click',async()=>{
          if (!window.confirm('Open "' + item.name + '"? Unsaved work on the current canvas will be replaced.')) return;
          btn.disabled=true;
          try {
            const opened=await open(item.id); close();
            status('Opened editable artwork: ' + opened.name + '. Continue painting.');
          } catch(e) { message(e.message); status('Open failed; artwork not discarded.'); }
          finally { btn.disabled=false; }
        });
        host.append(btn);
      }
    } catch(e) { message(e.message); }
  }
  function message(text) {
    if (!panel) return;
    panel.querySelector('[data-zgen-project-message]').textContent = text;
  }
  function close() {
    if (panel) panel.hidden=true;
  }
  function ensurePanel() {
    if(panel)return;
    const style=document.createElement('style');
    style.textContent='#zgen-projects-dialog[hidden]{display:none!important}'+
      '#zgen-projects-dialog{position:fixed;inset:0;z-index:99999;background:rgba(3,9,16,.92);'+
      'display:grid;place-items:center;padding:12px;color:#fff;font:16px system-ui,sans-serif}'+
      '#zgen-projects-dialog .project-card{width:min(100%,480px);max-height:88dvh;overflow:auto;'+
      'box-sizing:border-box;background:#182834;border:2px solid #d8d6cb;border-radius:12px;padding:14px}'+
      '#zgen-projects-dialog h2{font-size:20px;margin:4px 0 10px}'+
      '#zgen-projects-dialog input{box-sizing:border-box;width:100%;font-size:18px;padding:10px;'+
      'background:#fff;color:#111;border:2px solid #e1c989;border-radius:5px}'+
      '#zgen-projects-dialog button{font-size:16px;min-height:40px;padding:7px 12px;margin:6px 6px 2px 0;'+
      'background:#ebdfc2;color:#111;border:2px solid #e1c989;border-radius:6px}'+
      '#zgen-projects-dialog .zgen-project-row{width:100%;text-align:left;display:block;'+
      'overflow-wrap:anywhere;background:#f0eee8;margin:6px 0}'+
      '#zgen-projects-dialog [data-zgen-project-message]{min-height:1.6em;color:#ffdba3;'+
      'font-weight:600;overflow-wrap:anywhere}';
    document.head.append(style);
    panel=document.createElement('section');
    panel.id='zgen-projects-dialog';panel.hidden=true;panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Editable artwork projects');
    panel.innerHTML='<div class="project-card"><h2>Editable Artwork Projects</h2>'+
      '<p>Saved on this device, not downloaded. Export PNG is separate.</p>'+
      '<label for="zgen-project-name">Artwork name</label>'+
      '<input id="zgen-project-name" type="text" maxlength="72" autocomplete="off">'+
      '<div><button type="button" data-zgen-save>Save Artwork</button>'+
      '<button type="button" data-zgen-close>Close</button></div>'+
      '<p data-zgen-project-message role="status" aria-live="polite"></p>'+
      '<h3>Open Artwork</h3><div data-zgen-project-list></div>'+
      '<p>Projects stay in this browser. Clearing its site data may remove them.</p></div>';
    document.body.append(panel);
    panel.querySelector('[data-zgen-close]').addEventListener('click',close);
    const btn=panel.querySelector('[data-zgen-save]');
    btn.addEventListener('click',async()=>{
      btn.disabled=true;message('Saving the complete editable painting…');
      try {
        const saved=await save(panel.querySelector('#zgen-project-name').value);
        message('Saved: ' + saved.name + '. You can reopen it later.');
        status('Saved editable artwork: ' + saved.name);
        await renderList();
      } catch(e) { message('Save not completed: ' + e.message);status('Save failed; current art untouched.'); }
      finally { btn.disabled=false; }
    });
  }
  function show(mode) {
    ensurePanel();panel.hidden=false;
    panel.querySelector('#zgen-project-name').value=currentName;
    message(mode === 'open' ? 'Choose a named artwork below.' : 'Name your painting and save its editable wet state.');
    renderList();
    if(mode !== 'open') panel.querySelector('#zgen-project-name').focus();
  }
  window.ZGenNamedProjects = Object.freeze({ready:()=>{try{engine();return true}catch{return false}},
    save,open,list,show,close,flushRecovery,recoveryStatus,startRecovery});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',beginRecovery,{once:true});
  else beginRecovery();
})();
