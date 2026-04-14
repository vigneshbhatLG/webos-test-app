/* ═══════════════════════════════════════════════════════════
   webOSTV.js — Simulator Test Suite
   app4tv.js  — main application logic
═══════════════════════════════════════════════════════════ */

/* ── Helpers ──────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

function set(id, value) {
  var el = $(id);
  if (el) el.innerHTML = value;
}

function setBool(id, value) {
  var el = $(id);
  if (!el) return;
  el.innerHTML = value === true  ? '<span style="color:#4caf50">true</span>'
               : value === false ? '<span style="color:#f44336">false</span>'
               : String(value);
}

// ── Global event log ──────────────────────────────────
var logEntries = [];

function log(tag, msg, level) {
  level = level || 'info';
  var now   = new Date();
  var ts    = now.toTimeString().slice(0, 8);
  var entry = { ts: ts, tag: tag, msg: msg, level: level };
  logEntries.unshift(entry);
  if (logEntries.length > 200) logEntries.pop();
  renderLog();
  set('log-count', logEntries.length);
}

function renderLog() {
  var el = $('event-log');
  if (!el) return;
  el.innerHTML = logEntries.map(function (e) {
    return '<div class="log-entry log-' + e.level + '">'
      + '<span class="log-ts">' + e.ts + '</span>'
      + '<span class="log-tag">[' + e.tag + ']</span>'
      + '<span class="log-msg">' + escHtml(e.msg) + '</span>'
      + '</div>';
  }).join('');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtJson(obj) {
  try { return JSON.stringify(obj, null, 2); }
  catch (e) { return String(obj); }
}

/* ══════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════ */
function initTabs() {
  var btns = document.querySelectorAll('.tab-btn');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      document.querySelectorAll('.tab-content').forEach(function (s) {
        s.classList.remove('active');
      });
      btn.classList.add('active');
      var pane = $(target);
      if (pane) pane.classList.add('active');
      log('TAB', 'switched to ' + target, 'info');
    });
  });
}

/* ══════════════════════════════════════════════════════
   CLOCK
══════════════════════════════════════════════════════ */
function updateClock() {
  set('clock', new Date().toLocaleString());
}

/* ══════════════════════════════════════════════════════
   TAB 1 — SYSTEM INFO
══════════════════════════════════════════════════════ */
function loadSystemInfo() {
  set('libVersion', webOS.libVersion);
  setBool('platform-tv',      webOS.platform.tv);
  setBool('platform-watch',   webOS.platform.watch);
  setBool('platform-unknown', webOS.platform.unknown);
  set('platform-chrome', webOS.platform.chrome !== undefined
      ? webOS.platform.chrome : '—');
  setBool('palmsystem', !!(window.PalmSystem));

  var sys = webOS.systemInfo();
  set('sys-country',       sys.country       || '—');
  set('sys-smart-country', sys.smartServiceCountry || '—');
  set('sys-timezone',      sys.timezone      || '—');
  set('useragent',         navigator.userAgent);

  var psRaw = '—';
  if (window.PalmSystem && window.PalmSystem.deviceInfo) {
    try { psRaw = fmtJson(JSON.parse(window.PalmSystem.deviceInfo)); }
    catch (e) { psRaw = window.PalmSystem.deviceInfo; }
  }
  set('ps-deviceinfo', escHtml(psRaw));

  log('SYSTEM', 'System info loaded, libVersion=' + webOS.libVersion, 'ok');
}

