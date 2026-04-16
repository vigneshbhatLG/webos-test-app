"use strict";

/* ═══════════════════════════════════════════════════════════
   webOSTV.js — Simulator Test Suite
   app4tv.js  — main application logic
═══════════════════════════════════════════════════════════ */

/* ── Helpers ──────────────────────────────────────────── */
function $(id) {
  return document.getElementById(id);
}

function set(id, value) {
  var el = $(id);
  if (el) el.innerHTML = value;
}

function setBool(id, value) {
  var el = $(id);
  if (!el) return;
  el.innerHTML = value === true ? '<span style="color:#4caf50">true</span>' : value === false ? '<span style="color:#f44336">false</span>' : String(value);
} // ── Global event log ──────────────────────────────────


var logEntries = [];

function log(tag, msg, level) {
  level = level || 'info';
  var now = new Date();
  var ts = now.toTimeString().slice(0, 8);
  var entry = {
    ts: ts,
    tag: tag,
    msg: msg,
    level: level
  };
  logEntries.unshift(entry);
  if (logEntries.length > 200) logEntries.pop();
  renderLog();
  set('log-count', logEntries.length);
}

function renderLog() {
  var el = $('event-log');
  if (!el) return;
  el.innerHTML = logEntries.map(function (e) {
    return '<div class="log-entry log-' + e.level + '">' + '<span class="log-ts">' + e.ts + '</span>' + '<span class="log-tag">[' + e.tag + ']</span>' + '<span class="log-msg">' + escHtml(e.msg) + '</span>' + '</div>';
  }).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}
/* ══════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════ */


function initTabs() {
  var btns = document.querySelectorAll('.tab-btn');
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab');
      setActiveTab(target, 'click');
    });
  }); // Keep the first visible tab button as default RCU focus.

  var activeTabBtn = document.querySelector('.tab-btn.active');
  if (activeTabBtn) applyRcuFocus(activeTabBtn);
}

function setActiveTab(target, source) {
  if (!target) return false;
  var nextBtn = document.querySelector('.tab-btn[data-tab="' + target + '"]');
  var nextPane = $(target);
  if (!nextBtn || !nextPane) return false;
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(function (s) {
    s.classList.remove('active');
  });
  nextBtn.classList.add('active');
  nextPane.classList.add('active');

  if (source) {
    log('TAB', 'switched to ' + target + ' via ' + source, 'info');
  }

  syncRcuFocusToActiveTab();
  return true;
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
  setBool('platform-tv', webOS.platform.tv);
  setBool('platform-watch', webOS.platform.watch);
  setBool('platform-unknown', webOS.platform.unknown);
  set('platform-chrome', webOS.platform.chrome !== undefined ? webOS.platform.chrome : '—');
  setBool('palmsystem', !!window.PalmSystem);
  var sys = webOS.systemInfo();
  set('sys-country', sys.country || '—');
  set('sys-smart-country', sys.smartServiceCountry || '—');
  set('sys-timezone', sys.timezone || '—');
  set('useragent', navigator.userAgent);
  var psRaw = '—';

  if (window.PalmSystem && window.PalmSystem.deviceInfo) {
    try {
      psRaw = fmtJson(JSON.parse(window.PalmSystem.deviceInfo));
    } catch (e) {
      psRaw = window.PalmSystem.deviceInfo;
    }
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
    set('d-modelName', d.modelName || '—');
    set('d-brandName', d.brandName || '—');
    set('d-manufacturer', d.manufacturer || '—');
    set('d-mainboardMaker', d.mainboardMaker || '—');
    set('d-version', d.version || '—');
    set('d-sdkVersion', d.sdkVersion || '—');
    set('d-screenWidth', d.screenWidth || '—');
    set('d-screenHeight', d.screenHeight || '—');
    set('d-ddrSize', d.ddrSize || '—');
    set('d-platformBizType', d.platformBizType || '—');
    setBool('d-uhd', d.uhd);
    setBool('d-uhd8K', d.uhd8K);
    setBool('d-oled', d.oled);
    setBool('d-hdr10', d.hdr10);
    setBool('d-dolbyVision', d.dolbyVision);
    setBool('d-dolbyAtmos', d.dolbyAtmos);
    setBool('d-tuner', d.tuner);
    set('d-screen', window.screen.width + 'x' + window.screen.height);
    var badge = $('device-status');

    if (badge) {
      badge.textContent = 'loaded';
      badge.className = 'badge ok';
    }

    log('DEVICE', 'deviceInfo received: model=' + (d.modelName || '?'), 'ok');
  });
}
/* ══════════════════════════════════════════════════════
   TAB 3 — APP INFO
══════════════════════════════════════════════════════ */


