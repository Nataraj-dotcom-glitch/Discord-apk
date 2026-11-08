/**
 * content.js — DARK ALISE SoundPad v10.1.0 (ISOLATED WORLD)
 * Manages the floating widget UI, IndexedDB storage, and communication with hook.js.
 * Simple, light-DOM approach with bulletproof bubble-phase event blocking.
 */
'use strict';
(function () {

  /* ── IndexedDB Databases ─────────────────────────────────────────────── */
  var DB_NEW = 'SP8'; // Primary database (compatible with v8/v9)
  var DB_OLD = 'SoundPadKAC_73'; // Migration source database (v7.3)
  var ST = 'tracks';

  function openDB(name) {
    return new Promise(function(ok, fail) {
      var r = indexedDB.open(name, 1);
      r.onupgradeneeded = function(e) {
        e.target.result.createObjectStore(ST, { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = function(e) { ok(e.target.result); };
      r.onerror   = function(e) { fail(e.target.error); };
    });
  }

  function dbSave(name, buf) {
    return openDB(DB_NEW).then(function(db) {
      return new Promise(function(ok, fail) {
        var tx = db.transaction(ST, 'readwrite');
        tx.objectStore(ST).add({ name: name, buffer: buf });
        tx.oncomplete = ok; tx.onerror = function(e){ fail(e.target.error); };
      });
    });
  }

  function dbAll() {
    return openDB(DB_NEW).then(function(db) {
      return new Promise(function(ok, fail) {
        var r = db.transaction(ST,'readonly').objectStore(ST).getAll();
        r.onsuccess = function(){ ok(r.result); }; r.onerror = function(e){ fail(e.target.error); };
      });
    });
  }

  function dbGet(id) {
    return openDB(DB_NEW).then(function(db) {
      return new Promise(function(ok, fail) {
        var r = db.transaction(ST,'readonly').objectStore(ST).get(id);
        r.onsuccess = function(){ ok(r.result); }; r.onerror = function(e){ fail(e.target.error); };
      });
    });
  }

  function dbDel(id) {
    return openDB(DB_NEW).then(function(db) {
      return new Promise(function(ok, fail) {
        var tx = db.transaction(ST,'readwrite');
        tx.objectStore(ST).delete(id);
        tx.oncomplete = ok; tx.onerror = function(e){ fail(e.target.error); };
      });
    });
  }

  /* ── DB Migration (from v7.3 to v8/v9/v10) ───────────────────────────── */
  async function migrateIfNeeded() {
    try {
      var currentTracks = await dbAll();
      if (currentTracks.length > 0) return; // DB already has sounds
      
      // Try to open old DB
      var oldDB = await openDB(DB_OLD);
      if (!oldDB.objectStoreNames.contains(ST)) {
        oldDB.close();
        return;
      }
      
      var oldTracks = await new Promise(function(ok) {
        var r = oldDB.transaction(ST, 'readonly').objectStore(ST).getAll();
        r.onsuccess = function() { ok(r.result); };
        r.onerror = function() { ok([]); };
      });
      oldDB.close();
      
      if (oldTracks.length > 0) {
        console.log('[SP10 UI] Migrating ' + oldTracks.length + ' tracks from old v7.3 DB...');
        for (var i = 0; i < oldTracks.length; i++) {
          await dbSave(oldTracks[i].name, oldTracks[i].buffer);
        }
        console.log('[SP10 UI] Migration completed successfully.');
        renderList();
      }
    } catch (e) {
      console.warn('[SP10 UI] Migration skipped:', e);
    }
  }

  /* ── Send to hook.js (MAIN world) ─────────────────── */
  function cmd(obj) { window.postMessage(obj, '*'); }

  /* ── State ─────────────────────────────────────────── */
  var vol = 0.85, loop = false, playing = false, activeId = null, vizId = null;

  /* ── DOM refs ────────────────────────────────────────── */
  var listEl, dotEl, statusEl, vizCanvas, warnEl;

  var CSS = '\
#__sp10_host__{position:fixed;bottom:18px;right:14px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}\
#sp10-bubble{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#8b45c7,#e45bb5);box-shadow:0 0 0 3px rgba(88,101,242,.3);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;animation:sp10-pulse 2.8s ease-in-out infinite;user-select:none;}\
@keyframes sp10-pulse{0%,100%{box-shadow:0 0 0 3px rgba(88,101,242,.3)}50%{box-shadow:0 0 0 7px rgba(88,101,242,.08),0 6px 24px rgba(88,101,242,.45)}}\
#sp10-panel{display:none;width:272px;background:#0c0e14;border:1px solid rgba(255,255,255,.07);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.65);flex-direction:column;}\
#sp10-panel.open{display:flex;}\
.sp10-hd{padding:11px 13px;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;}\
.sp10-brand{font-size:13px;font-weight:700;background:linear-gradient(90deg,#b58cff,#e45bb5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}\
.sp10-sub{display:flex;align-items:center;gap:4px;font-size:10px;color:#4e5569;margin-top:2px;}\
.sp10-dot{width:6px;height:6px;border-radius:50%;background:#4e5569;flex-shrink:0;transition:.3s;}\
.sp10-dot.on{background:#3ba55d;box-shadow:0 0 6px #3ba55d88;}\
#sp10-stxt{color:#4e5569;transition:.3s;}\
#sp10-stxt.on{color:#3ba55d;}\
.sp10-x{background:none;border:none;color:#4e5569;font-size:17px;cursor:pointer;line-height:1;padding:2px 6px;}\
.sp10-x:hover{color:#e0e4ff;}\
.sp10-bd{padding:11px;display:flex;flex-direction:column;gap:8px;max-height:440px;overflow-y:auto;}\
.sp10-bd::-webkit-scrollbar{width:3px;}.sp10-bd::-webkit-scrollbar-thumb{background:#1e2130;border-radius:2px;}\
.sp10-card{background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.05);border-radius:9px;padding:9px 11px;display:flex;flex-direction:column;gap:6px;}\
.sp10-row{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#4e5569;}\
.sp10-row b{color:#c0c6df;}\
#__sp10_host__ input[type=range]{-webkit-appearance:none;width:100%;height:3px;background:rgba(255,255,255,.1);border-radius:2px;outline:none;}\
#__sp10_host__ input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#8b45c7;cursor:pointer;}\
.sp10-tog{position:relative;width:30px;height:16px;cursor:pointer;flex-shrink:0;}\
.sp10-tog input{display:none;}\
.sp10-thumb{position:absolute;inset:0;background:rgba(255,255,255,.1);border-radius:8px;transition:.2s;}\
.sp10-thumb::before{content:"";position:absolute;width:10px;height:10px;top:3px;left:3px;background:#fff;border-radius:50%;transition:.2s;}\
.sp10-tog input:checked+.sp10-thumb{background:#8b45c7;}\
.sp10-tog input:checked+.sp10-thumb::before{transform:translateX(14px);}\
canvas#sp10-viz{width:100%;height:26px;border-radius:6px;background:rgba(0,0,0,.2);display:block;}\
.sp10-lbl{font-size:10px;font-weight:700;color:#4e5569;text-transform:uppercase;letter-spacing:.6px;}\
.sp10-list{display:flex;flex-direction:column;gap:5px;}\
.sp10-empty{padding:16px;text-align:center;font-size:11px;color:#4e5569;}\
.sp10-item{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;cursor:pointer;transition:border-color .15s, background .15s;}\
.sp10-item:hover{border-color:#8b45c7;background:rgba(88,101,242,.07);}\
.sp10-item.active{border-color:#3ba55d;background:rgba(59,165,93,.08);}\
.sp10-ico{font-size:14px;flex-shrink:0;}\
.sp10-nm{flex:1;font-size:12px;color:#c0c6df;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\
.sp10-del{background:none;border:none;color:#4e5569;font-size:14px;cursor:pointer;padding:2px 6px;flex-shrink:0;}\
.sp10-del:hover{color:#ed4245;}\
.sp10-btns{display:flex;gap:6px;}\
.sp10-btn{flex:1;padding:9px 4px;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:.1s;}\
.sp10-btn:active{opacity:.8;transform:scale(.97);}\
.btn10-stop{background:#ed4245;color:#fff;}\
.btn10-add{background:#8b45c7;color:#fff;}\
.sp10-warn{font-size:10px;color:#faa61a;text-align:center;padding:5px 8px;background:rgba(250,166,26,.07);border-radius:6px;border:1px solid rgba(250,166,26,.15);}\
.sp10-note{font-size:10px;color:rgba(255,255,255,.17);text-align:center;}';

  var HTML = [
'<style>' + CSS + '</style>',
'<div id="__sp10_host__">',
'  <div id="sp10-bubble">🎵</div>',
'  <div id="sp10-panel">',
'    <div class="sp10-hd" id="sp10-drag">',
'      <div>',
'        <div class="sp10-brand">DARK ALISE</div>',
'        <div class="sp10-sub"><div class="sp10-dot" id="sp10-dot"></div><span id="sp10-stxt">Open bubble → start a call</span></div>',
'      </div>',
'      <button class="sp10-x" id="sp10-x">✕</button>',
'    </div>',
'    <div class="sp10-bd">',
'      <div class="sp10-warn" id="sp10-warn">⚠️ Open DARK ALISE before starting your call</div>',
'      <div class="sp10-card">',
'        <div class="sp10-row"><span>🔊 Volume</span><b id="sp10-vlbl">85%</b></div>',
'        <input type="range" id="sp10-vol" min="0" max="100" value="85">',
'        <div class="sp10-row" style="margin-top:3px"><span>🔁 Loop</span>',
'          <label class="sp10-tog"><input type="checkbox" id="sp10-loop"><div class="sp10-thumb"></div></label>',
'        </div>',
'      </div>',
'      <canvas id="sp10-viz"></canvas>',
'      <div class="sp10-lbl">Sound Board</div>',
'      <div class="sp10-list" id="sp10-list">',
'        <div class="sp10-empty">No sounds — tap Add!</div>',
'      </div>',
'      <div class="sp10-btns">',
'        <button class="sp10-btn btn10-stop" id="sp10-stop">⏹ Stop</button>',
'        <button class="sp10-btn btn10-add"  id="sp10-add">＋ Add Sound</button>',
'      </div>',
'      <div class="sp10-note">🎙 Sound is mixed into supported call microphone streams</div>',
'    </div>',
'  </div>',
'</div>',
'<input type="file" id="sp10-file" accept="audio/*" multiple style="display:none;">'
  ].join('');

  function mount() {
    var old = document.getElementById('__sp10_container__');
    if (old) old.remove();

    var root = document.createElement('div');
    root.id  = '__sp10_container__';
    root.innerHTML = HTML;
    document.documentElement.appendChild(root);

    listEl    = root.querySelector('#sp10-list');
    dotEl     = root.querySelector('#sp10-dot');
    statusEl  = root.querySelector('#sp10-stxt');
    vizCanvas = root.querySelector('#sp10-viz');
    warnEl    = root.querySelector('#sp10-warn');

    bindUI(root);
    renderList();
    setStatus(false);
    
    // Auto-migrate tracks from older version DBs if needed
    migrateIfNeeded();

    setTimeout(function() { cmd({ __sp10: 'ping' }); }, 500);
  }

  function bindUI(root) {
    var bubble  = root.querySelector('#sp10-bubble');
    var panel   = root.querySelector('#sp10-panel');
    var xbtn    = root.querySelector('#sp10-x');
    var volEl   = root.querySelector('#sp10-vol');
    var vlbl    = root.querySelector('#sp10-vlbl');
    var loopEl  = root.querySelector('#sp10-loop');
    var stopEl  = root.querySelector('#sp10-stop');
    var addEl   = root.querySelector('#sp10-add');
    var fileInput = root.querySelector('#sp10-file');
    var dragEl  = root.querySelector('#sp10-drag');
    var hostEl  = root.querySelector('#__sp10_host__');
    var container = root;

    /* 
     * Block ALL touch/mouse/keyboard events from bubbling past the container to Discord.
     * Since this is placed in the regular light DOM, it stops events in the bubble phase.
     * Discord never sees clicks/touches inside the widget, preventing site logout/navigation.
     */
    ['click','mousedown','mouseup','touchstart','touchend','touchmove',
     'pointerdown','pointerup','contextmenu','keydown','keyup','keypress'].forEach(function(ev) {
      container.addEventListener(ev, function(e) {
        e.stopPropagation();
      });
    });

    bubble.addEventListener('click', function(e) {
      e.preventDefault();
      cmd({ __sp10: 'init' }); // pre-warm AudioContext
      bubble.style.display = 'none';
      panel.classList.add('open');
    });

    xbtn.addEventListener('click', function(e) {
      e.preventDefault();
      panel.classList.remove('open');
      bubble.style.display = 'flex';
    });

    volEl.addEventListener('input', function() {
      vol = volEl.value / 100;
      vlbl.textContent = volEl.value + '%';
      cmd({ __sp10: 'vol', v: vol });
    });

    loopEl.addEventListener('change', function() {
      loop = loopEl.checked;
    });

    stopEl.addEventListener('click', function(e) {
      e.preventDefault();
      doStop();
    });

    addEl.addEventListener('click', function(e) {
      e.preventDefault();
      fileInput.click();
    });

    fileInput.addEventListener('change', async function() {
      for (var i = 0; i < fileInput.files.length; i++) {
        var f = fileInput.files[i];
        try {
          var buf = await readFile(f);
          await dbSave(f.name, buf);
        } catch(x) {}
      }
      fileInput.value = '';
      renderList();
    });

    makeDraggable(hostEl, dragEl);
    makeDraggable(hostEl, bubble);
  }

  /* ── Play ──────────────────────────────────────────── */
  async function doPlay(track) {
    try {
      var fresh = await dbGet(track.id);
      if (!fresh || !fresh.buffer) return;
      /* Copy buffer via slice to keep DB store intact */
      cmd({ __sp10: 'play', buf: fresh.buffer.slice(0), loop: loop });
      playing = true; activeId = track.id;
      renderList(); startViz(true);
    } catch(e) {}
  }

  function doStop() {
    cmd({ __sp10: 'stop' });
    playing = false; activeId = null;
    renderList(); startViz(false);
  }

  /* ── Render ────────────────────────────────────────── */
  async function renderList() {
    if (!listEl) return;
    var tracks = [];
    try { tracks = await dbAll(); } catch(e) {}
    if (!tracks.length) {
      listEl.innerHTML = '<div class="sp10-empty">No sounds — tap Add!</div>';
      return;
    }
    listEl.innerHTML = '';
    tracks.forEach(function(t) {
      var act = t.id === activeId && playing;
      var d = document.createElement('div');
      d.className = 'sp10-item' + (act ? ' active' : '');
      d.innerHTML =
        '<span class="sp10-ico">' + (act ? '🔊' : '🎵') + '</span>' +
        '<span class="sp10-nm" title="' + x(t.name) + '">' + x(t.name) + '</span>' +
        '<button class="sp10-del">🗑</button>';
        
      d.querySelector('.sp10-del').addEventListener('click', async function(e) {
        e.stopPropagation(); e.preventDefault();
        if (t.id === activeId) doStop();
        await dbDel(t.id); renderList();
      });
      
      d.addEventListener('click', function(e) {
        e.stopPropagation(); e.preventDefault();
        doPlay(t);
      });
      listEl.appendChild(d);
    });
  }

  /* ── Status ────────────────────────────────────────── */
  function setStatus(on) {
    if (!dotEl) return;
    if (on) {
      dotEl.classList.add('on'); statusEl.classList.add('on');
      statusEl.textContent = 'Call microphone connected ✅';
      if (warnEl) warnEl.style.display = 'none';
    } else {
      dotEl.classList.remove('on'); statusEl.classList.remove('on');
      statusEl.textContent = 'Open bubble → start a call';
      if (warnEl) warnEl.style.display = '';
    }
  }

  /* ── Visualizer ────────────────────────────────────── */
  function startViz(on) {
    if (!on) {
      if (vizId) { cancelAnimationFrame(vizId); vizId = null; }
      if (vizCanvas) { var c = vizCanvas.getContext('2d'); if(c) c.clearRect(0,0,vizCanvas.width,vizCanvas.height); }
      return;
    }
    if (vizId) return;
    var cv = vizCanvas; if (!cv) return;
    var cx = cv.getContext('2d'); if (!cx) return;
    function fr() {
      vizId = requestAnimationFrame(fr);
      var W = cv.offsetWidth||260, H = cv.offsetHeight||26;
      if (cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
      cx.clearRect(0,0,W,H);
      if(!playing) return;
      var bars=22, bw=W/bars, t=Date.now()/175;
      for(var i=0;i<bars;i++){
        var a=0.12+0.88*Math.abs(Math.sin(t+i*.41)*Math.cos(t*.7+i*.17));
        var h=a*H*.9;
        cx.fillStyle='hsl('+(210+i/bars*110)+',78%,58%)';
        cx.beginPath();
        if(cx.roundRect)cx.roundRect(i*bw+1,H-h,bw-2,h,2);
        else cx.rect(i*bw+1,H-h,bw-2,h);
        cx.fill();
      }
    }
    fr();
  }

  /* ── Drag ──────────────────────────────────────────── */
  function makeDraggable(el, handle) {
    var drag = false, ox = 0, oy = 0;
    function point(e) {
      var p = e.touches && e.touches.length ? e.touches[0] : (e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e);
      return { x: p.clientX, y: p.clientY };
    }
    function start(e) {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      var p = point(e), rect = el.getBoundingClientRect();
      drag = true; ox = p.x - rect.left; oy = p.y - rect.top;
      el.style.left = rect.left + 'px'; el.style.top = rect.top + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      document.addEventListener('pointermove', move, { passive: false, capture: true });
      document.addEventListener('pointerup', end, true);
      document.addEventListener('pointercancel', end, true);
      document.addEventListener('touchmove', move, { passive: false, capture: true });
      document.addEventListener('touchend', end, true);
      document.addEventListener('mousemove', move, true);
      document.addEventListener('mouseup', end, true);
    }
    function move(e) {
      if (!drag) return;
      var p = point(e), x = p.x - ox, y = p.y - oy;
      x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x));
      y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.style.right = 'auto'; el.style.bottom = 'auto';
      if (e.cancelable) e.preventDefault(); e.stopPropagation();
    }
    function end() {
      drag = false;
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', end, true);
      document.removeEventListener('pointercancel', end, true);
      document.removeEventListener('touchmove', move, true);
      document.removeEventListener('touchend', end, true);
      document.removeEventListener('mousemove', move, true);
      document.removeEventListener('mouseup', end, true);
    }
    handle.style.touchAction = 'none';
    handle.addEventListener('pointerdown', start);
    if (!window.PointerEvent) {
      handle.addEventListener('mousedown', start);
      handle.addEventListener('touchstart', start, { passive: false });
    }
  }

  /* ── Helpers ───────────────────────────────────────── */
  function x(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function readFile(f){
    return new Promise(function(ok,fail){
      var r=new FileReader(); r.onload=function(){ok(r.result);}; r.onerror=function(){fail(r.error);}; r.readAsArrayBuffer(f);
    });
  }

  /* ── Listen from hook.js ───────────────────────────── */
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.__sp10) return;
    var c = e.data.__sp10;
    if (c==='hooked') setStatus(true);
    if (c==='fail'||c==='idle') setStatus(false);
    if (c==='ended' && !loop) { playing=false; activeId=null; renderList(); startViz(false); }
  });

  /* ── SPA watcher ───────────────────────────────────── */
  var lastUrl = location.href;
  function watchSPA() {
    var obs = new MutationObserver(function(){
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(function(){
          if (!document.getElementById('__sp10_container__')) mount();
          cmd({ __sp10: 'ping' });
        }, 1200);
      }
    });
    if (document.body) obs.observe(document.body,{childList:true,subtree:false});
  }

  /* ── Boot ──────────────────────────────────────────── */
  function boot() {
    mount();
    watchSPA();
    setTimeout(function(){ cmd({ __sp10: 'ping' }); }, 600);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
