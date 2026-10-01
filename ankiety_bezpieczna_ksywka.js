/* Ankiety — bezpieczny wybór ksywki
   Po każdym otwarciu ankiety domyślnie: „Wybierz swoją ksywkę”.
   Głos można zapisać dopiero po świadomym wyborze osoby.
*/
(() => {
  'use strict';

  let identityChosenThisOpen = false;
  let lastModalVisible = false;
  let queued = false;

  function getModal(){ return document.getElementById('pollModal'); }

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

  document.addEventListener('click', (e) => {
    const openBtn = e.target && e.target.closest ? e.target.closest('#pollOpenBtn') : null;
    if(openBtn){
      identityChosenThisOpen = false;
      setTimeout(applySafeState, 0);
      setTimeout(applySafeState, 60);
      return;
    }

    const closeBtn = e.target && e.target.closest ? e.target.closest('#pollModal .poll-close') : null;
    if(closeBtn){
      identityChosenThisOpen = false;
    }
  }, true);

  document.addEventListener('change', (e) => {
    if(e.target && e.target.id === 'pollVoterSel'){
      identityChosenThisOpen = !!String(e.target.value || '').trim();
      setTimeout(applySafeState, 0);
      setTimeout(applySafeState, 40);
    }
  }, true);

  const observer = new MutationObserver(schedule);

  function start(){
    observer.observe(document.body, {childList:true, subtree:true});
    schedule();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
