/* ZGEN original JOB-M/C2 | legacy Save/Open release-blocking contract.
 * Bounded real Chromium test on disposable art. Uses native Save button
 * intentionally; NOT a physical S Pen or the owner's project file.
 * Expects existing legacy behavior (flat PNG layers and refusal for wet C4).
 * A PASS is a NEGATIVE CHARACTERIZATION, not native named-project acceptance.
 */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},
  deviceScaleFactor:1,isMobile:true,hasTouch:true,acceptDownloads:true});
 const page=await context.newPage(),downloads=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('download',d=>downloads.push(d.suggestedFilename()));
 await page.goto('http://127.0.0.1:8765/studio-recovery-20261124/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__ZGEN_ART_RECOVERY?.status().ready&&
  !window.__ZGEN_ART_RECOVERY.status().blocked&&window.__C4?.getState,null,{timeout:45000});
 const snapshot=()=>page.evaluate(()=>({
  paint:document.querySelector('#paint').toDataURL(),
  ref:document.querySelector('#reference').toDataURL(),
  history:window.__C4History(),
  native:window.__C4.getState(),
  status:document.querySelector('#status')?.textContent
 }));
 const base=await snapshot();
 assert.equal(base.native.dirty,false,'Fresh test profile must start clean');
 // Explicit native Save Project. This is not an auto-download; the user action
 // is reproduced by invoking the existing button's native delegated handler.
 await page.evaluate(()=>{
  const files=document.querySelector('button[data-act="files"]');
  if(!files)throw Error('Legacy Files button is absent');
  files.click();
  const save=document.querySelector('#drawer [data-act="saveProject"]');
  if(!save)throw Error('Legacy Save Project button absent');
 });
 const expected=page.waitForEvent('download',{timeout:20000});
 await page.evaluate(()=>document.querySelector('#drawer [data-act="saveProject"]').click());
 const dl=await expected,filename=dl.suggestedFilename();
 const target=await dl.path(),project=JSON.parse(fs.readFileSync(target,'utf8'));
 assert.equal(filename,'ZGenArtStudio_26_project.zgen.json');
 assert.equal(project.format,'ZGenArtStudio');
 assert.equal(project.version,2,'Legacy flat-file container version');
 assert.deepEqual(project.dimension,[720,1280]);
 assert.match(project.paint,/^data:image\/png;base64,/);
 assert.match(project.reference,/^data:image\/png;base64,/);
 assert.equal(project.wet,undefined,'v2 flat export lacks editable C4 native wet state');
 assert.equal(project.history,undefined,'v2 flat export lacks C1 native undo history');
 assert.equal(project.name,undefined,'v2 export is not owner-named local project');
 assert.equal(downloads.length,1,'One explicitly requested project download');
 console.log('ZGEN_JOB_M_LEGACY_V2_FLAT_FILE_CONTRACT_PASS',JSON.stringify({
  filename,format:project.format,version:project.version,
  hasFlatPaintPNG:true,hasFlatReferencePNG:true,
  hasNativeWetState:false,hasNativeHistory:false,hasNamedProject:false,
  explicitDownloadOnly:true,ownerAcceptance:false
 }));
 // Establish an authentic C4 wet paint stroke, let the native lifecycle FIX
 // before trying Save. Historical dirty remains true intentionally.
 await page.evaluate(()=>{
  const files=document.querySelector('button[data-act="brush"]');
  if(!files)throw Error('Brush command absent');
  files.click();
 });
 await page.waitForFunction(()=>document.querySelector('#drawer [data-brush="round"]'),null,{timeout:10000});
 await page.evaluate(()=>document.querySelector('#drawer [data-brush="round"]').click());
 const canvas=page.locator('#paint'),bb=await canvas.boundingBox();
 assert.ok(bb&&bb.width>100&&bb.height>200);
 const session=await context.newCDPSession(page);
 for(let i=0;i<14;i++)await session.send('Input.dispatchMouseEvent',{
  type:i?'mouseMoved':'mousePressed',pointerType:'pen',
  x:bb.x+bb.width*(.20+.40*i/13),y:bb.y+bb.height*.25,
  button:'left',buttons:1,clickCount:i?0:1,force:.65
 });
 await session.send('Input.dispatchMouseEvent',{
  type:'mouseReleased',pointerType:'pen',x:bb.x+bb.width*.60,y:bb.y+bb.height*.25,
  button:'left',buttons:0,force:0
 });
 await session.detach();
 await page.waitForFunction(()=>window.__C4History().undo.includes('stroke'),null,{timeout:15000});
 await page.waitForFunction(()=>window.__C4.getState().phase==='FIX',null,{timeout:45000});
 const fixed=await snapshot();
 assert.equal(fixed.native.dirty,true,'Original wet history dirty stays true even at FIX');
 await page.evaluate(()=>{
  const files=document.querySelector('button[data-act="files"]');
  files.click();
  const save=document.querySelector('#drawer [data-act="saveProject"]');
  if(!save)throw Error('Save Project after FIX missing');
  save.click();
 });
 const blockedSave=await snapshot();
 assert.match(blockedSave.status,/BLOCKED: C2 atomic wet save not connected/i);
 assert.equal(blockedSave.paint,fixed.paint);
 assert.deepEqual(blockedSave.history,fixed.history);
 assert.equal(downloads.length,1,'Blocked wet Save must not download a flattening substitute');
 console.log('ZGEN_JOB_M_LEGACY_POSTFIX_NAMED_SAVE_REFUSAL_CONFIRMED',JSON.stringify({
  phase:fixed.native.phase,historicalDirty:fixed.native.dirty,
  nativeProjectSaveBlocked:true,noUnexpectedDownload:true,pixelsUnchanged:true,
  historyUnchanged:true
 }));
 // Native Open Project while C4 wet state exists fails closed. The supplied
 // v2 file is the harmless export from the same disposable browser context.
 await page.locator('#projectFile').setInputFiles({
  name:filename,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))
 });
 await page.waitForTimeout(160);
 const blockedOpen=await snapshot();
 assert.match(blockedOpen.status,/BLOCKED: preserve wet artwork until C2 connected/i);
 assert.equal(blockedOpen.paint,fixed.paint);
 assert.deepEqual(blockedOpen.history,fixed.history);
 assert.deepEqual(errors,[],'No browser runtime errors');
 console.log('ZGEN_JOB_M_LEGACY_POSTFIX_OPEN_REFUSAL_CONFIRMED',JSON.stringify({
  nativeWetUnchanged:true,refusalProtectedArt:true,physicalSpen:false,
  installedNamedEditableProjects:false,legacySaveOpenReleased:false
 }));
 await context.close();
})().catch(e=>{
 console.error('ZGEN_JOB_M_LEGACY_SAVE_OPEN_QA_FAIL',e);
 process.exitCode=1;
}).finally(async()=>{if(browser)await browser.close()});
