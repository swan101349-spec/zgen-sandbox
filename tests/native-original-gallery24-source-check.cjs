/* Owner-approved 24 original crops: native painter and publication integrity. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const base='f71bfc095b89771b3c46d63fe248f3bab538083f';
const folder='studio-recovery-20261124/assets/gallery24/';
const old=execFileSync('git',['show',base+':studio-recovery-20261124/index.html'],{encoding:'utf8'});
const now=fs.readFileSync('studio-recovery-20261124/index.html','utf8');
const suffix='<script src="./artist-feedback.js"></script></body></html>';
const newSuffix='<script src="./artist-feedback.js"></script><script src="./original-artwork-gallery.js"></script></body></html>';
assert.equal(now,old.replace(suffix,newSuffix),
  'Original painter/physics, history, HTML, imported-reference/retention bridge must not change except additive gallery loader');
const gallery=fs.readFileSync('studio-recovery-20261124/original-artwork-gallery.js','utf8');
assert.doesNotThrow(()=>new Function(gallery),'Original gallery JS must parse');
assert(gallery.includes('./assets/gallery24/')&&gallery.includes('APPROVED_CROP_ASSETS_NOT_PRESENT'));
assert(!gallery.includes('./assets/ghost-sheets/'),'Full private master sheets MUST NOT be served');
const manifest=JSON.parse(fs.readFileSync(folder+'manifest.json','utf8'));
assert.equal(manifest.schema,'zgen-owner-approved-gallery24-v1');
assert.equal(manifest.approved_for_publication,'2026-11-24');
assert.equal(manifest.master_sheets_included,false);
assert.deepEqual(manifest.image_resolution,[362,362]);
assert.equal(manifest.assets.length,24,'Exactly 24 individual approved crops');
const expected=[];
for(const family of ['graphite','rascal'])for(let number=1;number<=12;number++)
  expected.push(family+'-'+String(number).padStart(2,'0')+'.png');
assert.deepEqual(manifest.assets.map(x=>x.filename),expected,'Exactly 12 Sketchbook and 12 Rascal originals');
let nBytes=0;
for(const meta of manifest.assets){
 const filename=folder+meta.filename;
 const bytes=fs.readFileSync(filename);
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Authentic PNG header '+filename);
 assert.equal(bytes.length,meta.bytes,'Approved crop byte count '+filename);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256,
  'Original authorized pixel-preserving PNG SHA-256 mismatch '+filename);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert.equal(width,362);assert.equal(height,362);
 nBytes+=bytes.length;
}
const changed=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n');
const allowed=new Set([
 'studio-recovery-20261124/index.html','studio-recovery-20261124/original-artwork-gallery.js',
 'tests/native-original-gallery24-browser-check.cjs',
 'tests/native-original-gallery24-source-check.cjs',
 'tests/native-authorized-gallery24-browser-check.cjs',
 '.github/workflows/native-original-gallery24-qa.yml',
 '.github/workflows/native-authorized-gallery24-qa.yml',
 folder+'manifest.json',
 ...expected.map(name=>folder+name)]);
for(const file of changed)assert(allowed.has(file),'Unauthorized file changed: '+file);
assert.equal(changed.filter(x=>x.endsWith('.png')).length,24,
 'Only 24 individual cropped originals can be published, never whole sheets');
assert(!fs.existsSync('studio-recovery-20261124/assets/ghost-sheets/'),
 'Full original artist sheet(s) accidentally exposed');
console.log('ZGEN_OWNER_APPROVED_RASCAL24_SOURCE_PASS '+JSON.stringify({
 originalPainterUntouched:true,exactOwnerApprovedIndividualAssets:24,
 approvedCropTotalBytes:nBytes,fullMasterSheetsInPublicRepo:false,
 nativeRecoveryPreserved:true,originalHistoryPreserved:true
}));
