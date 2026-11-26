/* ZGEN S0 original JOB-M/N | C2 recovery independent cold-browser QA.
 * This is a disposable real Chromium disk profile, not the owner's artwork.
 * No hosted deployment or browser/owner credentials. No fake S Pen acceptance.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'zgen-c2-cold-profile-'));
const url='http://127.0.0.1:8765/studio-recovery-20261124/';
const root='http://127.0.0.1:8765/';
let context;
const options={headless:true,viewport:{width:390,height:844},isMobile:true,
 deviceScaleFactor:1,hasTouch:true,args:[
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
async function open(){
 context=await chromium.launchPersistentContext(profile,options);
 const page=context.pages()[0]||await context.newPage();
 return page;
}
async function ready(page){
 await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready &&
    window.__C4?.snapshot && window.__C4?.getState,
    null,{timeout:45000});
}
function fingerprint(){
 const layers=window.__C4.snapshot()?.document?.whole?.layers||{};
 const obj={};
 for(const [key,arr] of Object.entries(layers)){
  let h=2166136261,nonzero=0;
  for(let i=0;i<arr.length;i++){h=Math.imul(h^arr[i],16777619);if(arr[i])nonzero++;}
  obj[key]={hash:h>>>0,nonzero,length:arr.length};
 }
 return obj;
}
const snap=page=>page.evaluate(fnText=>{
 const fingerprint=eval('('+fnText+')');
 const wet=window.__C4.getState(),recovery=window.__ZGEN_ART_RECOVERY.status();
 return {paint:document.querySelector('#paint').toDataURL('image/png'),
  reference:document.querySelector('#reference').toDataURL('image/png'),
  refOpacity:document.querySelector('#reference').style.opacity,
  wetHash:fingerprint(),wetPhase:wet.phase,wetDirty:wet.dirty,
  recovery,history:window.__C4History?.()};
},fingerprint.toString());
async function storeRead(page){
 return await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('ZGenArtStudio-ThreeShell-Recovery',1);
   req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
  });
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction('artwork','readonly'),req=tx.objectStore('artwork').get('current-v1');
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
  }finally{db.close();}
 });
}
(async()=>{
 // First actual Chromium process. It owns a wholly isolated disk profile.
 let page=await open(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready(page);
 assert.equal((await snap(page)).recovery.blocked,false);
 assert.equal(await storeRead(page),undefined,'Fresh profile must not inherit saved art');
 await page.evaluate(()=>{
  const ref=document.querySelector('#reference').getContext('2d');
  ref.lineWidth=9;ref.strokeStyle='#202736';ref.strokeRect(250,450,220,340);
  document.querySelector('#reference').style.opacity='0.48';
 });
 const left=page.locator('#zshell-left .zshell-handle');
 await left.tap();await page.locator('#zshell-left-panel button[data-act="brush"]').tap();
 await page.locator('#drawer [data-brush="round"]').tap();
 await page.waitForFunction(()=>window.__ZGEN_BETA_26.state().brush==='round');
 const b=await page.locator('#paint').boundingBox();
 assert.ok(b && b.width>100 && b.height>200,'Visible 720x1280 paper');
 const pen=await context.newCDPSession(page);
 for(let n=0;n<15;n++){
  await pen.send('Input.dispatchMouseEvent',{
   type:n?'mouseMoved':'mousePressed',pointerType:'pen',
   x:b.x+b.width*(.22+.46*n/14),y:b.y+b.height*.24,
   button:'left',buttons:1,clickCount:n?0:1,force:.69});
 }
 await pen.send('Input.dispatchMouseEvent',{
  type:'mouseReleased',pointerType:'pen',
  x:b.x+b.width*.68,y:b.y+b.height*.24,button:'left',buttons:0,force:0});
 await pen.detach();
 await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:15000});
 await page.waitForFunction(()=>{
  const w=window.__C4.getState(),r=window.__ZGEN_ART_RECOVERY.status();
  return w.phase==='FIX'&&!w.wet.active&&!w.wet.fixing&&r.savedAt!=null&&r.lastError===null;
 },null,{timeout:60000});
 await page.waitForTimeout(700);
 const before=await snap(page),dbBefore=await storeRead(page);
 assert.equal(before.wetPhase,'FIX');
 assert.equal(before.recovery.lastError,null);
 assert.equal(Object.keys(before.wetHash).length,5);
 assert.equal(dbBefore.format,'ZGenArtStudio-ThreeShell-Recovery');
 assert.equal(dbBefore.paint,before.paint);
 assert.equal(dbBefore.reference,before.reference);
 assert.equal(dbBefore.referenceOpacity,before.refOpacity);
 assert.ok(dbBefore.wet?.document?.whole?.layers?.wet,
  'All C4 wet arrays stored atomically');
 console.log('ZGEN_JOB_M_COLD_PROFILE_BEFORE_CLOSE_PASS',JSON.stringify({
  hasOriginalStroke:true,recoverySavedAt:before.recovery.savedAt,
  hasFiveWetLayers:true,referenceOpacity:before.refOpacity,
  dirtyWetHistory:before.wetDirty,runOwnerDevice:false}));
 await context.close();context=null;

 // Second completely fresh Chromium process, same isolated on-disk profile.
 page=await open();page.on('pageerror',err=>errors.push(err.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready(page);
 const fresh=await snap(page);
 assert.equal(fresh.recovery.blocked,false,'Valid checkpoint must reopen safely');
 assert.equal(fresh.paint,before.paint,'Cold-process paint pixels');
 assert.equal(fresh.reference,before.reference,'Cold-process reference pixels');
 assert.equal(fresh.refOpacity,before.refOpacity,'Cold-process reference opacity');
 assert.deepEqual(fresh.wetHash,before.wetHash,'All five C4 GPU arrays cold restore');
 assert.equal(fresh.wetPhase,before.wetPhase,'Native wet FIX lifecycle restored');
 assert.deepEqual(errors,[],'No browser errors after fresh-process restore');
 console.log('ZGEN_JOB_M_COLD_BROWSER_PROCESS_REOPEN_PASS',JSON.stringify({
  coldProcessRestart:true,exactPaint:true,exactReference:true,
  exactOpacity:true,exactFiveWetArrays:true,blocked:false,
  physicalSPen:false,ownerFilesUntouched:true}));
 await context.close();context=null;

 // Corrupt ONLY this temporary profile, using a bare HTTP directory page
 // so the artist recovery helper is not loaded and cannot rewrite it.
 page=await open();
 await page.goto(root,{waitUntil:'domcontentloaded'});
 const corrupted=await page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{
   const r=indexedDB.open('ZGenArtStudio-ThreeShell-Recovery',1);
   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction('artwork','readwrite'),obj=tx.objectStore('artwork');
    const get=obj.get('current-v1');
    get.onerror=()=>reject(get.error);
    get.onsuccess=()=>{
     if(!get.result){reject(Error('No prior record to corrupt'));return;}
     const tamper={...get.result,format:'ZGenArtStudio-CORRUPTED-QA-ONLY'};
     obj.put(tamper);
    };
    tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);
   });
  }finally{db.close();}
 });
 assert.equal(corrupted,true);
 const bad=await storeRead(page);
 assert.equal(bad.format,'ZGenArtStudio-CORRUPTED-QA-ONLY');
 await context.close();context=null;

 // Fourth cold process: malformed recovery MUST fail closed.
 page=await open();page.on('pageerror',err=>errors.push(err.message));
 await page.goto(url,{waitUntil:'domcontentloaded'});await ready(page);
 const failClosed=await snap(page);
 assert.equal(failClosed.recovery.blocked,true,'Corrupt record must latch recovery STOP');
 assert.match(failClosed.recovery.lastError||'',/version\/dimensions invalid/i);
 const originalCorrupt=await storeRead(page);
 assert.equal(originalCorrupt.format,'ZGenArtStudio-CORRUPTED-QA-ONLY',
  'Corrupt record must not be overwritten on blocked recovery');
 assert.equal(originalCorrupt.paint,before.paint,'Original saved paint survives corruption hold');
 assert.equal(originalCorrupt.reference,before.reference,'Original saved reference survives hold');
 assert.equal(await page.evaluate(()=>window.__ZGEN_ART_RECOVERY.flush()),false,
  'Blocked recovery must refuse new writes');
 assert.deepEqual(errors,[],'No browser exceptions in fail-closed path');
 console.log('ZGEN_JOB_M_CORRUPT_COLD_REOPEN_FAIL_CLOSED_PASS',JSON.stringify({
  coldProcessRestart:true,blocked:true,refusedOverwrite:true,
  storedArtStillPresent:true,storedFormatIntentionallyInvalid:true,
  actualOwnerProfileUsed:false,physicalDevicePass:false}));
 await context.close();context=null;
})().catch(err=>{
 console.error('ZGEN_JOB_M_COLD_PROFILE_ACCEPTANCE_FAIL',err);
 process.exitCode=1;
}).finally(async()=>{
 if(context)await context.close();
 fs.rmSync(profile,{recursive:true,force:true});
});