function loadAppInfo() {
  set('appId', webOS.fetchAppId() || '—');
  set('appRootPath', webOS.fetchAppRootPath() || '—');
  webOS.fetchAppInfo(function (info) {
    if (!info) {
      log('APPINFO', 'fetchAppInfo returned undefined', 'warn');
      return;
    }

    set('ai-id', info.id || '—');
    set('ai-version', info.version || '—');
    set('ai-title', info.title || '—');
    set('ai-type', info.type || '—');
    set('ai-vendor', info.vendor || '—');
    set('ai-main', info.main || '—');
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
    format: function format(r) {
      return Date(r.utc) + '\nutc: ' + r.utc;
    }
  },
  connman: {
    service: 'luna://com.palm.connectionmanager',
    method: 'getStatus',
    params: {},
    resultId: 'svc-connman',
    format: function format(r) {
      return 'isInternetConnectionAvailable: ' + r.isInternetConnectionAvailable + '\nwifi: ' + JSON.stringify(r.wifi) + '\nwired: ' + JSON.stringify(r.wired);
    }
  },
  sdkver: {
    service: 'luna://com.webos.service.tv.systemproperty',
    method: 'getSystemInfo',
    params: {
      keys: ['sdkVersion', 'firmwareVersion', 'modelName']
    },
    resultId: 'svc-sdkver',
    format: fmtJson
  },
  settings: {
    service: 'luna://com.webos.settingsservice',
    method: 'getSystemSettings',
    params: {
      category: 'sound',
      keys: ['soundOutput', 'soundOutputDigital', 'volumeControl']
    },
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
  if (svcKey === 'custom') {
    callCustomService();
    return;
  }

  var def = SERVICE_DEFS[svcKey];
  if (!def) return;
  set(def.resultId, 'calling…');
  log('LUNA', def.service + ' / ' + def.method, 'info');
  webOS.service.request(def.service, {
    method: def.method,
    parameters: def.params,
    onSuccess: function onSuccess(res) {
      var text;

      try {
        text = def.format(res);
      } catch (e) {
        text = fmtJson(res);
      }

      set(def.resultId, escHtml(text));
      log('LUNA', '[ok] ' + def.method + ': ' + JSON.stringify(res).slice(0, 120), 'ok');
    },
    onFailure: function onFailure(res) {
      set(def.resultId, 'ERROR: ' + (res.errorText || res.errorCode));
      log('LUNA', '[fail] ' + def.method + ': ' + JSON.stringify(res), 'err');
    }
  });
}

function callCustomService() {
  var uri = $('custom-uri') ? $('custom-uri').value.trim() : '';
  var method = $('custom-method') ? $('custom-method').value.trim() : '';
  var params = {};

  if (!uri || !method) {
    set('svc-custom', 'ERROR: fill in service URI and method');
    return;
  }

  try {
    params = JSON.parse($('custom-params').value || '{}');
  } catch (e) {
    set('svc-custom', 'ERROR: invalid JSON params');
    return;
  }

  set('svc-custom', 'calling…');
  log('LUNA', 'custom: ' + uri + ' / ' + method, 'info');
  webOS.service.request(uri, {
    method: method,
    parameters: params,
    onSuccess: function onSuccess(res) {
      set('svc-custom', escHtml(fmtJson(res)));
      log('LUNA', '[ok custom] ' + method, 'ok');
    },
    onFailure: function onFailure(res) {
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


var keyCounts = {
  keydown: 0,
  keyup: 0,
  keypress: 0
};
var keyLog = [];
var rcuFocusedEl = null;
var TAB_ORDER = ['tab-system', 'tab-device', 'tab-app', 'tab-service', 'tab-keys', 'tab-lifecycle', 'tab-cursor', 'tab-log'];
var COLOR_TAB_MAP = {
  RED: 'tab-system',
  GREEN: 'tab-service',
  YELLOW: 'tab-keys',
  BLUE: 'tab-log'
}; // Maps keyCode -> dpad element id

var KEY_MAP = {
  38: 'dpad-up',
  40: 'dpad-down',
  37: 'dpad-left',
  39: 'dpad-right',
  13: 'dpad-ok',
  461: 'dpad-back',
  8: 'dpad-back',
  48: 'dpad-0',
  49: 'dpad-1',
  50: 'dpad-2',
  51: 'dpad-3',
  52: 'dpad-4',
  53: 'dpad-5',
  54: 'dpad-6',
  55: 'dpad-7',
  56: 'dpad-8',
  57: 'dpad-9',
  403: 'dpad-red',
  404: 'dpad-green',
  405: 'dpad-yellow',
  406: 'dpad-blue',
  415: 'dpad-play',
  19: 'dpad-pause',
  413: 'dpad-stop',
  417: 'dpad-ff',
  412: 'dpad-rw',
  449: 'dpad-rw',
  164: 'dpad-mute',
  457: 'dpad-info',
  36: 'dpad-info',
  18: 'dpad-menu'
};
var KEY_NAMES = {
  38: 'UP',
  40: 'DOWN',
  37: 'LEFT',
  39: 'RIGHT',
  13: 'OK / ENTER',
  461: 'BACK',
  8: 'BACK',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  403: 'RED',
  404: 'GREEN',
  405: 'YELLOW',
  406: 'BLUE',
  415: 'PLAY',
  19: 'PAUSE',
  413: 'STOP',
  417: 'FAST-FORWARD',
  412: 'REWIND',
  449: 'REWIND',
  164: 'MUTE',
  457: 'INFO',
  36: 'HOME',
  18: 'MENU'
};

function isEditableTarget(el) {
  if (!el) return false;
  var tag = el.tagName ? el.tagName.toLowerCase() : '';
  return !!(el.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
}

function isVisibleElement(el) {
  if (!el) return false;
  if (el.disabled) return false;
  var style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  var rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getRcuCandidates() {
  var selectors = ['.tab-btn', '.tab-content.active .action-btn', '.tab-content.active .svc-btn', '.tab-content.active input', '.tab-content.active textarea', '.tab-content.active button'];
  var nodes;

  if (exitModalOpen) {
    nodes = Array.prototype.slice.call(document.querySelectorAll('#exit-modal.show button'));
  } else {
    nodes = Array.prototype.slice.call(document.querySelectorAll(selectors.join(',')));
  }

  var uniq = [];
  nodes.forEach(function (n) {
    if (uniq.indexOf(n) === -1 && isVisibleElement(n)) uniq.push(n);
  });
  return uniq;
}

function applyRcuFocus(el) {
  if (!el) return false;
  if (!isVisibleElement(el)) return false;

  if (rcuFocusedEl && rcuFocusedEl.classList) {
    rcuFocusedEl.classList.remove('rcu-focused');
  }

  rcuFocusedEl = el;
  rcuFocusedEl.classList.add('rcu-focused');

  if (typeof rcuFocusedEl.focus === 'function') {
    try {
      rcuFocusedEl.focus({
        preventScroll: true
      });
    } catch (e) {
      rcuFocusedEl.focus();
    }
  }

  return true;
}

function getActiveTabId() {
  var activeBtn = document.querySelector('.tab-btn.active');
  return activeBtn ? activeBtn.getAttribute('data-tab') : '';
}

function syncRcuFocusToActiveTab() {
  if (exitModalOpen) {
    var modalPrimary = $('btn-exit-confirm') || $('btn-exit-cancel');
    if (modalPrimary) applyRcuFocus(modalPrimary);
    return;
  }

  if (rcuFocusedEl && isVisibleElement(rcuFocusedEl)) return;
  var activeTabBtn = document.querySelector('.tab-btn.active');
  if (activeTabBtn) applyRcuFocus(activeTabBtn);
}

function switchTab(step, source) {
  var current = getActiveTabId();
  var idx = TAB_ORDER.indexOf(current);
  if (idx < 0) idx = 0;
  var next = (idx + step + TAB_ORDER.length) % TAB_ORDER.length;
  if (!setActiveTab(TAB_ORDER[next], source || 'RCU')) return false;
  var nextBtn = document.querySelector('.tab-btn[data-tab="' + TAB_ORDER[next] + '"]');
  if (nextBtn) applyRcuFocus(nextBtn);
  return true;
}

function focusFirstControlInActiveTab() {
  var active = document.querySelector('.tab-content.active');
  if (!active) return false;
  var first = active.querySelector('button, input, textarea');
  if (!first) return false;
  return applyRcuFocus(first);
}

function moveRcuFocus(direction) {
  var candidates = getRcuCandidates();
  if (!candidates.length) return false;
  var current = rcuFocusedEl;

  if (candidates.indexOf(current) === -1) {
    current = document.activeElement;
  }

  if (candidates.indexOf(current) === -1) {
    current = candidates[0];
  }

  applyRcuFocus(current);

  if (current.classList && current.classList.contains('tab-btn')) {
    if (direction === 'left') return switchTab(-1, 'RCU LEFT');
    if (direction === 'right') return switchTab(1, 'RCU RIGHT');
    if (direction === 'down') return focusFirstControlInActiveTab();
  }

  var from = current.getBoundingClientRect();
  var fx = from.left + from.width / 2;
  var fy = from.top + from.height / 2;
  var best = null;
  var bestScore = Infinity;
  candidates.forEach(function (candidate) {
    if (candidate === current) return;
    var rect = candidate.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = cx - fx;
    var dy = cy - fy;
    if (direction === 'left' && dx >= -4) return;
    if (direction === 'right' && dx <= 4) return;
    if (direction === 'up' && dy >= -4) return;
    if (direction === 'down' && dy <= 4) return;
    var primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy);
    var cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    var score = primary + cross * 1.8;

    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  if (best) return applyRcuFocus(best);

  if (direction === 'up') {
    var activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn) return applyRcuFocus(activeTabBtn);
  }

  return false;
}

function normalizeRcuKey(e) {
  var code = e.keyCode;
  var key = e.key || '';
  if (code >= 48 && code <= 57) return 'DIGIT_' + String(code - 48);
  if (/^Digit[0-9]$/.test(key)) return 'DIGIT_' + key.charAt(key.length - 1);
  if (code === 37 || key === 'ArrowLeft') return 'LEFT';
  if (code === 38 || key === 'ArrowUp') return 'UP';
  if (code === 39 || key === 'ArrowRight') return 'RIGHT';
  if (code === 40 || key === 'ArrowDown') return 'DOWN';
  if (code === 13 || key === 'Enter' || key === 'NumpadEnter') return 'OK';
  if (code === 36 || key === 'Home') return 'HOME';
  if (code === 18 || key === 'Menu' || key === 'ContextMenu') return 'MENU';
  if (code === 403) return 'RED';
  if (code === 404) return 'GREEN';
  if (code === 405) return 'YELLOW';
  if (code === 406) return 'BLUE';
  if (code === 457 || key === 'Info') return 'INFO';
  if (code === 164 || key === 'AudioVolumeMute') return 'MUTE';
  if (code === 415 || key === 'MediaPlay') return 'PLAY';
  if (code === 19 || key === 'Pause' || key === 'MediaPause') return 'PAUSE';
  if (code === 413 || key === 'MediaStop') return 'STOP';
  if (code === 417 || key === 'MediaFastForward') return 'FF';
  if (code === 412 || code === 449 || key === 'MediaRewind') return 'RW';
  return '';
}

function handleRcuAction(e, rcuKey) {
  if (!rcuKey) return false;
  var editable = isEditableTarget(e.target);

  if (editable && rcuKey !== 'OK' && rcuKey !== 'BACK') {
    return false;
  }

  if (rcuKey === 'LEFT') return moveRcuFocus('left');
  if (rcuKey === 'RIGHT') return moveRcuFocus('right');
  if (rcuKey === 'UP') return moveRcuFocus('up');
  if (rcuKey === 'DOWN') return moveRcuFocus('down');

  if (rcuKey === 'OK') {
    var target = rcuFocusedEl;

    if (!target || !isVisibleElement(target)) {
      syncRcuFocusToActiveTab();
      target = rcuFocusedEl;
    }

    if (!target) return false;

    if (typeof target.click === 'function') {
      target.click();
      log('RCU', 'OK click: ' + (target.id || target.textContent || target.tagName), 'ok');
      return true;
    }

    return false;
  }

  if (rcuKey === 'HOME') {
    return setActiveTab('tab-system', 'HOME key');
  }

  if (rcuKey === 'MENU') {
    return setActiveTab('tab-service', 'MENU key');
  }

  if (rcuKey === 'INFO') {
    return setActiveTab('tab-keys', 'INFO key');
  }

  if (rcuKey === 'RED' || rcuKey === 'GREEN' || rcuKey === 'YELLOW' || rcuKey === 'BLUE') {
    var targetTab = COLOR_TAB_MAP[rcuKey];
    return targetTab ? setActiveTab(targetTab, rcuKey + ' key') : false;
  }

  if (rcuKey.indexOf('DIGIT_') === 0) {
    var digit = parseInt(rcuKey.split('_')[1], 10);

    if (digit >= 1 && digit <= TAB_ORDER.length) {
      return setActiveTab(TAB_ORDER[digit - 1], 'NUM ' + digit);
    }

    return false;
  }

  if (rcuKey === 'PLAY' || rcuKey === 'PAUSE' || rcuKey === 'STOP' || rcuKey === 'FF' || rcuKey === 'RW' || rcuKey === 'MUTE') {
    log('RCU', 'media key pressed: ' + rcuKey, 'info');
    return true;
  }

  return false;
}

var activeDpad = null;
var lastExitRequestAt = 0;
var lastExitPromptAt = 0;
var exitModalOpen = false;

function showExitModal(source) {
  var modal = $('exit-modal');

  if (!modal) {
    requestAppExit(source + ' (no modal)');
    return;
  }

  exitModalOpen = true;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  log('APP', 'Exit confirmation opened via ' + source, 'warn');
  var confirmBtn = $('btn-exit-confirm');
  if (confirmBtn) applyRcuFocus(confirmBtn);
}

function hideExitModal(source) {
  var modal = $('exit-modal');
  exitModalOpen = false;
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if (source) log('APP', 'Exit confirmation closed: ' + source, 'info');
  syncRcuFocusToActiveTab();
}

function handleBackIntent(source) {
  var now = Date.now();

  if (exitModalOpen) {
    requestAppExit(source + ' (confirmed)');
    return;
  }

  if (now - lastExitPromptAt < 250) return;
  lastExitPromptAt = now;
  showExitModal(source);
}

function isBackKeyEvent(e) {
  return e.keyCode === 461 || e.keyCode === 8 || e.key === 'GoBack' || e.key === 'Back' || e.key === 'BrowserBack' || e.key === 'Backspace' || e.key === 'XF86Back' || e.code === 'GoBack' || e.code === 'BrowserBack' || e.code === 'Backspace' || e.keyCode === 27 || e.key === 'Escape' || e.code === 'Escape';
}

function requestAppExit(source) {
  var now = Date.now();
  if (now - lastExitRequestAt < 700) return;
  lastExitRequestAt = now;
  var called = false;
  var appId = '';
  var rawIdentifier = '';

  try {
    appId = window.webOS && typeof window.webOS.fetchAppId === 'function' ? window.webOS.fetchAppId() || '' : '';
  } catch (e0) {
    appId = '';
  }

  try {
    rawIdentifier = window.PalmSystem && window.PalmSystem.identifier ? String(window.PalmSystem.identifier) : '';
  } catch (e0id) {
    rawIdentifier = '';
  }

  if (!appId && rawIdentifier) appId = rawIdentifier.split(' ')[0] || '';
  log('APP', 'Exit requested via ' + source, 'warn');
  log('APP', 'Exit capabilities: webOSSystem.close=' + !!(window.webOSSystem && window.webOSSystem.close) + ', PalmSystem.close=' + !!(window.PalmSystem && window.PalmSystem.close) + ', platformBack=' + !!(window.PalmSystem && window.PalmSystem.platformBack) + ', appId=' + (appId || 'unknown'), 'info');

  try {
    if (window.webOSSystem && typeof window.webOSSystem.close === 'function') {
      window.webOSSystem.close();
      called = true;
      log('APP', 'webOSSystem.close called', 'ok');
    }
  } catch (e0a) {
    log('APP', 'webOSSystem.close failed: ' + (e0a && e0a.message ? e0a.message : String(e0a)), 'err');
  }

  try {
    if (window.webOSSystem && typeof window.webOSSystem.deactivate === 'function') {
      window.webOSSystem.deactivate();
      called = true;
      log('APP', 'webOSSystem.deactivate called', 'info');
    }
  } catch (e0d) {
    log('APP', 'webOSSystem.deactivate failed: ' + (e0d && e0d.message ? e0d.message : String(e0d)), 'err');
  }

  try {
    if (window.webOSSystem && typeof window.webOSSystem.hide === 'function') {
      window.webOSSystem.hide();
      called = true;
      log('APP', 'webOSSystem.hide called', 'info');
    }
  } catch (e0e) {
    log('APP', 'webOSSystem.hide failed: ' + (e0e && e0e.message ? e0e.message : String(e0e)), 'err');
  }

  try {
    if (window.PalmSystem && typeof window.PalmSystem.close === 'function') {
      window.PalmSystem.close();
      called = true;
      log('APP', 'PalmSystem.close called', 'ok');
    }
  } catch (e0b) {
    log('APP', 'PalmSystem.close failed: ' + (e0b && e0b.message ? e0b.message : String(e0b)), 'err');
  }

  try {
    if (window.PalmSystem && typeof window.PalmSystem.deactivate === 'function') {
      window.PalmSystem.deactivate();
      called = true;
      log('APP', 'PalmSystem.deactivate called', 'info');
    }
  } catch (e0f) {
    log('APP', 'PalmSystem.deactivate failed: ' + (e0f && e0f.message ? e0f.message : String(e0f)), 'err');
  }

  try {
    if (window.PalmSystem && typeof window.PalmSystem.hide === 'function') {
      window.PalmSystem.hide();
      called = true;
      log('APP', 'PalmSystem.hide called', 'info');
    }
  } catch (e0g) {
    log('APP', 'PalmSystem.hide failed: ' + (e0g && e0g.message ? e0g.message : String(e0g)), 'err');
  }

  try {
    if (appId && window.webOS && window.webOS.service && window.webOS.service.request) {
      [{
        service: 'luna://com.webos.applicationManager',
        params: {
          id: appId
        }
      }, {
        service: 'luna://com.webos.applicationManager',
        params: {
          appId: appId
        }
      }, {
        service: 'luna://com.webos.service.applicationmanager',
        params: {
          id: appId
        }
      }, {
        service: 'luna://com.webos.service.applicationmanager',
        params: {
          appId: appId
        }
      }].forEach(function (req) {
        window.webOS.service.request(req.service, {
          method: 'closeByAppId',
          parameters: req.params,
          onSuccess: function onSuccess() {
            log('APP', 'closeByAppId success via ' + req.service + ' ' + fmtJson(req.params), 'ok');
          },
          onFailure: function onFailure(res) {
            log('APP', 'closeByAppId failed via ' + req.service + ': ' + (res && (res.errorText || res.errorCode || fmtJson(res))), 'err');
          }
        });
      });
      called = true;
      log('APP', 'closeByAppId requests sent for ' + appId, 'info');
    }
  } catch (e0c) {
    log('APP', 'closeByAppId throw: ' + (e0c && e0c.message ? e0c.message : String(e0c)), 'err');
  }

  try {
    if (window.webOS && typeof window.webOS.platformBack === 'function') {
      window.webOS.platformBack();
      called = true;
      log('APP', 'webOS.platformBack called', 'info');
    }
  } catch (e1) {
    log('APP', 'webOS.platformBack failed: ' + (e1 && e1.message ? e1.message : String(e1)), 'err');
  }

  try {
    if (window.PalmSystem && typeof window.PalmSystem.platformBack === 'function') {
      window.PalmSystem.platformBack();
      called = true;
      log('APP', 'PalmSystem.platformBack called', 'info');
    }
  } catch (e2) {
    log('APP', 'PalmSystem.platformBack failed: ' + (e2 && e2.message ? e2.message : String(e2)), 'err');
  }

  try {
    if (typeof window.close === 'function') {
      window.close();
      called = true;
      log('APP', 'window.close called', 'info');
    }
  } catch (e4) {
    log('APP', 'window.close failed: ' + (e4 && e4.message ? e4.message : String(e4)), 'err');
  }

  try {
    if (window.history && window.history.length > 1) {
      window.history.back();
      called = true;
      log('APP', 'history.back called', 'info');
    }
  } catch (e3) {
    log('APP', 'history.back failed: ' + (e3 && e3.message ? e3.message : String(e3)), 'err');
  } // If runtime accepts calls but does nothing, force-close visually as a last fallback.


  setTimeout(function () {
    if (document.visibilityState === 'hidden') return;

    try {
      if (window.location && window.location.href !== 'about:blank') {
        log('APP', 'forcing fallback exit to about:blank', 'warn');
        window.location.replace('about:blank');
      }
    } catch (e5) {
      log('APP', 'fallback exit failed: ' + (e5 && e5.message ? e5.message : String(e5)), 'err');
    }
  }, 900);

  if (!called) {
    log('APP', 'No exit API available in this runtime', 'warn');
  }
}

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
      setTimeout(function () {
        el.classList.remove('active');
        activeDpad = null;
      }, 300);
    }
  }
}

function handleKeyEvent(e) {
  var type = e.type;
  keyCounts[type] = (keyCounts[type] || 0) + 1;
  set('kstat-down', keyCounts.keydown);
  set('kstat-up', keyCounts.keyup);
  set('kstat-press', keyCounts.keypress);
  var name = KEY_NAMES[e.keyCode] || e.key || 'code ' + e.keyCode;
  var rcuKey = normalizeRcuKey(e);

  if (type === 'keydown') {
    set('key-name', name);
    set('key-code', 'keyCode: ' + e.keyCode);
    set('key-type', 'event: keydown');
    flashDpad(e.keyCode);
    var entry = '<div class="key-entry"><span>' + ts() + '</span> ' + escHtml(type) + ' — ' + escHtml(name) + ' (keyCode:' + e.keyCode + ')</div>';
    keyLog.unshift(entry);
    if (keyLog.length > 20) keyLog.pop();
    var klEl = $('key-log');
    if (klEl) klEl.innerHTML = keyLog.join('');
    log('KEY', type + ' — ' + name + ' (keyCode:' + e.keyCode + ')', 'key');

    if (rcuKey && rcuKey !== 'BACK' && handleRcuAction(e, rcuKey)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isBackKeyEvent(e)) {
      var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
      var isEditable = !!(e.target && (e.target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));

      if (isEditable && e.keyCode === 8) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      handleBackIntent('BACK key (keydown)');
    }
  }

  if (type === 'keyup' && isBackKeyEvent(e)) {
    e.preventDefault();
    e.stopPropagation();
    handleBackIntent('BACK key (keyup)');
  }
}

function ts() {
  return new Date().toTimeString().slice(0, 8);
}

function initKeyEvents() {
  ['keydown', 'keyup', 'keypress'].forEach(function (t) {
    document.addEventListener(t, handleKeyEvent);
  }); // Capture-phase backup for simulator runtimes that consume key events early.

  ['keydown', 'keyup'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (!isBackKeyEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      handleBackIntent('BACK key (' + t + ' capture)');
    }, true);
  });
}

function initExitModal() {
  var confirmBtn = $('btn-exit-confirm');
  var cancelBtn = $('btn-exit-cancel');
  var modal = $('exit-modal');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      requestAppExit('Exit button');
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      hideExitModal('cancel button');
    });
  }

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) hideExitModal('overlay click');
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!exitModalOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      hideExitModal('escape');
      return;
    }

    if (isBackKeyEvent(e)) {
      e.preventDefault();
      e.stopPropagation();
      requestAppExit('BACK while confirm open');
    }
  }, true);
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

    if (el) {
      el.textContent = state;
      el.className = 'lc-state ' + (state === 'hidden' ? 'bad' : '');
    }

    miniLog('lc-vis-log', 'visibilitychange → ' + state);
    log('LIFECYCLE', 'visibilitychange: ' + state, state === 'hidden' ? 'warn' : 'ok');
  }); // Window focus / blur

  window.addEventListener('focus', function () {
    var el = $('lc-focus-state');

    if (el) {
      el.textContent = 'focused';
      el.className = 'lc-state';
    }

    miniLog('lc-focus-log', 'focus');
    log('LIFECYCLE', 'window focus', 'ok');
  });
  window.addEventListener('blur', function () {
    var el = $('lc-focus-state');

    if (el) {
      el.textContent = 'blurred';
      el.className = 'lc-state warn';
    }

    miniLog('lc-focus-log', 'blur');
    log('LIFECYCLE', 'window blur', 'warn');
  }); // Unload

  window.addEventListener('beforeunload', function () {
    miniLog('lc-unload-log', 'beforeunload fired');
    log('LIFECYCLE', 'beforeunload', 'warn');
  });
  window.addEventListener('pagehide', function (e) {
    var el = $('lc-unload-state');

    if (el) {
      el.textContent = 'pagehide (persisted:' + e.persisted + ')';
      el.className = 'lc-state warn';
    }

    miniLog('lc-unload-log', 'pagehide persisted=' + e.persisted);
    log('LIFECYCLE', 'pagehide, persisted=' + e.persisted, 'warn');
  }); // webOS relaunch (Mojo.relaunch or webOSRelaunch event)

  if (window.Mojo) {
    window.Mojo.relaunch = function (params) {
      var el = $('lc-relaunch-state');

      if (el) {
        el.textContent = 'relaunched';
        el.className = 'lc-state warn';
      }

      miniLog('lc-relaunch-log', 'Mojo.relaunch: ' + JSON.stringify(params));
      log('LIFECYCLE', 'Mojo.relaunch: ' + JSON.stringify(params), 'warn');
    };
  }

  document.addEventListener('webOSRelaunch', function (e) {
    var el = $('lc-relaunch-state');

    if (el) {
      el.textContent = 'webOSRelaunch';
      el.className = 'lc-state warn';
    }

    miniLog('lc-relaunch-log', 'webOSRelaunch event: ' + JSON.stringify(e.detail));
    log('LIFECYCLE', 'webOSRelaunch event', 'warn');
  }); // Simulate buttons

  $('btn-simulate-relaunch').addEventListener('click', function () {
    if (window.Mojo && typeof window.Mojo.relaunch === 'function') {
      window.Mojo.relaunch({
        simulated: true
      });
    } else {
      var ev = new CustomEvent('webOSRelaunch', {
        detail: {
          simulated: true
        }
      });
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

  try {
    showing = webOS.keyboard.isShowing();
  } catch (e) {
    showing = false;
  }

  var el = $('kb-state');

  if (el) {
    el.innerHTML = showing ? '<span style="color:#4caf50">showing</span>' : '<span style="color:#f44336">not showing</span>';
  }

  var vkbEl = $('vkb-status');

  if (vkbEl) {
    vkbEl.textContent = showing ? 'VKB visible' : 'VKB hidden';
  }

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
  }); // VKB test input

  var vkbInput = $('vkb-input');

  if (vkbInput) {
    ['focus', 'blur', 'click'].forEach(function (t) {
      vkbInput.addEventListener(t, function () {
        setTimeout(checkKeyboard, 200);
        log('INPUT', 'vkb-input ' + t, 'info');
      });
    });
  } // Pointer canvas


  var canvas = $('pointer-canvas');
  var dot = $('pointer-dot');

  if (canvas && dot) {
    var renderPointerFrame = function renderPointerFrame() {
      rafPending = false;
      if (!lastPointerEvent) return;
      var rect = canvas.getBoundingClientRect();
      var clientX = typeof lastPointerEvent.clientX === 'number' ? lastPointerEvent.clientX : null;
      var clientY = typeof lastPointerEvent.clientY === 'number' ? lastPointerEvent.clientY : null;
      if (clientX === null || clientY === null) return;
      var x = Math.round(clientX - rect.left);
      var y = Math.round(clientY - rect.top);
      var type = lastPointerEvent.pointerType || 'mouse';
      dot.style.display = 'block';
      dot.style.left = x + 'px';
      dot.style.top = y + 'px';

      if (x !== lastX) {
        set('cursor-x', x);
        lastX = x;
      }

      if (y !== lastY) {
        set('cursor-y', y);
        lastY = y;
      }

      set('pointer-type', type);
    };

    var queuePointerRender = function queuePointerRender(e) {
      lastPointerEvent = e;

      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(renderPointerFrame);
      }
    };

    var lastPointerEvent = null;
    var rafPending = false;
    var lastX = null;
    var lastY = null;
    canvas.addEventListener('pointermove', queuePointerRender, {
      passive: true
    });
    canvas.addEventListener('mousemove', queuePointerRender, {
      passive: true
    });
    canvas.addEventListener('pointerenter', queuePointerRender, {
      passive: true
    });
    canvas.addEventListener('mouseleave', function () {
      dot.style.display = 'none';
    });
    canvas.addEventListener('pointerleave', function () {
      dot.style.display = 'none';
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
      })["catch"](function () {
        log('LOG', 'clipboard write failed', 'err');
      });
    } else {
      log('LOG', 'clipboard API not available', 'warn');
    }
  });
}
/* ══════════════════════════════════════════════════════
   SCREEN ORIENTATION  (webOSSystem.setWindowOrientation)
══════════════════════════════════════════════════════ */


