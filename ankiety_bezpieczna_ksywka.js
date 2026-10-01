/* Ankiety — bezpieczny wybór ksywki
   Po każdym otwarciu ankiety domyślnie: „Wybierz swoją ksywkę”.
   Głos można zapisać dopiero po świadomym wyborze osoby.
   Próba zaznaczenia terminu bez ksywki pokazuje komunikat i blokuje zaznaczenie.
*/
(() => {
  'use strict';

  let identityChosenThisOpen = false;
  let lastModalVisible = false;
  let queued = false;
  let toastTimer = null;

  function getModal(){ return document.getElementById('pollModal'); }

  function ensureToastStyles(){
    if(document.getElementById('pollNickGuardStyles')) return;
    const style = document.createElement('style');
    style.id = 'pollNickGuardStyles';
    style.textContent = `
      #pollNickGuardToast{
        position:fixed;
        left:50%;
        top:22px;
        transform:translateX(-50%) translateY(-12px);
        z-index:20050;
        min-width:min(520px,calc(100vw - 30px));
        max-width:min(680px,calc(100vw - 30px));
        padding:14px 18px;
        border-radius:14px;
        border:1px solid rgba(255,196,82,.58);
        background:linear-gradient(180deg,rgba(92,57,0,.98),rgba(58,36,0,.98));
        color:#fff4cf;
        box-shadow:0 18px 50px rgba(0,0,0,.48),0 0 0 1px rgba(255,196,82,.12) inset;
        font:800 14px/1.35 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
        text-align:center;
        opacity:0;
        pointer-events:none;
        transition:opacity .18s ease,transform .18s ease;
      }
      #pollNickGuardToast.show{
        opacity:1;
        transform:translateX(-50%) translateY(0);
      }
      #pollModal #pollVoterSel.poll-nick-required{
        border-color:#ffcc66!important;
        box-shadow:0 0 0 3px rgba(255,196,82,.22),0 0 16px rgba(255,196,82,.18)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function showChooseNicknameMessage(){
    ensureToastStyles();
    let toast = document.getElementById('pollNickGuardToast');
    if(!toast){
      toast = document.createElement('div');
      toast.id = 'pollNickGuardToast';
      toast.setAttribute('role','alert');
      toast.textContent = 'Proszę wybrać swoją ksywkę przed próbą zaznaczenia terminu.';
      document.body.appendChild(toast);
    }

    const modal = getModal();
    const select = modal ? modal.querySelector('#pollVoterSel') : null;
    if(select){
      select.classList.add('poll-nick-required');
      try{ select.focus({preventScroll:true}); }catch(_){ try{ select.focus(); }catch(__){} }
      setTimeout(() => select.classList.remove('poll-nick-required'), 1800);
    }

    clearTimeout(toastTimer);
    toast.classList.remove('show');
    requestAnimationFrame(() => toast.classList.add('show'));
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function resetIdentityForOpen(){
    identityChosenThisOpen = false;
    applySafeState();
  }

  function applySafeState(){
    const modal = getModal();
    if(!modal || modal.style.display === 'none') return;

    const select = modal.querySelector('#pollVoterSel');
    const save = modal.querySelector('#pollSaveVoteBtn');
    if(!select) return;

    if(!identityChosenThisOpen){
      if(select.value !== '') select.value = '';

      // Nie pokazujemy wyborów poprzedniej osoby, dopóki użytkownik nie wybierze ksywki.
      modal.querySelectorAll('.poll-options [data-option-id]').forEach(el => {
        el.checked = false;
      });

      if(save){
        save.disabled = true;
        save.style.opacity = '.5';
        save.style.cursor = 'not-allowed';
        save.title = 'Najpierw wybierz swoją ksywkę.';
      }
    } else if(save){
      save.disabled = !select.value;
      save.style.opacity = select.value ? '' : '.5';
      save.style.cursor = select.value ? '' : 'not-allowed';
      save.title = select.value ? '' : 'Najpierw wybierz swoją ksywkę.';
    }
  }

  function schedule(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const modal = getModal();
      const visible = !!(modal && modal.style.display !== 'none');
      if(visible && !lastModalVisible){
        identityChosenThisOpen = false;
      }
      lastModalVisible = visible;
      applySafeState();
    });
  }

  // Blokujemy zaznaczenie już na etapie kliknięcia w pole lub cały kafelek odpowiedzi.
  document.addEventListener('click', (e) => {
    const target = e.target;
    const openBtn = target && target.closest ? target.closest('#pollOpenBtn') : null;
    if(openBtn){
      identityChosenThisOpen = false;
      setTimeout(applySafeState, 0);
      setTimeout(applySafeState, 60);
      return;
    }

    const closeBtn = target && target.closest ? target.closest('#pollModal .poll-close') : null;
    if(closeBtn){
      identityChosenThisOpen = false;
      return;
    }

    const option = target && target.closest ? target.closest('#pollModal .poll-option') : null;
    if(option){
      const modal = getModal();
      const select = modal ? modal.querySelector('#pollVoterSel') : null;
      const hasNick = !!(identityChosenThisOpen && select && String(select.value || '').trim());
      if(!hasNick){
        e.preventDefault();
        e.stopPropagation();
        if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        option.querySelectorAll('[data-option-id]').forEach(el => { el.checked = false; });
        showChooseNicknameMessage();
      }
    }
  }, true);

  document.addEventListener('change', (e) => {
    if(e.target && e.target.id === 'pollVoterSel'){
      identityChosenThisOpen = !!String(e.target.value || '').trim();
      e.target.classList.remove('poll-nick-required');
      setTimeout(applySafeState, 0);
      setTimeout(applySafeState, 40);
    }
  }, true);

  const observer = new MutationObserver(schedule);

  function start(){
    ensureToastStyles();
    observer.observe(document.body, {childList:true, subtree:true});
    schedule();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
