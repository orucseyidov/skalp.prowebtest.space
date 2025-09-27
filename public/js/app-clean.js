(() => {
  'use strict';
  
  const intervals = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
  const PREFS_KEY = 'scalp_prefs_v1';
  
  // Utility math functions
  function toBar(k) {
    return { time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] };
  }

  function sma(values, period) {
    const out = new Array(values.length).fill(null);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= period) sum -= values[i - period];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  function ema(values, period) {
    const out = new Array(values.length).fill(null);
    const k = 2 / (period + 1);
    let prev = null;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (i === period - 1) {
        let s = 0; for (let j = 0; j < period; j++) s += values[j];
        prev = s / period; out[i] = prev;
      } else if (i >= period) {
        prev = v * k + prev * (1 - k); out[i] = prev;
      }
    }
    return out;
  }

  function rsi(values, period = 14) {
    const out = new Array(values.length).fill(null);
    if (values.length < period + 1) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const ch = values[i] - values[i - 1];
      if (ch >= 0) gain += ch; else loss -= ch;
    }
    let avgGain = gain / period; let avgLoss = loss / period;
    out[period] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / (avgLoss || 1e-12)));
    for (let i = period + 1; i < values.length; i++) {
      const ch = values[i] - values[i - 1];
      const g = ch > 0 ? ch : 0; const l = ch < 0 ? -ch : 0;
      avgGain = (avgGain * (period - 1) + g) / period;
      avgLoss = (avgLoss * (period - 1) + l) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / (avgLoss || 1e-12);
      out[i] = 100 - 100 / (1 + rs);
    }
    return out;
  }

  function tfToMs(tf) {
    const map = {
      '30s': 30 * 1000,
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '3h': 3 * 60 * 60 * 1000,
      '5h': 5 * 60 * 60 * 1000,
      '10h': 10 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '2d': 2 * 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
    };
    return map[tf] || 60 * 1000;
  }

  // Preferences management
  function readPrefs() {
    try { 
      return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); 
    } catch { 
      return {}; 
    }
  }

  function writePrefs(partial) {
    const cur = readPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, ...partial }));
  }

  function applyPrefsToUI() {
    const p = readPrefs();
    if (p.symbol && $('#symbol').length) $('#symbol').val(p.symbol);
    if (p.interval && $('#interval').length) $('#interval').val(p.interval);
    if (p.limit != null && $('#limit').length) $('#limit').val(p.limit);
    if (p.scalpTf && $('#scalpTf').length) $('#scalpTf').val(p.scalpTf);
    if (p.autoReload != null && $('#aoutoReloadToggle').length) $('#aoutoReloadToggle').prop('checked', !!p.autoReload);
    if (p.rsiToggle != null && $('#rsiToggle').length) $('#rsiToggle').prop('checked', !!p.rsiToggle);
    if (p.rsiPeriod != null && $('#rsiPeriod').length) $('#rsiPeriod').val(p.rsiPeriod);
    if (p.ma7Toggle != null && $('#ma7Toggle').length) $('#ma7Toggle').prop('checked', !!p.ma7Toggle);
    if (p.ma7Period != null && $('#ma7Period').length) $('#ma7Period').val(p.ma7Period);
    if (p.ma25Toggle != null && $('#ma25Toggle').length) $('#ma25Toggle').prop('checked', !!p.ma25Toggle);
    if (p.ma25Period != null && $('#ma25Period').length) $('#ma25Period').val(p.ma25Period);
    if (p.ma99Toggle != null && $('#ma99Toggle').length) $('#ma99Toggle').prop('checked', !!p.ma99Toggle);
    if (p.ma99Period != null && $('#ma99Period').length) $('#ma99Period').val(p.ma99Period);
    if (p.emaMode != null && $('#emaMode').length) $('#emaMode').prop('checked', !!p.emaMode);
  }

  // Symbol loading (can be used on any page with symbol select)
  async function loadSymbols() {
    try {
      const list = await $.getJSON('/api/symbols');
      const $sel = $('#symbol');
      if ($sel.length === 0) {
        console.log('Symbol select not found, skipping symbol setup');
        return;
      }
      $sel.empty();
      for (const s of list) $sel.append(`<option value="${s}">${s}</option>`);
      $sel.val('SOLUSDT');
      
      // enhance SYMBOL select with Select2
      if ($.fn.select2) {
        // destroy previous instance if any to avoid duplicates
        if ($sel.hasClass('select2-hidden-accessible')) { $sel.select2('destroy'); }
        $sel.select2({
          width: 'style',
          dropdownAutoWidth: true,
          minimumResultsForSearch: 0
        });
      }
    } catch (e) {
      if (window.showError) {
        window.showError('Simvollar yüklənmədi');
      } else {
        console.error('Error loading symbols:', e);
      }
    }
  }

  function setupIntervals() {
    const $int = $('#interval');
    if ($int.length === 0) {
      console.log('Interval select not found, skipping interval setup');
      return;
    }
    $int.empty();
    for (const it of intervals) {
      $int.append(`<option value="${it}">${it}</option>`);
    }
    $int.val('1m');
  }

  // Toast error display
  function showError(msg) {
    const toastMsg = document.getElementById('toastMsg');
    const appToast = document.getElementById('appToast');
    if (toastMsg && appToast) {
      toastMsg.textContent = msg;
      const toast = new bootstrap.Toast(appToast);
      toast.show();
    }
  }

  // SweetAlert utility functions
  function showSuccess(message) {
    Swal.fire({
      title: 'Uğurlu!',
      text: message,
      icon: 'success',
      confirmButtonText: 'Tamam'
    });
  }

  function showErrorAlert(message) {
    Swal.fire({
      title: 'Xəta!',
      text: message,
      icon: 'error',
      confirmButtonText: 'Tamam'
    });
  }

  function showLoading(title = 'Yüklənir...', text = 'Zəhmət olmasa gözləyin') {
    return Swal.fire({
      title: title,
      text: text,
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });
  }

  function confirmAction(title, text, confirmText = 'Bəli', cancelText = 'Ləğv et') {
    return Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true
    });
  }

  // Collapse icon rotation functionality (UI animation)
  function setupCollapseIcons() {
    const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]');
    collapseElements.forEach(function(element) {
      element.addEventListener('click', function() {
        const target = document.querySelector(this.getAttribute('data-bs-target'));
        const icon = this.querySelector('.collapse-icon');
        
        if (target && icon) {
          if (target.classList.contains('show')) {
            icon.style.transform = 'rotate(-90deg)';
          } else {
            icon.style.transform = 'rotate(0deg)';
          }
        }
      });
    });
  }

  // Cache clear functionality for both desktop and mobile
  function setupCacheClearButton(buttonId) {
    const button = document.getElementById(buttonId);
    console.log(`Setting up cache clear button: ${buttonId}`, button);
    if (button) {
      button.addEventListener('click', function() {
        confirmAction(
          'Keşi silmək istəyirsiniz?',
          "Bu əməliyyat bütün keş məlumatlarını siləcək və səhifəni yeniləyəcək!",
          'Bəli, sil!',
          'Ləğv et'
        ).then((result) => {
          if (result.isConfirmed) {
            showLoading('Keş silinir...', 'Zəhmət olmasa gözləyin');

            // Call cache clear API
            fetch('/api/cache/clear', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                showSuccess('Keş uğurla silindi').then(() => {
                  window.location.reload();
                });
              } else {
                showErrorAlert(data.message || 'Keş silinərkən xəta baş verdi');
              }
            })
            .catch(error => {
              console.error('Error:', error);
              showErrorAlert('Keş silinərkən xəta baş verdi');
            });
          }
        });
      });
    }
  }

  // Initialize app functionality
  function initApp() {
    // Setup intervals and symbols (if elements exist)
    setupIntervals();
    loadSymbols();
    
    // Apply saved preferences
    applyPrefsToUI();
    
    // Setup tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el) => { new bootstrap.Tooltip(el); });
    
    // Setup cache clear buttons (available on all pages)
    setupCacheClearButton('btnClearCache');
    setupCacheClearButton('btnClearCacheMobile');
    setupCacheClearButton('testCacheClear');
    
    // Setup collapse icon animations (UI functionality)
    setupCollapseIcons();
  }

  // Make functions globally available
  window.toBar = toBar;
  window.sma = sma;
  window.ema = ema;
  window.rsi = rsi;
  window.tfToMs = tfToMs;
  window.writePrefs = writePrefs;
  window.readPrefs = readPrefs;
  window.showSuccess = showSuccess;
  window.showError = showErrorAlert;
  window.showLoading = showLoading;
  window.confirmAction = confirmAction;
  window.loadSymbols = loadSymbols;
  window.setupIntervals = setupIntervals;

  // Initialize when DOM is ready
  $(document).ready(initApp);

})();
