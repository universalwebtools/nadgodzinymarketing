/* Kolorowe wykresy słupkowe + pełnoekranowy układ ankiet bez scrollowania */
(() => {
  'use strict';

  const STYLE_ID = 'pollChartStyles';
  const PALETTE = [
    ['#22c55e', '#16a34a'],
    ['#3b82f6', '#2563eb'],
    ['#a855f7', '#7e22ce'],
    ['#f59e0b', '#d97706'],
    ['#ec4899', '#db2777'],
    ['#06b6d4', '#0891b2'],
    ['#f97316', '#ea580c'],
    ['#84cc16', '#65a30d'],
    ['#14b8a6', '#0f766e'],
    ['#6366f1', '#4f46e5']
  ];

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* ===== OKNO ===== */
      #pollModal{padding:16px!important;overflow:hidden!important}
      #pollModal .poll-shell{
        width:min(1460px,calc(100vw - 32px))!important;
        height:min(900px,calc(100vh - 32px))!important;
        max-height:calc(100vh - 32px)!important;
        overflow:hidden!important;
        border-radius:20px!important;
      }
      #pollModal .poll-head{
        padding:13px 18px!important;
        min-height:64px!important;
        flex:0 0 auto!important;
      }
      #pollModal .poll-title{font-size:19px!important;line-height:1.1!important}
      #pollModal .poll-sub{font-size:11px!important;margin-top:3px!important}
      #pollModal .poll-close{min-width:44px!important;padding:9px 12px!important;font-size:18px!important}

      #pollModal .poll-body{
        grid-template-columns:300px minmax(0,1fr)!important;
        min-height:0!important;
        flex:1 1 auto!important;
        overflow:hidden!important;
      }

      /* ===== LEWA KOLUMNA ===== */
      #pollModal .poll-left{
        padding:14px!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        min-height:0!important;
      }
      #pollModal .poll-toolbar{margin-bottom:10px!important;font-size:14px!important}
      #pollModal .poll-list{
        gap:8px!important;
        min-height:0!important;
        overflow:hidden!important;
      }
      #pollModal .poll-list-btn{padding:12px 13px!important;border-radius:14px!important}
      #pollModal .poll-list-name{font-size:14px!important;line-height:1.25!important}
      #pollModal .poll-list-meta{font-size:11px!important;margin-top:5px!important}
      #pollModal .poll-badge{padding:4px 8px!important;font-size:10px!important}

      #pollModal .poll-left-save-zone{
        margin-top:auto!important;
        padding-top:12px!important;
        border-top:1px solid rgba(255,255,255,.10)!important;
        display:flex!important;
        flex-direction:column!important;
        gap:8px!important;
      }
      #pollModal .poll-left-save-zone .poll-save{
        width:100%!important;
        min-height:48px!important;
        padding:11px 12px!important;
        font-size:14px!important;
        font-weight:900!important;
        background:linear-gradient(180deg,rgba(31,143,78,.42),rgba(31,143,78,.22))!important;
        border-color:rgba(74,222,128,.58)!important;
        box-shadow:0 0 0 1px rgba(74,222,128,.12) inset,0 10px 26px rgba(0,0,0,.20)!important;
      }
      #pollModal .poll-left-save-zone .poll-left-save-note{
        font-size:11px!important;
        line-height:1.3!important;
        color:rgba(255,255,255,.64)!important;
      }

      /* ===== PRAWA KOLUMNA ===== */
      #pollModal .poll-right{
        padding:14px 16px 16px!important;
        overflow:hidden!important;
        min-height:0!important;
        display:flex!important;
        flex-direction:column!important;
      }
      #pollModal .poll-voter-row{
        gap:10px!important;
        padding:9px 11px!important;
        margin-bottom:9px!important;
        min-height:48px!important;
        flex:0 0 auto!important;
      }
      #pollModal .poll-voter-row select{
        min-width:185px!important;
        padding:8px 10px!important;
        font-size:13px!important;
      }
      #pollModal .poll-voter-row .poll-msg{font-size:11px!important}
      #pollModal .poll-question{font-size:21px!important;margin:2px 0 3px!important;line-height:1.15!important}
      #pollModal .poll-desc{font-size:12px!important;margin-bottom:8px!important;line-height:1.3!important}

      /* ===== OPCJE — rozciągają się na CAŁĄ wolną wysokość ===== */
      #pollModal .poll-options{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:9px!important;
        flex:1 1 auto!important;
        min-height:0!important;
        align-content:stretch!important;
      }
      #pollModal .poll-option{
        grid-template-columns:auto minmax(0,1fr)!important;
        grid-template-rows:auto 1fr!important;
        gap:6px 11px!important;
        padding:12px 14px!important;
        border-radius:14px!important;
        min-height:0!important;
        height:100%!important;
        align-items:center!important;
        overflow:hidden!important;
      }
      #pollModal .poll-option input{
        width:20px!important;
        height:20px!important;
        grid-row:1 / span 2!important;
      }
      #pollModal .poll-option-label{
        font-size:14px!important;
        line-height:1.2!important;
        font-weight:900!important;
      }
      #pollModal .poll-option-result{
        grid-column:2!important;
        min-width:0!important;
        width:100%!important;
        text-align:left!important;
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        grid-template-rows:auto auto!important;
        gap:5px 10px!important;
        align-content:center!important;
      }
      #pollModal .poll-count{font-size:13px!important;white-space:nowrap!important;font-weight:900!important}
      #pollModal .poll-voters{
        font-size:10px!important;
        margin-top:0!important;
        line-height:1.2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }

      /* ===== WYKRESY ===== */
      #pollModal .poll-chart{grid-column:1 / -1!important;margin-top:2px!important;width:100%!important}
      #pollModal .poll-chart-track{
        position:relative!important;
        width:100%!important;
        height:12px!important;
        overflow:hidden!important;
        border-radius:999px!important;
        background:rgba(255,255,255,.08)!important;
        border:1px solid rgba(255,255,255,.10)!important;
        box-shadow:inset 0 1px 3px rgba(0,0,0,.30)!important;
      }
      #pollModal .poll-chart-bar{
        height:100%!important;
        width:0;
        min-width:0;
        border-radius:999px!important;
        transition:width .35s cubic-bezier(.2,.8,.2,1)!important;
      }
      #pollModal .poll-chart-bar.has-votes{min-width:8px!important}
      #pollModal .poll-chart-meta{
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:7px!important;
        margin-top:3px!important;
        font-size:9px!important;
        line-height:1!important;
        color:rgba(255,255,255,.48)!important;
      }
      #pollModal .poll-chart-rank{font-weight:900!important;color:rgba(255,255,255,.72)!important}
      #pollModal .poll-option.poll-chart-leader{
        border-color:rgba(34,197,94,.46)!important;
        background:linear-gradient(90deg,rgba(34,197,94,.09),rgba(255,255,255,.035))!important;
      }
      #pollModal .poll-option.poll-chart-leader .poll-count{color:#86efac!important}

      /* ===== DÓŁ PRAWEJ KOLUMNY ===== */
      #pollModal .poll-actions{
        margin-top:8px!important;
        padding-top:8px!important;
        gap:7px!important;
        flex:0 0 auto!important;
      }
      #pollModal .poll-actions > .poll-msg{display:none!important}
      #pollModal #pollInlineMsg{
        margin-top:4px!important;
        min-height:12px!important;
        font-size:10px!important;
        flex:0 0 auto!important;
      }

      /* 1080p i niżej — nadal duże, ale bez scrolla */
      @media(max-height:900px) and (min-width:900px){
        #pollModal{padding:10px!important}
        #pollModal .poll-shell{height:calc(100vh - 20px)!important;max-height:calc(100vh - 20px)!important}
        #pollModal .poll-head{min-height:54px!important;padding:9px 14px!important}
        #pollModal .poll-title{font-size:17px!important}
        #pollModal .poll-sub{font-size:10px!important}
        #pollModal .poll-left{padding:11px!important}
        #pollModal .poll-right{padding:10px 12px 12px!important}
        #pollModal .poll-voter-row{padding:7px 9px!important;margin-bottom:6px!important;min-height:42px!important}
        #pollModal .poll-question{font-size:18px!important}
        #pollModal .poll-desc{font-size:11px!important;margin-bottom:6px!important}
        #pollModal .poll-options{gap:7px!important}
        #pollModal .poll-option{padding:9px 11px!important}
        #pollModal .poll-option-label{font-size:13px!important}
        #pollModal .poll-count{font-size:12px!important}
        #pollModal .poll-chart-track{height:10px!important}
      }

      /* bardzo niskie laptopy */
      @media(max-height:760px) and (min-width:900px){
        #pollModal .poll-head{min-height:46px!important;padding:6px 12px!important}
        #pollModal .poll-sub{display:none!important}
        #pollModal .poll-voter-row{padding:5px 8px!important;margin-bottom:4px!important;min-height:36px!important}
        #pollModal .poll-question{font-size:16px!important}
        #pollModal .poll-desc{font-size:10px!important;margin-bottom:4px!important}
        #pollModal .poll-options{gap:5px!important}
        #pollModal .poll-option{padding:7px 9px!important}
        #pollModal .poll-option-label{font-size:12px!important}
        #pollModal .poll-count{font-size:11px!important}
        #pollModal .poll-chart-track{height:8px!important}
        #pollModal .poll-chart-meta{font-size:8px!important}
      }

      @media(max-width:899px){
        #pollModal{padding:5px!important}
        #pollModal .poll-shell{width:calc(100vw - 10px)!important;height:calc(100vh - 10px)!important;max-height:calc(100vh - 10px)!important}
        #pollModal .poll-body{grid-template-columns:210px minmax(0,1fr)!important;display:grid!important;overflow:hidden!important}
        #pollModal .poll-left{max-height:none!important;border-right:1px solid rgba(255,255,255,.10)!important;border-bottom:0!important}
        #pollModal .poll-right{overflow:hidden!important}
        #pollModal .poll-options{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
    `;
    document.head.appendChild(style);
  }

  function getCount(option) {
    const el = option.querySelector('.poll-count');
    if (!el) return 0;
    const match = String(el.textContent || '').match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function moveSaveButtonLeft() {
    const modal = document.getElementById('pollModal');
    if (!modal || modal.style.display === 'none') return;
    const left = modal.querySelector('.poll-left');
    const saveBtn = modal.querySelector('#pollSaveVoteBtn');
    if (!left || !saveBtn) return;

    let zone = left.querySelector('.poll-left-save-zone');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'poll-left-save-zone';
      zone.innerHTML = '<div class="poll-left-save-note">Po zaznaczeniu terminów kliknij przycisk poniżej.</div>';
      left.appendChild(zone);
    }
    if (saveBtn.parentElement !== zone) zone.appendChild(saveBtn);
  }

  function cleanBottomActions() {
    const modal = document.getElementById('pollModal');
    if (!modal) return;
    const actions = modal.querySelector('.poll-actions');
    if (!actions) return;
    Array.from(actions.querySelectorAll('.poll-msg')).forEach(el => {
      if (/Twój zapisany głos|Możesz zaznaczyć/.test(el.textContent || '')) el.style.display = 'none';
    });
  }

  function fitOptionGrid() {
    const modal = document.getElementById('pollModal');
    if (!modal) return;
    const optionsBox = modal.querySelector('.poll-options');
    if (!optionsBox) return;
    const count = optionsBox.querySelectorAll('.poll-option').length;
    const rows = Math.max(1, Math.ceil(count / 2));
    optionsBox.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  }

  function updateCharts() {
    injectStyles();
    const modal = document.getElementById('pollModal');
    if (!modal || modal.style.display === 'none') return;

    moveSaveButtonLeft();
    cleanBottomActions();
    fitOptionGrid();

    const options = Array.from(modal.querySelectorAll('.poll-options .poll-option'));
    if (!options.length) return;

    const counts = options.map(getCount);
    const maxVotes = Math.max(0, ...counts);
    const uniqueSorted = Array.from(new Set(counts)).sort((a,b) => b-a);

    options.forEach((option, index) => {
      const result = option.querySelector('.poll-option-result');
      if (!result) return;
      const count = counts[index];
      const percent = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
      const rank = count > 0 ? uniqueSorted.indexOf(count) + 1 : null;
      const palette = PALETTE[index % PALETTE.length];

      option.classList.toggle('poll-chart-leader', maxVotes > 0 && count === maxVotes);

      let chart = result.querySelector('.poll-chart');
      if (!chart) {
        chart = document.createElement('div');
        chart.className = 'poll-chart';
        chart.innerHTML = '<div class="poll-chart-track"><div class="poll-chart-bar"></div></div><div class="poll-chart-meta"><span class="poll-chart-percent"></span><span class="poll-chart-rank"></span></div>';
        result.appendChild(chart);
      }

      const bar = chart.querySelector('.poll-chart-bar');
      const percentEl = chart.querySelector('.poll-chart-percent');
      const rankEl = chart.querySelector('.poll-chart-rank');
      if (bar) {
        bar.style.background = `linear-gradient(90deg, ${palette[0]}, ${palette[1]})`;
        bar.style.width = `${percent}%`;
        bar.classList.toggle('has-votes', count > 0);
      }
      if (percentEl) percentEl.textContent = maxVotes > 0 ? `${Math.round(percent)}% wyniku lidera` : 'Brak głosów';
      if (rankEl) {
        if (!rank) rankEl.textContent = '';
        else if (rank === 1) rankEl.textContent = '★ NAJWIĘCEJ GŁOSÓW';
        else rankEl.textContent = `${rank}. miejsce`;
      }
    });
  }

  let queued = false;
  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateCharts();
    });
  }

  const observer = new MutationObserver(scheduleUpdate);

  function start() {
    injectStyles();
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    document.addEventListener('click', scheduleUpdate, true);
    document.addEventListener('change', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
