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
  if (document.querySelector('script[data-nadgodziny-polls]')) return;
  const script = document.createElement('script');
  script.src = './ankiety.js?v=20261001-1';
  script.async = true;
  script.dataset.nadgodzinyPolls = '1';
  document.head.appendChild(script);
})();
