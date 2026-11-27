#!/usr/bin/env python3
"""Local Playwright tests. Does not call GitHub, GitHub Actions, or any paid host."""
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from tempfile import TemporaryDirectory
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SIZES = [(320,640),(390,844),(430,932),(800,1280),(1024,768)]

@contextmanager
def local_server():
    class QuietHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)
        def log_message(self, *args):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
    worker = Thread(target=server.serve_forever,daemon=True);worker.start()
    try:
        yield f'http://127.0.0.1:{server.server_address[1]}/synthetic-painter.html'
    finally:
        server.shutdown();server.server_close()

def test_viewport(browser, url, w,h):
    context=browser.new_context(viewport={'width':w,'height':h},accept_downloads=True)
    page=context.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='load')
    assert page.evaluate('paper.width===720 && paper.height===1280')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    rect=page.locator('#paper').bounding_box()
    assert rect and rect['width']>0
    x,y=rect['x']+rect['width']*.35,rect['y']+rect['height']*.25
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+24,y+30,steps=7);page.mouse.up()
    assert page.locator('#status').inner_text()=='STROKE'
    assert page.evaluate('SYNTH_QA.pixel(252,320)[3]')>0
    page.locator('#undo').click();assert page.evaluate('SYNTH_QA.pixel(252,320)[3]')==0
    page.locator('#redo').click();assert page.evaluate('SYNTH_QA.pixel(252,320)[3]')>0
    page.locator('#save').click();assert page.locator('#status').inner_text()=='SAVED'
    page.reload();page.locator('#open').click();assert page.locator('#status').inner_text()=='OPENED'
    assert page.evaluate('SYNTH_QA.pixel(252,320)[3]')>0
    with page.expect_download() as d:page.locator('#export').click()
    download=d.value
    with TemporaryDirectory() as tmp:
        p=Path(tmp)/download.suggested_filename;download.save_as(p)
        with Image.open(p) as im:assert im.size==(720,1280) and im.mode=='RGBA'
    # Actual PNGs created within isolated browser memory, never owner files.
    results=page.evaluate('''async()=>{
      async function make(w,h,kind){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(kind==='opaque'){g.fillStyle='#000';g.fillRect(0,0,w,h);}else if(kind==='color'){g.fillStyle='#f00';g.fillRect(10,10,80,80);}else if(kind==='ink'){g.fillStyle='#222';g.fillRect(10,10,80,80);}return new Promise(r=>c.toBlob(r,'image/png'));}
      return await Promise.all([['portrait',720,1280,'ink'],['square',362,362,'ink'],['opaque',720,1280,'opaque'],['color',720,1280,'color'],['blank',720,1280,'blank']].map(async ([key,w,h,k])=>[key,(await SYNTH_QA.validateStencilPng(await make(w,h,k)))]));
    }''')
    result=dict(results)
    assert result['portrait']['ok'] is True
    assert [result[k]['reason'] for k in ('square','opaque','color','blank')]==['NOT_PORTRAIT','OPAQUE','NOT_MONOCHROME','BLANK']
    assert not errors,errors
    context.close()
    print(f'PASS viewport {w}x{h}: draw, undo/redo, reload Save/Open, PNG 9:16, five stencil cases, no JS errors')

if __name__=='__main__':
    with local_server() as url, sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'],headless=True)
        for w,h in SIZES:test_viewport(browser,url,w,h)
        browser.close()
    print('RESULT: 5/5 viewport groups PASS, 25/25 portrait-stencil cases PASS | SYNTHETIC ONLY')
