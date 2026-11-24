// P0 owner tablet failure: imported PNG appears briefly then artwork vanishes.
// This is TEST-ONLY against the existing public beta root. No painter or deploy edits.
// Desktop Chromium is not proof of physical Galaxy Tab S9 acceptance.
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const checkpoints=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
   '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const viewport of [{width:390,height:844},{width:800,height:1280},{width:853,height:533}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:true,isMobile:true,acceptDownloads:true});
   const downloads=[],errors=[],navigations=[];
   page.on('download',d=>downloads.push(d.suggestedFilename()));
   page.on('pageerror',e=>errors.push(e.message));
   page.on('framenavigated',f=>{if(f===page.mainFrame())navigations.push(f.url());});
   try{
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__ZGEN_THREE_SHELL &&
      window.__ZGEN_BETA_26 && window.__C4 && window.__ZGEN_FILL,{timeout:30000});
    const pngData=await page.evaluate(()=>{
      const can=document.createElement('canvas');
      can.width=720;can.height=1280;
      const ctx=can.getContext('2d');
      ctx.fillStyle='#e80085';ctx.fillRect(230,450,280,370);
      ctx.fillStyle='#121212';ctx.fillRect(250,580,200,50);
      return can.toDataURL('image/png').split(',')[1];
    });
    const png=Buffer.from(pngData,'base64');
    await page.locator('#file').setInputFiles({name:'owner-import-fixture.png',
      mimeType:'image/png',buffer:png});
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('Reference imported'),{timeout:20000});
    const measure=label=>page.evaluate(label=>{
      const ref=document.querySelector('#reference');
      const paint=document.querySelector('#paint');
      const board=document.querySelector('#board');
      const view=document.querySelector('#canvasArea');
      const ctx=ref.getContext('2d',{willReadFrequently:true});
      const p=[...ctx.getImageData(330,630,1,1).data];
      const rect=board.getBoundingClientRect(),area=view.getBoundingClientRect();
      return {label,pixel:p,refPng:ref.toDataURL('image/png'),
        dimensions:[ref.width,ref.height,paint.width,paint.height],
        opacity:getComputedStyle(ref).opacity,display:getComputedStyle(ref).display,
        board:[rect.width,rect.height],area:[area.width,area.height],
        zoom:window.__ZGEN_BETA_26?.state?.().zoom,
        history:window.__C4History?.()};
    },label);
    const before=await measure('import');
    assert(before.pixel[0]<50 && before.pixel[1]<50 && before.pixel[2]<50 && before.pixel[3]>250,
      'Actual import should place opaque black pixel in expected tracing layer: '+JSON.stringify(before.pixel));
    const stages=[];
    const preserved=async label=>{
      await page.waitForTimeout(350);
      const m=await measure(label);
      stages.push({label,pixel:m.pixel,backing:m.dimensions,opacity:m.opacity,
        board:m.board,canvasSame:m.refPng===before.refPng});
      assert.equal(m.refPng,before.refPng,label+': imported PNG vanished or was modified');
      assert.deepEqual(m.dimensions,[720,1280,720,1280],label+': canvas backing reset');
      assert.ok(Number(m.opacity)>0,label+': reference opacity was turned off');
      assert(m.board[0]>30&&m.board[1]>30,label+': paper disappeared visually');
      assert.deepEqual(downloads,[],label+': unsolicited file download');
      assert.deepEqual(errors,[],label+': browser page error');
    };
    await preserved('first 350 ms');
    await page.locator('#zshell-bottom .zshell-handle').click();
    await preserved('palette opened');
    await page.locator('#zshell-left .zshell-handle').click();
    await preserved('brush rail opened');
    await page.locator('#zshell-right .zshell-handle').click();
    await preserved('tools rail opened');
    await page.locator('#zshell-right-panel .zshell-viewbar button').first().click();
    await preserved('Fit Canvas');
    await page.setViewportSize({width:viewport.width===853?800:853,height:viewport.height===533?1280:533});
    await preserved('viewport changed');
    await page.locator('#zshell-right .zshell-handle').click();
    await preserved('tools closed');
    checkpoints.push({viewport,status:'PASS',importedPngBytes:png.length,
      stages,downloads,errors,navigations,physicalHardware:'UNTESTED'});
    console.log('PASS P0 public beta imported PNG survival '+JSON.stringify({viewport,stages:stages.map(s=>({
      label:s.label,canvasSame:s.canvasSame,backing:s.backing,opacity:s.opacity}))}));
   }catch(error){
    checkpoints.push({viewport,status:'FAIL',error:String(error.stack||error),
      downloads,errors,navigations,physicalHardware:'UNTESTED'});
    console.error('FAIL P0 owner-beta imported PNG survival '+JSON.stringify({
      viewport,error:String(error.message||error),downloads,errors,navigations}));
   }finally{await page.close();}
  }
 }finally{
  await fs.mkdir('three-shell-browser-qa',{recursive:true});
  await fs.writeFile('three-shell-browser-qa/p0-artwork-survival.json',
    JSON.stringify({scope:'actual public beta root, desktop Chromium only; Tab S9 owner still FAIL',
      checkpoints},null,2));
  await browser.close();
 }
 assert(checkpoints.every(x=>x.status==='PASS'),'P0 imported PNG disappearance regression FAIL');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
