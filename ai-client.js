/*!
 * 中南大学 智慧学工 AI 助手 - 统一 AI 客户端
 * - OpenAI 兼容协议（支持 OpenAI / DeepSeek / Kimi / 通义 / 智谱 / Ollama-OpenAI 等）
 * - 支持流式与非流式
 * - 未配置 Key 时自动进入 "Demo 拟真" 模式（本地模拟流式输出，无需网络）
 * - 配置通过 localStorage 持久化：ai.baseUrl / ai.apiKey / ai.model / ai.mode / ai.temp
 * - 作用域：全局命名空间 window.AI
 */
(function (global) {
  'use strict';
  if (global.AI) return;

  var LS_KEY = 'ai.config.v1';

  var DEFAULT_CFG = {
    baseUrl: 'https://api.openai.com/v1', // 可换成 https://api.deepseek.com/v1、https://api.moonshot.cn/v1 等
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1200,
    mode: 'auto', // auto / live / demo
    systemHint: '你是中南大学智慧学工 AI 助手，服务学生、辅导员与管理员。回答务必简洁、结构化、中文，涉及政策规则时标注"（以学校正式文件为准）"。'
  };

  function readCfg() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return Object.assign({}, DEFAULT_CFG);
      return Object.assign({}, DEFAULT_CFG, JSON.parse(raw));
    } catch (e) { return Object.assign({}, DEFAULT_CFG); }
  }

  function writeCfg(patch) {
    var next = Object.assign({}, readCfg(), patch || {});
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function isLiveReady(cfg) {
    cfg = cfg || readCfg();
    return !!(cfg.apiKey && cfg.baseUrl && cfg.model);
  }

  function effectiveMode(cfg) {
    cfg = cfg || readCfg();
    if (cfg.mode === 'demo') return 'demo';
    if (cfg.mode === 'live') return 'live';
    return isLiveReady(cfg) ? 'live' : 'demo';
  }

  /* ============== 真实调用（OpenAI 兼容 /chat/completions 流式） ============== */
  async function chatLive(messages, opts) {
    var cfg = readCfg();
    opts = opts || {};
    var url = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';
    var body = {
      model: opts.model || cfg.model,
      messages: messages,
      temperature: opts.temperature != null ? opts.temperature : cfg.temperature,
      max_tokens: opts.maxTokens || cfg.maxTokens,
      stream: !!opts.onDelta
    };

    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var errText = await res.text().catch(function(){ return ''; });
      throw new Error('AI 服务返回 ' + res.status + '：' + errText.slice(0, 300));
    }

    // 非流式
    if (!opts.onDelta) {
      var data = await res.json();
      var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      return { text: text, raw: data };
    }

    // 流式 SSE
    var reader = res.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buf = '';
    var full = '';
    while (true) {
      var r = await reader.read();
      if (r.done) break;
      buf += decoder.decode(r.value, { stream: true });
      var lines = buf.split('\n');
      buf = lines.pop();
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || !line.startsWith('data:')) continue;
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          var j = JSON.parse(payload);
          var delta = (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
          if (delta) { full += delta; opts.onDelta(delta, full); }
        } catch (e) { /* ignore partial */ }
      }
    }
    return { text: full };
  }

  /* ============== Demo 模式（离线拟真流式输出） ============== */
  // 简单策略：根据最后一条用户消息命中关键词，选模板，逐字 setInterval 吐出
  var DEMO_TEMPLATES = [
    { kw: /请假|事假|病假|公假/,
      text: '【请假建议】\n1. 根据你的描述，判定类型：**病假**，建议时长 2~3 天。\n2. 需上传佐证：门诊病历 / 诊断证明。\n3. 审批链路：辅导员 → 学院分管副书记；预计 1 个工作日内完成。\n4. 注意：本学期你已累计请假 3 次，再请假将触发学风提醒（以学校正式文件为准）。\n\n你可以点击"一键填表"按钮，系统已为你生成请假单初稿。' },
    { kw: /审批|多久|几天|多长时间|流程/,
      text: '【审批流程说明】\n根据《中南大学学生请假管理办法》：\n- **3 天及以下**：辅导员审批，通常 **4 小时内** 完成\n- **3~7 天**：辅导员 → 学院分管副书记，约 **1~2 个工作日**\n- **7 天以上**：需学院审批 + 学工部备案，约 **3 个工作日**\n\n📌 你可以在"请假记录"页面实时查看审批进度，系统也会通过消息推送通知你结果。\n\n（以学校正式文件为准）' },
    { kw: /奖学金|国励|国奖|校奖|评奖/,
      text: '【评奖建议】\n依据你的 GPA 3.78、综测 87.4 分、三项竞赛获奖与一项论文，AI 匹配 3 类奖项：\n- 🟢 **冲刺型**：国家奖学金（需院系答辩，匹配度 82%）\n- 🟢 **稳拿型**：校优秀学生一等奖学金（匹配度 95%）\n- 🟡 **加分型**：学科竞赛专项（文件未公示，建议关注）\n\n点击对应奖项可查看申请材料清单与智能填表入口。' },
    { kw: /助学金|贷款|困难|资助|奖助贷/,
      text: '【资助政策查询】\n根据你的档案信息，AI 为你梳理了可申请项目：\n- ✅ **国家助学金**：一档 4400元/年（匹配度 90%）\n- ✅ **校临时困难补助**：最高 3000元（随时可申请）\n- ✅ **国家助学贷款**：最高 16000元/年（利率 4.5%，在校期间免息）\n- 📎 **勤工助学**：图书馆助管岗（20h/周，800元/月）\n\n建议先申请国家助学金，截止日期为 **10 月 15 日**。如需帮助可点击"智能填表"。' },
    { kw: /宿舍|报修|床|空调|热水/,
      text: '【报修建议】\n识别到问题：**空调不制冷**。\n1. AI 已为你生成工单：\n   - 位置：16 栋 203\n   - 分类：电器故障 / 空调\n   - 优先级：普通（当前室外 32°C，建议升级至"紧急"）\n2. 预计维修响应：24 小时内。\n3. 建议先检查：遥控器电池 / 断电重启 / 滤网堵塞。\n\n点击"提交工单"即可下派后勤中心。' },
    { kw: /简历|就业|求职|面试|实习|签约|三方/,
      text: '【就业 AI 分析】\n基于你的学业画像与目标岗位「算法工程师」：\n- 📄 简历体检：项目经验匹配度 78%，建议突出 2 项 ACM 经历与 1 段大厂实习\n- 🎯 岗位推荐：字节跳动 / 蚂蚁 / 华为 · 共 12 个 HC 匹配度 ≥ 80%\n- 💬 模拟面试：已为你准备 5 道高频算法题 + 2 道项目深挖题\n- ⚠️ 风险提示：你目前无 Kaggle / 开源贡献，相对竞品弱\n\n点击"一键投递"或"开始模拟面试"继续。' },
    { kw: /综测|综合测评|加分/,
      text: '【综测推演】\n当前得分 87.4（年级前 18%）\n拆分：\n- 学业（70%）：85.2\n- 德育（15%）：92.0\n- 文体（10%）：88.5\n- 社会实践（5%）：84.0\n\n**AI 提升建议**：\n1. 参加 5 月"挑战杯"可 +0.6 分（报名截至 4-25）\n2. 补交志愿服务证明可追认 +0.3 分\n3. 当前距年级前 10% 还差 1.2 分，可行。' },
    { kw: /成绩|绩点|GPA|挂科|补考|重修/,
      text: '【成绩分析报告】\n📊 当前学业画像：\n- **累计 GPA**：3.62（专业排名 28/186，前 15%）\n- **本学期 GPA**：3.78（上升趋势 ↑ 0.16）\n- **已修学分**：126 / 170（完成 74%）\n\n⚠️ 风险提示：\n- 高等数学 B(下) 期中成绩 62 分，有挂科风险\n- 建议参加周三晚"学霸帮帮团"辅导（报名入口已开放）\n\n📈 按目前趋势，预计毕业 GPA 约 **3.65**，满足保研基本线（3.5）。' },
    { kw: /课表|上课|课程|选课/,
      text: '【课程信息】\n📅 今日课表（周三）：\n- 08:00-09:35  高等数学 B(下)  ·  数学楼 301\n- 10:10-11:45  大学英语(三)  ·  外语楼 205\n- 14:30-16:05  数据结构与算法  ·  计算机楼 402\n\n📌 温馨提示：\n- 明天上午有"中国近现代史"，别忘了带课本\n- 下周一"数据结构"有课堂测验，建议复习第 7 章"图"\n- 本学期还剩 6 个教学周' },
    { kw: /谈话|问题学生|心理|情绪/,
      text: '【谈话辅助】\n已为你生成 5 步谈话提纲：\n1. 暖场（3min）：以近期篮球赛切入，建立信任\n2. 学业关切（5min）：指出本学期挂科风险（高数 / 英语）\n3. 深挖原因（8min）：家庭 / 情绪 / 社交 / 沉迷游戏等\n4. 共创方案（8min）：结对学习 + 朋辈辅导 + 每周复盘\n5. 结束确认（2min）：下次谈话时间 & 书面承诺\n\n📌 风险识别：学生本月请假 2 次 + 夜跑门禁 3 次，建议启用心理三级联动。' },
    { kw: /材料|初审|审核/,
      text: '【材料 AI 初审】\n已识别 5 份材料：\n- ✅ 成绩单：信息完整、校验章清晰\n- ✅ 获奖证书：3 张，其中 1 张 OCR 置信度 86%，建议复核\n- ⚠️ 家庭情况说明：字数 120，低于规定 300 字，**建议退回补充**\n- ❌ 身份证复印件：反面模糊，**不通过**\n- ✅ 推荐信：签字 / 章齐全\n\n**AI 综合意见**：建议退回补充 2 项后再次提交，预计学生可在 1 天内完成。' },
    { kw: /舆情|投诉|BBS|心声/,
      text: '【舆情研判】\n近 24h 采集帖文 186 条，AI 聚类出 3 条热点：\n- 🔥 食堂二楼菜价上涨 · 讨论度 412 · 情绪负向 78%\n- 🔸 图书馆空调过冷 · 讨论度 86 · 情绪偏中性\n- 🔸 宿舍热水故障 · 讨论度 64 · 已联系后勤\n\n**AI 处置建议**：\n1. 食堂价格：12h 内由后勤处联合饮食中心回应（模板已生成）\n2. 图书馆：当日工程部调温\n3. 宿舍：已派单，持续跟踪' },
    { kw: /第二课堂|学分|证书|学时/,
      text: '【第二课堂学分报告】\n📋 你的学分完成情况：\n- **已获学分**：6.5 / 10（完成 65%）\n- 思想政治：2.0 ✅ 已达标\n- 学术科技：1.5（还差 0.5）\n- 文体活动：1.5 ✅ 已达标\n- 志愿服务：1.0（还差 1.0）\n- 社会实践：0.5（还差 0.5）\n\n🎯 AI 推荐活动：\n1. "周末志愿行"——本周六 · 可获 0.5 志愿学分\n2. "数学建模讲座"——下周三 · 可获 0.5 学术学分\n\n距毕业要求还差 **3.5 学分**，按当前节奏可按时完成。' },
    { kw: /校园卡|饭卡|挂失|充值|一卡通/,
      text: '【校园卡服务】\n🔍 查询到你的校园卡信息：\n- 卡号：2022****3856\n- 余额：￥126.50\n- 状态：正常使用中\n\n💡 常用操作：\n1. **在线充值**：支持微信 / 支付宝 / 银行卡，实时到账\n2. **挂失补办**：线上申请后到一站式大厅取卡（工本费 20 元）\n3. **消费明细**：近 7 日消费 ￥89.00（食堂占 76%）\n\n⚠️ 提示：你的卡近 3 天未使用，如有丢失风险请及时挂失。' },
    { kw: /失物|丢|找|捡/,
      text: '【失物招领 AI 匹配】\n🔍 根据你的描述，AI 匹配到 3 条相关信息：\n1. **黑色钱包** — 5 月 14 日 · 图书馆 3 楼 → 匹配度 92%\n2. **深蓝色卡包** — 5 月 12 日 · 食堂二楼 → 匹配度 67%\n3. **棕色零钱包** — 5 月 10 日 · 教学楼 A 区 → 匹配度 45%\n\n📞 点击对应条目可查看详情并联系拾到者。\n\n💡 建议：同时在"失物招领"板块发布寻物启事，AI 会持续匹配新增招领信息并推送通知。' },
    { kw: /预警|学业预警|挂科|学分不够/,
      text: '【学业预警分析】\n⚠️ 当前预警状态：**黄色预警**\n\n原因分析：\n- 本学期已挂科 1 门（高等数学 B 下）\n- 累计不及格学分：6 学分\n- 绩点趋势：连续 2 学期下滑\n\n📋 AI 帮扶方案：\n1. 已为你匹配"学霸帮帮团"导师：计科院 李同学（GPA 4.2）\n2. 建议参加：周三/周五晚自习辅导（数学楼 201）\n3. 高数补考辅导班将于期末前 3 周开班\n\n📌 辅导员 张老师 将于本周五与你谈话，请留意消息通知。' },
    { kw: /征兵|入伍|当兵|军队|参军/,
      text: '【征兵入伍指南】\n🎖️ 基于你的条件（本科在读 · 男 · 20岁），AI 为你梳理：\n\n**报名流程**：\n1. 全国征兵网注册 → 2. 学校武装部审核 → 3. 体检站体检 → 4. 政治考核 → 5. 批准入伍\n\n**优惠政策**：\n- 🏫 学费补偿：最高 16000元/年（追溯已缴学费）\n- 📋 保留学籍：退役后 2 年内可复学\n- 🎓 考研加分：初试加 10 分，同等条件优先录取\n- 💰 一次性奖励金：按当地标准发放\n\n⏰ 当前为春季征兵窗口期，截止 **3 月 31 日**，建议尽快提交。\n\n（以学校正式文件为准）' },
    { kw: /活动|报名|竞赛|比赛|评优/,
      text: '【活动评优推荐】\n🎯 根据你的画像，AI 推荐以下活动：\n\n**可报名活动**（3 项）：\n- 🏆 "挑战杯"科技作品竞赛 · 截止 5-25 · 综测 +0.6\n- 🎭 校园文化节志愿者 · 截止 5-18 · 志愿学时 +8h\n- 📝 英语演讲比赛 · 截止 5-20 · 文体学分 +0.5\n\n**已获荣誉**（本学期）：\n- ✅ 优秀学生干部（院级）\n- ✅ 数学建模校赛三等奖\n\n**评优提醒**：\n- 校三好学生评选 6 月启动，你的条件匹配度 **88%**\n- 建议再参加 1 项志愿活动以补足条件' }
  ];

  function demoPickTemplate(userMsg) {
    for (var i = 0; i < DEMO_TEMPLATES.length; i++) {
      if (DEMO_TEMPLATES[i].kw.test(userMsg)) return DEMO_TEMPLATES[i].text;
    }
    return '你好！我已收到你的问题："' + userMsg.slice(0, 60) + '"\n\n根据系统检索，为你整理以下信息：\n\n1. **相关政策**：该事项适用《中南大学本科生学籍管理规定》相关条款，具体以学校正式文件为准。\n2. **办理方式**：你可以通过智慧学工系统在线办理，也可前往一站式学生服务大厅（校本部行政楼 102）现场咨询。\n3. **联系方式**：如需进一步帮助，请联系你的辅导员或学工办（电话：0731-8888XXXX）。\n\n💡 你还可以尝试问我更具体的问题，例如"奖学金申请条件"、"请假怎么填"、"宿舍报修"等，我会给出更精准的解答。';
  }

  function chatDemo(messages, opts) {
    opts = opts || {};
    var last = '';
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { last = messages[i].content || ''; break; }
    }
    var text = demoPickTemplate(last);
    return new Promise(function (resolve) {
      if (!opts.onDelta) { setTimeout(function(){ resolve({ text: text, demo: true }); }, 300); return; }
      var idx = 0;
      var acc = '';
      var step = Math.max(1, Math.floor(text.length / 80));
      var timer = setInterval(function () {
        if (idx >= text.length) { clearInterval(timer); resolve({ text: acc, demo: true }); return; }
        var chunk = text.slice(idx, idx + step);
        idx += step;
        acc += chunk;
        try { opts.onDelta(chunk, acc); } catch (e) {}
      }, 35);
    });
  }

  /* ============== 统一入口 ============== */
  async function chat(messages, opts) {
    opts = opts || {};
    var mode = effectiveMode();
    if (mode === 'live') {
      try { return await chatLive(messages, opts); }
      catch (err) {
        // live 失败回落 demo，并在前面加一段错误说明
        var notice = '⚠️ 真实 AI 调用失败：' + (err && err.message ? err.message : err) + '\n已自动切换到 Demo 模式演示以下内容：\n\n';
        if (opts.onDelta) opts.onDelta(notice, notice);
        var r = await chatDemo(messages, opts);
        return { text: notice + r.text, demo: true, error: String(err) };
      }
    }
    return chatDemo(messages, opts);
  }

  // 便捷：一次性问答（不流式）
  async function ask(prompt, systemPrompt) {
    var cfg = readCfg();
    var msgs = [
      { role: 'system', content: systemPrompt || cfg.systemHint },
      { role: 'user', content: prompt }
    ];
    var r = await chat(msgs);
    return r.text;
  }

  // 连通性测试
  async function ping() {
    var cfg = readCfg();
    if (!isLiveReady(cfg)) return { ok: false, mode: 'demo', msg: '未配置 API Key，当前 Demo 模式' };
    try {
      var r = await chatLive([{ role: 'user', content: 'ping, 回复 pong 即可' }], { maxTokens: 16 });
      return { ok: true, mode: 'live', msg: '连通成功：' + (r.text || '').slice(0, 60) };
    } catch (e) {
      return { ok: false, mode: 'live', msg: '失败：' + (e.message || e) };
    }
  }

  // 简易 Markdown 渲染（只处理 **粗体** / 列表 / 换行，避免引入第三方）
  function renderMd(txt) {
    if (!txt) return '';
    var esc = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    esc = esc.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    esc = esc.replace(/^### (.*)$/gm, '<h4 style="margin:8px 0 4px;font-size:14px">$1</h4>');
    esc = esc.replace(/^## (.*)$/gm, '<h3 style="margin:10px 0 6px;font-size:15px">$1</h3>');
    // 有序/无序列表
    esc = esc.replace(/^(\d+)\.\s+(.*)$/gm, '<div style="margin-left:14px">$1. $2</div>');
    esc = esc.replace(/^-\s+(.*)$/gm, '<div style="margin-left:14px">• $1</div>');
    esc = esc.replace(/\n/g, '<br>');
    return esc;
  }

  global.AI = {
    version: '1.0',
    readCfg: readCfg,
    writeCfg: writeCfg,
    isLiveReady: isLiveReady,
    effectiveMode: effectiveMode,
    chat: chat,
    ask: ask,
    ping: ping,
    renderMd: renderMd
  };

  /* ============== 全站右下浮球快速对话（与 .ai-ball 锚点共存）============== */
  // 若页面上有 #ai-mini-launcher 或 .ai-ball，点击时按 Alt 键展开迷你对话框；否则跳转既有链接
  document.addEventListener('DOMContentLoaded', function () {
    try { injectMini(); } catch (e) {}
  });

  function injectMini() {
    if (document.getElementById('ai-mini-panel')) return;
    var panel = document.createElement('div');
    panel.id = 'ai-mini-panel';
    panel.style.cssText = 'position:fixed;right:28px;bottom:130px;width:360px;max-height:520px;background:#fff;border-radius:14px;box-shadow:0 14px 40px rgba(10,31,68,.22);display:none;flex-direction:column;z-index:90;overflow:hidden;border:1px solid #E5E6EB;font-size:13px';
    panel.innerHTML = ''
      + '<div style="padding:10px 14px;background:linear-gradient(135deg,#0E42B5,#165DFF);color:#fff;display:flex;align-items:center;justify-content:space-between">'
      +   '<div style="display:flex;align-items:center;gap:8px"><span style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center">🤖</span><b>学工 AI 助手</b><span id="ai-mini-mode" style="font-size:11px;padding:2px 6px;border-radius:8px;background:rgba(255,255,255,.18)"></span></div>'
      +   '<div style="display:flex;gap:6px"><a href="' + (/\/(student|teacher|admin)\//.test(location.pathname) ? '../' : '') + 'ai-settings.html" style="color:#fff;font-size:12px;opacity:.9" title="AI 配置">⚙</a><span id="ai-mini-close" style="cursor:pointer;font-size:16px">×</span></div>'
      + '</div>'
      + '<div id="ai-mini-log" style="flex:1;overflow:auto;padding:12px 14px;background:#F7F8FA;min-height:220px"></div>'
      + '<div style="padding:10px;border-top:1px solid #F2F3F5;display:flex;gap:6px;background:#fff">'
      +   '<input id="ai-mini-inp" placeholder="输入问题，Enter 发送（如：我感冒了想请 3 天病假）" style="flex:1;padding:8px 10px;border:1px solid #E5E6EB;border-radius:8px;font-size:13px;outline:0">'
      +   '<button id="ai-mini-send" style="padding:8px 14px;border:0;border-radius:8px;background:linear-gradient(135deg,#165DFF,#4080FF);color:#fff;cursor:pointer;font-size:13px">发送</button>'
      + '</div>';
    document.body.appendChild(panel);
    document.getElementById('ai-mini-mode').textContent = global.AI.effectiveMode() === 'live' ? '● Live' : '● Demo';
    document.getElementById('ai-mini-close').onclick = function () { panel.style.display = 'none'; };

    var log = document.getElementById('ai-mini-log');
    var inp = document.getElementById('ai-mini-inp');
    var sendBtn = document.getElementById('ai-mini-send');
    var history = [];
    log.innerHTML = '<div style="color:#86909C;font-size:12px;line-height:1.7">👋 我是智慧学工 AI 助手。可以问我：<br>• 请假 / 报销 / 宿舍报修<br>• 奖学金资格 / 综测得分<br>• 学生谈话提纲 / 材料初审<br>• 就业岗位匹配 / 简历体检</div>';

    function appendMsg(role, text, isStream) {
      var row = document.createElement('div');
      row.style.cssText = 'margin:8px 0;display:flex;' + (role === 'user' ? 'justify-content:flex-end' : '');
      var bubble = document.createElement('div');
      bubble.style.cssText = 'max-width:82%;padding:8px 12px;border-radius:10px;line-height:1.7;' + (role === 'user' ? 'background:#165DFF;color:#fff;border-top-right-radius:2px' : 'background:#fff;border:1px solid #E5E6EB;border-top-left-radius:2px');
      bubble.innerHTML = role === 'user' ? (text.replace(/</g, '&lt;')) : global.AI.renderMd(text);
      row.appendChild(bubble);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    async function send() {
      var q = inp.value.trim(); if (!q) return;
      inp.value = '';
      appendMsg('user', q);
      history.push({ role: 'user', content: q });
      var bubble = appendMsg('assistant', '思考中…');
      bubble.innerHTML = '<span style="color:#86909C">思考中</span>';
      var acc = '';
      try {
        var r = await global.AI.chat(
          [{ role: 'system', content: global.AI.readCfg().systemHint }].concat(history.slice(-8)),
          { onDelta: function (d, full) { acc = full; bubble.innerHTML = global.AI.renderMd(full); log.scrollTop = log.scrollHeight; } }
        );
        if (!acc) bubble.innerHTML = global.AI.renderMd(r.text || '');
        history.push({ role: 'assistant', content: r.text || acc });
      } catch (e) {
        bubble.innerHTML = '<span style="color:#F53F3F">出错：' + (e.message || e) + '</span>';
      }
    }
    sendBtn.onclick = send;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

    // 劫持 .ai-ball：点击改为展开面板（保留原跳转到对话页的备选 - 长按/右键可用原链接）
    var balls = document.querySelectorAll('.ai-ball');
    balls.forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        var open = panel.style.display === 'flex';
        panel.style.display = open ? 'none' : 'flex';
        if (!open) setTimeout(function(){ inp.focus(); }, 50);
      });
    });
  }
})(window);