function readOrientation() {
  var sysPresent = !!(window.webOSSystem && typeof window.webOSSystem.setWindowOrientation === 'function');
  setBool('orient-sys-present', sysPresent);
  var current = '—';

  if (window.webOSSystem) {
    // screenOrientation may be a property or getter depending on firmware
    try {
      var raw = window.webOSSystem.screenOrientation;
      if (raw) current = raw;
    } catch (e) {
      /* not available */
    }
  }

  set('orient-current', current);
  var webApi = '—';

  if (window.screen && window.screen.orientation) {
    webApi = window.screen.orientation.type + ' (' + (window.screen.orientation.angle || 0) + "\xB0)";
  }

  set('orient-web', webApi);
}

function setOrientation(value) {
  if (!window.webOSSystem || typeof window.webOSSystem.setWindowOrientation !== 'function') {
    set('orient-last-set', 'ERROR: webOSSystem.setWindowOrientation not available');
    log('ORIENT', 'setWindowOrientation not available — webOSSystem missing', 'warn');
    return;
  }

  try {
    window.webOSSystem.setWindowOrientation(value);
    set('orient-last-set', value);
    log('ORIENT', 'setWindowOrientation("' + value + '") called', 'ok');
    setTimeout(readOrientation, 300);
  } catch (e) {
    var msg = e && e.message ? e.message : String(e);
    set('orient-last-set', 'ERROR: ' + msg);
    log('ORIENT', 'setWindowOrientation error: ' + msg, 'err');
  }
}

