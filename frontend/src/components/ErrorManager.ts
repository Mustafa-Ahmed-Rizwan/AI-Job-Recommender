export const createErrorBanner = () => {
  const existing = document.getElementById('error-banner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.id = 'error-banner';
  banner.className = 'fixed top-16 left-0 right-0 z-40 transform -translate-y-full transition-transform duration-300';
  banner.innerHTML = `
    <div class="bg-red-50 border-l-4 border-red-400 p-4 mx-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <i data-lucide="alert-circle" class="w-5 h-5 text-red-400 mr-3"></i>
          <p id="error-message" class="text-sm text-red-800"></p>
        </div>
        <button onclick="hideErrorBanner()" class="text-red-400 hover:text-red-600">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(banner);
  return banner;
};

export const showErrorMessage = (message: string) => {
  const banner = createErrorBanner();
  const messageEl = document.getElementById('error-message');
  if (messageEl) messageEl.textContent = message;
  
  setTimeout(() => {
    banner.classList.remove('-translate-y-full');
  }, 10);
  
  if (window.lucide) window.lucide.createIcons();
  
  setTimeout(() => {
    hideErrorBanner();
  }, 5000);
};

export const showSuccessMessage = (message: string) => {
  const existing = document.getElementById('success-banner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.id = 'success-banner';
  banner.className = 'fixed top-16 left-0 right-0 z-40 transform -translate-y-full transition-transform duration-300';
  banner.innerHTML = `
    <div class="bg-green-50 border-l-4 border-green-400 p-4 mx-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <i data-lucide="check-circle" class="w-5 h-5 text-green-400 mr-3"></i>
          <p class="text-sm text-green-800">${message}</p>
        </div>
        <button onclick="hideSuccessBanner()" class="text-green-400 hover:text-green-600">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(banner);
  
  setTimeout(() => {
    banner.classList.remove('-translate-y-full');
  }, 10);
  
  if (window.lucide) window.lucide.createIcons();
  
  setTimeout(() => {
    hideSuccessBanner();
  }, 3000);
};

export const hideErrorBanner = () => {
  const banner = document.getElementById('error-banner');
  if (banner) {
    banner.classList.add('-translate-y-full');
    setTimeout(() => banner.remove(), 300);
  }
};

export const hideSuccessBanner = () => {
  const banner = document.getElementById('success-banner');
  if (banner) {
    banner.classList.add('-translate-y-full');
    setTimeout(() => banner.remove(), 300);
  }
};