/* ══════════════════════════════════════════════════════
   TAB 2 — DEVICE INFO
══════════════════════════════════════════════════════ */
function loadDeviceInfo() {
  set('device-status', 'loading…');
  log('DEVICE', 'calling webOS.deviceInfo()', 'info');

  webOS.deviceInfo(function (d) {
    set('d-modelName',      d.modelName      || '—');
    set('d-brandName',      d.brandName      || '—');
    set('d-manufacturer',   d.manufacturer   || '—');
    set('d-mainboardMaker', d.mainboardMaker || '—');
    set('d-version',        d.version        || '—');
    set('d-sdkVersion',     d.sdkVersion     || '—');
    set('d-screenWidth',    d.screenWidth    || '—');
    set('d-screenHeight',   d.screenHeight   || '—');
    set('d-ddrSize',        d.ddrSize        || '—');
    set('d-platformBizType',d.platformBizType|| '—');
    setBool('d-uhd',        d.uhd);
    setBool('d-uhd8K',      d.uhd8K);
    setBool('d-oled',       d.oled);
    setBool('d-hdr10',      d.hdr10);
    setBool('d-dolbyVision',d.dolbyVision);
    setBool('d-dolbyAtmos', d.dolbyAtmos);
    setBool('d-tuner',      d.tuner);
    set('d-screen', window.screen.width + 'x' + window.screen.height);

    var badge = $('device-status');
    if (badge) { badge.textContent = 'loaded'; badge.className = 'badge ok'; }
    log('DEVICE', 'deviceInfo received: model=' + (d.modelName || '?'), 'ok');
  });
}

/* ══════════════════════════════════════════════════════
   TAB 3 — APP INFO
══════════════════════════════════════════════════════ */
function loadAppInfo() {
  set('appId',       webOS.fetchAppId()       || '—');
  set('appRootPath', webOS.fetchAppRootPath() || '—');

  webOS.fetchAppInfo(function (info) {
    if (!info) {
      log('APPINFO', 'fetchAppInfo returned undefined', 'warn');
      return;
    }
    set('ai-id',         info.id         || '—');
    set('ai-version',    info.version    || '—');
    set('ai-title',      info.title      || '—');
    set('ai-type',       info.type       || '—');
    set('ai-vendor',     info.vendor     || '—');
    set('ai-main',       info.main       || '—');
    set('ai-resolution', info.resolution || '—');
    set('ai-raw', escHtml(fmtJson(info)));
    log('APPINFO', 'appinfo.json loaded: id=' + info.id + ', v=' + info.version, 'ok');
  }, webOS.fetchAppRootPath() + 'appinfo.json');
}

/* ══════════════════════════════════════════════════════
   TAB 4 — LUNA SERVICES
══════════════════════════════════════════════════════ */
var SERVICE_DEFS = {
  time: {
    service: 'luna://com.palm.systemservice',
    method: 'time/getSystemTime',
    params: {},
    resultId: 'svc-time',
    format: function (r) { return Date(r.utc) + '\nutc: ' + r.utc; }
  },
  connman: {
    service: 'luna://com.palm.connectionmanager',
    method: 'getStatus',
    params: {},
    resultId: 'svc-connman',
    format: function (r) {
      return 'isInternetConnectionAvailable: ' + r.isInternetConnectionAvailable
        + '\nwifi: ' + JSON.stringify(r.wifi)
        + '\nwired: ' + JSON.stringify(r.wired);
    }
  },
  sdkver: {
    service: 'luna://com.webos.service.tv.systemproperty',
    method: 'getSystemInfo',
    params: { keys: ['sdkVersion', 'firmwareVersion', 'modelName'] },
    resultId: 'svc-sdkver',
    format: fmtJson
  },
  settings: {
    service: 'luna://com.webos.settingsservice',
    method: 'getSystemSettings',
    params: { category: 'sound', keys: ['soundOutput', 'soundOutputDigital', 'volumeControl'] },
    resultId: 'svc-settings',
    format: fmtJson
  },
  power: {
    service: 'luna://com.webos.service.tvpower',
    method: 'getPowerState',
    params: {},
    resultId: 'svc-power',
    format: fmtJson
  }
};

function callService(svcKey) {
  if (svcKey === 'custom') { callCustomService(); return; }
  var def = SERVICE_DEFS[svcKey];
  if (!def) return;
  set(def.resultId, 'calling…');
  log('LUNA', def.service + ' / ' + def.method, 'info');

  webOS.service.request(def.service, {
    method: def.method,
    parameters: def.params,
    onSuccess: function (res) {
      var text;
      try { text = def.format(res); } catch (e) { text = fmtJson(res); }
      set(def.resultId, escHtml(text));
      log('LUNA', '[ok] ' + def.method + ': ' + JSON.stringify(res).slice(0, 120), 'ok');
    },
    onFailure: function (res) {
      set(def.resultId, 'ERROR: ' + (res.errorText || res.errorCode));
      log('LUNA', '[fail] ' + def.method + ': ' + JSON.stringify(res), 'err');
    }
  });
}

