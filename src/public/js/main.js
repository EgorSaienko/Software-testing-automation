// Mobile menu toggle
const toggle = document.getElementById('menuToggle');
const nav = document.getElementById('mainNav');
if (toggle && nav) {
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// Auto-dismiss flash messages
const flash = document.getElementById('flash');
if (flash) {
  setTimeout(() => {
    flash.style.transition = 'opacity 0.5s ease';
    flash.style.opacity = '0';
    setTimeout(() => flash.remove(), 500);
  }, 4000);
}

// Confirm delete actions
document.querySelectorAll('[data-confirm]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (!confirm(btn.dataset.confirm)) e.preventDefault();
  });
});

// File input label update
document.querySelectorAll('input[type="file"]').forEach(input => {
  input.addEventListener('change', () => {
    const label = input.closest('.file-input-wrapper')?.querySelector('.file-label-text');
    if (label && input.files[0]) {
      label.textContent = input.files[0].name;
    }
  });
});
