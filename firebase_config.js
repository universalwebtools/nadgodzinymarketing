// Wklej tutaj konfigurację z Firebase (Project settings -> Your apps -> Web app)
// Uwaga: databaseURL jest wymagane (Realtime Database).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyArGjDo3PAItB9fojKCrNiRW_HMf3BoXPA",
  authDomain: "nadgodziny-ea1ce.firebaseapp.com",
  databaseURL: "https://nadgodziny-ea1ce-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "nadgodziny-ea1ce",
  storageBucket: "nadgodziny-ea1ce.firebasestorage.app",
  messagingSenderId: "319391686767",
  appId: "1:319391686767:web:1f9cd1ba96ae520597ed9a"
  // measurementId: "G-TPK2ZHF12K" // opcjonalnie
};

// Moduł ankiet działu. Jest ładowany osobno, żeby nie rozbudowywać jeszcze bardziej głównego index.html.
(() => {
  if (!document.querySelector('script[data-nadgodziny-polls]')) {
    const script = document.createElement('script');
    script.src = './ankiety.js?v=20261001-1';
    script.async = true;
    script.dataset.nadgodzinyPolls = '1';
    document.head.appendChild(script);
  }

  if (!document.querySelector('script[data-nadgodziny-poll-charts]')) {
    const chartScript = document.createElement('script');
    chartScript.src = './ankiety_wykres.js?v=20261001-3';
    chartScript.async = true;
    chartScript.dataset.nadgodzinyPollCharts = '1';
    document.head.appendChild(chartScript);
  }

  if (!document.querySelector('script[data-nadgodziny-poll-safe-nick]')) {
    const safeNickScript = document.createElement('script');
    safeNickScript.src = './ankiety_bezpieczna_ksywka.js?v=20261001-2';
    safeNickScript.async = true;
    safeNickScript.dataset.nadgodzinyPollSafeNick = '1';
    document.head.appendChild(safeNickScript);
  }

  if (!document.querySelector('script[data-nadgodziny-poll-date-fix]')) {
    const dateFixScript = document.createElement('script');
    dateFixScript.src = './ankiety_korekta_terminow.js?v=20261001-1';
    dateFixScript.async = true;
    dateFixScript.dataset.nadgodzinyPollDateFix = '1';
    document.head.appendChild(dateFixScript);
  }
})();
