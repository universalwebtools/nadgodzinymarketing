/* Kolorowe wykresy słupkowe + kompaktowy układ ankiet */
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
      /* ===== WYKRESY ===== */
      #pollModal .poll-option-result{min-width:260px}
      #pollModal .poll-chart{margin-top:4px;width:100%}
      #pollModal .poll-chart-track{
        position:relative;
        width:100%;
        height:10px;
        overflow:hidden;
        border-radius:999px;
        background:rgba(255,255,255,.08);
        border:1px solid rgba(255,255,255,.09);
        box-shadow:inset 0 1px 3px rgba(0,0,0,.30);
      }
      #pollModal .poll-chart-bar{
        height:100%;
        width:0;
        min-width:0;
        border-radius:999px;
        transition:width .45s cubic-bezier(.2,.8,.2,1);
        box-shadow:0 0 12px rgba(255,255,255,.12);
      }
      #pollModal .poll-chart-bar.has-votes{min-width:8px}
      #pollModal .poll-chart-meta{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        margin-top:2px;
        font-size:9px;
        line-height:1.15;
        color:rgba(255,255,255,.48);
      }
      #pollModal .poll-chart-rank{font-weight:800;color:rgba(255,255,255,.68)}
      #pollModal .poll-option.poll-chart-leader{
        border-color:rgba(34,197,94,.42);
        background:linear-gradient(90deg,rgba(34,197,94,.07),rgba(255,255,255,.035));
      }
      #pollModal .poll-option.poll-chart-leader .poll-count{color:#86efac}

      /* ===== KOMPAKTOWY WIDOK — ma się zmieścić na typowym ekranie 1080p ===== */
      #pollModal{padding:10px}
      #pollModal .poll-shell{
        width:min(1280px,calc(100vw - 20px));
        height:min(900px,calc(100vh - 20px));
        max-height:calc(100vh - 20px);
      }
      #pollModal .poll-head{padding:9px 14px}
      #pollModal .poll-title{font-size:16px}
      #pollModal .poll-sub{font-size:10px;margin-top:2px}
      #pollModal .poll-close{min-width:38px;padding:7px 10px}
      #pollModal .poll-body{grid-template-columns:275px minmax(0,1fr);min-height:0;flex:1}
      #pollModal .poll-left{padding:10px}
      #pollModal .poll-right{padding:10px 12px;overflow:auto}
      #pollModal .poll-toolbar{margin-bottom:8px}
      #pollModal .poll-list{gap:6px}
      #pollModal .poll-list-btn{padding:8px 10px}
      #pollModal .poll-list-name{font-size:12px}
      #pollModal .poll-list-meta{font-size:10px;margin-top:3px}

      #pollModal .poll-voter-row{
        gap:8px;
        padding:7px 9px;
        margin-bottom:7px;
        min-height:42px;
      }
      #pollModal .poll-voter-row select{min-width:165px;padding:7px 9px}
      #pollModal .poll-voter-row .poll-msg{font-size:10px}
      #pollModal .poll-voter-row #pollSaveVoteBtn{
        margin-left:2px;
        padding:8px 12px;
        white-space:nowrap;
        box-shadow:0 0 0 1px rgba(31,143,78,.18) inset;
      }
      #pollModal .poll-question{font-size:18px;margin:1px 0 2px}
      #pollModal .poll-desc{font-size:11px;margin-bottom:7px;line-height:1.25}
      #pollModal .poll-badge{padding:3px 7px;font-size:9px}
      #pollModal .poll-options{gap:5px}
      #pollModal .poll-option{
        grid-template-columns:auto minmax(150px,1fr) minmax(235px,300px);
        gap:9px;
        padding:7px 10px;
        border-radius:11px;
        min-height:61px;
      }
      #pollModal .poll-option input{width:18px;height:18px}
      #pollModal .poll-option-label{font-size:12px}
      #pollModal .poll-option-result{min-width:235px}
      #pollModal .poll-count{font-size:11px}
      #pollModal .poll-voters{font-size:9px;margin-top:1px;line-height:1.15;max-height:22px;overflow:hidden}

      /* Po przeniesieniu przycisku na górę zostawiamy dół tylko dla admina/komunikatów. */
      #pollModal .poll-actions{margin-top:7px;padding-top:7px;gap:6px}
      #pollModal .poll-actions:empty{display:none}
      #pollModal .poll-actions > .poll-msg{font-size:10px}
      #pollModal #pollInlineMsg{margin-top:5px!important;min-height:12px;font-size:10px}

      @media(max-height:850px) and (min-width:821px){
        #pollModal .poll-shell{height:calc(100vh - 10px);max-height:calc(100vh - 10px)}
        #pollModal{padding:5px}
        #pollModal .poll-head{padding:6px 12px}
        #pollModal .poll-right{padding:7px 10px}
        #pollModal .poll-voter-row{padding:5px 8px;margin-bottom:5px}
        #pollModal .poll-question{font-size:16px}
        #pollModal .poll-desc{margin-bottom:5px}
        #pollModal .poll-options{gap:4px}
        #pollModal .poll-option{padding:5px 9px;min-height:53px}
        #pollModal .poll-chart{margin-top:2px}
        #pollModal .poll-chart-track{height:8px}
        #pollModal .poll-chart-meta{font-size:8px}
      }

      @media(max-width:820px){
        #pollModal{padding:5px}
        #pollModal .poll-shell{height:calc(100vh - 10px);max-height:calc(100vh - 10px)}
        #pollModal .poll-body{grid-template-columns:1fr;display:block;overflow:auto}
        #pollModal .poll-left{border-right:0;border-bottom:1px solid rgba(255,255,255,.10);max-height:170px}
        #pollModal .poll-right{overflow:visible}
        #pollModal .poll-voter-row{position:sticky;top:0;z-index:8;background:#122039;box-shadow:0 8px 18px rgba(0,0,0,.22)}
        #pollModal .poll-voter-row #pollSaveVoteBtn{margin-left:0}
        #pollModal .poll-option{grid-template-columns:auto 1fr;min-height:0}
        #pollModal .poll-option-result{grid-column:2;text-align:left;min-width:0;width:100%}
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

  function moveSaveButtonUp() {
    const modal = document.getElementById('pollModal');
    if (!modal || modal.style.display === 'none') return;
    const voterRow = modal.querySelector('.poll-voter-row');
    const saveBtn = modal.querySelector('#pollSaveVoteBtn');
    if (!voterRow || !saveBtn) return;
    if (saveBtn.parentElement !== voterRow) {
      const voterSelect = voterRow.querySelector('#pollVoterSel');
      if (voterSelect && voterSelect.nextSibling) voterRow.insertBefore(saveBtn, voterSelect.nextSibling);
      else voterRow.appendChild(saveBtn);
    }
  }

  function cleanBottomActions() {
    const modal = document.getElementById('pollModal');
    if (!modal) return;
    const actions = modal.querySelector('.poll-actions');
    if (!actions) return;
    const helper = Array.from(actions.querySelectorAll('.poll-msg')).find(el => /Twój zapisany głos|Możesz zaznaczyć/.test(el.textContent || ''));
    if (helper) {
      const voterRow = modal.querySelector('.poll-voter-row');
      if (voterRow && !voterRow.querySelector('[data-poll-top-helper]')) {
        helper.dataset.pollTopHelper = '1';
        voterRow.appendChild(helper);
      }
    }
  }

  function updateCharts() {
    injectStyles();
    const modal = document.getElementById('pollModal');
    if (!modal || modal.style.display === 'none') return;

    moveSaveButtonUp();
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
        chart.innerHTML = `
          <div class="poll-chart-track"><div class="poll-chart-bar"></div></div>
          <div class="poll-chart-meta"><span class="poll-chart-percent"></span><span class="poll-chart-rank"></span></div>`;
        result.appendChild(chart);
      }

      const bar = chart.querySelector('.poll-chart-bar');
      const percentEl = chart.querySelector('.poll-chart-percent');
      const rankEl = chart.querySelector('.poll-chart-rank');

      if (bar) {
        bar.style.background = `linear-gradient(90deg, ${palette[0]}, ${palette[1]})`;
        bar.style.width = `${percent}%`;
        bar.classList.toggle('has-votes', count > 0);
        bar.title = `${count} głosów — ${Math.round(percent)}% najlepszego wyniku`;
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
