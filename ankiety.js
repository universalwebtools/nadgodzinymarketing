/* Ankiety działu marketingu — moduł do aplikacji Nadgodziny
   Dane: Firebase Realtime Database -> nadgodziny/polls
*/
(() => {
  'use strict';

  const POLLS_PATH = 'nadgodziny/polls';
  const DEFAULT_POLL_ID = 'spotkanie-integracyjne-2026-jesien';
  const DEFAULT_POLL = {
    title: 'Spotkanie integracyjne — propozycja terminów',
    description: 'Zaznacz wszystkie terminy, które Ci pasują. Możesz wybrać więcej niż jeden termin.',
    multiple: true,
    active: true,
    createdAt: 1790848800000,
    createdBy: 'System',
    options: {
      opt_1: { label: '16–17 października', order: 1 },
      opt_2: { label: '23–24 października', order: 2 },
      opt_3: { label: '30–31 października', order: 3 },
      opt_4: { label: '7–8 listopada', order: 4 },
      opt_5: { label: '14–15 listopada', order: 5 },
      opt_6: { label: '21–22 listopada', order: 6 },
      opt_7: { label: '28–29 listopada', order: 7 }
    },
    votes: {}
  };

  let db = null;
  let pollsRef = null;
  let authUser = null;
  let polls = {};
  let selectedPollId = null;
  let unsubscribeAttached = false;
  let ui = {};

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function safeIdPart(v) {
    return String(v || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function voteKey(name) {
    try {
      const bytes = new TextEncoder().encode(String(name || ''));
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch (_) {
      return safeIdPart(name);
    }
  }

  function getNicknameOptions() {
    const result = [];
    const push = (v) => {
      const s = String(v || '').trim();
      if (s && !result.includes(s)) result.push(s);
    };
    const editor = document.getElementById('editorSel');
    if (editor) Array.from(editor.options || []).forEach(o => push(o.value));
    const employee = document.getElementById('employeeSel');
    if (employee) Array.from(employee.options || []).forEach(o => push(o.value));
    Object.values(polls || {}).forEach(p => {
      Object.values((p && p.votes) || {}).forEach(v => push(v && v.name));
    });
    return result;
  }

  function getActiveNickname() {
    try {
      const saved = String(localStorage.getItem('nadgodziny_active_editor') || '').trim();
      if (saved) return saved;
    } catch (_) {}
    const editor = document.getElementById('editorSel');
    return editor ? String(editor.value || '').trim() : '';
  }

  function setActiveNickname(name) {
    const value = String(name || '').trim();
    if (!value) return;
    try { localStorage.setItem('nadgodziny_active_editor', value); } catch (_) {}
    const editor = document.getElementById('editorSel');
    if (editor && editor.value !== value) {
      editor.value = value;
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function isAdminUi() {
    const logout = document.getElementById('adminLogoutBtn');
    if (!logout) return false;
    return getComputedStyle(logout).display !== 'none';
  }

  function sortedOptions(poll) {
    return Object.entries((poll && poll.options) || {})
      .map(([id, o]) => ({ id, label: String(o && o.label || ''), order: Number(o && o.order || 0) }))
      .filter(o => o.label)
      .sort((a,b) => a.order - b.order || a.label.localeCompare(b.label, 'pl'));
  }

  function sortedPolls() {
    return Object.entries(polls || {})
      .map(([id, p]) => ({ id, ...(p || {}) }))
      .sort((a,b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }

  function pollVoteFor(poll, nickname) {
    const key = voteKey(nickname);
    const direct = poll && poll.votes && poll.votes[key];
    if (direct) return direct;
    return Object.values((poll && poll.votes) || {}).find(v => v && v.name === nickname) || null;
  }

  function votersForOption(poll, optionId) {
    return Object.values((poll && poll.votes) || {})
      .filter(v => v && v.options && v.options[optionId])
      .map(v => String(v.name || '').trim())
      .filter(Boolean)
      .sort((a,b) => a.localeCompare(b, 'pl'));
  }

  function countVoters(poll) {
    return Object.values((poll && poll.votes) || {}).filter(v => v && v.name).length;
  }

  function injectStyles() {
    if (document.getElementById('pollModuleStyles')) return;
    const style = document.createElement('style');
    style.id = 'pollModuleStyles';
    style.textContent = `
      #pollOpenBtn{position:relative;border-color:rgba(110,168,255,.55);background:linear-gradient(180deg,rgba(110,168,255,.18),rgba(110,168,255,.08));font-weight:800}
      #pollOpenBtn .poll-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#6ea8ff;margin-right:7px;box-shadow:0 0 12px rgba(110,168,255,.8)}
      #pollModal{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.76);display:none;align-items:center;justify-content:center;padding:18px}
      #pollModal .poll-shell{width:min(1180px,100%);max-height:min(900px,94vh);display:flex;flex-direction:column;background:#0f1a2e;border:1px solid rgba(255,255,255,.15);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.58);overflow:hidden;color:rgba(255,255,255,.92)}
      #pollModal .poll-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.03)}
      #pollModal .poll-title{font-size:18px;font-weight:900;letter-spacing:.2px}
      #pollModal .poll-sub{font-size:12px;color:rgba(255,255,255,.62);margin-top:4px}
      #pollModal .poll-close{font-size:18px;min-width:44px}
      #pollModal .poll-body{display:grid;grid-template-columns:300px minmax(0,1fr);min-height:520px;overflow:hidden}
      #pollModal .poll-left{border-right:1px solid rgba(255,255,255,.10);padding:14px;overflow:auto;background:rgba(0,0,0,.12)}
      #pollModal .poll-right{padding:16px;overflow:auto}
      #pollModal .poll-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:12px}
      #pollModal .poll-list{display:flex;flex-direction:column;gap:8px}
      #pollModal .poll-list-btn{width:100%;text-align:left;padding:11px 12px;border-radius:13px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10)}
      #pollModal .poll-list-btn.active{border-color:rgba(110,168,255,.75);background:rgba(110,168,255,.14);box-shadow:0 0 0 2px rgba(110,168,255,.12) inset}
      #pollModal .poll-list-name{font-weight:800;line-height:1.25}
      #pollModal .poll-list-meta{font-size:11px;color:rgba(255,255,255,.58);margin-top:5px}
      #pollModal .poll-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06)}
      #pollModal .poll-badge.closed{color:#ffd3a6;border-color:rgba(255,179,71,.40);background:rgba(255,179,71,.11)}
      #pollModal .poll-voter-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid rgba(255,255,255,.10);border-radius:13px;background:rgba(255,255,255,.035);margin-bottom:14px}
      #pollModal .poll-voter-row select{min-width:190px}
      #pollModal .poll-question{font-size:22px;font-weight:900;margin:4px 0 6px}
      #pollModal .poll-desc{font-size:13px;color:rgba(255,255,255,.68);margin-bottom:14px;line-height:1.45}
      #pollModal .poll-options{display:flex;flex-direction:column;gap:9px}
      #pollModal .poll-option{display:grid;grid-template-columns:auto minmax(160px,1fr) auto;gap:12px;align-items:center;padding:12px 13px;border:1px solid rgba(255,255,255,.11);border-radius:14px;background:rgba(255,255,255,.035)}
      #pollModal .poll-option:hover{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.18)}
      #pollModal .poll-option input{width:20px;height:20px;accent-color:#6ea8ff}
      #pollModal .poll-option-label{font-weight:800;font-size:14px}
      #pollModal .poll-option-result{text-align:right;min-width:230px}
      #pollModal .poll-count{font-size:13px;font-weight:900}
      #pollModal .poll-voters{font-size:11px;color:rgba(255,255,255,.61);margin-top:4px;line-height:1.35;word-break:break-word}
      #pollModal .poll-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.09)}
      #pollModal .poll-save{font-weight:900;border-color:rgba(31,143,78,.58);background:rgba(31,143,78,.18)}
      #pollModal .poll-msg{font-size:12px;color:rgba(255,255,255,.72)}
      #pollModal .poll-empty{padding:30px;text-align:center;color:rgba(255,255,255,.62);border:1px dashed rgba(255,255,255,.14);border-radius:14px}
      #pollModal .poll-field{margin-bottom:10px}
      #pollModal .poll-field label{display:block;font-size:12px;color:rgba(255,255,255,.67);margin-bottom:5px}
      #pollModal .poll-field input,#pollModal .poll-field textarea{width:100%;font:inherit;color:rgba(255,255,255,.92);background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 11px;outline:none}
      #pollModal .poll-field textarea{min-height:72px;resize:vertical}
      #pollModal .poll-new-option-row{display:flex;gap:7px;margin-bottom:7px}
      #pollModal .poll-new-option-row input{flex:1}
      #pollModal .poll-new-option-row button{padding:8px 11px}
      #pollModal .poll-admin-note{font-size:11px;color:rgba(255,255,255,.56);margin-top:8px}
      @media(max-width:820px){#pollModal{padding:7px}#pollModal .poll-shell{max-height:97vh;border-radius:15px}#pollModal .poll-body{grid-template-columns:1fr;display:block;overflow:auto}#pollModal .poll-left{border-right:0;border-bottom:1px solid rgba(255,255,255,.10);max-height:230px}#pollModal .poll-right{overflow:visible}#pollModal .poll-option{grid-template-columns:auto 1fr}#pollModal .poll-option-result{grid-column:2;text-align:left;min-width:0}#pollModal .poll-question{font-size:19px}}
    `;
    document.head.appendChild(style);
  }

  function injectUi() {
    if (document.getElementById('pollOpenBtn')) return;
    injectStyles();
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;

    const btn = document.createElement('button');
    btn.id = 'pollOpenBtn';
    btn.type = 'button';
    btn.innerHTML = '<span class="poll-dot"></span>Ankieta';
    btn.title = 'Ankiety działu';
    btn.addEventListener('click', openModal);
    toolbar.appendChild(btn);

    const modal = document.createElement('div');
    modal.id = 'pollModal';
    modal.innerHTML = `
      <div class="poll-shell" role="dialog" aria-modal="true" aria-labelledby="pollModuleTitle">
        <div class="poll-head">
          <div><div id="pollModuleTitle" class="poll-title">Ankiety działu</div><div class="poll-sub">Głosowanie pod tymi samymi ksywkami, których używacie w nadgodzinach</div></div>
          <button type="button" class="poll-close" aria-label="Zamknij">✕</button>
        </div>
        <div class="poll-body">
          <aside class="poll-left">
            <div class="poll-toolbar"><b>Ankiety</b><button id="pollNewBtn" type="button" style="display:none">+ Nowa</button></div>
            <div id="pollList" class="poll-list"></div>
          </aside>
          <main id="pollRight" class="poll-right"></main>
        </div>
      </div>`;
    document.body.appendChild(modal);

    ui.modal = modal;
    ui.list = modal.querySelector('#pollList');
    ui.right = modal.querySelector('#pollRight');
    ui.newBtn = modal.querySelector('#pollNewBtn');
    modal.querySelector('.poll-close').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    ui.newBtn.addEventListener('click', renderCreateForm);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });
  }

  function openModal() {
    injectUi();
    if (!ui.modal) return;
    ui.modal.style.display = 'flex';
    renderAll();
  }

  function closeModal() {
    if (ui.modal) ui.modal.style.display = 'none';
  }

  function renderAll() {
    if (!ui.modal) return;
    const admin = isAdminUi();
    if (ui.newBtn) ui.newBtn.style.display = admin ? '' : 'none';
    renderPollList();
    renderSelectedPoll();
  }

  function renderPollList() {
    if (!ui.list) return;
    const items = sortedPolls();
    if (!selectedPollId || !polls[selectedPollId]) {
      const active = items.find(p => p.active !== false) || items[0];
      selectedPollId = active ? active.id : null;
    }
    if (!items.length) {
      ui.list.innerHTML = '<div class="poll-empty">Brak ankiet.</div>';
      return;
    }
    ui.list.innerHTML = items.map(p => `
      <button type="button" class="poll-list-btn ${p.id===selectedPollId?'active':''}" data-poll-id="${esc(p.id)}">
        <div class="poll-list-name">${esc(p.title || 'Ankieta')}</div>
        <div class="poll-list-meta">${countVoters(p)} głosujących • ${p.active===false?'<span class="poll-badge closed">zamknięta</span>':'<span class="poll-badge">aktywna</span>'}</div>
      </button>`).join('');
    ui.list.querySelectorAll('[data-poll-id]').forEach(b => b.addEventListener('click', () => {
      selectedPollId = b.dataset.pollId;
      renderAll();
    }));
  }

  function renderSelectedPoll() {
    if (!ui.right) return;
    const poll = selectedPollId ? polls[selectedPollId] : null;
    if (!poll) {
      ui.right.innerHTML = `<div class="poll-empty">${isAdminUi() ? 'Nie ma jeszcze żadnej ankiety. Kliknij „+ Nowa”, aby ją utworzyć.' : 'Nie ma jeszcze żadnej ankiety.'}</div>`;
      return;
    }

    const nicknames = getNicknameOptions();
    const activeNick = getActiveNickname();
    const vote = activeNick ? pollVoteFor(poll, activeNick) : null;
    const chosen = (vote && vote.options) || {};
    const opts = sortedOptions(poll);
    const closed = poll.active === false;
    const admin = isAdminUi();

    const nickOptions = ['<option value="">Wybierz swoją ksywkę</option>']
      .concat(nicknames.map(n => `<option value="${esc(n)}" ${n===activeNick?'selected':''}>${esc(n)}</option>`)).join('');

    ui.right.innerHTML = `
      <div class="poll-voter-row">
        <b>Głosujesz jako:</b>
        <select id="pollVoterSel">${nickOptions}</select>
        <span class="poll-msg">Ksywki są pobierane z tego samego systemu co nadgodziny.</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <div class="poll-question">${esc(poll.title || 'Ankieta')}</div>
          <div class="poll-desc">${esc(poll.description || '')}</div>
        </div>
        <div>${closed?'<span class="poll-badge closed">ANKIETA ZAMKNIĘTA</span>':'<span class="poll-badge">ANKIETA AKTYWNA</span>'}</div>
      </div>
      <div class="poll-options">
        ${opts.map(o => {
          const voters = votersForOption(poll, o.id);
          const type = poll.multiple === false ? 'radio' : 'checkbox';
          return `<label class="poll-option">
            <input type="${type}" name="pollChoice" data-option-id="${esc(o.id)}" ${chosen[o.id]?'checked':''} ${closed?'disabled':''}>
            <div class="poll-option-label">${esc(o.label)}</div>
            <div class="poll-option-result"><div class="poll-count">${voters.length} ${voters.length===1?'osoba':'osób'}</div><div class="poll-voters">${voters.length ? esc(voters.join(', ')) : 'Jeszcze nikt'}</div></div>
          </label>`;
        }).join('')}
      </div>
      <div class="poll-actions">
        ${closed ? '' : '<button id="pollSaveVoteBtn" class="poll-save" type="button">Zapisz mój głos</button>'}
        ${activeNick && vote ? '<span class="poll-msg">Twój zapisany głos możesz w każdej chwili zmienić i zapisać ponownie.</span>' : '<span class="poll-msg">Możesz zaznaczyć więcej niż jeden termin.</span>'}
        ${admin ? `<span style="flex:1"></span><button id="pollToggleBtn" type="button">${closed?'Otwórz ankietę':'Zamknij ankietę'}</button><button id="pollDeleteBtn" class="btn-danger" type="button">Usuń ankietę</button>` : ''}
      </div>
      <div id="pollInlineMsg" class="poll-msg" style="margin-top:10px"></div>`;

    const voterSel = ui.right.querySelector('#pollVoterSel');
    if (voterSel) voterSel.addEventListener('change', () => {
      setActiveNickname(voterSel.value);
      renderSelectedPoll();
    });
    const saveBtn = ui.right.querySelector('#pollSaveVoteBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveVote);
    const toggleBtn = ui.right.querySelector('#pollToggleBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', togglePoll);
    const deleteBtn = ui.right.querySelector('#pollDeleteBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deletePoll);
  }

  async function saveVote() {
    const poll = polls[selectedPollId];
    const msg = ui.right && ui.right.querySelector('#pollInlineMsg');
    const nickname = String((ui.right.querySelector('#pollVoterSel') || {}).value || '').trim();
    if (!nickname) {
      if (msg) msg.textContent = 'Najpierw wybierz swoją ksywkę.';
      return;
    }
    if (!poll || poll.active === false) {
      if (msg) msg.textContent = 'Ta ankieta jest już zamknięta.';
      return;
    }
    const selected = {};
    ui.right.querySelectorAll('[data-option-id]:checked').forEach(el => { selected[el.dataset.optionId] = true; });
    if (!Object.keys(selected).length) {
      if (msg) msg.textContent = 'Zaznacz przynajmniej jedną opcję.';
      return;
    }
    if (!poll.multiple && Object.keys(selected).length > 1) {
      if (msg) msg.textContent = 'W tej ankiecie można wybrać tylko jedną opcję.';
      return;
    }
    try {
      setActiveNickname(nickname);
      await pollsRef.child(selectedPollId).child('votes').child(voteKey(nickname)).set({
        name: nickname,
        options: selected,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
      if (msg) msg.textContent = 'Głos zapisany ✅';
    } catch (e) {
      console.error('Ankieta: błąd zapisu głosu', e);
      if (msg) msg.textContent = 'Nie udało się zapisać głosu. Sprawdź połączenie z bazą.';
    }
  }

  function renderCreateForm() {
    if (!ui.right || !isAdminUi()) return;
    ui.right.innerHTML = `
      <div class="poll-question">Nowa ankieta</div>
      <div class="poll-desc">Dodaj pytanie i dowolną liczbę odpowiedzi. Ankieta będzie wspólna dla wszystkich zalogowanych osób.</div>
      <div class="poll-field"><label>Tytuł ankiety</label><input id="pollNewTitle" type="text" placeholder="np. Gdzie jedziemy na integrację?"></div>
      <div class="poll-field"><label>Opis / instrukcja</label><textarea id="pollNewDesc" placeholder="np. Zaznacz wszystkie odpowiedzi, które Ci pasują."></textarea></div>
      <div class="poll-field"><label><input id="pollNewMultiple" type="checkbox" checked style="width:auto;margin-right:7px"> Pozwól zaznaczyć więcej niż jedną odpowiedź</label></div>
      <div class="poll-field"><label>Opcje odpowiedzi</label><div id="pollNewOptions"></div><button id="pollAddOptionBtn" type="button">+ Dodaj opcję</button></div>
      <div class="poll-actions"><button id="pollCreateBtn" class="poll-save" type="button">Utwórz ankietę</button><button id="pollCreateCancelBtn" type="button">Anuluj</button></div>
      <div id="pollCreateMsg" class="poll-msg" style="margin-top:10px"></div>
      <div class="poll-admin-note">Tworzenie, zamykanie i usuwanie ankiet jest dostępne w sesji administratora.</div>`;
    const box = ui.right.querySelector('#pollNewOptions');
    const add = (value='') => {
      const row = document.createElement('div');
      row.className = 'poll-new-option-row';
      row.innerHTML = `<input type="text" class="poll-new-option" placeholder="Opcja odpowiedzi" value="${esc(value)}"><button type="button" title="Usuń">✕</button>`;
      row.querySelector('button').addEventListener('click', () => { if (box.children.length > 2) row.remove(); });
      box.appendChild(row);
    };
    add(); add(); add();
    ui.right.querySelector('#pollAddOptionBtn').addEventListener('click', () => add());
    ui.right.querySelector('#pollCreateCancelBtn').addEventListener('click', renderSelectedPoll);
    ui.right.querySelector('#pollCreateBtn').addEventListener('click', createPoll);
  }

  async function createPoll() {
    if (!isAdminUi() || !pollsRef) return;
    const msg = ui.right.querySelector('#pollCreateMsg');
    const title = String(ui.right.querySelector('#pollNewTitle').value || '').trim();
    const description = String(ui.right.querySelector('#pollNewDesc').value || '').trim();
    const multiple = !!ui.right.querySelector('#pollNewMultiple').checked;
    const labels = Array.from(ui.right.querySelectorAll('.poll-new-option')).map(i => String(i.value || '').trim()).filter(Boolean);
    if (!title) { msg.textContent = 'Wpisz tytuł ankiety.'; return; }
    if (labels.length < 2) { msg.textContent = 'Dodaj przynajmniej dwie opcje odpowiedzi.'; return; }
    const options = {};
    labels.forEach((label, i) => { options[`opt_${i+1}`] = { label, order:i+1 }; });
    const nickname = getActiveNickname() || 'Admin';
    const id = `poll_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    try {
      await pollsRef.child(id).set({
        title, description, multiple, active:true,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: nickname,
        options,
        votes: {}
      });
      selectedPollId = id;
      msg.textContent = 'Ankieta utworzona ✅';
    } catch (e) {
      console.error('Ankieta: błąd tworzenia', e);
      msg.textContent = 'Nie udało się utworzyć ankiety.';
    }
  }

  async function togglePoll() {
    if (!isAdminUi() || !selectedPollId || !pollsRef) return;
    const poll = polls[selectedPollId];
    if (!poll) return;
    try { await pollsRef.child(selectedPollId).child('active').set(poll.active === false); }
    catch (e) { console.error(e); }
  }

  async function deletePoll() {
    if (!isAdminUi() || !selectedPollId || !pollsRef) return;
    const poll = polls[selectedPollId];
    if (!poll) return;
    if (!confirm(`Usunąć ankietę „${poll.title || 'Ankieta'}” razem ze wszystkimi głosami?`)) return;
    try {
      await pollsRef.child(selectedPollId).remove();
      selectedPollId = null;
    } catch (e) { console.error(e); }
  }

  async function ensureDefaultPoll() {
    if (!pollsRef || !authUser) return;
    try {
      await pollsRef.child(DEFAULT_POLL_ID).transaction(current => current || DEFAULT_POLL);
    } catch (e) {
      console.warn('Ankieta: nie udało się utworzyć domyślnej ankiety', e);
    }
  }

  function attachPolls() {
    if (!db || !authUser || unsubscribeAttached) return;
    pollsRef = db.ref(POLLS_PATH);
    unsubscribeAttached = true;
    pollsRef.on('value', snap => {
      polls = snap.val() || {};
      if (ui.modal && ui.modal.style.display === 'flex') renderAll();
      const btn = document.getElementById('pollOpenBtn');
      if (btn) {
        const activeCount = Object.values(polls).filter(p => p && p.active !== false).length;
        btn.title = activeCount ? `Ankiety działu — aktywne: ${activeCount}` : 'Ankiety działu';
      }
    });
    ensureDefaultPoll();
  }

  function detachPolls() {
    if (pollsRef && unsubscribeAttached) pollsRef.off();
    unsubscribeAttached = false;
    pollsRef = null;
    polls = {};
  }

  function waitForApp(tries=0) {
    injectUi();
    if (window.firebase && firebase.apps && firebase.apps.length) {
      try {
        db = firebase.database();
        firebase.auth().onAuthStateChanged(user => {
          authUser = user || null;
          if (authUser) attachPolls(); else detachPolls();
        });
        return;
      } catch (e) {
        console.warn('Ankieta: Firebase jeszcze niegotowy', e);
      }
    }
    if (tries < 100) setTimeout(() => waitForApp(tries + 1), 150);
  }

  function start() {
    injectUi();
    waitForApp();
    setInterval(() => {
      if (!document.getElementById('pollOpenBtn')) injectUi();
      if (ui.modal && ui.modal.style.display === 'flex') {
        if (ui.newBtn) ui.newBtn.style.display = isAdminUi() ? '' : 'none';
      }
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
