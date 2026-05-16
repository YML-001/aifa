/* =========================================================
 * AI 页面增强 · 为子模块页面的 AI 按钮注入交互逻辑
 * ---------------------------------------------------------
 * 自动检测当前页面，找到已有的 AI 占位 UI 并赋予真实功能。
 * 依赖：ai-client.js（window.AI）
 * ========================================================= */
(function () {
  if (window.__AI_PAGE_ENHANCE__) return;
  window.__AI_PAGE_ENHANCE__ = true;

  var page = (location.pathname || '').toLowerCase().replace(/.*\//, '').replace(/\.html?$/i, '');

  /* --------------- 通用工具 --------------- */
  var CSS_INJECTED = false;
  function injectCSS() {
    if (CSS_INJECTED) return; CSS_INJECTED = true;
    var s = document.createElement('style');
    s.textContent = [
      '.aipe-result{margin-top:10px;padding:12px 16px;border-radius:12px;background:#F5FAFF;border:1px solid #E8F3FF;font-size:13px;color:#4E5969;line-height:1.8;display:none;animation:aipe-in .2s ease}',
      '.aipe-result.show{display:block}',
      '.aipe-result b{color:#1D2129}',
      '.aipe-result .aipe-discl{font-size:11px;color:#C9CDD4;margin-top:8px;padding-top:6px;border-top:1px dashed #E5E6EB}',
      '@keyframes aipe-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}',
      '.aipe-loading{color:#86909C;font-style:italic}'
    ].join('');
    document.head.appendChild(s);
  }

  function createResultBox(parent) {
    injectCSS();
    var box = document.createElement('div');
    box.className = 'aipe-result';
    parent.appendChild(box);
    return box;
  }

  function showResult(box, html) {
    box.innerHTML = html + '<div class="aipe-discl">AI 生成，仅供参考</div>';
    box.classList.add('show');
  }

  async function aiGenerate(btn, box, prompt, sysPrompt) {
    if (btn.disabled) return;
    btn.disabled = true;
    var origText = btn.textContent;
    btn.textContent = '⏳ AI 生成中…';
    box.innerHTML = '<span class="aipe-loading">AI 正在分析…</span>';
    box.classList.add('show');

    var sys = sysPrompt || '你是中南大学智慧学工 AI 助手。回答简洁、结构化、中文。';
    try {
      var r = await AI.chat(
        [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        { onDelta: function (d, full) { box.innerHTML = AI.renderMd(full); } }
      );
      showResult(box, AI.renderMd(r.text));
    } catch (e) {
      box.innerHTML = '<span style="color:#F53F3F">生成失败：' + (e.message || e) + '</span>';
      box.classList.add('show');
    }
    btn.disabled = false;
    btn.textContent = origText;
  }

  function wireButton(btn, prompt, sysPrompt, insertTarget) {
    if (!btn || btn.__aipe) return;
    btn.__aipe = true;
    var target = insertTarget || btn.parentNode;
    var box = createResultBox(target);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      aiGenerate(btn, box, prompt, sysPrompt);
    });
  }

  function wireAllByText(selector, textPattern, prompt, sysPrompt) {
    var els = document.querySelectorAll(selector);
    Array.prototype.forEach.call(els, function (el) {
      if (textPattern.test(el.textContent)) {
        wireButton(el, prompt, sysPrompt);
      }
    });
  }

  /* --------------- 页面增强定义 --------------- */
  var SYS_STUDENT = '你是中南大学智慧学工 AI 助手，服务学生。回答简洁、结构化、中文。涉及政策时标注"（以学校正式文件为准）"。';
  var SYS_TEACHER = '你是中南大学智慧学工 AI 助手，服务辅导员。回答简洁、结构化、中文，语气专业。';

  var ENHANCERS = {
    /* ===== P1：已有 AI UI 需接线 ===== */

    'student-scholarship': function () {
      wireAllByText('button, a.btn', /立即申请/, '我想申请国家奖学金，请帮我列出需要准备的材料清单，标注哪些我可能已有、哪些需要新准备，并评估我的申请通过概率。我的条件：GPA 3.78，综测 87.4，获蓝桥杯省一、数学建模校三等奖。', SYS_STUDENT);
    },

    'student-funding': function () {
      wireAllByText('button, a.btn', /查看全部匹配|向 AI 详询/, '基于我的家庭经济情况（二档困难）、GPA 3.7（前22%）、志愿时长 40h，请详细分析我能申请的所有奖助贷勤项目，逐条说明匹配原因、申请条件、所需材料、截止日期，并给出最优申请策略。', SYS_STUDENT);
    },

    'student-employment': function () {
      wireAllByText('button', /AI 优化简历|AI 简历/, '请对我的简历进行全面诊断和优化建议。我的背景：计算机科学专业大三，GPA 3.62，有ACM竞赛省二等奖、1段大厂实习经验（字节跳动算法工程师实习3个月）、2个课程项目。目标岗位：算法工程师。请从简历结构、内容优化、关键词匹配、项目描述等方面给出具体建议。', SYS_STUDENT);
      wireAllByText('a.btn', /向 AI 咨询职业/, '基于我的学业画像（计科专业、GPA 3.62、ACM省二、字节实习），请给出完整的职业规划建议，包括：短期（本学期）、中期（大四）、长期（毕业后）的行动计划，推荐适合的岗位方向，以及如何提升竞争力。', SYS_STUDENT);
    },

    'student-dorm-repair': function () {
      wireAllByText('button', /AI 拍照识别|AI 智能诊断/, '我宿舍水龙头一直在滴水，关紧了还是会漏。请帮我诊断可能的故障原因、严重程度、维修建议，以及在等待维修期间的临时处理方法。', SYS_STUDENT);
      wireAllByText('a.btn', /提交报修/, '请帮我根据以下情况生成一份规范的报修工单描述：宿舍16栋203室，卫生间水龙头持续漏水，已关紧但仍有滴水现象，约3秒一滴。请包含故障分类、位置、描述和紧急程度建议。', SYS_STUDENT);
    },

    'student-second-classroom': function () {
      wireAllByText('button', /查看完整规划|问 AI/, '我目前第二课堂已获 6.5 学分（思政2.0、学术1.5、文体1.5、志愿1.0、实践0.5），还需要 3.5 学分才能达到毕业要求。请给我制定一份详细的学分补齐计划，推荐具体的活动和时间安排，确保我能在毕业前完成。', SYS_STUDENT);
    },

    'student-activity-match': function () {
      wireAllByText('a.btn, button', /AI 解读评奖|AI 评奖/, '请详细解读中南大学本科生综合测评和评奖评优规则，包括：综测各维度权重和计算方式、各级奖学金的申请条件、评选流程和时间节点、常见的加分项和注意事项。结合我的情况（GPA 3.62, 综测87.4）给出针对性建议。', SYS_STUDENT);
    },

    /* ===== P2：数据页加 AI 解读 ===== */

    'student-grades': function () {
      var anchor = document.querySelector('.m-tabs, .tabs');
      if (!anchor) {
        var cards = document.querySelectorAll('.card, .m-card');
        if (cards.length > 0) anchor = cards[0];
      }
      if (!anchor) return;
      injectCSS();
      var wrap = document.createElement('div');
      wrap.style.cssText = 'margin:0 0 12px;text-align:center';
      var btn = document.createElement('button');
      btn.style.cssText = 'margin:0 auto;display:inline-flex;gap:4px;align-items:center;padding:8px 20px;border-radius:999px;font-size:12px;cursor:pointer;border:1px solid #D0E4FF;background:#F5FAFF;color:#165DFF;font-weight:600';
      btn.innerHTML = '📊 AI 成绩分析与学习建议';
      wrap.appendChild(btn);
      anchor.parentNode.insertBefore(wrap, anchor);
      wireButton(btn, '请对我的成绩进行全面分析。当前累计GPA 3.62，专业排名28/186（前15%），本学期GPA 3.78。已修126/170学分。高等数学B(下)期中62分有挂科风险。请分析成绩趋势、风险预警、学习建议，以及保研/考研/就业各路径下的GPA竞争力评估。', SYS_STUDENT, wrap);
    },

    'student-academic': function () {
      wireAllByText('button, a', /AI 学习|查看建议|学习计划/, '基于我的课程进度和学业预警情况，请给出个性化学习建议。重点关注：高等数学B(下)挂科风险、本学期选课负荷评估、下学期选课建议、以及如何平衡学业与课外活动。', SYS_STUDENT);
      var aiCard = null;
      var cards = document.querySelectorAll('.card, .m-card');
      Array.prototype.forEach.call(cards, function (c) {
        if (/AI 学习建议/.test(c.textContent) && !c.__aipe_insight) {
          c.__aipe_insight = true;
          c.style.cursor = 'pointer';
          var box = createResultBox(c);
          c.addEventListener('click', function () {
            if (box.classList.contains('show')) { box.classList.remove('show'); return; }
            aiGenerate({ disabled: false, textContent: '', addEventListener: function(){} }, box,
              '请根据我的学业情况给出具体可执行的学习建议。GPA 3.62，本学期修30学分，有1门高风险课程。包括：每周时间分配建议、重点科目攻克策略、推荐的学习资源。', SYS_STUDENT);
          });
        }
      });
    },

    'teacher-approval-todo': function () {
      var filterArea = document.querySelector('.filter, .page-title');
      if (!filterArea) return;
      injectCSS();
      var wrap = document.createElement('div');
      wrap.style.cssText = 'margin:12px 0';
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm';
      btn.style.cssText = 'display:flex;gap:4px;align-items:center;padding:8px 20px;border-radius:8px;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#165DFF,#4080FF);color:#fff;border:0;font-weight:600;box-shadow:0 2px 8px rgba(22,93,255,.2)';
      btn.innerHTML = '🤖 AI 批量审批建议';
      wrap.appendChild(btn);
      filterArea.parentNode.insertBefore(wrap, filterArea.nextSibling);
      wireButton(btn, '当前有8条待审批事项（3条请假、2条材料审核、2条活动申请、1条调宿申请）。请按风险等级分类汇总，给出每条的AI初审建议（通过/需关注/建议驳回），并生成一段可直接使用的批量审批说明。', SYS_TEACHER, wrap);
    },

    'teacher-academic': function () {
      var aiCards = document.querySelectorAll('.card');
      Array.prototype.forEach.call(aiCards, function (c) {
        if (/AI 整体分析|AI 综合分析/.test(c.textContent) && !c.__aipe) {
          c.__aipe = true;
          var btn = document.createElement('button');
          btn.className = 'btn btn-outline btn-sm';
          btn.style.cssText = 'margin-top:10px;display:flex;gap:4px;align-items:center;padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #D0E4FF;background:#F5FAFF;color:#165DFF;font-weight:600';
          btn.innerHTML = '🔄 AI 重新生成分析';
          c.appendChild(btn);
          wireButton(btn, '请对本班学风数据进行全面分析。当前数据：出勤率96.2%、课堂互动参与率78%、作业按时提交率91%、预警学生5人（红色1人、黄色2人、蓝色2人）。给出趋势判断、重点关注学生、改进建议，以及下周可执行的3个行动项。', SYS_TEACHER, c);
        }
      });
    },

    'teacher-academic-warning': function () {
      wireAllByText('a.btn, button', /生成谈话提纲|问 AI 建议/, '该学生情况：大二计算机科学专业，本学期挂科1门（高等数学），累计不及格6学分，出勤率下滑至82%。近期请假2次，宿舍晚归3次。请生成一份详细的谈话提纲，包含：开场策略、问题引导、原因分析框架、帮扶方案建议，以及需要关注的心理健康指标。', SYS_TEACHER);
    },

    'teacher-academic-attendance': function () {
      var cards = document.querySelectorAll('.card');
      Array.prototype.forEach.call(cards, function (c) {
        if (/AI 综合分析/.test(c.textContent) && !c.__aipe) {
          c.__aipe = true;
          var btn = document.createElement('button');
          btn.className = 'btn btn-outline btn-sm';
          btn.style.cssText = 'margin-top:10px;display:flex;gap:4px;align-items:center;padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #D0E4FF;background:#F5FAFF;color:#165DFF;font-weight:600';
          btn.innerHTML = '🔄 AI 重新生成分析';
          c.appendChild(btn);
          wireButton(btn, '请分析本班出勤数据：周均出勤率96.2%，但周一上午第1-2节仅89.3%。连续缺勤≥3次的学生有3人。本周因病请假增加40%（疑似换季流感）。请给出：出勤问题归因分析、需重点关注的学生名单建议、以及改善出勤的可行措施。', SYS_TEACHER, c);
        }
      });
    },

    'teacher-academic-meeting': function () {
      wireAllByText('a, button', /用此模板|AI 生成|班会素材/, '请为下周主题班会生成完整素材包。主题："学风建设与期末冲刺"。要求包含：1) PPT 大纲（5-6页）2) 讨论议题（3个）3) 互动环节设计 4) 数据支撑要点（出勤率、作业提交率等）5) 会后行动清单。参会学生30人，大二计算机专业。', SYS_TEACHER);
    },

    'teacher-academic-history': function () {
      var cards = document.querySelectorAll('.card');
      Array.prototype.forEach.call(cards, function (c) {
        if (/AI 洞察/.test(c.textContent) && !c.__aipe) {
          c.__aipe = true;
          var btn = document.createElement('button');
          btn.className = 'btn btn-outline btn-sm';
          btn.style.cssText = 'margin-top:10px;display:flex;gap:4px;align-items:center;padding:6px 14px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #D0E4FF;background:#F5FAFF;color:#165DFF;font-weight:600';
          btn.innerHTML = '🔄 AI 重新生成洞察';
          c.appendChild(btn);
          wireButton(btn, '请对比近4个学期的学风数据趋势：出勤率从93%上升至96.2%、预警人数从12人下降至5人、综测均分从82上升至86.4。分析改善原因、仍存在的问题、以及下学期的预测和建议。可用于向学院汇报。', SYS_TEACHER, c);
        }
      });
    },

    /* ===== P3：表单页 AI 辅助输入 ===== */

    'student-bbs': function () {
      var fab = document.querySelector('[class*="fab"], button[onclick*="发帖"]');
      if (!fab) {
        var btns = document.querySelectorAll('button, a');
        Array.prototype.forEach.call(btns, function (b) { if (/发帖/.test(b.textContent)) fab = b; });
      }
      if (!fab) return;
      fab.__aipe = true;
      fab.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var topic = prompt('输入帖子主题（如：图书馆空调太冷了）：');
        if (!topic) return;
        injectCSS();
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px';
        var modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:420px;max-height:80vh;overflow:auto;padding:20px;box-shadow:0 16px 48px rgba(0,0,0,.2)';
        modal.innerHTML = '<div style="font-size:16px;font-weight:700;margin-bottom:12px">🤖 AI 辅助发帖</div><div class="aipe-result show"><span class="aipe-loading">AI 正在生成帖子内容…</span></div><div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end"><button id="aipe-bbs-close" style="padding:8px 16px;border:1px solid #E5E6EB;border-radius:8px;background:#fff;cursor:pointer">关闭</button><button id="aipe-bbs-post" style="padding:8px 16px;border:0;border-radius:8px;background:#165DFF;color:#fff;cursor:pointer">发布帖子</button></div>';
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        var box = modal.querySelector('.aipe-result');
        modal.querySelector('#aipe-bbs-close').onclick = function () { document.body.removeChild(overlay); };
        modal.querySelector('#aipe-bbs-post').onclick = function () { alert('帖子已发布（演示）'); document.body.removeChild(overlay); };
        AI.chat(
          [{ role: 'system', content: '你是校园论坛写作助手，帮学生润色帖子。请根据主题生成一篇规范、得体的帖子，包含标题、正文（200字左右）、推荐标签。' },
           { role: 'user', content: '请帮我写一篇关于"' + topic + '"的帖子' }],
          { onDelta: function (d, full) { box.innerHTML = AI.renderMd(full); } }
        ).then(function (r) { showResult(box, AI.renderMd(r.text)); });
      });
    },

    'teacher-business-notice': function () {
      var textareas = document.querySelectorAll('textarea');
      Array.prototype.forEach.call(textareas, function (ta) {
        if (ta.__aipe) return; ta.__aipe = true;
        var btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-sm';
        btn.style.cssText = 'margin-top:6px;padding:4px 12px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #D0E4FF;background:#F5FAFF;color:#165DFF;font-weight:600';
        btn.textContent = '✨ AI 润色 / 生成通知';
        ta.parentNode.insertBefore(btn, ta.nextSibling);
        var box = createResultBox(ta.parentNode);
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var content = ta.value.trim() || '请帮我起草一份通知';
          aiGenerate(btn, box, '请帮我润色/生成以下通知内容，使其更正式、规范。如果内容较少，请帮我扩写成完整通知：\n\n' + content, SYS_TEACHER);
        });
      });
      wireAllByText('button, a', /AI 校对|校对/, '请对以下通知进行合规校对，检查：时间节点是否冲突、政策引用是否准确、用语是否规范、是否有敏感词，并给出修改建议。', SYS_TEACHER);
    },

    'teacher-talk-detail': function () {
      var textareas = document.querySelectorAll('textarea, .textarea');
      Array.prototype.forEach.call(textareas, function (ta) {
        if (ta.__aipe) return; ta.__aipe = true;
        var btn = document.createElement('button');
        btn.style.cssText = 'margin:6px 0;padding:4px 12px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #D0E4FF;background:#F5FAFF;color:#165DFF;font-weight:600;display:inline-flex;align-items:center;gap:4px';
        btn.textContent = '✨ AI 补全';
        ta.parentNode.insertBefore(btn, ta.nextSibling);
        var box = createResultBox(ta.parentNode);
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var content = (ta.value || ta.textContent || '').trim();
          var label = '';
          var prev = ta.previousElementSibling;
          if (prev) label = prev.textContent.trim();
          aiGenerate(btn, box,
            '上下文：正在填写谈话记录的"' + label + '"部分。已有内容：' + (content || '（空）') + '\n请帮我补全这部分内容，要求专业、客观、结构化。如果是"帮扶计划"请列出具体可执行的步骤。', SYS_TEACHER);
        });
      });
    }
  };

  /* --------------- 启动 --------------- */
  function boot() {
    if (!window.AI) return;
    var fn = ENHANCERS[page];
    if (fn) fn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
