/* ZGenArtStudio | isolated P0 artwork-survival bridge.
 * Preserves the original embedded C4 engine, brush behavior, and original UI.
 * Browser-local only; never uploads, downloads, clears storage, or alters files.
 * One atomic IndexedDB checkpoint: reference PNG + dry paint PNG + native C4 wet state.
 */
(() => {
  'use strict';
  const DB = 'ZGenArtStudio-ThreeShell-Recovery', STORE = 'artwork', KEY = 'current-v1';
  let dbTask, ready = false, blocked = false, savedAt = null, lastError = null;
  let timer = null, writing = null, repeat = false;
  const byId = id => document.getElementById(id);
  const message = text => { const el = byId('status'); if (el) el.textContent = text; };
  function engine() {
    const paint = byId('paint'), reference = byId('reference'), wet = window.__C4;
    if (!paint || !reference || !wet || typeof wet.snapshot !== 'function' ||
        typeof wet.restore !== 'function' || !window.__ZGEN_BETA_26)
      throw Error('Native painter not ready.');
    if (paint.width !== 720 || paint.height !== 1280 ||
        reference.width !== 720 || reference.height !== 1280)
      throw Error('Original 720x1280 paint dimensions changed.');
    return {paint, reference, wet};
  }
  function database() {
    if (dbTask) return dbTask;
    dbTask = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE))
          req.result.createObjectStore(STORE, {keyPath:'id'});
      };
      req.onsuccess = () => {
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error || Error('Artwork database unavailable.'));
      req.onblocked = () => reject(Error('Close duplicate studio tabs to unlock artwork.'));
    }).catch(e => { dbTask = null; throw e; });
    return dbTask;
  }
  async function record(mode, operation) {
    const db = await database();
    return new Promise((resolve,reject) => {
      let tx, req, value;
      try { tx = db.transaction(STORE,mode); req = operation(tx.objectStore(STORE)); }
      catch (e) { reject(e); return; }
      if (req) {
        req.onsuccess = () => { value = req.result; };
        req.onerror = () => { try { tx.abort(); } catch {} };
      }
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error || req?.error || Error('Artwork storage failed.'));
      tx.onabort = () => reject(tx.error || req?.error || Error('Artwork storage aborted.'));
    });
  }
  function validWet(wet) {
    const layers = wet?.document?.whole?.layers;
    if (wet?.version !== 'c4-webgl2/1' || !layers || !(layers.wet instanceof Uint16Array) ||
        !['inkA','inkB','fixedA','fixedB'].every(k => layers[k] instanceof Uint16Array &&
          layers[k].length === layers.wet.length * 4) ||
        layers.wet.length > 720*1280)
      throw Error('Native wet snapshot has unsupported shape; current artwork untouched.');
    return wet;
  }
  function capture() {
    const {paint, reference, wet} = engine();
    if (wet.active || wet.engine?.hostWetState?.fixing)
      throw Error('Current wet stroke is active; retry after it settles.');
    return {
      id:KEY, format:'ZGenArtStudio-ThreeShell-Recovery', version:1,
      updated:Date.now(), dimensions:[720,1280],
      paint:paint.toDataURL('image/png'), reference:reference.toDataURL('image/png'),
      referenceOpacity:reference.style.opacity,
      wet:validWet(wet.snapshot())
    };
  }
  async function flush() {
    if (!ready || blocked) return false;
    clearTimeout(timer); timer = null;
    if (writing) { repeat = true; return writing; }
    writing = (async () => {
      const snap = capture();
      // Committed transaction replaces all layers together, never one by one.
      await record('readwrite', store => store.put(snap));
      savedAt = snap.updated; lastError = null;
      return true;
    })().catch(e => {
      lastError = String(e.message || e);
      message('Artwork recovery save failed; keep this tab open. ' + lastError);
      return false;
    }).finally(() => {
      writing = null;
      if (repeat) { repeat = false; schedule(100); }
    });
    return writing;
  }
  function schedule(ms = 250) {
    if (!ready || blocked) return;
    clearTimeout(timer);
    timer = setTimeout(() => { flush(); }, ms);
  }
  function decode(data) {
    return new Promise((resolve,reject) => {
      if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,'))
        return reject(Error('Recovery PNG format invalid.'));
      const img = new Image();
      img.onload = () => img.naturalWidth === 720 && img.naturalHeight === 1280
        ? resolve(img) : reject(Error('Recovery PNG dimensions invalid.'));
      img.onerror = () => reject(Error('Recovery PNG is unreadable.'));
      img.src = data;
    });
  }
  async function recover() {
    const found = await record('readonly', store => store.get(KEY));
    if (!found) return false;
    if (found.format !== 'ZGenArtStudio-ThreeShell-Recovery' || found.version !== 1 ||
        found.dimensions?.[0] !== 720 || found.dimensions?.[1] !== 1280)
      throw Error('Recovery record version/dimensions invalid. Refusing overwrite.');
    validWet(found.wet);
    const [paintImage, referenceImage] = await Promise.all([decode(found.paint), decode(found.reference)]);
    const {paint,reference,wet} = engine();
    // Validate both PNG images and wet-state BEFORE writing any canvas pixel.
    const paintCtx = paint.getContext('2d'), refCtx = reference.getContext('2d');
    const backup = {
      paint:paintCtx.getImageData(0,0,720,1280),
      reference:refCtx.getImageData(0,0,720,1280),
      wet:validWet(wet.snapshot()), opacity:reference.style.opacity
    };
    try {
      wet.restore(found.wet);
      paintCtx.clearRect(0,0,720,1280); paintCtx.drawImage(paintImage,0,0);
      refCtx.clearRect(0,0,720,1280); refCtx.drawImage(referenceImage,0,0);
      if (typeof found.referenceOpacity === 'string') reference.style.opacity = found.referenceOpacity;
    } catch(e) {
      try {
        wet.restore(backup.wet);
        paintCtx.putImageData(backup.paint,0,0);
        refCtx.putImageData(backup.reference,0,0);
        reference.style.opacity=backup.opacity;
      } catch(rollback) {
        throw Error('Restore and rollback failed: '+e.message+' / '+rollback.message);
      }
      throw Error('Restore rejected, previous canvas retained: '+e.message);
    }
    savedAt = found.updated;
    message('Recovered imported reference and editable wet paint. Continue painting.');
    return true;
  }
  function watch() {
    // The painter's own pointerup handler runs before this bubbling listener.
    document.addEventListener('pointerup', e => {
      if (e.target?.id !== 'paint') return;
      schedule(150);
      // Wet pigment keeps moving after pointerup: capture settled state too.
      setTimeout(() => schedule(0), 1900);
    });
    const status = byId('status');
    if (status) {
      let previous = '';
      new MutationObserver(() => {
        const now = status.textContent || '';
        if (now !== previous) {
          previous = now;
          if (now.includes('Reference imported.') ||
              now.includes('Reference removed.') ||
              now.includes('Undone ') || now.includes('Redone ') ||
              now.includes('Bounded watercolor Fill applied.') ||
              now.includes('Painting cleared.') ||
              now.includes('Project reopened, both image layers restored.')) schedule(100);
        }
      }).observe(status,{childList:true,characterData:true,subtree:true});
    }
    document.addEventListener('click', e => {
      if (e.target.closest('[data-paper]')) schedule(300);
      const act = e.target.closest('[data-act]')?.dataset?.act;
      if (['dry','clearRef','undo','redo'].includes(act)) schedule(300);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', () => { flush(); });
  }
  async function start() {
    try {
      for (let i=0; i<100; i++) {
        try { engine(); break; }
        catch (e) {
          if (i===99) throw e;
          await new Promise(resolve=>setTimeout(resolve,100));
        }
      }
      await recover();
    } catch(e) {
      // Fail closed: never overwrite a saved checkpoint that cannot be loaded.
      blocked = true; lastError = String(e.message||e);
      message('Artwork recovery blocked; stored artwork not erased. '+lastError);
    } finally {
      ready = true;
      if (!blocked) watch();
    }
  }
  window.__ZGEN_ART_RECOVERY = Object.freeze({
    flush, status:()=>({ready,blocked,savedAt,lastError,writing:!!writing})
  });
  start();
})();