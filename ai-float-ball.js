/* =========================================================
 * AI 悬浮球 · 全局通用组件 (PC + 移动端)
 * ---------------------------------------------------------
 * 功能：
 *   PC  - 增强页面已有 .ai-ball：可拖动 / 滚动透明 / 位置记忆
 *   H5  - 自动注入悬浮球 DOM（56px · 避让 .m-tabbar）
 *   子模块 - setModuleMode：蓝球显示模块名，点击开面板
 * 对外 API：
 *   window.AIBall.show()
 *   window.AIBall.hide()
 *   window.AIBall.setModuleMode(name, onFigClick)
 * z-index: 900（方案规范）
 * ========================================================= */
(function () {
  if (window.__AI_FLOAT_BALL_LOADED__) return;
  window.__AI_FLOAT_BALL_LOADED__ = true;

  /* --------------- 角色 --------------- */
  function detectRole() {
    if (window.AI_SEARCH_ROLE) return window.AI_SEARCH_ROLE;
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('teacher-') >= 0 || p.indexOf('admin-') >= 0) return 'teacher';
    return 'student';
  }

  var isInMobileDir = /\/mobile\//.test(location.pathname);
  var isMobileSite = isInMobileDir || /mobile-entry/i.test(location.pathname);
  var isMobile = isMobileSite || window.innerWidth <= 540;
  var LS_POS_KEY = 'aiBall.pos.' + (isMobile ? 'h5' : 'pc');

  /* --------------- 样式 --------------- */
  var CSS = [
    '.aib-wrap{position:fixed;z-index:900;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;transition:opacity .3s,transform .22s}',
    '.aib-wrap.dragging{cursor:grabbing;transition:none}',
    '.aib-wrap.scroll-dim{opacity:.4}',
    '.aib-wrap.hidden{opacity:0;pointer-events:none;transform:scale(.6)}',

    /* ===== 默认模式（首页） ===== */
    '.aib-ball{display:flex;flex-direction:column;align-items:center;text-decoration:none;color:inherit}',
    '.aib-fig{border-radius:50%;background:radial-gradient(circle at 30% 30%,#4080FF,#165DFF 70%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;box-shadow:0 8px 24px rgba(22,93,255,.45);transition:box-shadow .2s}',
    '.aib-fig:hover{box-shadow:0 10px 30px rgba(22,93,255,.55)}',
    '.aib-fig .ai-word{line-height:1.1;text-align:center}',
    '.aib-fig .ai-word b{display:block;letter-spacing:.5px}',
    '.aib-tt{font-size:11px;color:#165DFF;margin-top:4px;font-weight:600;white-space:nowrap;text-align:center;display:none}',
    '@media (min-width:541px){.aib-fig{width:72px;height:72px}.aib-fig .ai-word b{font-size:18px}.aib-fig .ai-word{font-size:12px}.aib-tt{font-size:12px}}',
    '@media (max-width:540px){.aib-fig{width:52px;height:52px}.aib-fig .ai-word b{font-size:14px}.aib-fig .ai-word{font-size:10px}.aib-tt{font-size:10px;margin-top:2px}}',

    /* ===== 子模块模式 ===== */
    /* 球体：白色描边 + 外圈光晕，突出模块入口 */
    '.aib-wrap.mod-mode .aib-fig{position:relative;box-shadow:0 6px 20px rgba(22,93,255,.4),0 0 0 3px rgba(255,255,255,.9),0 0 0 5px rgba(22,93,255,.12)}',
    '.aib-wrap.mod-mode .aib-fig:hover{box-shadow:0 8px 26px rgba(22,93,255,.5),0 0 0 3px rgba(255,255,255,.95),0 0 0 6px rgba(22,93,255,.18)}',
    /* 球内模块名 */
    '.aib-fig .ai-word.mod{line-height:1.15}',
    '.aib-fig .ai-word.mod b{letter-spacing:0}',
    '@media (min-width:541px){.aib-fig .ai-word.mod b{font-size:13px}.aib-fig .ai-word.mod{font-size:10px}}',
    '@media (max-width:540px){.aib-fig .ai-word.mod b{font-size:10px}.aib-fig .ai-word.mod{font-size:8px}}',
    /* 聊天角标 */
    '.aib-badge{position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#FF7D00,#FF9A2E);font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(255,125,0,.35);border:2px solid #fff;line-height:1;pointer-events:none}',
    '@media (max-width:540px){.aib-badge{width:18px;height:18px;font-size:9px;top:-3px;right:-3px;border-width:1.5px}}',
    /* 学工助手链接：白底胶囊按钮，与蓝球形成对比 */
    '.aib-wrap.mod-mode .aib-tt{display:inline-flex;align-items:center;gap:3px;background:rgba(255,255,255,.95);border:1px solid #D0E4FF;padding:4px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(22,93,255,.08);margin-top:6px;color:#4E5969;font-weight:500;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:all .18s}',
    '.aib-wrap.mod-mode .aib-tt:hover{border-color:#165DFF;background:#fff;color:#165DFF;box-shadow:0 3px 12px rgba(22,93,255,.18)}',
    '.aib-wrap.mod-mode .aib-tt .aib-arr{font-size:12px;opacity:.4;transition:opacity .15s;margin-left:1px}',
    '.aib-wrap.mod-mode .aib-tt:hover .aib-arr{opacity:.8}',
    '@media (min-width:541px){.aib-wrap.mod-mode .aib-tt{font-size:11px;padding:4px 12px}}',
    '@media (max-width:540px){.aib-wrap.mod-mode .aib-tt{font-size:9px;padding:3px 9px;margin-top:4px}}'
  ].join('');

  var style = document.createElement('style');
  style.id = 'aib-style';
  style.textContent = CSS;
  document.head.appendChild(style);

  /* --------------- DOM 初始化 --------------- */
  var $wrap, $ball;
  var _moduleMode = false, _onFigClick = null;

  function init() {
    var role = detectRole();
    var isInSubDir = /\/(student|teacher|admin)\//.test(location.pathname);
    var href;
    if (isMobileSite) {
      href = isInMobileDir ? 'ai-assistant-chat.html' : 'mobile/ai-assistant-chat.html';
    } else {
      var chatPage = role === 'teacher' ? 'ai-assistant-teacher.html' : 'ai-assistant-chat.html';
      href = isInSubDir ? '../' + chatPage : chatPage;
    }

    var ballHTML =
      '<a class="aib-ball" href="' + href + '" title="学工 AI 助手">' +
        '<div class="aib-fig"><div class="ai-word"><b>AI</b>学工助手</div></div>' +
        '<div class="aib-tt">点击对话</div>' +
      '</a>';

    var existing = document.querySelector('a.ai-ball');
    if (existing) {
      existing.style.cssText = '';
      existing.className = '';
      var parent = existing.parentNode;
      $wrap = document.createElement('div');
      $wrap.className = 'aib-wrap';
      $wrap.innerHTML = ballHTML;
      parent.replaceChild($wrap, existing);
    } else {
      $wrap = document.createElement('div');
      $wrap.className = 'aib-wrap';
      $wrap.innerHTML = ballHTML;
      document.body.appendChild($wrap);
    }

    $ball = $wrap.querySelector('.aib-ball');

    var defaultPos = isMobile
      ? { right: 16, bottom: 80 }
      : { right: 28, bottom: 32 };

    var saved = loadPos();
    var pos = saved || defaultPos;
    applyPos(pos);

    initDrag();
    initScrollDim();
  }

  /* --------------- 位置管理 --------------- */
  function applyPos(pos) {
    $wrap.style.right = pos.right + 'px';
    $wrap.style.bottom = pos.bottom + 'px';
    $wrap.style.left = 'auto';
    $wrap.style.top = 'auto';
  }

  function loadPos() {
    try {
      var s = localStorage.getItem(LS_POS_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }

  function savePos(pos) {
    try { localStorage.setItem(LS_POS_KEY, JSON.stringify(pos)); } catch (e) {}
  }

  /* --------------- 拖动 --------------- */
  function initDrag() {
    var startX, startY, origRight, origBottom, dragged;
    var THRESHOLD = 5;

    function onStart(e) {
      var t = e.touches ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
      var rect = $wrap.getBoundingClientRect();
      origRight = window.innerWidth - rect.right;
      origBottom = window.innerHeight - rect.bottom;
      dragged = false;
      $wrap.classList.add('dragging');
      document.addEventListener(e.touches ? 'touchmove' : 'mousemove', onMove, { passive: false });
      document.addEventListener(e.touches ? 'touchend' : 'mouseup', onEnd);
    }

    function onMove(e) {
      e.preventDefault();
      var t = e.touches ? e.touches[0] : e;
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      if (!dragged && Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      dragged = true;
      var r = origRight - dx;
      var b = origBottom - dy;
      r = Math.max(0, Math.min(r, window.innerWidth - 60));
      b = Math.max(0, Math.min(b, window.innerHeight - 60));
      applyPos({ right: r, bottom: b });
    }

    function onEnd() {
      $wrap.classList.remove('dragging');
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('mouseup', onEnd);
      if (dragged) {
        var rect = $wrap.getBoundingClientRect();
        var pos = {
          right: Math.round(window.innerWidth - rect.right),
          bottom: Math.round(window.innerHeight - rect.bottom)
        };
        savePos(pos);
      }
    }

    $wrap.addEventListener('mousedown', onStart);
    $wrap.addEventListener('touchstart', onStart, { passive: true });

    $ball.addEventListener('click', function (e) {
      if (dragged) { e.preventDefault(); dragged = false; return; }
      if (_moduleMode && _onFigClick) {
        var t = e.target;
        var isTT = (t.classList && t.classList.contains('aib-tt')) ||
                   (t.parentNode && t.parentNode.classList && t.parentNode.classList.contains('aib-tt'));
        if (isTT) return;
        e.preventDefault();
        _onFigClick();
      }
    });
  }

  /* --------------- 滚动透明化 --------------- */
  function initScrollDim() {
    var timer;
    window.addEventListener('scroll', function () {
      $wrap.classList.add('scroll-dim');
      clearTimeout(timer);
      timer = setTimeout(function () {
        $wrap.classList.remove('scroll-dim');
      }, 300);
    }, { passive: true });
  }

  /* --------------- 对外 API --------------- */
  function show() {
    if ($wrap) $wrap.classList.remove('hidden');
  }

  function hide() {
    if ($wrap) $wrap.classList.add('hidden');
  }

  function setModuleMode(moduleName, onFigClick) {
    if (!$ball || !$wrap) return;
    _moduleMode = true;
    _onFigClick = onFigClick;
    $wrap.classList.add('mod-mode');

    var prefix = moduleName.replace(/助手$/, '');
    var wordEl = $ball.querySelector('.ai-word');
    if (wordEl) {
      wordEl.classList.add('mod');
      wordEl.innerHTML = '<b>' + prefix + '</b>助手';
    }

    var figEl = $ball.querySelector('.aib-fig');
    if (figEl) {
      figEl.style.cursor = 'pointer';
      var badge = document.createElement('span');
      badge.className = 'aib-badge';
      badge.textContent = '\uD83D\uDCAC';
      figEl.appendChild(badge);
    }

    var ttEl = $wrap.querySelector('.aib-tt');
    if (ttEl) ttEl.innerHTML = '学工助手<span class="aib-arr">›</span>';
  }

  /* --------------- 启动 --------------- */
  function boot() {
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.AIBall = {
    show: show,
    hide: hide,
    setModuleMode: setModuleMode
  };
})();
