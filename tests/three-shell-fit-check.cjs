'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const js = fs.readFileSync('three-shell.js', 'utf8');
const css = fs.readFileSync('three-shell.css', 'utf8');
const html = fs.readFileSync('shell-v2.html', 'utf8');
new vm.Script(js, {filename:'three-shell.js'});

// Fit is a shell CSS size, not a bitmap resize. Protect the painting canvas.
assert.match(html, /<canvas id="paint" width="720" height="1280"/);
assert.match(html, /<canvas id="reference" width="720" height="1280"/);
assert.match(html, /href="\.\/three-shell\.css"/);
assert.match(html, /src="\.\/three-shell\.js"/);
assert.match(js, /let viewMode='fit'/);
assert.match(js, /zgen-paper-view-v2/);
assert.match(js, /new ResizeObserver\(queuePaperFit\)\.observe\(area\)/);
assert.match(js, /window\.visualViewport\?\.addEventListener\('resize',queuePaperFit\)/);
assert.doesNotMatch(js, /(?:canvas|paint|reference)\.width\s*=/);
assert.doesNotMatch(js, /(?:canvas|paint|reference)\.height\s*=/);
assert.match(css, /width:var\(--zgen-paper-width, 100%\)!important/);
assert.match(css, /height:var\(--zgen-paper-height, auto\)!important/);
assert.match(css, /\.zshell\.bottom\{[\s\S]*?width:min\(174px/);

// Extract the exact committed function rather than copying a parallel formula.
const signature = 'function recalculatePaperFit(){';
const start = js.indexOf(signature);
assert.notEqual(start, -1, 'recalculatePaperFit function exists');
let depth = 0, end = -1;
for (let i = js.indexOf('{', start); i < js.length; i++) {
  if (js[i] === '{') depth++;
  else if (js[i] === '}' && --depth === 0) { end = i + 1; break; }
}
assert.ok(end > start, 'function closes');
const fn = js.slice(start, end);

function size(w, h, mode) {
  const values = new Map();
  const scope = {
    area:{clientWidth:w,clientHeight:h},
    viewport:{style:{setProperty:(k,v)=>values.set(k,v)}},
    viewMode:mode
  };
  vm.runInNewContext(
    'const PAPER_W=720,PAPER_H=1280,PAPER_INSET=10;\n' +
    fn + '\nrecalculatePaperFit();', scope
  );
  return {
    width:parseFloat(values.get('--zgen-paper-width')),
    height:parseFloat(values.get('--zgen-paper-height'))
  };
}
const cases = [
  [360, 700, 'phone360'],
  [390, 750, 'phone390'],
  [430, 820, 'phone430'],
  [800, 1080, 'tabletPortrait'],
  [1180, 690, 'tabletLandscape'],
  [1400, 2800, 'wideTallNo470Cap']
];
for (const [w,h,name] of cases) {
  const fit = size(w,h,'fit');
  assert.ok(fit.width > 0 && fit.width <= w-10, name+' width inside area');
  assert.ok(fit.height > 0 && fit.height <= h-9.9, name+' height inside area');
  assert.ok(Math.abs(fit.width / fit.height - 9/16) < 0.001, name+' paper ratio');
  const fill = size(w,h,'fill');
  assert.equal(fill.width,w-10,name+' Fill Width fills available width');
}
assert.ok(size(1400,2800,'fit').width>470, 'historical cap removed');
assert.ok(Number.isNaN(size(0,0,'fit').width), 'hidden stage produces no width write');
console.log('PASS: source syntax, original 720x1280 drawing layer, 9:16 sizing at 6 viewports, fit/width separation, auto-resize wiring.');