function initOrientation() {
  readOrientation();
  [{
    id: 'btn-orient-landscape',
    val: 'landscape'
  }, {
    id: 'btn-orient-portrait',
    val: 'portrait'
  }, {
    id: 'btn-orient-reversed-landscape',
    val: 'reversed_landscape'
  }, {
    id: 'btn-orient-reversed-portrait',
    val: 'reversed_portrait'
  }].forEach(function (item) {
    var btn = $(item.id);
    if (btn) btn.addEventListener('click', function () {
      setOrientation(item.val);
    });
  });
  var refreshBtn = $('btn-orient-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', readOrientation); // Listen for Web API orientation changes too

  if (window.screen && window.screen.orientation) {
    window.screen.orientation.addEventListener('change', function () {
      readOrientation();
      log('ORIENT', 'screen.orientation changed: ' + window.screen.orientation.type, 'info');
    });
  }
}
/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */


window.addEventListener('load', function () {
  initTabs();
  updateClock();
  setInterval(updateClock, 1000); // System tab

  loadSystemInfo();
  $('btn-refresh-system').addEventListener('click', function () {
    loadSystemInfo();
    log('SYSTEM', 'system info refreshed', 'info');
  });
  $('btn-platformBack').addEventListener('click', function () {
    handleBackIntent('System tab button');
  }); // Orientation (System tab section)

  initOrientation(); // Device tab

  loadDeviceInfo();
  $('btn-deviceInfo').addEventListener('click', loadDeviceInfo); // App info tab

  loadAppInfo();
  $('btn-fetchAppInfo').addEventListener('click', loadAppInfo); // Luna services tab

  initServiceButtons(); // Key events tab

  initKeyEvents(); // Exit confirmation modal

  initExitModal(); // Lifecycle tab

  initLifecycle(); // Cursor / input tab

  initCursor(); // Log tab

  initLogButtons();
  log('APP', 'Test suite initialised — webOSTV.js v' + webOS.libVersion, 'ok');
});
//# sourceMappingURL=app4tv.dev.js.map
