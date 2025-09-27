// Home page specific JavaScript functionality
(() => {
  'use strict';

  // Home page specific variables
  let scalpLoadingCount = 0;

  // Scalp analysis functionality
  async function refreshScalp() {
    function fmt(n) { return (+n).toFixed(6); }
    function renderPlan(side, entry) {
      const tp = side === 'long' ? entry * 1.005 : entry * 0.995;
      const sl = side === 'long' ? entry * 0.997 : entry * 1.003;
      return (
        `<div class="border rounded p-2 mb-2">`+
        `<div><strong>${side === 'long' ? 'Alış planı' : 'Satış planı'} (təxminən 30s)</strong></div>`+
        `<div>Giriş qiyməti: <strong>${fmt(entry)}</strong></div>`+
        `<div>Qazanc hədəfi (TP): <strong>${fmt(tp)}</strong> (${side === 'long' ? '+0.5%' : '-0.5%'})</div>`+
        `<div>Zərər dayandır (SL): <strong>${fmt(sl)}</strong> (${side === 'long' ? '-0.3%' : '+0.3%'})</div>`+
        `</div>`
      );
    }
    try {
      scalpLoadingCount++;
      $('#scalpLoading').removeClass('d-none');
      const tf = $('#scalpTf').val() || '30s';
      const symbol = window.currentSymbol || 'SOLUSDT';
      const resp = await $.getJSON('/api/scalp30s', { symbol, tf });
      $('#scalpMode').text(resp.mode);
      $('#scalpTrend').text(resp.trend);
      $('#scalpSignal').text(resp.signal);
      if (resp.suggestion) {
        const s = resp.suggestion;
        const planHtml = renderPlan(s.side, s.entry);
        $('#scalpSuggestion').html(planHtml + `<div class="small text-secondary">Risk/Mükafat nisbəti: ${s.rr}. Müddət: təxminən 30s.</div>`);
      } else {
        const last = window.lastData && window.lastData.length ? window.lastData[window.lastData.length - 1].close : null;
        if (last) {
          const both = renderPlan('long', last) + renderPlan('short', last);
          $('#scalpSuggestion').html(both + `<div class="small text-secondary">Aydın siqnal yoxdur; qiymət əsaslı sürətli planlar. Müddət: təxminən 30s.</div>`);
        } else {
          $('#scalpSuggestion').text('-');
        }
      }
    } catch (e) {
      $('#scalpMode').text('-');
      $('#scalpTrend').text('-');
      $('#scalpSignal').text('N/A');
      const last = window.lastData && window.lastData.length ? window.lastData[window.lastData.length - 1].close : null;
      if (last) {
        const both = renderPlan('long', last) + renderPlan('short', last);
        $('#scalpSuggestion').html(both + `<div class="small text-secondary">Hesablama alınmadı; yerli qiymət əsaslı planlar. Müddət: təxminən 30s.</div>`);
      } else {
        $('#scalpSuggestion').text('Hesablama alınmadı');
      }
    } finally {
      scalpLoadingCount = Math.max(0, scalpLoadingCount - 1);
      if (scalpLoadingCount === 0) $('#scalpLoading').addClass('d-none');
    }

    // fetch context coins AFTER spinner is settled so loader does not block
    try {
      const tf = $('#scalpTf').val() || '30s';
      const symbol = window.currentSymbol || 'SOLUSDT';
      const ai = await $.getJSON('/api/deepseek', { symbol, tf });
      const stats = ai.stats || {};
      const lines = Object.entries(stats).map(([s, st]) => `${s}: ${st.lastClose != null ? st.lastClose.toFixed(6) : '-'} (${st.changePct != null ? (st.changePct>=0?'+':'')+st.changePct.toFixed(2)+'%' : '-'})`);
      if (lines.length) {
        $('#scalpContext').html(`<div class="small text-secondary">Nəzərə alınan simvollar:</div><pre class="mb-0">${lines.join('\n')}</pre>`);
      } else {
        $('#scalpContext').empty();
      }
    } catch { $('#scalpContext').empty(); }
  }

  // AI analysis functionality
  async function refreshAI(showLoadingText = false) {
    try {
      $('#aiLoading').removeClass('d-none');
      const tf = $('#scalpTf').val() || '30s';
      const symbol = window.currentSymbol || 'SOLUSDT';
      if (showLoadingText) $('#aiAnalysis').text('Analiz olunur...');
      const resp = await $.getJSON('/api/deepseek', { symbol, tf });
      let header = '';
      if (resp.stats) {
        const lines = Object.entries(resp.stats).map(([s, st]) => {
          const last = st.lastClose != null ? st.lastClose.toFixed(6) : '-';
          const pct = st.changePct != null ? (st.changePct >= 0 ? '+' : '') + st.changePct.toFixed(2) + '%' : '-';
          return `${s}: son qiymət ${last} (${pct})`;
        });
        header = lines.join('\n') + '\n\n';
      }
      $('#aiAnalysis').text(header + (resp.analysis || '-'));
    } catch (e) {
      $('#aiAnalysis').text('AI analizi alınmadı');
    } finally { $('#aiLoading').addClass('d-none'); }
  }


  // Initialize home page functionality when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Setup scalp and AI analysis event listeners
    $('#btnScalpRefresh').on('click', () => refreshScalp());
    $('#btnAiAnalyze').on('click', () => refreshAI(true));
    $('#scalpTf').on('change', () => { 
      // Save preference if available
      if (window.writePrefs) {
        window.writePrefs({ scalpTf: $('#scalpTf').val() });
      }
      refreshScalp(); 
      refreshAI(false); 
      // Setup auto reload if available
      if (window.setupAutoReload) {
        window.setupAutoReload();
      }
    });

    // Make functions globally available for app.js integration
    window.refreshScalp = refreshScalp;
    window.refreshAI = refreshAI;
  });

})();
