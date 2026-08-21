import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyCDRuFbCBtiX6MLzBeXEIDyMLMybkGwEYc',
  authDomain: 'cvzone-app-9a41b.firebaseapp.com',
  projectId: 'cvzone-app-9a41b',
  storageBucket: 'cvzone-app-9a41b.firebasestorage.app',
  messagingSenderId: '126192034228',
  appId: '1:126192034228:web:201abc488c6f20835bd2e1',
  measurementId: 'G-BBPL0W5Q6L'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
