/* Ankiety — wymuszona synchronizacja z Firebase + status połączenia */
(() => {
  'use strict';

  const POLLS_PATH = 'nadgodziny/polls';
  let started = false;
  let db = null;
  let pollsRef = null;
  let connectedRef = null;
  let lastServerReadAt = 0;
  let forceTimer = null;

  function ensureStatusStyle(){
    if(document.getElementById('pollCloudStatusStyles')) return;
    const style = document.createElement('style');
    style.id = 'pollCloudStatusStyles';
    style.textContent = `
      #pollCloudStatus{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);white-space:nowrap}
      #pollCloudStatus .dot{width:7px;height:7px;border-radius:50%;background:#f59e0b;box-shadow:0 0 8px rgba(245,158,11,.45)}
      #pollCloudStatus.ok .dot{background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,.55)}
      #pollCloudStatus.bad .dot{background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,.55)}
    `;
    document.head.appendChild(style);
  }

  function ensureStatusEl(){
    ensureStatusStyle();
    const modal = document.getElementById('pollModal');
    if(!modal) return null;
    let el = modal.querySelector('#pollCloudStatus');
    if(el) return el;
    const head = modal.querySelector('.poll-head > div');
    if(!head) return null;
    el = document.createElement('span');
    el.id = 'pollCloudStatus';
    el.innerHTML = '<span class="dot"></span><span class="txt">Chmura ankiet: sprawdzanie…</span>';
    head.appendChild(el);
    return el;
  }

  function setStatus(state, text){
    const el = ensureStatusEl();
    if(!el) return;
    el.classList.remove('ok','bad');
    if(state) el.classList.add(state);
    const txt = el.querySelector('.txt');
    if(txt) txt.textContent = text;
  }

  async function forceServerRead(){
    if(!db || !pollsRef) return;
    try {
      if(typeof db.goOnline === 'function') db.goOnline();
      setStatus('', 'Chmura ankiet: synchronizacja…');
      const snap = await pollsRef.once('value');
      lastServerReadAt = Date.now();
      let voters = 0;
      const data = snap.val() || {};
      Object.values(data).forEach(p => {
        voters += Object.values((p && p.votes) || {}).filter(v => v && v.name).length;
      });
      setStatus('ok', `Chmura ankiet: połączono • głosów: ${voters}`);
      // Dodatkowy event dla modułu ankiet / dodatków UI.
      window.dispatchEvent(new CustomEvent('nadgodziny:polls-server-sync', { detail:{ polls:data, voters } }));
    } catch(e){
      console.error('Ankiety: błąd wymuszonej synchronizacji', e);
      setStatus('bad', 'Chmura ankiet: brak synchronizacji');
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
          setStatus('ok', 'Chmura ankiet: połączono');
          if(isPollModalOpen()) forceServerRead();
        } else {
          setStatus('bad', 'Chmura ankiet: brak połączenia');
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

      forceTimer = setInterval(() => {
        if(isPollModalOpen() && Date.now() - lastServerReadAt > 5000) forceServerRead();
      }, 5000);
    }catch(e){
      started = false;
      console.warn('Ankiety: synchronizacja jeszcze niegotowa', e);
      setTimeout(attach,300);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, {once:true});
  else attach();
})();
