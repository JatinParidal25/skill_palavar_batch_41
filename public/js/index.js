/*eslint-disable*/
import '@babel/polyfill';
import { login, logout } from './login';
import { updateSettings, setupTabSwitching } from './updateSettings';
console.log('Hello from Engineer of JPMC i.e. Jatin');
const loginForm = document.querySelector('.form--login');
const logoutBtn = document.querySelector('.nav__el--logout');
const updateSettingsForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');

console.log('loginForm:', loginForm);
console.log('updateSettingsForm:', updateSettingsForm);
console.log('All forms on page:', document.querySelectorAll('form'));
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm.querySelector('#email').value;
    const password = loginForm.querySelector('#password').value;
    login(email, password);
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => logout());
}

if (updateSettingsForm) {
  updateSettingsForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = updateSettingsForm.querySelector('#name').value;
    const email = updateSettingsForm.querySelector('#email').value;
    updateSettings({ name, email }, 'data');
  });
}
if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();

    const savePasswordBtn = userPasswordForm.querySelector(
      '.btn--save-password'
    );
    savePasswordBtn.textContent = 'Updating...';
    const passwordCurrent = userPasswordForm.querySelector('#password-current')
      .value;
    const password = userPasswordForm.querySelector('#password').value;
    const passwordConfirm = userPasswordForm.querySelector('#password-confirm')
      .value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    userPasswordForm.querySelector('#password-current').value = '';
    userPasswordForm.querySelector('#password').value = '';
    userPasswordForm.querySelector('#password-confirm').value = '';
    savePasswordBtn.textContent = 'Save Password';
  });
}

// Initialize tab switching on account page
if (updateSettingsForm) {
  console.log('updateSettingsForm found, initializing tab switching');
  const userDataElement = document.getElementById('user-data');
  console.log('userDataElement:', userDataElement);
  if (userDataElement) {
    try {
      const userData = JSON.parse(userDataElement.textContent);
      console.log('Parsed user data:', userData);
      if (userData && userData.id) {
        console.log('Calling setupTabSwitching with userId:', userData.id);
        setupTabSwitching(userData.id);
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
    }
  } else {
    console.warn('userDataElement not found in DOM');
  }
}
