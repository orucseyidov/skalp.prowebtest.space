// User profile and settings JavaScript functionality
(() => {
  'use strict';

  // Bootstrap offcanvas instances
  let ocProfile, ocSettings, ocPassword;


  // Profile management functions
  async function openProfile(e) {
    e.preventDefault();
    try {
      const r = await fetch('/api/me/profile');
      if (r.ok) {
        const { data } = await r.json();
        const fullNameEl = document.getElementById('profile_full_name');
        const emailEl = document.getElementById('profile_email');
        
        if (fullNameEl) fullNameEl.value = data.full_name || '';
        if (emailEl) emailEl.value = data.email || '';
      }
    } catch(e) {
      console.error('Error loading profile:', e);
    }
    if (ocProfile) ocProfile.show();
  }

  async function saveProfile(e) {
    e.preventDefault();
    const msg = document.getElementById('profileMsg');
    if (msg) {
      msg.textContent = '';
      msg.className = 'small';
    }
    
    const fullNameEl = document.getElementById('profile_full_name');
    const emailEl = document.getElementById('profile_email');
    
    const payload = {
      full_name: fullNameEl ? fullNameEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : ''
    };
    
    try {
      const r = await fetch('/api/me/profile', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || 'Yadda saxlanmadı');
      }
      
      if (msg) {
        msg.textContent = 'Yadda saxlandı';
        msg.classList.add('text-success');
      }
      
      // Show success using global utility if available
      if (window.showSuccess) {
        window.showSuccess('Profil məlumatları yeniləndi');
      }
    } catch(err) {
      if (msg) {
        msg.textContent = err.message;
        msg.classList.add('text-danger');
      }
      
      // Show error using global utility if available
      if (window.showError) {
        window.showError(err.message);
      }
    }
  }

  // Settings management functions
  async function openSettings(e) {
    e.preventDefault();
    try {
      const r = await fetch('/api/me/settings');
      if (r.ok) {
        const { data } = await r.json();
        const settingsFields = ['gpt_token', 'gpt_key', 'deepseek_token', 'deepseek_key', 'binance_token', 'binance_key', 'binance_user_code'];
        
        settingsFields.forEach(k => {
          const el = document.getElementById(k);
          if (el) el.value = data?.[k] || '';
        });
      }
    } catch(e) {
      console.error('Error loading settings:', e);
    }
    if (ocSettings) ocSettings.show();
  }

  async function saveSettings(e) {
    e.preventDefault();
    const msg = document.getElementById('settingsMsg');
    if (msg) {
      msg.textContent = '';
      msg.className = 'small';
    }
    
    const payload = {
      gpt_token: document.getElementById('gpt_token')?.value || null,
      gpt_key: document.getElementById('gpt_key')?.value || null,
      deepseek_token: document.getElementById('deepseek_token')?.value || null,
      deepseek_key: document.getElementById('deepseek_key')?.value || null,
      binance_token: document.getElementById('binance_token')?.value || null,
      binance_key: document.getElementById('binance_key')?.value || null,
      binance_user_code: document.getElementById('binance_user_code')?.value || null,
    };
    
    try {
      const r = await fetch('/api/me/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.message || 'Yadda saxlanmadı');
      }
      
      if (msg) {
        msg.textContent = 'Yadda saxlandı';
        msg.classList.add('text-success');
      }
      
      // Show success using global utility if available
      if (window.showSuccess) {
        window.showSuccess('Ayarlar yadda saxlandı');
      }
    } catch(err) {
      if (msg) {
        msg.textContent = err.message;
        msg.classList.add('text-danger');
      }
      
      // Show error using global utility if available
      if (window.showError) {
        window.showError(err.message);
      }
    }
  }

  // Password management functions
  function openPassword(e) {
    e.preventDefault();
    const oldPasswordEl = document.getElementById('old_password');
    const newPasswordEl = document.getElementById('new_password');
    const confirmPasswordEl = document.getElementById('confirm_password');
    const msgEl = document.getElementById('passwordMsg');
    
    if (oldPasswordEl) oldPasswordEl.value = '';
    if (newPasswordEl) newPasswordEl.value = '';
    if (confirmPasswordEl) confirmPasswordEl.value = '';
    if (msgEl) {
      msgEl.textContent = '';
      msgEl.className = 'small';
    }
    
    if (ocPassword) ocPassword.show();
  }

  async function changePassword(e) {
    e.preventDefault();
    const msg = document.getElementById('passwordMsg');
    if (msg) {
      msg.textContent = '';
      msg.className = 'small';
    }
    
    const oldPasswordEl = document.getElementById('old_password');
    const newPasswordEl = document.getElementById('new_password');
    const confirmPasswordEl = document.getElementById('confirm_password');
    
    const payload = {
      oldPassword: oldPasswordEl ? oldPasswordEl.value : '',
      newPassword: newPasswordEl ? newPasswordEl.value : '',
      confirmPassword: confirmPasswordEl ? confirmPasswordEl.value : ''
    };
    
    try {
      const r = await fetch('/api/me/password', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      const data = await r.json();
      
      if (!r.ok || data.success === false) {
        throw new Error(data.message || 'Şifrə yenilənmədi');
      }
      
      if (msg) {
        msg.textContent = 'Şifrə yeniləndi';
        msg.classList.add('text-success');
      }
      
      // Show success using global utility if available
      if (window.showSuccess) {
        window.showSuccess('Şifrə uğurla yeniləndi');
      }
      
      // Clear form after successful change
      if (oldPasswordEl) oldPasswordEl.value = '';
      if (newPasswordEl) newPasswordEl.value = '';
      if (confirmPasswordEl) confirmPasswordEl.value = '';
      
    } catch(err) {
      if (msg) {
        msg.textContent = err.message;
        msg.classList.add('text-danger');
      }
      
      // Show error using global utility if available
      if (window.showError) {
        window.showError(err.message);
      }
    }
  }

  // Logout function
  async function logout(e) {
    e.preventDefault();
    
    // Use global confirm utility if available
    if (window.confirmAction) {
      const result = await window.confirmAction(
        'Çıxış etmək istəyirsiniz?',
        'Bu səhifədən çıxacaqsınız',
        'Bəli, çıx',
        'Ləğv et'
      );
      
      if (!result.isConfirmed) return;
    }
    
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch(e) {
      console.error('Logout error:', e);
    }
    
    window.location.href = '/login';
  }

  // Initialize user functionality
  function initializeUserFunctionality() {
    // Initialize Bootstrap offcanvas instances if elements exist
    const profileCanvas = document.getElementById('offcanvasProfile');
    const settingsCanvas = document.getElementById('offcanvasSettings');
    const passwordCanvas = document.getElementById('offcanvasPassword');
    
    if (profileCanvas) ocProfile = new bootstrap.Offcanvas(profileCanvas);
    if (settingsCanvas) ocSettings = new bootstrap.Offcanvas(settingsCanvas);
    if (passwordCanvas) ocPassword = new bootstrap.Offcanvas(passwordCanvas);
    
    // Setup event listeners
    const setupEventListener = (id, handler) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('click', handler);
      }
    };
    
    const setupFormListener = (id, handler) => {
      const form = document.getElementById(id);
      if (form) {
        form.addEventListener('submit', handler);
      }
    };
    
    // Profile event listeners
    setupEventListener('btnOpenProfile', openProfile);
    setupEventListener('btnOpenProfileMobile', openProfile);
    setupFormListener('profileForm', saveProfile);
    
    // Settings event listeners
    setupEventListener('btnOpenSettings', openSettings);
    setupEventListener('btnOpenSettingsMobile', openSettings);
    setupFormListener('settingsForm', saveSettings);
    
    // Password event listeners
    setupEventListener('btnOpenPassword', openPassword);
    setupEventListener('btnOpenPasswordMobile', openPassword);
    setupFormListener('passwordForm', changePassword);
    
    // Logout event listeners
    setupEventListener('btnLogout', logout);
    setupEventListener('btnLogoutMobile', logout);
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', initializeUserFunctionality);

})();
