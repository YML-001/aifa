/* =========================================================
 * AI 全局搜索 · 结果弹窗组件 (非对话式 · 直接结果展示)
 * ---------------------------------------------------------
 * 使用方法：
 *   1. 在任意页面 <body> 末尾加入 <script src="ai-search-popup.js"></script>
 *   2. 组件会自动拦截 .top-search form 的提交事件
 *   3. 角色判定：URL 以 teacher- 开头 → 老师；否则视为学生
 *      也可通过 window.AI_SEARCH_ROLE = 'student' | 'teacher' 手动覆盖
 * ========================================================= */
(function () {
  if (window.__AI_SEARCH_POPUP_LOADED__) return;
  window.__AI_SEARCH_POPUP_LOADED__ = true;

  /* --------------- 角色识别 --------------- */
  function detectRole() {
    if (window.AI_SEARCH_ROLE) return window.AI_SEARCH_ROLE;
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('teacher-') >= 0 || p.indexOf('admin-') >= 0) return 'teacher';
    return 'student';
  }

  /* --------------- 样式注入 --------------- */
  var CSS = [
    '.ais-mask{position:fixed;inset:0;background:rgba(15,28,55,.45);backdrop-filter:blur(2px);z-index:9998;display:none;align-items:flex-start;justify-content:center;padding:60px 16px 20px;overflow-y:auto}',
    '.ais-mask.show{display:flex;animation:ais-fade .18s ease}',
    '@keyframes ais-fade{from{opacity:0}to{opacity:1}}',
    '.ais-modal{width:100%;max-width:920px;background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(10,31,68,.28);overflow:hidden;animation:ais-rise .22s ease}',
    '@keyframes ais-rise{from{transform:translateY(18px);opacity:.4}to{transform:translateY(0);opacity:1}}',
    '.ais-hd{background:linear-gradient(120deg,#165DFF 0%,#36CFC9 100%);color:#fff;padding:14px 22px;display:flex;align-items:center;gap:12px}',
    '.ais-hd .ai-ic{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0}',
    '.ais-hd .ti{flex:1;min-width:0}',
    '.ais-hd .ti .tt{font-size:15px;font-weight:700;letter-spacing:.5px}',
    '.ais-hd .ti .meta{font-size:12px;opacity:.9;margin-top:2px}',
    '.ais-hd .role-pill{background:rgba(255,255,255,.22);color:#fff;padding:4px 10px;border-radius:10px;font-size:12px;white-space:nowrap}',
    '.ais-hd .cls{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;border:0}',
    '.ais-hd .cls:hover{background:rgba(255,255,255,.3)}',
    /* 弹窗内搜索栏 */
    '.ais-search{padding:16px 22px 12px;background:#fff;border-bottom:1px solid #F2F3F5;position:sticky;top:0;z-index:2}',
    '.ais-search .bar{display:flex;align-items:center;gap:10px;background:#F7F8FA;border:1.5px solid #E5E6EB;border-radius:999px;padding:4px 4px 4px 16px;transition:all .15s}',
    '.ais-search .bar:focus-within{border-color:#165DFF;background:#fff;box-shadow:0 0 0 4px rgba(22,93,255,.08)}',
    '.ais-search .ic{color:#86909C;font-size:15px;flex-shrink:0}',
    '.ais-search input{flex:1;border:0;outline:0;background:transparent;font-size:14px;color:#1D2129;height:36px;font-family:inherit;min-width:0}',
    '.ais-search input::placeholder{color:#C9CDD4}',
    '.ais-search .clr{background:transparent;border:0;color:#C9CDD4;font-size:16px;width:28px;height:28px;border-radius:50%;cursor:pointer;display:none;align-items:center;justify-content:center}',
    '.ais-search .clr:hover{background:#F2F3F5;color:#4E5969}',
    '.ais-search .clr.show{display:flex}',
    '.ais-search .go{background:linear-gradient(135deg,#165DFF,#4080FF);color:#fff;border:0;border-radius:999px;padding:0 20px;height:36px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px}',
    '.ais-search .go:hover{background:linear-gradient(135deg,#0E42B5,#165DFF)}',
    '.ais-search .intent-line{margin-top:10px;display:flex;align-items:center;gap:10px;font-size:12px;color:#86909C;flex-wrap:wrap}',
    '.ais-search .intent-line .pill{background:#E8F3FF;color:#165DFF;padding:2px 10px;border-radius:10px;font-weight:600}',
    '.ais-search .intent-line .hot{color:#86909C}',
    '.ais-search .intent-line .hot a{color:#4E5969;margin-right:10px;cursor:pointer}',
    '.ais-search .intent-line .hot a:hover{color:#165DFF;text-decoration:underline}',
    '.ais-bd{padding:18px 22px 24px;max-height:calc(100vh - 240px);overflow-y:auto}',
    '.ais-sec{margin-bottom:18px}',
    '.ais-sec:last-child{margin-bottom:0}',
    '.ais-sec-ti{font-size:14px;font-weight:600;color:#1D2129;margin-bottom:10px;display:flex;align-items:center;gap:6px}',
    '.ais-sec-ti .bar{width:3px;height:14px;border-radius:2px;background:linear-gradient(180deg,#165DFF,#36CFC9)}',
    '.ais-empty{padding:26px 20px;background:#F7F8FA;border:1px dashed #E5E6EB;border-radius:10px;text-align:center;color:#86909C;font-size:13px}',
    '.ais-empty .eic{font-size:32px;margin-bottom:8px;opacity:.6}',
    '.ais-info{padding:14px 16px;background:#F5FAFF;border-left:3px solid #165DFF;border-radius:6px;font-size:13px;color:#4E5969;line-height:1.8}',
    '.ais-info b{color:#1D2129}',
    '.ais-table{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;background:#fff;border:1px solid #F2F3F5;border-radius:8px;overflow:hidden}',
    '.ais-table th,.ais-table td{padding:10px 12px;text-align:left;border-bottom:1px solid #F2F3F5}',
    '.ais-table th{background:#F7F8FA;color:#4E5969;font-weight:600;font-size:12px}',
    '.ais-table tr:last-child td{border-bottom:0}',
    '.ais-table tr:hover td{background:#FAFBFC}',
    '.ais-table .gpa-hi{color:#00B42A;font-weight:600}',
    '.ais-table .gpa-mi{color:#165DFF;font-weight:600}',
    '.ais-table .gpa-lo{color:#FF7D00;font-weight:600}',
    '.ais-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.ais-summary .box{flex:1;min-width:120px;background:linear-gradient(135deg,#F2F6FF,#FFFFFF);border:1px solid #E8F3FF;border-radius:10px;padding:10px 14px}',
    '.ais-summary .box .lb{font-size:12px;color:#86909C}',
    '.ais-summary .box .val{font-size:20px;font-weight:700;color:#165DFF;margin-top:2px}',
    '.ais-quick{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}',
    '.ais-quick a{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border:1px solid #E5E6EB;border-radius:10px;text-decoration:none;color:#1D2129;transition:all .16s}',
    '.ais-quick a:hover{border-color:#165DFF;background:#F5FAFF;transform:translateY(-1px);box-shadow:0 4px 10px rgba(22,93,255,.08);text-decoration:none}',
    '.ais-quick a .ic{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;flex-shrink:0}',
    '.ais-quick a .tx .ti{font-size:13px;font-weight:600}',
    '.ais-quick a .tx .sb{font-size:11px;color:#86909C;margin-top:1px}',
    '.ais-chips{display:flex;flex-wrap:wrap;gap:8px}',
    '.ais-chip{padding:6px 12px;border-radius:16px;background:#F2F6FF;color:#165DFF;font-size:12px;cursor:pointer;border:1px solid transparent;transition:all .15s}',
    '.ais-chip:hover{background:#E8F3FF;border-color:#165DFF}',
    '.ais-tip{font-size:12px;color:#86909C;margin-top:8px;display:flex;align-items:center;gap:6px}',
    '.ais-tip .d{width:6px;height:6px;border-radius:50%;background:#00B42A;box-shadow:0 0 0 3px #E8FFEA}',
    '@media (max-width:640px){.ais-mask{padding:12px}.ais-hd{padding:14px 16px}.ais-bd{padding:14px 16px}.ais-hd .ti .q{font-size:15px}}',
    /* ---- 移动端全屏覆盖层适配 ---- */
    '@media (max-width:540px){',
      '.ais-mask{padding:0;align-items:stretch}',
      '.ais-modal{max-width:100%;border-radius:0;min-height:100vh;display:flex;flex-direction:column}',
      '.ais-hd{border-radius:0;padding:12px 16px;gap:8px}',
      '.ais-hd .ai-ic{width:26px;height:26px;font-size:11px}',
      '.ais-hd .ti .tt{font-size:14px}',
      '.ais-hd .ti .meta{font-size:11px}',
      '.ais-hd .role-pill{font-size:11px;padding:3px 8px}',
      '.ais-search{padding:12px 16px 10px}',
      '.ais-search .bar{padding:2px 2px 2px 12px}',
      '.ais-search input{height:34px;font-size:13px}',
      '.ais-search .go{padding:0 14px;height:34px;font-size:12px}',
      '.ais-search .intent-line{margin-top:8px;font-size:11px}',
      '.ais-bd{padding:14px 16px 20px;flex:1;max-height:none;overflow-y:auto;-webkit-overflow-scrolling:touch}',
      '.ais-summary{flex-direction:column;gap:6px}',
      '.ais-summary .box{min-width:0}',
      '.ais-quick{grid-template-columns:1fr}',
      '.ais-quick a{padding:10px 12px}',
      '.ais-table{font-size:12px}',
      '.ais-table th,.ais-table td{padding:8px 6px}',
    '}'
  ].join('');

  var style = document.createElement('style');
  style.id = 'ais-style';
  style.innerHTML = CSS;
  document.head.appendChild(style);

  /* --------------- 快捷入口定义（按角色） --------------- */
  var QUICKS = {
    student: {
      grades:     {ic:'📊', bg:'#165DFF', ti:'我的成绩',   sb:'历年课程 / GPA',    href:'student-grades.html'},
      academic:   {ic:'📚', bg:'#36CFC9', ti:'学业成长',   sb:'课程 · 目标 · 规划', href:'student-academic.html'},
      scholarship:{ic:'🏆', bg:'#FF7D00', ti:'奖学金',     sb:'申请 / 规则查询',    href:'student-scholarship.html'},
      aid:        {ic:'🎗️', bg:'#F53F3F', ti:'助学金',     sb:'国助 / 校助 / 贷款', href:'student-aid.html'},
      funding:    {ic:'💰', bg:'#722ED1', ti:'奖助贷勤',   sb:'一站式办理入口',     href:'student-funding.html'},
      leave:      {ic:'🗓️', bg:'#165DFF', ti:'在线请假',   sb:'病假 / 事假 / 公假', href:'student-leave.html'},
      leaveRec:   {ic:'📄', bg:'#86909C', ti:'请假记录',   sb:'查看审批进度',       href:'student-leave-detail.html'},
      dormRepair: {ic:'🔧', bg:'#00B42A', ti:'宿舍报修',   sb:'空调/水电/家具',     href:'student-dorm-repair.html'},
      dorm:       {ic:'🏠', bg:'#36CFC9', ti:'我的宿舍',   sb:'宿舍成员 · 考勤',    href:'student-dorm.html'},
      activity:   {ic:'🎭', bg:'#722ED1', ti:'活动评奖',   sb:'报名 · 综测加分',    href:'student-activity-match.html'},
      material:   {ic:'📎', bg:'#FF7D00', ti:'材料初审',   sb:'补传 / 校验',        href:'student-material-review.html'},
      secondCls:  {ic:'🎓', bg:'#0FC6C2', ti:'第二课堂',   sb:'学分 / 证书',        href:'student-second-classroom.html'},
      employment: {ic:'💼', bg:'#165DFF', ti:'就业中心',   sb:'岗位 / 简历 / 签约', href:'student-employment.html'},
      card:       {ic:'💳', bg:'#FF7D00', ti:'校园卡',     sb:'挂失 / 充值',        href:'student-card.html'},
      lost:       {ic:'🔎', bg:'#F53F3F', ti:'失物招领',   sb:'发布 / 查找',        href:'student-lost.html'},
      consult:    {ic:'💬', bg:'#36CFC9', ti:'咨询/谈心',  sb:'预约辅导员',         href:'student-consult.html'},
      aiAssist:   {ic:'🤖', bg:'#722ED1', ti:'AI 助手',    sb:'对话式深入咨询',     href:'ai-assistant-chat.html'},
      profile:    {ic:'👤', bg:'#86909C', ti:'个人档案',   sb:'基础信息维护',       href:'student-profile.html'},
      warning:    {ic:'⚠️', bg:'#F53F3F', ti:'学业预警',   sb:'查看预警原因',       href:'student-warning.html'}
    },
    teacher: {
      approval:   {ic:'📥', bg:'#165DFF', ti:'待审请假',   sb:'审批待办队列',       href:'teacher-approval-todo.html'},
      student:    {ic:'🎓', bg:'#36CFC9', ti:'学生档案',   sb:'查找学生 / 成绩查看',href:'teacher-student-info.html'},
      academic:   {ic:'📚', bg:'#722ED1', ti:'学风建设',   sb:'出勤 / 预警',        href:'teacher-academic.html'},
      warning:    {ic:'⚠️', bg:'#F53F3F', ti:'预警名单',   sb:'重点关注学生',       href:'teacher-academic-warning.html'},
      material:   {ic:'📎', bg:'#FF7D00', ti:'材料审核',   sb:'奖助申请审批',       href:'teacher-material-review.html'},
      dorm:       {ic:'🏠', bg:'#36CFC9', ti:'宿舍管理',   sb:'卫生 / 报修 / 调换', href:'teacher-dorm.html'},
      dormScreen: {ic:'📺', bg:'#722ED1', ti:'宿舍大屏',   sb:'在位情况总览',       href:'teacher-dorm-screen.html'},
      talk:       {ic:'💬', bg:'#0FC6C2', ti:'学生谈话',   sb:'记录 / 跟踪',        href:'teacher-talk.html'},
      team:       {ic:'👥', bg:'#165DFF', ti:'学工队伍',   sb:'KPI / 案例库',       href:'teacher-team.html'},
      business:   {ic:'🧰', bg:'#FF7D00', ti:'业务助手',   sb:'通知 / 场地 / 活动', href:'teacher-business.html'},
      aiAssist:   {ic:'🤖', bg:'#722ED1', ti:'AI 教师助手',sb:'写通知 / 生成评语',  href:'ai-assistant-teacher.html'},
      profile:    {ic:'👤', bg:'#86909C', ti:'个人资料',   sb:'职务 / 班级',        href:'teacher-profile.html'}
    }
  };

  /* --------------- 模拟学生历年成绩数据 --------------- */
  var MOCK_GRADES = [
    {term:'2024-2025 秋季', code:'CS301', name:'操作系统',           credit:4.0, score:92, gpa:4.0, type:'必修'},
    {term:'2024-2025 秋季', code:'CS305', name:'计算机网络',         credit:3.5, score:88, gpa:3.7, type:'必修'},
    {term:'2024-2025 秋季', code:'CS310', name:'数据库原理',         credit:3.5, score:95, gpa:4.0, type:'必修'},
    {term:'2024-2025 秋季', code:'EN201', name:'学术英语写作',       credit:2.0, score:83, gpa:3.3, type:'必修'},
    {term:'2024-2025 秋季', code:'PE201', name:'篮球',               credit:1.0, score:90, gpa:4.0, type:'选修'},
    {term:'2023-2024 春季', code:'CS204', name:'数据结构与算法',     credit:4.0, score:94, gpa:4.0, type:'必修'},
    {term:'2023-2024 春季', code:'CS210', name:'面向对象程序设计',   credit:3.0, score:91, gpa:4.0, type:'必修'},
    {term:'2023-2024 春季', code:'MA203', name:'概率论与数理统计',   credit:3.0, score:78, gpa:2.7, type:'必修'},
    {term:'2023-2024 春季', code:'PH102', name:'大学物理(下)',       credit:3.0, score:82, gpa:3.3, type:'必修'},
    {term:'2023-2024 秋季', code:'CS201', name:'离散数学',           credit:3.0, score:89, gpa:3.7, type:'必修'},
    {term:'2023-2024 秋季', code:'MA201', name:'线性代数',           credit:2.5, score:86, gpa:3.7, type:'必修'},
    {term:'2023-2024 秋季', code:'PH101', name:'大学物理(上)',       credit:3.0, score:80, gpa:3.0, type:'必修'},
    {term:'2022-2023 春季', code:'CS102', name:'程序设计基础(C)',    credit:3.5, score:96, gpa:4.0, type:'必修'},
    {term:'2022-2023 春季', code:'MA102', name:'高等数学(下)',       credit:4.0, score:84, gpa:3.3, type:'必修'},
    {term:'2022-2023 秋季', code:'CS101', name:'计算机导论',         credit:2.0, score:93, gpa:4.0, type:'必修'},
    {term:'2022-2023 秋季', code:'MA101', name:'高等数学(上)',       credit:4.0, score:81, gpa:3.0, type:'必修'}
  ];

  function gpaClass(g){ return g>=3.7?'gpa-hi':(g>=3.0?'gpa-mi':'gpa-lo'); }

  function renderGradesTable(){
    var totalCredit = 0, weightedGpa = 0, totalCredits = 0;
    MOCK_GRADES.forEach(function(c){
      totalCredit += c.credit;
      weightedGpa += c.gpa * c.credit;
      totalCredits += c.credit;
    });
    var avgGpa = (weightedGpa / totalCredits).toFixed(2);

    var rows = MOCK_GRADES.map(function(c){
      return '<tr>'+
        '<td>'+c.term+'</td>'+
        '<td>'+c.code+'</td>'+
        '<td><b>'+c.name+'</b></td>'+
        '<td>'+c.type+'</td>'+
        '<td>'+c.credit.toFixed(1)+'</td>'+
        '<td>'+c.score+'</td>'+
        '<td class="'+gpaClass(c.gpa)+'">'+c.gpa.toFixed(1)+'</td>'+
      '</tr>';
    }).join('');

    return (
      '<div class="ais-summary">'+
        '<div class="box"><div class="lb">累计学分</div><div class="val">'+totalCredit.toFixed(1)+'</div></div>'+
        '<div class="box"><div class="lb">加权 GPA</div><div class="val">'+avgGpa+'</div></div>'+
        '<div class="box"><div class="lb">已修课程</div><div class="val">'+MOCK_GRADES.length+'</div></div>'+
        '<div class="box"><div class="lb">专业排名</div><div class="val">8 / 126</div></div>'+
      '</div>'+
      '<div style="overflow-x:auto;max-height:360px;overflow-y:auto;border-radius:8px">'+
        '<table class="ais-table">'+
          '<thead><tr><th>学期</th><th>课程号</th><th>课程名</th><th>类别</th><th>学分</th><th>成绩</th><th>绩点</th></tr></thead>'+
          '<tbody>'+rows+'</tbody>'+
        '</table>'+
      '</div>'+
      '<div class="ais-tip"><span class="d"></span>数据来源：教务系统 · 近 3 学年全部成绩 · 可在「学业成长 → 我的成绩」页导出完整 PDF</div>'
    );
  }

  /* --------------- 知识库：意图 → 结果渲染 --------------- */
  /* 每条：kw (RegExp), intent, related (keywords), render(role) -> {result, quicks, emptyForTeacher?} */
  var KB = [
    {
      key:'grades',
      kw:/成绩|绩点|gpa|排名|挂科|学分绩|分数/i,
      intent:'成绩查询',
      related:['GPA 加权计算','学分排名','补考重修','奖学金成绩要求','四级六级成绩'],
      render:function(role){
        if(role === 'teacher'){
          return {
            result:
              '<div class="ais-empty">'+
                '<div class="eic">🔒</div>'+
                '<div style="font-size:14px;color:#4E5969;margin-bottom:4px"><b>您没有相关成绩可查询</b></div>'+
                '<div>教师角色不保留个人"历年成绩"数据。<br>如需查看<b>指定学生</b>的成绩情况，请使用下方快捷入口进入「学生档案」检索。</div>'+
              '</div>',
            quicks:['student','academic','warning','material']
          };
        }
        return {
          result: renderGradesTable(),
          quicks:['grades','academic','scholarship','warning','secondCls']
        };
      }
    },
    {
      key:'leave',
      kw:/请假|事假|病假|公假|销假/i,
      intent:'请假办理',
      related:['病假流程','请假销假','超 7 天长假','请假去哪盖章','辅导员审批进度'],
      render:function(role){
        if(role === 'teacher'){
          return {
            result:
              '<div class="ais-info">'+
                '<b>当前待审请假：12 条</b>（其中超 3 天 2 条、病假 5 条、事假 5 条）<br>'+
                '• 审批时限：普通请假需 24h 内处理，超过 3 天的请假需院领导复核<br>'+
                '• 可在「待办事项」页批量审批，AI 会自动标注异常件'+
              '</div>',
            quicks:['approval','student','material','talk']
          };
        }
        return {
          result:
            '<div class="ais-info">'+
              '<b>请假流程（学生端）</b><br>'+
              '1. 「在线请假」填写起止时间与原因，上传证明材料（病假需病历单）<br>'+
              '2. 系统自动推送至<b>班主任 → 辅导员</b>审批，超 3 天需加签院领导<br>'+
              '3. 审批通过后系统自动同步至考勤与课程表，假期结束记得<b>销假</b><br>'+
              '<span style="color:#86909C">（以《中南大学学生请假管理办法》2024 修订版为准）</span>'+
            '</div>',
          quicks:['leave','leaveRec','consult','profile']
        };
      }
    },
    {
      key:'scholarship',
      kw:/奖学金|国奖|国励|学业奖|优秀学生/i,
      intent:'奖学金 / 奖助查询',
      related:['国家奖学金申请条件','助学金评定','奖学金公示','综测加分'],
      render:function(role){
        if(role === 'teacher'){
          return {
            result:
              '<div class="ais-info">'+
                '<b>本学期奖学金审核进度</b><br>'+
                '• 国家奖学金：推荐名单 4 人，已完成初审 3 人<br>'+
                '• 国家励志奖学金：候选 12 人，材料待复核 5 人<br>'+
                '• 建议优先使用「材料审核」进行批量盖章与退回'+
              '</div>',
            quicks:['material','student','approval','business']
          };
        }
        return {
          result:
            '<div class="ais-info">'+
              '<b>你的奖学金匹配结果（AI 预判）</b><br>'+
              '• 国家奖学金：GPA 3.62 ✅ 达标（需 ≥3.5）· 综测排名 8/126 ✅<br>'+
              '• 国家励志奖学金：需<b>家庭经济困难认定</b>（未提交，建议补传）<br>'+
              '• 校级一等奖学金：匹配度 <b>92%</b>，可直接申请<br>'+
              '<span style="color:#86909C">（最终以学院公示结果为准）</span>'+
            '</div>',
          quicks:['scholarship','aid','funding','material','activity']
        };
      }
    },
    {
      key:'dorm',
      kw:/宿舍|报修|空调|热水|寝室|床铺|调换/i,
      intent:'宿舍 / 报修',
      related:['空调报修','宿舍调换','卫生评分','寝室成员'],
      render:function(role){
        if(role === 'teacher'){
          return {
            result:
              '<div class="ais-info">'+
                '<b>宿舍本周概览</b><br>'+
                '• 未销假在寝：94.2%<br>'+
                '• 待处理报修：7 件（空调 4 · 水电 2 · 家具 1）<br>'+
                '• 卫生不合格寝室：2 间，已推送整改通知'+
              '</div>',
            quicks:['dorm','dormScreen','student','talk']
          };
        }
        return {
          result:
            '<div class="ais-info">'+
              '<b>宿舍报修步骤</b><br>'+
              '1. 「宿舍报修」→ 选择故障类型（空调 / 水电 / 家具 / 其他）<br>'+
              '2. 上传<b>故障照片</b>，选择维修上门时段<br>'+
              '3. 宿管 30 分钟内响应，修复后在「我的工单」里确认并评价'+
            '</div>',
          quicks:['dormRepair','dorm','lost','card']
        };
      }
    },
    {
      key:'employment',
      kw:/就业|签约|实习|简历|三方|offer|面试/i,
      intent:'就业服务',
      related:['三方协议','就业推荐信','生源地调整','简历优化'],
      render:function(role){
        if(role === 'teacher'){
          return {
            result:
              '<div class="ais-info">'+
                '<b>学院就业情况（2025 届）</b><br>'+
                '• 已签约：68% · 拟签约：12% · 升学：14% · 未落实：6%<br>'+
                '• 未落实学生名单已标记，可在「学生档案」导出跟踪'+
              '</div>',
            quicks:['student','business','talk','team']
          };
        }
        return {
          result:
            '<div class="ais-info">'+
              '<b>就业办理直达</b><br>'+
              '• 三方协议：下载 → 企业盖章 → 系统上传 → 辅导员审核<br>'+
              '• 生源地：可在「个人档案」中修改，<b>一年仅限 1 次</b><br>'+
              '• 推荐信：在「就业中心」→ 推荐信模板 → 一键生成 PDF'+
            '</div>',
          quicks:['employment','profile','aiAssist','consult']
        };
      }
    },
    {
      key:'activity',
      kw:/综测|综合测评|评奖|活动|比赛|竞赛|蓝桥/i,
      intent:'综测 / 活动',
      related:['综测加分细则','活动报名','竞赛学分','第二课堂'],
      render:function(role){
        if(role === 'teacher'){
          return {
            result:
              '<div class="ais-info">'+
                '<b>本班综测进度</b><br>'+
                '• 已提交：48 / 52 · 系统初筛通过 42<br>'+
                '• 异常件：4（材料缺失 3 · 加分项超限 1），待人工复核'+
              '</div>',
            quicks:['material','student','approval','business']
          };
        }
        return {
          result:
            '<div class="ais-info">'+
              '<b>综测 / 活动办理要点</b><br>'+
              '• 综测计分 = 学业 70% + 思政 15% + 能力 10% + 身心 5%<br>'+
              '• 活动报名：在「活动评奖评优」查看匹配度 ≥85 的推荐活动<br>'+
              '• 第二课堂：每学期需修满 2 学分，不足将影响毕业'+
            '</div>',
          quicks:['activity','material','secondCls','scholarship']
        };
      }
    }
  ];

  function matchKB(q){
    for (var i=0;i<KB.length;i++){
      if (KB[i].kw.test(q)) return KB[i];
    }
    return null;
  }

  /* --------------- 通用结果：未命中知识库 --------------- */
  function buildGenericResult(q, role){
    var allQuicks = role === 'teacher'
      ? ['approval','student','academic','material','business','aiAssist']
      : ['aiAssist','academic','funding','leave','dormRepair','employment'];
    return {
      result:
        '<div class="ais-info">'+
          '未在本地词典命中"<b>'+escapeHtml(q)+'</b>"的精确结果。下方是 AI 根据"<b>'+(role==='teacher'?'教师':'学生')+'</b>"角色推荐的高频入口；如需对话式深入咨询，请点击「AI 助手」。'+
        '</div>',
      quicks: allQuicks
    };
  }

  /* --------------- HTML 转义 --------------- */
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* --------------- 热门提示词（搜索栏下方） --------------- */
  var HOT_HINTS = {
    student: ['成绩查询','请假流程','奖学金申请','宿舍报修','综测加分','第二课堂'],
    teacher: ['待审请假','预警名单','学生档案','奖学金审核','宿舍卫生','班会通知']
  };

  /* --------------- 弹窗 DOM --------------- */
  var $mask, $modal, $hdMeta, $hdRole, $input, $clr, $intentPill, $hotBox, $bd;
  function ensureDom(){
    if ($mask) return;
    $mask = document.createElement('div');
    $mask.className = 'ais-mask';
    $mask.innerHTML =
      '<div class="ais-modal" role="dialog" aria-modal="true">'+
        '<div class="ais-hd">'+
          '<div class="ai-ic">Ai</div>'+
          '<div class="ti"><div class="tt">AI 全局搜索</div><div class="meta">权限已校验 · 非对话式直达结果</div></div>'+
          '<div class="role-pill"></div>'+
          '<button class="cls" type="button" aria-label="关闭">×</button>'+
        '</div>'+
        '<div class="ais-search">'+
          '<div class="bar">'+
            '<span class="ic">🔍</span>'+
            '<input type="text" class="q-input" placeholder="输入关键词，例如：成绩查询 / 请假 / 奖学金" autocomplete="off">'+
            '<button type="button" class="clr" aria-label="清空">×</button>'+
            '<button type="button" class="go">搜索</button>'+
          '</div>'+
          '<div class="intent-line">'+
            '<span class="pill">等待识别…</span>'+
            '<span class="hot"></span>'+
          '</div>'+
        '</div>'+
        '<div class="ais-bd"></div>'+
      '</div>';
    document.body.appendChild($mask);
    $modal = $mask.querySelector('.ais-modal');
    $hdMeta = $mask.querySelector('.ais-hd .meta');
    $hdRole = $mask.querySelector('.ais-hd .role-pill');
    $input = $mask.querySelector('.ais-search .q-input');
    $clr = $mask.querySelector('.ais-search .clr');
    $intentPill = $mask.querySelector('.ais-search .intent-line .pill');
    $hotBox = $mask.querySelector('.ais-search .intent-line .hot');
    $bd = $mask.querySelector('.ais-bd');

    $mask.addEventListener('click', function(e){
      if (e.target === $mask) close();
    });
    $mask.querySelector('.cls').addEventListener('click', close);
    $mask.querySelector('.ais-search .go').addEventListener('click', function(){
      var v = $input.value.trim();
      if (v) open(v);
    });
    $input.addEventListener('keydown', function(e){
      if (e.key === 'Enter'){
        e.preventDefault();
        var v = $input.value.trim();
        if (v) open(v);
      }
    });
    $input.addEventListener('input', function(){
      $clr.classList.toggle('show', !!$input.value);
    });
    $clr.addEventListener('click', function(){
      $input.value = '';
      $clr.classList.remove('show');
      $input.focus();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && $mask.classList.contains('show')) close();
    });
  }

  function close(){
    if ($mask) $mask.classList.remove('show');
    document.body.style.overflow = '';
  }

  var isMobilePage = /\/mobile[\/\-]/.test(location.pathname) || /mobile-entry/i.test(location.pathname) || /[?&]mobile/.test(location.search);
  var isInMobileDir = /\/mobile\//.test(location.pathname);

  var MOBILE_FILES = [
    'student-leave','student-schedule','student-grades','student-funding',
    'student-activity-match','student-dorm-repair','student-second-classroom',
    'student-employment','student-bbs','student-academic','student-scholarship',
    'student-card','student-lost','student-life','student-military',
    'student-messages','student-profile','student-dorm-repair',
    'ai-assistant-chat','ai-global-search'
  ];

  var isInStudentDir = /\/student\//.test(location.pathname);
  var isInTeacherDir = /\/teacher\//.test(location.pathname);
  var isInAdminDir   = /\/admin\//.test(location.pathname);
  var isInSubDir     = isInStudentDir || isInTeacherDir || isInAdminDir || isInMobileDir;

  function targetFolder(href){
    if (/^student-/.test(href)) return 'student';
    if (/^teacher-/.test(href)) return 'teacher';
    if (/^(admin-|config-)/.test(href)) return 'admin';
    return '';
  }

  function resolveHref(href){
    if (/^(https?:|\/\/)/.test(href)) return href;

    if (isMobilePage) {
      var base = href.replace(/\.html?$/i, '');
      for (var i = 0; i < MOBILE_FILES.length; i++) {
        if (base === MOBILE_FILES[i]) {
          return isInMobileDir ? href : ('mobile/' + href);
        }
      }
      return href;
    }

    var tf = targetFolder(href);
    var curDir = isInStudentDir ? 'student' : isInTeacherDir ? 'teacher' : isInAdminDir ? 'admin' : '';

    if (isInSubDir) {
      if (tf && tf === curDir) return href;
      if (tf) return '../' + tf + '/' + href;
      return '../' + href;
    }

    if (tf) return tf + '/' + href;
    return href;
  }

  function buildQuicks(keys, role){
    var pool = QUICKS[role] || QUICKS.student;
    var items = keys.map(function(k){
      var q = pool[k]; if(!q) return '';
      return '<a href="'+resolveHref(q.href)+'"><span class="ic" style="background:'+q.bg+'">'+q.ic+'</span>'+
        '<span class="tx"><div class="ti">'+q.ti+'</div><div class="sb">'+q.sb+'</div></span></a>';
    }).filter(Boolean).join('');
    return items ? '<div class="ais-quick">'+items+'</div>' : '';
  }

  function buildChips(words){
    return '<div class="ais-chips">' + words.map(function(w){
      return '<span class="ais-chip" data-q="'+escapeHtml(w)+'">'+escapeHtml(w)+'</span>';
    }).join('') + '</div>';
  }

  /* --------------- 填充搜索栏下方的热门提示 --------------- */
  function renderHotHints(role){
    var arr = HOT_HINTS[role] || HOT_HINTS.student;
    $hotBox.innerHTML = '热门：' + arr.map(function(w){
      return '<a data-q="'+escapeHtml(w)+'">'+escapeHtml(w)+'</a>';
    }).join('');
    Array.prototype.forEach.call($hotBox.querySelectorAll('a'), function(el){
      el.addEventListener('click', function(){
        open(el.getAttribute('data-q'));
      });
    });
  }

  /* --------------- 打开弹窗 --------------- */
  function open(q){
    ensureDom();
    q = String(q || '').trim();
    if (!q) return;

    var role = detectRole();
    var roleLabel = role === 'teacher' ? '👨‍🏫 教师 · 梧老师' : '🎓 学生 · 梧桐同学';
    var item = matchKB(q);
    var intent = item ? item.intent : '通用查询';
    var related = item ? item.related : ['请假流程','奖学金规则','宿舍报修','综测加分','第二课堂','成绩查询'];
    var data = item ? item.render(role) : buildGenericResult(q, role);

    // 同步页面顶部搜索框 & 弹窗内搜索框
    var topInput = document.querySelector('.top-search input[name="q"]');
    if (topInput) topInput.value = q;
    $input.value = q;
    $clr.classList.toggle('show', !!q);

    // 弹窗头 & 意图标识
    $hdMeta.textContent = '权限已校验 · 非对话式直达结果 · 响应时间 0.42s';
    $hdRole.textContent = roleLabel;
    $intentPill.textContent = 'AI 意图识别：' + intent;
    renderHotHints(role);

    var html = '';
    html += '<div class="ais-sec"><div class="ais-sec-ti"><span class="bar"></span>📋 查询结果</div>' + data.result + '</div>';
    var quicksHtml = buildQuicks(data.quicks || [], role);
    if (quicksHtml){
      html += '<div class="ais-sec"><div class="ais-sec-ti"><span class="bar"></span>🚀 快捷入口（' + (role==='teacher'?'教师':'学生') + '角色可直接办理）</div>' + quicksHtml + '</div>';
    }
    html += '<div class="ais-sec"><div class="ais-sec-ti"><span class="bar"></span>🔖 相关关键词（点击继续查询）</div>' + buildChips(related) + '</div>';
    html += '<div class="ais-tip" style="justify-content:center;padding:8px 0 0"><span class="d"></span>本结果由 AI 结合知识库 + 角色权限生成 · 来源：学工中心 · 教务处</div>';

    $bd.innerHTML = html;
    $bd.scrollTop = 0;

    // 关键词点击继续查询
    Array.prototype.forEach.call($bd.querySelectorAll('.ais-chip'), function(el){
      el.addEventListener('click', function(){
        open(el.getAttribute('data-q'));
      });
    });

    $mask.classList.add('show');
    document.body.style.overflow = 'hidden';

    // 首次打开时把光标放进输入框末尾，便于继续编辑
    setTimeout(function(){
      try {
        $input.focus();
        $input.setSelectionRange($input.value.length, $input.value.length);
      } catch(e) {}
    }, 50);
  }

  /* --------------- 拦截搜索表单（PC + 移动端） --------------- */
  function bindForms(){
    var selectors = '.top-search form, .m-search form, form[data-ai-search]';
    var forms = document.querySelectorAll(selectors);
    Array.prototype.forEach.call(forms, function(f){
      if (f.__ais_bound) return;
      f.__ais_bound = true;
      f.addEventListener('submit', function(e){
        var input = f.querySelector('input[name="q"]') || f.querySelector('input[type="search"]') || f.querySelector('input[type="text"]');
        var q = input ? input.value.trim() : '';
        if (!q) return;
        e.preventDefault();
        if (isMobilePage && !isInMobileDir) {
          location.href = 'mobile/ai-global-search.html?q=' + encodeURIComponent(q);
          return;
        }
        if (isInMobileDir) {
          if (!/ai-global-search/i.test(location.pathname)) {
            location.href = 'ai-global-search.html?q=' + encodeURIComponent(q);
          }
          return;
        }
        open(q);
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindForms);
  } else {
    bindForms();
  }

  /* --------------- 对外 API --------------- */
  window.AISearchPopup = {
    open: open,
    close: close,
    setRole: function(r){ window.AI_SEARCH_ROLE = r; }
  };
})();