function callCustomService() {
  var uri    = $('custom-uri')    ? $('custom-uri').value.trim()    : '';
  var method = $('custom-method') ? $('custom-method').value.trim() : '';
  var params = {};

  if (!uri || !method) {
    set('svc-custom', 'ERROR: fill in service URI and method');
    return;
  }
  try { params = JSON.parse($('custom-params').value || '{}'); }
  catch (e) { set('svc-custom', 'ERROR: invalid JSON params'); return; }

  set('svc-custom', 'calling…');
  log('LUNA', 'custom: ' + uri + ' / ' + method, 'info');

  webOS.service.request(uri, {
    method: method,
    parameters: params,
    onSuccess: function (res) {
      set('svc-custom', escHtml(fmtJson(res)));
      log('LUNA', '[ok custom] ' + method, 'ok');
    },
    onFailure: function (res) {
      set('svc-custom', 'ERROR: ' + (res.errorText || res.errorCode || fmtJson(res)));
      log('LUNA', '[fail custom] ' + method, 'err');
    }
  });
}

function initServiceButtons() {
  document.querySelectorAll('.svc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      callService(btn.getAttribute('data-svc'));
    });
  });
}

/* ══════════════════════════════════════════════════════
   TAB 5 — KEY EVENTS
══════════════════════════════════════════════════════ */
var keyCounts = { keydown: 0, keyup: 0, keypress: 0 };
var keyLog    = [];

// Maps keyCode -> dpad element id
var KEY_MAP = {
  38: 'dpad-up',    40: 'dpad-down',
  37: 'dpad-left',  39: 'dpad-right',
  13: 'dpad-ok',    461: 'dpad-back', 8: 'dpad-back',
  403: 'dpad-red',  404: 'dpad-green',
  405: 'dpad-yellow', 406: 'dpad-blue',
  415: 'dpad-play', 19: 'dpad-pause',
  413: 'dpad-stop', 417: 'dpad-ff',
  412: 'dpad-rw',
  457: 'dpad-info', 36: 'dpad-info',
  18: 'dpad-menu'
};

var KEY_NAMES = {
  38: 'UP', 40: 'DOWN', 37: 'LEFT', 39: 'RIGHT',
  13: 'OK / ENTER', 461: 'BACK', 8: 'BACK',
  403: 'RED', 404: 'GREEN', 405: 'YELLOW', 406: 'BLUE',
  415: 'PLAY', 19: 'PAUSE', 413: 'STOP',
  417: 'FAST-FORWARD', 412: 'REWIND',
  457: 'INFO', 36: 'HOME', 18: 'MENU'
};

var activeDpad = null;

function flashDpad(keyCode) {
  if (activeDpad) {
    var prev = $(activeDpad);
    if (prev) prev.classList.remove('active');
  }
  var id = KEY_MAP[keyCode];
  if (id) {
    var el = $(id);
    if (el) {
      el.classList.add('active');
      activeDpad = id;
      setTimeout(function () { el.classList.remove('active'); activeDpad = null; }, 300);
    }
  }
}

function handleKeyEvent(e) {
  var type = e.type;
  keyCounts[type] = (keyCounts[type] || 0) + 1;
  set('kstat-down',  keyCounts.keydown);
  set('kstat-up',    keyCounts.keyup);
  set('kstat-press', keyCounts.keypress);

  var name = KEY_NAMES[e.keyCode] || e.key || ('code ' + e.keyCode);

  if (type === 'keydown') {
    set('key-name', name);
    set('key-code', 'keyCode: ' + e.keyCode);
    set('key-type', 'event: keydown');
    flashDpad(e.keyCode);

    var entry = '<div class="key-entry"><span>' + ts() + '</span> '
      + escHtml(type) + ' — ' + escHtml(name) + ' (keyCode:' + e.keyCode + ')</div>';
    keyLog.unshift(entry);
    if (keyLog.length > 20) keyLog.pop();
    var klEl = $('key-log');
    if (klEl) klEl.innerHTML = keyLog.join('');

    log('KEY', type + ' — ' + name + ' (keyCode:' + e.keyCode + ')', 'key');
  }
}

