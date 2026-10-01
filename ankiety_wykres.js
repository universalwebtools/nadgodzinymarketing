/* Kolorowe wykresy słupkowe dla modułu ankiet */
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
      #pollModal .poll-option-result{min-width:280px}
      #pollModal .poll-chart{margin-top:7px;width:100%}
      #pollModal .poll-chart-track{
        position:relative;
        width:100%;
        height:13px;
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
        margin-top:4px;
        font-size:10px;
        color:rgba(255,255,255,.48);
      }
      #pollModal .poll-chart-rank{font-weight:800;color:rgba(255,255,255,.68)}
      #pollModal .poll-option.poll-chart-leader{
        border-color:rgba(34,197,94,.42);
        background:linear-gradient(90deg,rgba(34,197,94,.07),rgba(255,255,255,.035));
      }
      #pollModal .poll-option.poll-chart-leader .poll-count{color:#86efac}
      @media(max-width:820px){
        #pollModal .poll-option-result{min-width:0;width:100%}
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

  function updateCharts() {
    injectStyles();
    const modal = document.getElementById('pollModal');
    if (!modal || modal.style.display === 'none') return;

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
    scheduleUpdate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
