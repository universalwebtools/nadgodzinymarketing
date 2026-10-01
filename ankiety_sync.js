/* Ankiety — twarda synchronizacja z Firebase + weryfikacja zapisu */
(() => {
  'use strict';

  const POLLS_PATH = 'nadgodziny/polls';
  const DEFAULT_POLL_ID = 'spotkanie-integracyjne-2026-jesien';
  let started = false;
  let db = null;
  let pollsRef = null;
  let connectedRef = null;
  let lastServerReadAt = 0;
  let forceTimer = null;
  let lastSnapshot = {};

  function ensureStatusStyle(){
    if(document.getElementById('pollCloudStatusStyles')) return;
    const style = document.createElement('style');
    style.id = 'pollCloudStatusStyles';
    style.textContent = `
      #pollCloudStatus{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900;padding:7px 9px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);margin-top:8px;line-height:1.2}
      #pollCloudStatus .dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:#f59e0b;box-shadow:0 0 8px rgba(245,158,11,.45)}
      #pollCloudStatus.ok .dot{background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.55)}
      #pollCloudStatus.bad .dot{background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,.55)}
      #pollCloudStatus.saved{border-color:rgba(34,197,94,.55);background:rgba(34,197,94,.12);color:#bbf7d0}
      #pollCloudStatus.bad{border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.10);color:#fecaca}
    `;
    document.head.appendChild(style);
  }

  function ensureStatusEl(){
    ensureStatusStyle();
    const modal = document.getElementById('pollModal');
    if(!modal) return null;
    let el = modal.querySelector('#pollCloudStatus');
    if(el) return el;

    const left = modal.querySelector('.poll-left-save-zone') || modal.querySelector('.poll-left');
    if(!left) return null;
    el = document.createElement('div');
    el.id = 'pollCloudStatus';
    el.innerHTML = '<span class="dot"></span><span class="txt">Chmura ankiet: sprawdzanie…</span>';
    left.appendChild(el);
    return el;
  }

  function setStatus(state, text){
    const el = ensureStatusEl();
    if(!el) return;
    el.classList.remove('ok','bad','saved');
    if(state) el.classList.add(state);
    const txt = el.querySelector('.txt');
    if(txt) txt.textContent = text;
  }

  function voteKey(name){
    try{
      const bytes = new TextEncoder().encode(String(name || ''));
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
    }catch(_){
      return String(name || '').replace(/[^a-zA-Z0-9_-]/g,'_');
    }
  }

  function countAllVoters(data){
    let voters = 0;
    Object.values(data || {}).forEach(p => {
      voters += Object.values((p && p.votes) || {}).filter(v => v && v.name).length;
    });
    return voters;
  }

  function getCurrentPollFromSnapshot(){
    if(lastSnapshot[DEFAULT_POLL_ID]) return lastSnapshot[DEFAULT_POLL_ID];
    return Object.values(lastSnapshot || {})[0] || null;
  }

  function renderSnapshotDirectly(data){
    const modal = document.getElementById('pollModal');
    if(!modal || modal.style.display === 'none') return;
    const poll = data && (data[DEFAULT_POLL_ID] || Object.values(data)[0]);
    if(!poll) return;

    const optionMap = poll.options || {};
    const votes = poll.votes || {};
    const optionEls = Array.from(modal.querySelectorAll('.poll-options .poll-option'));

    optionEls.forEach(row => {
      const labelEl = row.querySelector('.poll-option-label');
      const countEl = row.querySelector('.poll-count');
      const votersEl = row.querySelector('.poll-voters');
      if(!labelEl || !countEl || !votersEl) return;
      const label = String(labelEl.textContent || '').trim();
      const found = Object.entries(optionMap).find(([,o]) => String((o && o.label) || '').trim() === label);
      if(!found) return;
      const optionId = found[0];
      const names = Object.values(votes)
        .filter(v => v && v.options && v.options[optionId])
        .map(v => String(v.name || '').trim())
        .filter(Boolean)
        .sort((a,b) => a.localeCompare(b,'pl'));
      countEl.textContent = `${names.length} ${names.length === 1 ? 'osoba' : 'osób'}`;
      votersEl.textContent = names.length ? names.join(', ') : 'Jeszcze nikt';
    });

    const total = Object.values(votes).filter(v => v && v.name).length;
    const activeList = modal.querySelector('.poll-list-btn.active .poll-list-meta');
    if(activeList){
      const badge = activeList.querySelector('.poll-badge');
      activeList.innerHTML = `${total} głosujących • `;
      if(badge) activeList.appendChild(badge);
      else activeList.insertAdjacentHTML('beforeend','<span class="poll-badge">aktywna</span>');
    }
  }

  async function forceServerRead(){
    if(!db || !pollsRef) return;
    try{
      if(typeof db.goOnline === 'function') db.goOnline();
      setStatus('', 'Chmura ankiet: synchronizacja…');
      const snap = await pollsRef.once('value');
      lastServerReadAt = Date.now();
      lastSnapshot = snap.val() || {};
      const voters = countAllVoters(lastSnapshot);
      renderSnapshotDirectly(lastSnapshot);
      setStatus('ok', `Chmura ankiet: połączono • ${voters} głosów na serwerze`);
      window.dispatchEvent(new CustomEvent('nadgodziny:polls-server-sync', {detail:{polls:lastSnapshot,voters}}));
    }catch(e){
      console.error('Ankiety: błąd wymuszonej synchronizacji', e);
      setStatus('bad', 'Chmura ankiet: BRAK SYNCHRONIZACJI');
    }
  }

  async function verifyAndMirrorVote(){
    const modal = document.getElementById('pollModal');
    if(!modal || modal.style.display === 'none' || !db) return;
    const select = modal.querySelector('#pollVoterSel');
    if(!select) return;
    const nickname = String(select.value || '').trim();
    if(!nickname) return;

    const selected = {};
    modal.querySelectorAll('.poll-options [data-option-id]:checked').forEach(el => {
      selected[el.dataset.optionId] = true;
    });
    if(!Object.keys(selected).length) return;

    const key = voteKey(nickname);
    const payload = {
      name:nickname,
      options:selected,
      updatedAt:firebase.database.ServerValue.TIMESTAMP
    };

    try{
      setStatus('', `Zapisywanie głosu ${nickname} do chmury…`);
      const ref = db.ref(`${POLLS_PATH}/${DEFAULT_POLL_ID}/votes/${key}`);
      await ref.set(payload);
      const confirmSnap = await ref.once('value');
      const confirmed = confirmSnap.val();
      if(!confirmed || confirmed.name !== nickname){
        throw new Error('Brak potwierdzenia danych z serwera');
      }

      // Druga kopia bezpieczeństwa głosów — niezależna od definicji ankiety.
      await db.ref(`nadgodziny/pollVotesBackup/${DEFAULT_POLL_ID}/${key}`).set(payload);

      setStatus('saved', `✓ ZAPISANO W CHMURZE: ${nickname}`);
      setTimeout(forceServerRead,250);
    }catch(e){
      console.error('Ankiety: głos NIE został potwierdzony przez serwer', e);
      setStatus('bad', '✕ NIE ZAPISANO W CHMURZE — spróbuj ponownie');
      alert('Nie udało się potwierdzić zapisu głosu w chmurze. Ten głos NIE jest jeszcze bezpiecznie zapisany. Spróbuj ponownie.');
    }
  }

  function isPollModalOpen(){
    const modal = document.getElementById('pollModal');
    return !!(modal && modal.style.display !== 'none');
  }

  function attach(){
    if(started) return;
    if(!(window.firebase && firebase.apps && firebase.apps.length)){
      setTimeout(attach,150);
      return;
    }
    started = true;
    try{
      db = firebase.database();
      pollsRef = db.ref(POLLS_PATH);
      connectedRef = db.ref('.info/connected');

      connectedRef.on('value', snap => {
        const online = snap.val() === true;
        if(online){
          setStatus('ok','Chmura ankiet: połączono');
          if(isPollModalOpen()) forceServerRead();
        }else{
          setStatus('bad','Chmura ankiet: brak połączenia');
        }
      });

      firebase.auth().onAuthStateChanged(user => {
        if(user){
          if(typeof db.goOnline === 'function') db.goOnline();
          setTimeout(forceServerRead,100);
          setTimeout(forceServerRead,900);
        }
      });

      document.addEventListener('click', e => {
        if(e.target && e.target.closest && e.target.closest('#pollOpenBtn')){
          setTimeout(forceServerRead,80);
          setTimeout(forceServerRead,650);
        }
      }, true);

      // Oryginalny moduł obsługuje kliknięcie i zapis. Po nim wykonujemy własny,
      // serwerowo potwierdzony zapis oraz kopię bezpieczeństwa.
      document.addEventListener('click', e => {
        const btn = e.target && e.target.closest ? e.target.closest('#pollSaveVoteBtn') : null;
        if(!btn) return;
        setTimeout(verifyAndMirrorVote,120);
      }, false);

      const obs = new MutationObserver(() => {
        if(isPollModalOpen()){
          ensureStatusEl();
          if(lastSnapshot && Object.keys(lastSnapshot).length) renderSnapshotDirectly(lastSnapshot);
        }
      });
      obs.observe(document.body,{childList:true,subtree:true});

      forceTimer = setInterval(() => {
        if(isPollModalOpen() && Date.now() - lastServerReadAt > 4000) forceServerRead();
      },4000);
    }catch(e){
      started = false;
      console.warn('Ankiety: synchronizacja jeszcze niegotowa', e);
      setTimeout(attach,300);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
})();
