import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export function friendlyAuthError(error) {
  const map = {
    'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل.',
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/weak-password': 'كلمة السر ضعيفة؛ استخدم 6 أحرف على الأقل.',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة السر غير صحيحة.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
    'auth/wrong-password': 'كلمة السر غير صحيحة.',
    'auth/too-many-requests': 'تمت محاولات كثيرة. حاول لاحقاً.',
    'auth/network-request-failed': 'تعذر الاتصال. تحقق من الإنترنت.'
  };
  return map[error?.code] || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

export async function ensureUserDocument(user, extra = {}) {
  if (!user) return null;
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || extra.displayName || '',
      phone: extra.phone || '',
      photoURL: user.photoURL || '',
      role: 'user',
      accountStatus: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(ref, { updatedAt: serverTimestamp() }, { merge: true });
  }
  return ref;
}

export async function registerUser({ name, email, password, phone = '' }) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name?.trim()) await updateProfile(credential.user, { displayName: name.trim() });
  await ensureUserDocument(credential.user, { displayName: name.trim(), phone: phone.trim() });
  return credential.user;
}

export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserDocument(credential.user);
  return credential.user;
}

export function logoutUser() {
  return signOut(auth);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function authLinksHTML() {
  return `
    <span class="auth-user" id="authUserLabel" hidden></span>
    <a class="auth-link" id="authDashboardLink" href="user-dashboard.html" hidden><i class="fas fa-user-circle"></i> حسابي</a>
    <button class="auth-link auth-button" id="authLoginButton" type="button"><i class="fas fa-sign-in-alt"></i> دخول / إنشاء حساب</button>
    <button class="auth-link auth-button" id="authLogoutButton" type="button" hidden><i class="fas fa-sign-out-alt"></i> خروج</button>
  `;
}

export function mountAuthUI({ modalId = 'authModal', triggerId = 'authLoginButton' } = {}) {
  const modal = document.getElementById(modalId);
  const trigger = document.getElementById(triggerId);
  if (!modal || !trigger) return;
  const close = modal.querySelector('[data-auth-close]');
  const form = modal.querySelector('#authForm');
  const modeTitle = modal.querySelector('#authModeTitle');
  const submit = modal.querySelector('#authSubmit');
  const nameField = modal.querySelector('#authNameGroup');
  const phoneField = modal.querySelector('#authPhoneGroup');
  const resetLink = modal.querySelector('#authReset');
  const switchLink = modal.querySelector('#authSwitch');
  const message = modal.querySelector('#authMessage');
  let mode = 'login';

  function render() {
    const register = mode === 'register';
    modeTitle.textContent = register ? 'إنشاء حساب اختياري' : 'تسجيل الدخول';
    submit.textContent = register ? 'إنشاء الحساب' : 'دخول';
    nameField.hidden = !register;
    phoneField.hidden = !register;
    resetLink.hidden = register;
    switchLink.textContent = register ? 'لديك حساب؟ تسجيل الدخول' : 'إنشاء حساب جديد اختيارياً';
    message.textContent = '';
  }
  function open() { modal.hidden = false; modal.classList.add('open'); render(); }
  function closeModal() { modal.classList.remove('open'); modal.hidden = true; }
  trigger.addEventListener('click', open);
  close?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  switchLink?.addEventListener('click', () => { mode = mode === 'login' ? 'register' : 'login'; render(); });
  resetLink?.addEventListener('click', async () => {
    const email = form.elements.namedItem('email').value.trim();
    if (!email) { message.textContent = 'اكتب بريدك الإلكتروني أولاً.'; return; }
    try { await resetPassword(email); message.textContent = 'تم إرسال رابط استعادة كلمة السر إلى بريدك.'; }
    catch (error) { message.textContent = friendlyAuthError(error); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    submit.disabled = true;
    message.textContent = 'جارٍ التنفيذ...';
    try {
      if (mode === 'register') {
        await registerUser({ name: form.elements.namedItem('name').value, email: form.elements.namedItem('email').value, password: form.elements.namedItem('password').value, phone: form.elements.namedItem('phone').value });
      } else {
        await loginUser(form.elements.namedItem('email').value, form.elements.namedItem('password').value);
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('cvzone-auth-changed'));
    } catch (error) {
      message.textContent = friendlyAuthError(error);
    } finally { submit.disabled = false; }
  });
  const logout = document.getElementById('authLogoutButton');
  logout?.addEventListener('click', async () => { await logoutUser(); window.location.reload(); });
  watchAuth(user => {
    const label = document.getElementById('authUserLabel');
    const dashboard = document.getElementById('authDashboardLink');
    const button = document.getElementById('authLoginButton');
    if (user) {
      if (label) { label.hidden = false; label.textContent = `مرحباً ${user.displayName || user.email}`; }
      if (dashboard) dashboard.hidden = false;
      if (button) button.hidden = true;
      if (logout) logout.hidden = false;
    } else {
      if (label) label.hidden = true;
      if (dashboard) dashboard.hidden = true;
      if (button) button.hidden = false;
      if (logout) logout.hidden = true;
    }
  });
}
