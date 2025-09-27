// Home page specific JavaScript functionality
(() => {
  'use strict';

  // Home page specific variables
  let scalpLoadingCount = 0;
  let chart, candleSeries, volumeSeries, rsiChart, rsiSeries;
  let rsiGuides = { upper: null, mid: null, lower: null, minBound: null, maxBound: null };
  let ma7Series, ma25Series, ma99Series;
  let ws;
  let autoTimer = null;

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

  // Chart creation and management functions
  function createCharts() {
    const container = document.getElementById('tvchart');
    if (!container) {
      console.log('Chart container not found, skipping chart creation');
      return;
    }
    container.innerHTML = '';
    chart = LightweightCharts.createChart(container, {
      layout: { background: { color: '#0b1220' }, textColor: '#D1D4DC' },
      grid: { vertLines: { color: '#1b2436' }, horzLines: { color: '#1b2436' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      autoSize: true,
    });
    candleSeries = chart.addCandlestickSeries({ upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350' });
    volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 } });
  }

  function ensureRsiChart() {
    if ($('#rsiToggle').is(':checked')) {
      if (!rsiChart) {
        const rsiContainer = document.getElementById('rsichart');
        if (!rsiContainer) {
          console.log('RSI chart container not found, skipping RSI chart creation');
          return;
        }
        rsiContainer.innerHTML = '';
        rsiChart = LightweightCharts.createChart(rsiContainer, {
          layout: { background: { color: '#0b1220' }, textColor: '#D1D4DC' },
          grid: { vertLines: { color: '#1b2436' }, horzLines: { color: '#1b2436' } },
          rightPriceScale: { borderVisible: false },
          timeScale: { borderVisible: false },
          autoSize: true,
        });
        rsiSeries = rsiChart.addLineSeries({ color: '#e6b800', lineWidth: 1 });

        // guide lines
        rsiGuides.upper = rsiChart.addLineSeries({ color: 'rgba(230,184,0,0.35)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed });
        rsiGuides.mid   = rsiChart.addLineSeries({ color: 'rgba(148,163,184,0.35)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed });
        rsiGuides.lower = rsiChart.addLineSeries({ color: 'rgba(230,184,0,0.35)', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed });
        // hidden bounds to lock autoscale to 0..100
        rsiGuides.minBound = rsiChart.addLineSeries({ color: 'rgba(0,0,0,0)', lineWidth: 0.0001 });
        rsiGuides.maxBound = rsiChart.addLineSeries({ color: 'rgba(0,0,0,0)', lineWidth: 0.0001 });

        // sync time ranges with main chart
        const sync = (range) => { if (rsiChart && range) rsiChart.timeScale().setVisibleRange(range); };
        chart.timeScale().subscribeVisibleTimeRangeChange(sync);
        rsiChart.timeScale().subscribeVisibleTimeRangeChange((range) => { if (chart && range) chart.timeScale().setVisibleRange(range); });
      }
    } else {
      if (rsiChart) {
        rsiChart.remove();
        rsiChart = null; rsiSeries = null;
        rsiGuides = { upper: null, mid: null, lower: null, minBound: null, maxBound: null };
      }
    }
  }

  function computeIndicators(bars) {
    const closes = bars.map(b => b.close);
    const vol = bars.map(b => b.volume);
    const rsiP = parseInt($('#rsiPeriod').val(), 10) || 14;
    const ma7P = parseInt($('#ma7Period').val(), 10) || 7;
    const ma25P = parseInt($('#ma25Period').val(), 10) || 25;
    const ma99P = parseInt($('#ma99Period').val(), 10) || 99;
    const useEma = $('#emaMode').is(':checked');
    const maFn = useEma ? window.ema : window.sma;
    return {
      rsi: window.rsi(bars.map(b=>b.close), rsiP),
      ma7: maFn(closes, ma7P),
      ma25: maFn(closes, ma25P),
      ma99: maFn(closes, ma99P),
      volSma20: window.sma(vol, 20),
    };
  }

  function drawSeries(bars) {
    if (!chart || !candleSeries || !volumeSeries) return;
    
    candleSeries.setData(bars.map(b => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close })));
    volumeSeries.setData(bars.map(b => ({ time: b.time, value: b.volume, color: b.close >= b.open ? '#26a69a' : '#ef5350' })));

    const ind = computeIndicators(bars);

    const times = bars.map(b => b.time);
    function seriesFrom(values, color) {
      return values.map((v, i) => v == null ? null : { time: times[i], value: v }).filter(Boolean);
    }

    // MAs
    if (!ma7Series) ma7Series = chart.addLineSeries({ color: '#ffd54f', lineWidth: 1 });
    if (!ma25Series) ma25Series = chart.addLineSeries({ color: '#42a5f5', lineWidth: 1 });
    if (!ma99Series) ma99Series = chart.addLineSeries({ color: '#ab47bc', lineWidth: 1 });
    if ($('#ma7Toggle').is(':checked')) ma7Series.setData(seriesFrom(ind.ma7)); else ma7Series.setData([]);
    if ($('#ma25Toggle').is(':checked')) ma25Series.setData(seriesFrom(ind.ma25)); else ma25Series.setData([]);
    if ($('#ma99Toggle').is(':checked')) ma99Series.setData(seriesFrom(ind.ma99)); else ma99Series.setData([]);

    // RSI
    ensureRsiChart();
    if (rsiSeries && $('#rsiToggle').is(':checked')) {
      const rsiData = seriesFrom(ind.rsi);
      rsiSeries.setData(rsiData);
      // guides and bounds
      const times = bars.map(b => b.time);
      const mkConst = (val) => times.map(t => ({ time: t, value: val }));
      if (rsiGuides.upper) rsiGuides.upper.setData(mkConst(70));
      if (rsiGuides.mid)   rsiGuides.mid.setData(mkConst(50));
      if (rsiGuides.lower) rsiGuides.lower.setData(mkConst(30));
      if (rsiGuides.minBound) rsiGuides.minBound.setData(mkConst(0));
      if (rsiGuides.maxBound) rsiGuides.maxBound.setData(mkConst(100));
      // keep ranges aligned
      const range = chart.timeScale().getVisibleRange();
      if (range) rsiChart.timeScale().setVisibleRange(range);
    }
  }

  async function loadData() {
    try {
      const current = { 
        symbol: window.currentSymbol || 'SOLUSDT', 
        interval: $('#interval').val() || '1m', 
        limit: parseInt($('#limit').val(), 10) || 500 
      };
      const data = await $.getJSON('/api/klines', current);
      const bars = data.map(window.toBar);
      window.lastData = bars;
      drawSeries(bars);
      connectWs();
      if (window.refreshScalp) window.refreshScalp();
    } catch (e) {
      if (window.showError) {
        window.showError('Məlumat yüklənmədi');
      } else {
        console.error('Load data error:', e);
      }
    }
  }

  function connectWs() {
    if (ws) { ws.close(); ws = null; }
    const symbol = window.currentSymbol || 'SOLUSDT';
    const interval = $('#interval').val() || '1m';
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const url = `wss://stream.binance.com:9443/ws/${stream}`;
    ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const k = msg.k; // kline
        if (!k) return;
        const t = Math.floor(k.t / 1000);
        const bar = { time: t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v };
        // merge/update by time
        if (!window.lastData || window.lastData.length === 0 || bar.time > window.lastData[window.lastData.length - 1].time) {
          window.lastData = window.lastData || [];
          window.lastData.push(bar);
        } else {
          window.lastData[window.lastData.length - 1] = bar;
        }
        drawSeries(window.lastData);
      } catch {}
    };
    ws.onerror = () => {};
  }

  function setupAutoReload() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    const enabled = $('#aoutoReloadToggle').is(':checked');
    if (!enabled) return;
    const tf = $('#scalpTf').val() || '30s';
    const periodMs = window.tfToMs ? window.tfToMs(tf) : 60 * 1000;
    autoTimer = setInterval(() => {
      if (window.refreshScalp) window.refreshScalp();
      if (window.refreshAI) window.refreshAI();
    }, periodMs);
  }

  function bindHomeEvents() {
    $('#btnLoad').on('click', () => {
      const symbol = $('#symbol').val();
      const interval = $('#interval').val();
      const limit = Math.min(Math.max(parseInt($('#limit').val(), 10) || 500, 50), 1000);
      
      if (window.writePrefs) {
        window.writePrefs({ symbol, interval, limit });
      }
      
      // Update global variables
      window.currentSymbol = symbol;
      loadData();
    });
    
    $('#symbol, #interval').on('change', () => {
      if (window.writePrefs) {
        window.writePrefs({ symbol: $('#symbol').val(), interval: $('#interval').val() });
      }
      $('#btnLoad').click();
    });
    
    $('#rsiToggle, #rsiPeriod, #ma7Toggle, #ma7Period, #ma25Toggle, #ma25Period, #ma99Toggle, #ma99Period, #emaMode').on('change input', () => {
      if (window.writePrefs) {
        window.writePrefs({
          rsiToggle: $('#rsiToggle').is(':checked'),
          rsiPeriod: parseInt($('#rsiPeriod').val(), 10) || 14,
          ma7Toggle: $('#ma7Toggle').is(':checked'),
          ma7Period: parseInt($('#ma7Period').val(), 10) || 7,
          ma25Toggle: $('#ma25Toggle').is(':checked'),
          ma25Period: parseInt($('#ma25Period').val(), 10) || 25,
          ma99Toggle: $('#ma99Toggle').is(':checked'),
          ma99Period: parseInt($('#ma99Period').val(), 10) || 99,
          emaMode: $('#emaMode').is(':checked'),
        });
      }
      if (window.lastData && window.lastData.length) drawSeries(window.lastData);
    });
    
    $('#aoutoReloadToggle').on('change', () => { 
      if (window.writePrefs) {
        window.writePrefs({ autoReload: $('#aoutoReloadToggle').is(':checked') }); 
      }
      setupAutoReload(); 
    });
    
    window.addEventListener('resize', () => chart && chart.timeScale().fitContent());
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
  $(async function initHome() {
    // Only initialize if we're on a page with trading elements
    if ($('#tvchart').length === 0) {
      console.log('Trading elements not found, skipping home initialization');
      return;
    }
    
    // Setup charts
    createCharts();
    
    // Setup event listeners
    bindHomeEvents();
    
    // Setup scalp and AI analysis event listeners
    $('#btnScalpRefresh').on('click', () => refreshScalp());
    $('#btnAiAnalyze').on('click', () => refreshAI(true));
    $('#scalpTf').on('change', () => { 
      if (window.writePrefs) {
        window.writePrefs({ scalpTf: $('#scalpTf').val() });
      }
      refreshScalp(); 
      refreshAI(false); 
      setupAutoReload();
    });
    
    // Initial load
    const $btnLoad = $('#btnLoad');
    if ($btnLoad.length > 0) {
      $btnLoad.click();
    }
    
    // Initial AI analysis
    refreshAI(true);
    setupAutoReload();

    // Make functions globally available
    window.refreshScalp = refreshScalp;
    window.refreshAI = refreshAI;
  });

})();
