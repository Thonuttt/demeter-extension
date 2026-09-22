// toast.js — small notification popups

let hideTimer = null;

export function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}
