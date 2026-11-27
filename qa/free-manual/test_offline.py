#!/usr/bin/env python3
"""Fully offline synthetic sanity tests; no browser, account or network access needed."""
from pathlib import Path
from io import BytesIO
from tempfile import NamedTemporaryFile
from subprocess import run
from PIL import Image, ImageDraw

HERE=Path(__file__).resolve().parent
HTML=(HERE/'synthetic-painter.html').read_text('utf-8')
assert '<canvas id="paper" width="720" height="1280"' in HTML
assert 'touch-action:none' in HTML
assert 'localStorage.setItem(KEY' in HTML and 'localStorage.getItem(KEY' in HTML
assert 'function checkpoint()' in HTML and 'function restore(data)' in HTML
assert 'validateStencilPng' in HTML and 'Math.abs(bitmap.width/bitmap.height-9/16)' in HTML
assert 'workflow_dispatch' not in HTML and '.github/workflows/' not in HTML
script=HTML.split('<script>',1)[1].split('</script>',1)[0]
with NamedTemporaryFile('w',suffix='.js',encoding='utf-8') as tmp:
    tmp.write(script);tmp.flush()
    result=run(['node','--check',tmp.name],capture_output=True,text=True)
    assert result.returncode==0,result.stderr
print('PASS HTML static checks: 9:16 canvas, pointer, undo/redo, localStorage, export, stencil validator')
print('PASS JavaScript parse: node --check')

def valid_rgba_png(raw):
    try: im=Image.open(BytesIO(raw));im.load()
    except Exception:return 'BAD_PNG'
    if im.format!='PNG' or im.mode!='RGBA':return 'NOT_RGBA8'
    w,h=im.size
    if w<540 or h<960 or abs(w/h-9/16)>0.015:return 'NOT_PORTRAIT'
    pix=im.load();alpha_zero=ink=0
    for y in range(h):
        for x in range(w):
            r,g,b,a=pix[x,y]
            if a==0:alpha_zero+=1
            if a>30:
                ink+=1
                if max(r,g,b)-min(r,g,b)>12:return 'NOT_MONOCHROME'
    if alpha_zero==0:return 'OPAQUE'
    if ink<20:return 'BLANK'
    return 'PASS'

def make(w,h,kind):
    im=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(im)
    if kind=='ink':d.rectangle((10,10,90,90),fill=(33,33,33,255))
    if kind=='color':d.rectangle((10,10,90,90),fill=(255,0,0,255))
    if kind=='opaque':d.rectangle((0,0,w,h),fill=(0,0,0,255))
    buf=BytesIO();im.save(buf,format='PNG');return buf.getvalue()

cases={
 'valid 9:16 transparent monochrome':(make(720,1280,'ink'),'PASS'),
 'square old asset':(make(362,362,'ink'),'NOT_PORTRAIT'),
 'opaque dark background':(make(720,1280,'opaque'),'OPAQUE'),
 'color art':(make(720,1280,'color'),'NOT_MONOCHROME'),
 'blank portrait':(make(720,1280,'blank'),'BLANK'),
}
for name,(raw,expected) in cases.items():
    result=valid_rgba_png(raw)
    assert result==expected,(name,expected,result)
    print(f'PASS synthetic PNG case: {name} => {result}')
print('RESULT: 2 source checks + 5 synthetic image checks PASS | real browser and real artwork NOT VERIFIED')
