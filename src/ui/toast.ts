let timer = 0;

/** Короткое сообщение вверху экрана. */
export function toast(msg: string): void {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(timer);
  timer = window.setTimeout(() => el.remove(), 2600);
}
