/* =========================================================
 * AI 子模块组件 SDK（PC + 移动端统一）
 * ---------------------------------------------------------
 * 原则（来自方案文档）：
 *   - 入口收敛：子模块不新增浮窗，复用全局悬浮球 + 上下文穿衣
 *   - 能力下沉：行内按钮 / 洞察卡 / 审批卡 / 模块面板嵌入页面
 *   - CSS 前缀：.aim-  (AI Module)，与全局 .ais- 不冲突
 *   - z-index：面板 950 > 全局浮球 900 > 行内提示 100
 * 对外 API：
 *   window.AIModule.currentModule    - 当前模块信息
 *   window.AIModule.openPanel()      - 打开模块面板
 *   window.AIModule.closePanel()     - 关闭模块面板
 *   window.AIModule.renderInlineButtons()  - 渲染行内 AI 按钮
 *   window.AIModule.renderInsightCards()   - 渲染数据洞察卡
 *   window.AIModule.renderApprovalCards()  - 渲染审批辅助卡
 * ========================================================= */
(function () {
  if (window.__AI_MODULE_SDK_LOADED__) return;
  window.__AI_MODULE_SDK_LOADED__ = true;

  /* --------------- 模块映射表 --------------- */
  var MODULE_MAP = {
    'student-leave':       { name: '请销假助手',   icon: '🗓️', skills: ['polish', 'compliance', 'approval'], hints: ['怎么请病假？', '需要什么材料？', '审批要多久？'] },
    'student-leave-detail':{ name: '请假记录助手', icon: '📄', skills: ['query'],                            hints: ['请假记录查询', '审批到哪一步了？'] },
    'student-dorm':        { name: '宿舍管理助手', icon: '🏠', skills: ['report', 'insight'],                hints: ['宿舍评分标准', '怎么申请调换？'] },
    'student-dorm-repair': { name: '宿舍报修助手', icon: '🔧', skills: ['diagnose', 'report'],               hints: ['空调不制冷', '热水器故障', '如何查维修进度？'] },
    'student-funding':     { name: '奖助贷助手',   icon: '💰', skills: ['match', 'review'],                  hints: ['我能申请什么奖学金？', '助学贷款流程'] },
    'student-scholarship': { name: '奖学金助手',   icon: '🏆', skills: ['match', 'review'],                  hints: ['国奖申请条件', '奖学金公示时间'] },
    'student-grades':      { name: '成绩查询助手', icon: '📊', skills: ['insight'],                          hints: ['GPA 怎么算？', '挂科怎么办？'] },
    'student-academic':    { name: '学业成长助手', icon: '📚', skills: ['insight', 'generate'],               hints: ['学业预警怎么解除？', '选课建议'] },
    'student-activity':    { name: '活动评优助手', icon: '🎭', skills: ['match', 'generate'],                 hints: ['综测加分细则', '活动报名'] },
    'student-second-classroom': { name: '第二课堂助手', icon: '🎓', skills: ['query', 'insight'],             hints: ['学分要求', '如何认定？'] },
    'student-employment':  { name: '就业服务助手', icon: '💼', skills: ['polish', 'generate'],                hints: ['三方协议流程', '简历优化'] },
    'student-card':        { name: '校园卡助手',   icon: '💳', skills: ['query'],                             hints: ['怎么挂失？', '如何充值？'] },
    'student-lost':        { name: '失物招领助手', icon: '🔎', skills: ['generate'],                          hints: ['发布招领信息', '联系失主'] },
    'student-bbs':         { name: '论坛助手',     icon: '💬', skills: ['polish'],                            hints: ['发帖规范', '如何置顶？'] },
    'student-profile':     { name: '个人档案助手', icon: '👤', skills: ['query'],                             hints: ['如何修改信息？', '照片要求'] },
    'student-messages':    { name: '消息助手',     icon: '📨', skills: ['query'],                             hints: ['未读通知', '消息设置'] },
    'student-military':    { name: '征兵入伍助手', icon: '🎖️', skills: ['query', 'generate'],                 hints: ['入伍流程', '学费补偿政策'] },
    'student-life':        { name: '生活服务助手', icon: '🏪', skills: ['query'],                             hints: ['校医院在哪？', '快递站点'] },
    'teacher-approval':    { name: '审批助手',     icon: '📥', skills: ['approval', 'compliance'],            hints: ['批量审批', '驳回模板'] },
    'teacher-academic':    { name: '学风建设助手', icon: '📚', skills: ['insight', 'generate'],               hints: ['出勤统计', '帮扶建议'] },
    'teacher-dorm':        { name: '宿舍管理助手', icon: '🏠', skills: ['insight', 'report'],                 hints: ['卫生检查', '违纪处理'] },
    'teacher-talk':        { name: '谈心谈话助手', icon: '💬', skills: ['generate', 'insight'],               hints: ['谈话记录模板', '问题分析'] },
    'teacher-team':        { name: '队伍建设助手', icon: '👥', skills: ['insight'],                           hints: ['KPI 统计', '案例分享'] },
    'teacher-business':    { name: '业务助手',     icon: '🧰', skills: ['generate'],                         hints: ['通知模板', '场地预约'] },
    'teacher-student-info':{ name: '学生档案助手', icon: '🎓', skills: ['query', 'insight'],                  hints: ['学生查询', '成绩趋势'] },
    'teacher-material':    { name: '材料审核助手', icon: '📎', skills: ['review', 'compliance'],              hints: ['材料要求', '审核标准'] }
  };

  /* --------------- 模块检测 --------------- */
  function detectModule() {
    var p = (location.pathname || '').toLowerCase().replace(/.*\//, '').replace(/\.html?$/i, '');
    for (var key in MODULE_MAP) {
      if (p === key || p.indexOf(key) === 0) return { key: key, meta: MODULE_MAP[key] };
    }
    return null;
  }

  var currentModule = detectModule();

  /* --------------- 样式注入 --------------- */
  var CSS = [
    /* --- A 类：行内 AI 按钮 --- */
    '.aim-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:8px;border:1px solid #D0E4FF;background:linear-gradient(135deg,#F2F6FF,#E8F3FF);color:#165DFF;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;vertical-align:middle;line-height:1.5}',
    '.aim-btn:hover{background:linear-gradient(135deg,#E8F3FF,#D0E4FF);border-color:#165DFF;box-shadow:0 2px 8px rgba(22,93,255,.15)}',
    '.aim-btn:active{transform:scale(.97)}',
    '.aim-btn .aim-ic{font-size:14px}',
    '.aim-btn.loading{opacity:.7;pointer-events:none}',
    '.aim-btn.loading .aim-ic{animation:aim-spin 1s linear infinite}',
    '@keyframes aim-spin{to{transform:rotate(360deg)}}',
    /* 按钮输出结果区 */
    '.aim-result{margin-top:8px;padding:10px 14px;border-radius:10px;background:#F5FAFF;border:1px solid #E8F3FF;font-size:13px;color:#4E5969;line-height:1.7;display:none}',
    '.aim-result.show{display:block;animation:aim-fadeIn .2s ease}',
    '.aim-result .aim-discl{font-size:11px;color:#C9CDD4;margin-top:6px;padding-top:6px;border-top:1px dashed #E5E6EB}',
    '@keyframes aim-fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}',

    /* --- B 类：模块面板（PC 右抽屉 / H5 底部半屏） --- */
    '.aim-panel-mask{position:fixed;inset:0;background:rgba(15,28,55,.35);z-index:950;display:none;transition:opacity .2s}',
    '.aim-panel-mask.show{display:block;animation:aim-fadeIn .18s ease}',
    '.aim-panel{position:fixed;z-index:951;background:#fff;display:flex;flex-direction:column;transition:transform .25s ease}',
    /* PC：右侧抽屉 */
    '@media (min-width:541px){.aim-panel{right:0;top:0;bottom:0;width:380px;box-shadow:-4px 0 24px rgba(10,31,68,.12);transform:translateX(100%)}.aim-panel.show{transform:translateX(0)}}',
    /* H5：底部半屏 */
    '@media (max-width:540px){.aim-panel{left:0;right:0;bottom:0;max-height:70vh;border-radius:16px 16px 0 0;box-shadow:0 -4px 24px rgba(10,31,68,.12);transform:translateY(100%)}.aim-panel.show{transform:translateY(0)}}',
    '.aim-panel-hd{padding:14px 18px;border-bottom:1px solid #F2F3F5;display:flex;align-items:center;gap:10px;flex-shrink:0}',
    '.aim-panel-hd .aim-pi{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#165DFF,#36CFC9);color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0}',
    '.aim-panel-hd .aim-pti{flex:1;min-width:0}',
    '.aim-panel-hd .aim-pti .aim-pn{font-size:14px;font-weight:700;color:#1D2129}',
    '.aim-panel-hd .aim-pti .aim-ps{font-size:11px;color:#86909C;margin-top:1px}',
    '.aim-panel-hd .aim-pcls{width:28px;height:28px;border-radius:50%;border:0;background:#F2F3F5;color:#86909C;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px}',
    '.aim-panel-hd .aim-pcls:hover{background:#E5E6EB;color:#4E5969}',
    '.aim-panel-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 18px}',
    '.aim-panel-hints{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}',
    '.aim-panel-hint{padding:5px 12px;border-radius:16px;background:#F2F6FF;color:#165DFF;font-size:12px;cursor:pointer;border:1px solid transparent;transition:all .15s}',
    '.aim-panel-hint:hover{background:#E8F3FF;border-color:#165DFF}',
    '.aim-chat-log{min-height:60px}',
    '.aim-chat-msg{margin-bottom:10px;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.7;max-width:90%;word-break:break-word}',
    '.aim-chat-msg.user{background:#165DFF;color:#fff;margin-left:auto;border-bottom-right-radius:4px}',
    '.aim-chat-msg.ai{background:#F7F8FA;color:#4E5969;border-bottom-left-radius:4px}',
    '.aim-chat-msg.ai .aim-discl{font-size:11px;color:#C9CDD4;margin-top:6px}',
    '.aim-panel-input{flex-shrink:0;border-top:1px solid #F2F3F5;padding:10px 18px;display:flex;gap:8px;align-items:center;background:#fff}',
    '.aim-panel-input input{flex:1;border:1px solid #E5E6EB;border-radius:999px;padding:8px 14px;font-size:13px;outline:0;background:#F7F8FA;font-family:inherit}',
    '.aim-panel-input input:focus{border-color:#165DFF;background:#fff}',
    '.aim-panel-input .aim-send{width:36px;height:36px;border-radius:50%;border:0;background:linear-gradient(135deg,#165DFF,#4080FF);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}',
    '.aim-panel-input .aim-send:hover{background:linear-gradient(135deg,#0E42B5,#165DFF)}',

    /* --- D 类：数据洞察卡 --- */
    '.aim-insight{padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,#F2F6FF,#FFFFFF);border:1px solid #E8F3FF;margin-top:8px;cursor:pointer;transition:all .15s}',
    '.aim-insight:hover{border-color:#165DFF;box-shadow:0 2px 10px rgba(22,93,255,.08)}',
    '.aim-insight-hd{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#165DFF}',
    '.aim-insight-hd .aim-ic{font-size:15px}',
    '.aim-insight-bd{margin-top:8px;font-size:13px;color:#4E5969;line-height:1.7;display:none}',
    '.aim-insight-bd.show{display:block;animation:aim-fadeIn .2s ease}',
    '.aim-insight .aim-discl{font-size:11px;color:#C9CDD4;margin-top:6px}',

    /* --- E 类：审批辅助卡 --- */
    '.aim-approval{padding:14px 16px;border-radius:12px;border:1px solid #E5E6EB;margin-top:8px;background:#fff}',
    '.aim-approval-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
    '.aim-approval-hd .aim-risk{padding:3px 10px;border-radius:8px;font-size:11px;font-weight:600;color:#fff}',
    '.aim-approval-hd .aim-risk.low{background:#00B42A}',
    '.aim-approval-hd .aim-risk.mid{background:#FF7D00}',
    '.aim-approval-hd .aim-risk.high{background:#F53F3F}',
    '.aim-approval-hd .aim-at{font-size:13px;font-weight:600;color:#1D2129}',
    '.aim-approval-bd{font-size:13px;color:#4E5969;line-height:1.7}',
    '.aim-approval .aim-discl{font-size:11px;color:#C9CDD4;margin-top:8px;padding-top:6px;border-top:1px dashed #E5E6EB}',

    /* 模块面板触发已合并到悬浮球 */
    ''
  ].join('');

  var style = document.createElement('style');
  style.id = 'aim-style';
  style.textContent = CSS;
  document.head.appendChild(style);

  /* --------------- 上下文穿衣：蓝球变身为模块助手 --------------- */
  function applyModuleContext() {
    if (!currentModule) return;
    if (window.AIBall && window.AIBall.setModuleMode) {
      window.AIBall.setModuleMode(currentModule.meta.name, openPanel);
    }
  }

  /* --------------- B 类：模块面板 --------------- */
  var $panelMask, $panel, $chatLog, $panelInput;
  var chatHistory = [];

  function ensurePanel() {
    if ($panel) return;
    if (!currentModule) return;
    var meta = currentModule.meta;

    $panelMask = document.createElement('div');
    $panelMask.className = 'aim-panel-mask';
    document.body.appendChild($panelMask);

    $panel = document.createElement('div');
    $panel.className = 'aim-panel';
    $panel.innerHTML =
      '<div class="aim-panel-hd">' +
        '<div class="aim-pi">' + meta.icon + '</div>' +
        '<div class="aim-pti"><div class="aim-pn">' + meta.name + '</div><div class="aim-ps">AI 仅供参考 · 以正式文件为准</div></div>' +
        '<button class="aim-pcls" type="button" aria-label="关闭">×</button>' +
      '</div>' +
      '<div class="aim-panel-body">' +
        '<div class="aim-panel-hints"></div>' +
        '<div class="aim-chat-log"></div>' +
      '</div>' +
      '<div class="aim-panel-input">' +
        '<input type="text" placeholder="输入问题…" autocomplete="off">' +
        '<button class="aim-send" type="button">➤</button>' +
      '</div>';
    document.body.appendChild($panel);

    $chatLog = $panel.querySelector('.aim-chat-log');
    $panelInput = $panel.querySelector('.aim-panel-input input');

    var hintsBox = $panel.querySelector('.aim-panel-hints');
    (meta.hints || []).forEach(function (h) {
      var el = document.createElement('span');
      el.className = 'aim-panel-hint';
      el.textContent = h;
      el.addEventListener('click', function () { sendChat(h); });
      hintsBox.appendChild(el);
    });

    $panelMask.addEventListener('click', closePanel);
    $panel.querySelector('.aim-pcls').addEventListener('click', closePanel);

    $panel.querySelector('.aim-send').addEventListener('click', function () {
      var v = $panelInput.value.trim();
      if (v) sendChat(v);
    });
    $panelInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var v = $panelInput.value.trim();
        if (v) sendChat(v);
      }
    });
  }

  function appendMsg(role, text) {
    var el = document.createElement('div');
    el.className = 'aim-chat-msg ' + role;
    if (role === 'ai') {
      el.innerHTML = text + '<div class="aim-discl">AI 生成，仅供参考</div>';
    } else {
      el.textContent = text;
    }
    $chatLog.appendChild(el);
    $chatLog.scrollTop = $chatLog.scrollHeight;
  }

  function sendChat(q) {
    ensurePanel();
    $panelInput.value = '';
    appendMsg('user', q);
    chatHistory.push({ role: 'user', content: q });

    var meta = currentModule ? currentModule.meta : {};
    var sysHint = '你是"' + (meta.name || '学工AI助手') + '"，只回答与该模块相关的问题。回答简洁、结构化、中文。涉及政策规则时标注"（以学校正式文件为准）"。';

    if (window.AI && typeof window.AI.chat === 'function') {
      var msgs = [{ role: 'system', content: sysHint }].concat(chatHistory);
      var streamEl = document.createElement('div');
      streamEl.className = 'aim-chat-msg ai';
      streamEl.innerHTML = '<span style="color:#86909C">思考中…</span>';
      $chatLog.appendChild(streamEl);
      $chatLog.scrollTop = $chatLog.scrollHeight;
      window.AI.chat(msgs, {
        onDelta: function(d, full) {
          streamEl.innerHTML = (window.AI.renderMd ? window.AI.renderMd(full) : full.replace(/\n/g,'<br>'));
          $chatLog.scrollTop = $chatLog.scrollHeight;
        }
      }).then(function (r) {
        var text = (r && r.text) || '暂时无法回复，请稍后重试。';
        chatHistory.push({ role: 'assistant', content: text });
        streamEl.innerHTML = (window.AI.renderMd ? window.AI.renderMd(text) : text.replace(/\n/g,'<br>')) + '<div class="aim-discl">AI 生成，仅供参考</div>';
      }).catch(function () {
        var fallback = generateDemoReply(q, meta);
        chatHistory.push({ role: 'assistant', content: fallback });
        streamEl.innerHTML = fallback + '<div class="aim-discl">AI 生成，仅供参考</div>';
      });
    } else {
      var fallback = generateDemoReply(q, meta);
      chatHistory.push({ role: 'assistant', content: fallback });
      appendMsg('ai', fallback);
    }
  }

  function generateDemoReply(q, meta) {
    var name = meta.name || '学工AI助手';
    var hints = meta.hints || [];
    var suggest = hints.length > 0
      ? '你还可以问我：' + hints.map(function(h){ return '"' + h + '"'; }).join('、')
      : '你可以换个更具体的问题再试';
    return '你好，我是<b>' + name + '</b>。<br><br>' +
      '关于"' + q + '"，根据学校相关规定和你的个人信息，建议你：<br>' +
      '1. 登录智慧学工系统查看最新通知和政策文件<br>' +
      '2. 如有材料需提交，可使用系统"智能填表"功能<br>' +
      '3. 如需线下咨询，请联系辅导员或学工办<br><br>' +
      '💡 ' + suggest + '。';
  }

  function openPanel() {
    ensurePanel();
    if (!$panel) return;
    $panelMask.classList.add('show');
    $panel.classList.add('show');
    document.body.style.overflow = 'hidden';
    if (window.AIBall) window.AIBall.hide();
    setTimeout(function () { $panelInput.focus(); }, 200);
  }

  function closePanel() {
    if ($panelMask) $panelMask.classList.remove('show');
    if ($panel) $panel.classList.remove('show');
    document.body.style.overflow = '';
    if (window.AIBall) window.AIBall.show();
  }

  /* --------------- A 类：行内 AI 按钮 --------------- */
  var ACTION_LABELS = {
    polish:     { icon: '✨', label: 'AI 润色' },
    compliance: { icon: '✅', label: 'AI 合规自检' },
    generate:   { icon: '📝', label: 'AI 生成' },
    diagnose:   { icon: '🔍', label: 'AI 智能诊断' },
    match:      { icon: '🎯', label: 'AI 匹配' },
    review:     { icon: '📋', label: 'AI 预审' },
    report:     { icon: '📊', label: 'AI 生成报告' },
    query:      { icon: '💡', label: 'AI 查询' },
    insight:    { icon: '📈', label: 'AI 解读' }
  };

  function renderInlineButtons() {
    var els = document.querySelectorAll('[data-ai-action]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.__aim_rendered) return;
      el.__aim_rendered = true;

      var action = el.getAttribute('data-ai-action');
      var customLabel = el.getAttribute('data-ai-label');
      var context = el.getAttribute('data-ai-context') || '';
      var info = ACTION_LABELS[action] || { icon: '🤖', label: customLabel || 'AI 处理' };

      var btn = document.createElement('button');
      btn.className = 'aim-btn';
      btn.type = 'button';
      btn.innerHTML = '<span class="aim-ic">' + info.icon + '</span>' + (customLabel || info.label);

      var result = document.createElement('div');
      result.className = 'aim-result';

      el.appendChild(btn);
      el.appendChild(result);

      btn.addEventListener('click', function () {
        if (btn.classList.contains('loading')) return;
        btn.classList.add('loading');

        var prompt = buildActionPrompt(action, context, el);
        executeAction(prompt, function (text) {
          btn.classList.remove('loading');
          result.innerHTML = text + '<div class="aim-discl">AI 生成，仅供参考</div>';
          result.classList.add('show');
        });
      });
    });
  }

  function buildActionPrompt(action, context) {
    var prompts = {
      polish:     '请润色以下文本，使其更正式、通顺：' + context,
      compliance: '请检查以下内容是否符合学校相关规章制度，列出合规项和风险项：' + context,
      generate:   '请根据以下要求生成内容：' + context,
      diagnose:   '请分析以下问题并给出诊断建议：' + context,
      match:      '请根据条件匹配合适的选项：' + context,
      review:     '请审核以下材料，指出需要补充或修改的地方：' + context,
      report:     '请根据以下数据生成分析报告：' + context,
      query:      '请回答以下问题：' + context,
      insight:    '请对以下数据进行解读分析：' + context
    };
    return prompts[action] || context;
  }

  function executeAction(prompt, callback) {
    if (window.AI && typeof window.AI.chat === 'function') {
      var mode = window.AI.effectiveMode ? window.AI.effectiveMode() : 'demo';
      if (mode === 'live') {
        window.AI.chat(
          [{ role: 'system', content: '你是智慧学工 AI 助手，请简洁回答。' }, { role: 'user', content: prompt }],
          {}
        ).then(function (r) {
          callback((r && r.text) || '处理完成。');
        }).catch(function () {
          callback(generateDemoActionResult(prompt));
        });
        return;
      }
    }
    setTimeout(function () {
      callback(generateDemoActionResult(prompt));
    }, 500);
  }

  function generateDemoActionResult(prompt) {
    if (/润色/.test(prompt)) {
      return '✅ <b>润色完成</b><br>已将文本调整为更正式的措辞，语句更加通顺连贯。（Demo 模式）';
    }
    if (/合规|自检/.test(prompt)) {
      return '✅ <b>合规检查完成</b><br>• 时间填写：<span style="color:#00B42A">✓ 合规</span><br>• 证明材料：<span style="color:#FF7D00">⚠ 建议补充</span><br>• 审批路径：<span style="color:#00B42A">✓ 正确</span>（Demo 模式）';
    }
    if (/诊断|分析/.test(prompt)) {
      return '🔍 <b>智能诊断</b><br>初步判断：设备可能存在硬件老化问题。<br>建议：联系后勤部门安排专业检修。（Demo 模式）';
    }
    if (/匹配/.test(prompt)) {
      return '🎯 <b>匹配结果</b><br>根据您的条件，推荐 3 个最佳匹配项。具体结果将在正式环境中展示。（Demo 模式）';
    }
    return '💡 <b>AI 处理完成</b><br>结果已生成。正式环境中将根据实际数据给出精准回答。（Demo 模式）';
  }

  /* --------------- D 类：数据洞察卡 --------------- */
  function renderInsightCards() {
    var els = document.querySelectorAll('[data-ai-insight]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.__aim_insight) return;
      el.__aim_insight = true;

      var dataKey = el.getAttribute('data-ai-insight');
      var card = document.createElement('div');
      card.className = 'aim-insight';
      card.innerHTML =
        '<div class="aim-insight-hd"><span class="aim-ic">📈</span>AI 数据解读</div>' +
        '<div class="aim-insight-bd">' + generateInsightText(dataKey) + '<div class="aim-discl">AI 生成，仅供参考</div></div>';

      var bd = card.querySelector('.aim-insight-bd');
      card.addEventListener('click', function () {
        bd.classList.toggle('show');
      });

      el.appendChild(card);
    });
  }

  function generateInsightText(dataKey) {
    var insights = {
      'attendance': '本周出勤率 96.2%，环比上升 1.3%。缺勤主要集中在周一上午第 1-2 节。建议关注连续缺勤 ≥3 次的同学。',
      'grades': '本学期平均绩点 3.45，较上学期提升 0.12。高等数学科目不及格率下降 3pp，说明帮扶措施有效。',
      'leave': '本月请假 48 人次，病假占比 58%（环比上升 6pp），可能与换季流感相关。超 3 天请假 6 例，均已完成院级审批。',
      'dorm': 'A 栋平均卫生评分 87.3，B 栋 82.1。B 栋 303 室本月第 3 次不合格，建议约谈。报修平均响应时长 2.4h，优于目标 4h。',
      'funding': '本学期奖助贷申请 312 人次，AI 预审通过率 89%。退回原因前三：材料不全（45%）、信息不符（30%）、超时提交（15%）。',
      'employment': '2025 届签约率 68%，同比提升 5pp。IT 行业签约最多（32%），金融次之（18%）。6% 未落实需重点关注。'
    };
    return insights[dataKey] || '暂无该维度的数据洞察。正式环境中，AI 将实时分析最新数据并生成自然语言解读。';
  }

  /* --------------- E 类：审批辅助卡 --------------- */
  function renderApprovalCards() {
    var els = document.querySelectorAll('[data-ai-approval]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.__aim_approval) return;
      el.__aim_approval = true;

      var context = el.getAttribute('data-ai-approval');
      var result = generateApprovalAdvice(context);

      var card = document.createElement('div');
      card.className = 'aim-approval';
      card.innerHTML =
        '<div class="aim-approval-hd">' +
          '<span class="aim-risk ' + result.level + '">' + result.levelText + '</span>' +
          '<span class="aim-at">AI 审批建议</span>' +
        '</div>' +
        '<div class="aim-approval-bd">' + result.advice + '</div>' +
        '<div class="aim-discl">AI 生成，仅供参考 · 最终决策权在审批人</div>';

      el.appendChild(card);
    });
  }

  function generateApprovalAdvice(context) {
    if (/频繁|多次|5次|超/.test(context)) {
      return {
        level: 'high', levelText: '风险偏高',
        advice: '该生近期请假频率较高，建议核实具体原因。若为身体问题，建议转介心理咨询或医务室；若缺少材料，建议要求补充后再审批。'
      };
    }
    if (/缺|未|不全/.test(context)) {
      return {
        level: 'mid', levelText: '需关注',
        advice: '部分证明材料不完整，建议退回要求补充后重新提交。关注是否有时限性要求。'
      };
    }
    return {
      level: 'low', levelText: '正常',
      advice: '该申请各项信息齐全，符合相关规定，建议按流程正常审批通过。'
    };
  }

  /* --------------- 启动 --------------- */
  function boot() {
    applyModuleContext();
    renderInlineButtons();
    renderInsightCards();
    renderApprovalCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* --------------- 对外 API --------------- */
  window.AIModule = {
    currentModule: currentModule,
    openPanel: openPanel,
    closePanel: closePanel,
    renderInlineButtons: renderInlineButtons,
    renderInsightCards: renderInsightCards,
    renderApprovalCards: renderApprovalCards
  };
})();
