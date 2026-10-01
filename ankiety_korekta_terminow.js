/* Jednorazowa korekta terminów w ankiecie integracyjnej: sobota-niedziela -> piątek-sobota */
(() => {
  'use strict';

  const POLL_ID = 'spotkanie-integracyjne-2026-jesien';
  const UPDATES = {
    'options/opt_4/label': '6–7 listopada',
    'options/opt_5/label': '13–14 listopada',
    'options/opt_6/label': '20–21 listopada',
    'options/opt_7/label': '27–28 listopada'
  };

  function start(tries = 0){
    if (window.firebase && firebase.apps && firebase.apps.length) {
      try {
        firebase.auth().onAuthStateChanged(user => {
          if (!user) return;
          firebase.database().ref(`nadgodziny/polls/${POLL_ID}`).update(UPDATES).catch(err => {
            console.warn('Ankieta: nie udało się zaktualizować terminów', err);
          });
        });
        return;
      } catch (e) {
        console.warn('Ankieta: Firebase jeszcze niegotowy do korekty terminów', e);
      }
    }
    if (tries < 100) setTimeout(() => start(tries + 1), 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once:true });
  else start();
})();
