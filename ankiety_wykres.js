/* Kolorowe wykresy słupkowe + widok ankiet bez scrollowania */
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
      /* ===== MODAL: bez przewijania na desktopie ===== */
      #pollModal{padding:6px!important;overflow:hidden!important}
      #pollModal .poll-shell{
        width:min(1360px,calc(100vw - 12px))!important;
        height:calc(100vh - 12px)!important;
        max-height:calc(100vh - 12px)!important;
        overflow:hidden!important;
      }
      #pollModal .poll-head{padding:6px 12px!important;min-height:48px}
      #pollModal .poll-title{font-size:15px!important;line-height:1.1}
      #pollModal .poll-sub{font-size:9px!important;margin-top:1px!important}
      #pollModal .poll-close{min-width:36px!important;padding:6px 9px!important}
      #pollModal .poll-body{
        grid-template-columns:250px minmax(0,1fr)!important;
        min-height:0!important;
        height:calc(100% - 48px)!important;
        flex:1!important;
        overflow:hidden!important;
      }
      #pollModal .poll-left{
        padding:8px!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        min-height:0!important;
      }
      #pollModal .poll-right{
        padding:7px 9px!important;
        overflow:hidden!important;
        min-height:0!important;
      }
      #pollModal .poll-toolbar{margin-bottom:6px!important}
      #pollModal .poll-list{gap:5px!important;min-height:0;overflow:hidden}
      #pollModal .poll-list-btn{padding:7px 9px!important}
      #pollModal .poll-list-name{font-size:11px!important;line-height:1.15!important}
      #pollModal .poll-list-meta{font-size:9px!important;margin-top:2px!important}
      #pollModal .poll-badge{padding:2px 6px!important;font-size:8px!important}

      /* ===== ZAPIS PO LEWEJ ===== */
      #pollModal .poll-left-save-zone{
        margin-top:auto;
        padding-top:8px;
        border-top:1px solid rgba(255,255,255,.10);
        display:flex;
        flex-direction:column;
        gap:6px;
      }
      #pollModal .poll-left-save-zone .poll-save{
        width:100%;
        padding:10px 10px!important;
        font-size:12px!important;
        font-weight:900!important;
        background:linear-gradient(180deg,rgba(31,143,78,.36),rgba(31,143,78,.20))!important;
        border-color:rgba(74,222,128,.52)!important;
        box-shadow:0 0 0 1px rgba(74,222,128,.12) inset,0 8px 22px rgba(0,0,0,.18);
      }
      #pollModal .poll-left-save-zone .poll-left-save-note{
        font-size:9px;
        line-height:1.2;
        color:rgba(255,255,255,.60);
      }

      /* ===== GÓRA ANKIETY ===== */
      #pollModal .poll-voter-row{
        gap:7px!important;
        padding:5px 7px!important;
        margin-bottom:5px!important;
        min-height:36px!important;
      }
      #pollModal .poll-voter-row select{min-width:150px!important;padding:6px 8px!important;font-size:11px!important}
      #pollModal .poll-voter-row .poll-msg{font-size:9px!important}
      #pollModal .poll-question{font-size:16px!important;margin:0 0 1px!important;line-height:1.1!important}
      #pollModal .poll-desc{font-size:10px!important;margin-bottom:5px!important;line-height:1.15!important}

      /* ===== OPCJE: DWIE KOLUMNY ===== */
      #pollModal .poll-options{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:5px!important;
        align-content:start!important;
      }
      #pollModal .poll-option{
        grid-template-columns:auto minmax(115px,1fr)!important;
        grid-template-rows:auto auto!important;
        gap:3px 7px!important;
        padding:6px 8px!important;
        border-radius:10px!important;
        min-height:0!important;
        align-items:center!important;
      }
      #pollModal .poll-option input{
        width:16px!important;
        height:16px!important;
        grid-row:1 / span 2;
      }
      #pollModal .poll-option-label{font-size:11px!important;line-height:1.15!important}
      #pollModal .poll-option-result{
        grid-column:2!important;
        min-width:0!important;
        width:100%!important;
        text-align:left!important;
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr)!important;
        gap:2px 8px!important;
        align-items:center!important;
      }
      #pollModal .poll-count{font-size:10px!important;white-space:nowrap}
      #pollModal .poll-voters{
        font-size:8px!important;
        margin-top:0!important;
        line-height:1.1!important;
        max-height:18px!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }

      /* ===== WYKRESY ===== */
      #pollModal .poll-chart{grid-column:1 / -1;margin-top:1px!important;width:100%}
      #pollModal .poll-chart-track{
        position:relative;width:100%;height:7px;overflow:hidden;border-radius:999px;
        background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.09);
        box-shadow:inset 0 1px 3px rgba(0,0,0,.30)
      }
      #pollModal .poll-chart-bar{
        height:100%;width:0;min-width:0;border-radius:999px;
        transition:width .35s cubic-bezier(.2,.8,.2,1)
      }
      #pollModal .poll-chart-bar.has-votes{min-width:6px}
      #pollModal .poll-chart-meta{
        display:flex;align-items:center;justify-content:space-between;gap:5px;
        margin-top:1px;font-size:7px;line-height:1;color:rgba(255,255,255,.46)
      }
      #pollModal .poll-chart-rank{font-weight:800;color:rgba(255,255,255,.66)}
      #pollModal .poll-option.poll-chart-leader{
        border-color:rgba(34,197,94,.42)!important;
        background:linear-gradient(90deg,rgba(34,197,94,.07),rgba(255,255,255,.035))!important
      }
      #pollModal .poll-option.poll-chart-leader .poll-count{color:#86efac}

      /* ===== DÓŁ ===== */
      #pollModal .poll-actions{margin-top:5px!important;padding-top:5px!important;gap:5px!important}
      #pollModal .poll-actions > .poll-msg{display:none!important}
      #pollModal #pollInlineMsg{margin-top:3px!important;min-height:10px!important;font-size:9px!important}

      /* Jeszcze ciaśniej na niższych monitorach/laptopach */
      @media(max-height:850px) and (min-width:900px){
        #pollModal .poll-head{min-height:42px!important;padding:4px 10px!important}
        #pollModal .poll-body{height:calc(100% - 42px)!important}
        #pollModal .poll-title{font-size:14px!important}
        #pollModal .poll-sub{display:none!important}
        #pollModal .poll-right{padding:5px 7px!important}
        #pollModal .poll-voter-row{padding:4px 6px!important;margin-bottom:3px!important;min-height:32px!important}
        #pollModal .poll-question{font-size:14px!important}
        #pollModal .poll-desc{font-size:9px!important;margin-bottom:3px!important}
        #pollModal .poll-options{gap:4px!important}
        #pollModal .poll-option{padding:4px 7px!important}
        #pollModal .poll-option-label{font-size:10px!important}
        #pollModal .poll-count{font-size:9px!important}
        #pollModal .poll-voters{font-size:7px!important}
        #pollModal .poll-chart-track{height:6px!important}
        #pollModal .poll-chart-meta{font-size:6px!important}
      }

      /* Wąskie ekrany: dalej bez wewnętrznego scrolla — dwie kolumny pozostają */
      @media(max-width:899px){
        #pollModal .poll-body{grid-template-columns:190px minmax(0,1fr)!important;display:grid!important;overflow:hidden!important}
        #pollModal .poll-left{max-height:none!important;border-right:1px solid rgba(255,255,255,.10)!important;border-bottom:0!important}
        #pollModal .poll-right{overflow:hidden!important}
        #pollModal .poll-options{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        #pollModal .poll-voter-row{position:static!important;box-shadow:none!important}
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

  function updateCharts() {
    injectStyles();
    const modal = document.getElementById('pollModal');
    if (!modal || modal.style.display === 'none') return;

    moveSaveButtonLeft();
    cleanBottomActions();

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
      if (percentEl) percentEl.textContent = maxVotes > 0 ? `${Math.round(percent)}%` : '0%';
      if (rankEl) {
        if (!rank) rankEl.textContent = '';
        else if (rank === 1) rankEl.textContent = '★ LIDER';
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