function ts() { return new Date().toTimeString().slice(0, 8); }

function initKeyEvents() {
  ['keydown', 'keyup', 'keypress'].forEach(function (t) {
    document.addEventListener(t, handleKeyEvent);
  });
}

/* ══════════════════════════════════════════════════════
   TAB 6 — LIFECYCLE
══════════════════════════════════════════════════════ */
function miniLog(id, msg) {
  var el = $(id);
  if (!el) return;
  var line = '<div>' + ts() + ' ' + escHtml(msg) + '</div>';
  el.innerHTML = line + el.innerHTML;
}

function initLifecycle() {
  // Page visibility
  document.addEventListener('visibilitychange', function () {
    var state = document.visibilityState;
    var el = $('lc-vis-state');
    if (el) { el.textContent = state; el.className = 'lc-state ' + (state === 'hidden' ? 'bad' : ''); }
    miniLog('lc-vis-log', 'visibilitychange → ' + state);
    log('LIFECYCLE', 'visibilitychange: ' + state, state === 'hidden' ? 'warn' : 'ok');
  });

  // Window focus / blur
  window.addEventListener('focus', function () {
    var el = $('lc-focus-state');
    if (el) { el.textContent = 'focused'; el.className = 'lc-state'; }
    miniLog('lc-focus-log', 'focus');
    log('LIFECYCLE', 'window focus', 'ok');
  });
  window.addEventListener('blur', function () {
    var el = $('lc-focus-state');
    if (el) { el.textContent = 'blurred'; el.className = 'lc-state warn'; }
    miniLog('lc-focus-log', 'blur');
    log('LIFECYCLE', 'window blur', 'warn');
  });

  // Unload
  window.addEventListener('beforeunload', function () {
    miniLog('lc-unload-log', 'beforeunload fired');
    log('LIFECYCLE', 'beforeunload', 'warn');
  });
  window.addEventListener('pagehide', function (e) {
    var el = $('lc-unload-state');
    if (el) { el.textContent = 'pagehide (persisted:' + e.persisted + ')'; el.className = 'lc-state warn'; }
    miniLog('lc-unload-log', 'pagehide persisted=' + e.persisted);
    log('LIFECYCLE', 'pagehide, persisted=' + e.persisted, 'warn');
  });

  // webOS relaunch (Mojo.relaunch or webOSRelaunch event)
  if (window.Mojo) {
    window.Mojo.relaunch = function (params) {
      var el = $('lc-relaunch-state');
      if (el) { el.textContent = 'relaunched'; el.className = 'lc-state warn'; }
      miniLog('lc-relaunch-log', 'Mojo.relaunch: ' + JSON.stringify(params));
      log('LIFECYCLE', 'Mojo.relaunch: ' + JSON.stringify(params), 'warn');
    };
  }
  document.addEventListener('webOSRelaunch', function (e) {
    var el = $('lc-relaunch-state');
    if (el) { el.textContent = 'webOSRelaunch'; el.className = 'lc-state warn'; }
    miniLog('lc-relaunch-log', 'webOSRelaunch event: ' + JSON.stringify(e.detail));
    log('LIFECYCLE', 'webOSRelaunch event', 'warn');
  });

  // Simulate buttons
  $('btn-simulate-relaunch').addEventListener('click', function () {
    if (window.Mojo && typeof window.Mojo.relaunch === 'function') {
      window.Mojo.relaunch({ simulated: true });
    } else {
      var ev = new CustomEvent('webOSRelaunch', { detail: { simulated: true } });
      document.dispatchEvent(ev);
    }
  });
  $('btn-simulate-blur').addEventListener('click', function () {
    var ev = new Event('blur');
    window.dispatchEvent(ev);
  });
  $('btn-simulate-hidden').addEventListener('click', function () {
    miniLog('lc-vis-log', '[simulated] visibilitychange → hidden');
    log('LIFECYCLE', '[simulated] visibilitychange: hidden', 'warn');
  });
}

/* ══════════════════════════════════════════════════════
   TAB 7 — CURSOR / INPUT
══════════════════════════════════════════════════════ */
var kbPollInterval = null;

function checkKeyboard() {
  var showing = false;
  try { showing = webOS.keyboard.isShowing(); } catch (e) { showing = false; }
  var el = $('kb-state');
  if (el) {
    el.innerHTML = showing
      ? '<span style="color:#4caf50">showing</span>'
      : '<span style="color:#f44336">not showing</span>';
  }
  var vkbEl = $('vkb-status');
  if (vkbEl) { vkbEl.textContent = showing ? 'VKB visible' : 'VKB hidden'; }
  return showing;
}

function initCursor() {
  // Keyboard poll toggle
  $('btn-kb-poll').addEventListener('click', function () {
    if (kbPollInterval) {
      clearInterval(kbPollInterval);
      kbPollInterval = null;
      set('kb-poll', 'OFF');
      this.textContent = 'Start KB Poll';
      log('INPUT', 'keyboard poll stopped', 'info');
    } else {
      kbPollInterval = setInterval(checkKeyboard, 1000);
      set('kb-poll', 'ON (1s)');
      this.textContent = 'Stop KB Poll';
      log('INPUT', 'keyboard poll started', 'info');
    }
  });

  $('btn-kb-check').addEventListener('click', function () {
    var s = checkKeyboard();
    log('INPUT', 'keyboard.isShowing() = ' + s, 'info');
  });

  // VKB test input
  var vkbInput = $('vkb-input');
  if (vkbInput) {
    ['focus', 'blur', 'click'].forEach(function (t) {
      vkbInput.addEventListener(t, function () {
        setTimeout(checkKeyboard, 200);
        log('INPUT', 'vkb-input ' + t, 'info');
      });
    });
  }

  // Pointer canvas
  var canvas = $('pointer-canvas');
  var dot    = $('pointer-dot');
  if (canvas && dot) {
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      dot.style.display = 'block';
      dot.style.left = x + 'px';
      dot.style.top  = y + 'px';
      set('cursor-x', Math.round(x));
      set('cursor-y', Math.round(y));
      set('pointer-type', e.pointerType || 'mouse');
    });
    canvas.addEventListener('mouseleave', function () {
      dot.style.display = 'none';
    });
    canvas.addEventListener('pointermove', function (e) {
      set('pointer-type', e.pointerType || '—');
    });
  }
}

/* ══════════════════════════════════════════════════════
   TAB 8 — LOG BUTTONS
══════════════════════════════════════════════════════ */
function initLogButtons() {
  $('btn-clear-log').addEventListener('click', function () {
    logEntries = [];
    renderLog();
    set('log-count', 0);
  });
  $('btn-copy-log').addEventListener('click', function () {
    var text = logEntries.map(function (e) {
      return e.ts + ' [' + e.tag + '] ' + e.msg;
    }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        log('LOG', 'log copied to clipboard', 'ok');
      }).catch(function () {
        log('LOG', 'clipboard write failed', 'err');
      });
    } else {
      log('LOG', 'clipboard API not available', 'warn');
    }
  });
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
window.addEventListener('load', function () {
  initTabs();
  updateClock();
  setInterval(updateClock, 1000);

  // System tab
  loadSystemInfo();
  $('btn-refresh-system').addEventListener('click', function () {
    loadSystemInfo();
    log('SYSTEM', 'system info refreshed', 'info');
  });
  $('btn-platformBack').addEventListener('click', function () {
    log('SYSTEM', 'platformBack() called', 'warn');
    webOS.platformBack();
  });

  // Device tab
  loadDeviceInfo();
  $('btn-deviceInfo').addEventListener('click', loadDeviceInfo);

  // App info tab
  loadAppInfo();
  $('btn-fetchAppInfo').addEventListener('click', loadAppInfo);

  // Luna services tab
  initServiceButtons();

  // Key events tab
  initKeyEvents();

  // Lifecycle tab
  initLifecycle();

  // Cursor / input tab
  initCursor();

  // Log tab
  initLogButtons();

  log('APP', 'Test suite initialised — webOSTV.js v' + webOS.libVersion, 'ok');
});
