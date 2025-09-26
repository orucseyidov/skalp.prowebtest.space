(() => {
  const intervals = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
  let chart, candleSeries, volumeSeries, rsiChart, rsiSeries;
  let rsiGuides = { upper: null, mid: null, lower: null, minBound: null, maxBound: null };
  let ma7Series, ma25Series, ma99Series;
  let ws;
  let current = { symbol: 'SOLUSDT', interval: '1m', limit: 500 };
  let lastData = [];
  let indicatorCache = { ema: {}, sma: {}, rsi: {} };
  let autoTimer = null;
  let scalpLoadingCount = 0;
  const PREFS_KEY = 'scalp_prefs_v1';

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
  }
  function writePrefs(partial) {
    const cur = readPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...cur, ...partial }));
  }
  function applyPrefsToUI() {
    const p = readPrefs();
    if (p.symbol) $('#symbol').val(p.symbol);
    if (p.interval) $('#interval').val(p.interval);
    if (p.limit != null) $('#limit').val(p.limit);
    if (p.scalpTf) $('#scalpTf').val(p.scalpTf);
    if (p.autoReload != null) $('#aoutoReloadToggle').prop('checked', !!p.autoReload);
    if (p.rsiToggle != null) $('#rsiToggle').prop('checked', !!p.rsiToggle);
    if (p.rsiPeriod != null) $('#rsiPeriod').val(p.rsiPeriod);
    if (p.ma7Toggle != null) $('#ma7Toggle').prop('checked', !!p.ma7Toggle);
    if (p.ma7Period != null) $('#ma7Period').val(p.ma7Period);
    if (p.ma25Toggle != null) $('#ma25Toggle').prop('checked', !!p.ma25Toggle);
    if (p.ma25Period != null) $('#ma25Period').val(p.ma25Period);
    if (p.ma99Toggle != null) $('#ma99Toggle').prop('checked', !!p.ma99Toggle);
    if (p.ma99Period != null) $('#ma99Period').val(p.ma99Period);
    if (p.emaMode != null) $('#emaMode').prop('checked', !!p.emaMode);
  }

  function showError(msg) {
    $('#toastMsg').text(msg);
    const toast = new bootstrap.Toast($('#appToast')[0]);
    toast.show();
  }

  function setupIntervals() {
    const $int = $('#interval');
    $int.empty();
    for (const it of intervals) {
      $int.append(`<option value="${it}">${it}</option>`);
    }
    $int.val('1m');
  }

  async function loadSymbols() {
    try {
      const list = await $.getJSON('/api/symbols');
      const $sel = $('#symbol');
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
      showError('Simvollar yüklənmədi');
    }
  }

  function createCharts() {
    const container = document.getElementById('tvchart');
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
    // RSI separate chart created in its own container
  }

  function ensureRsiChart() {
    if ($('#rsiToggle').is(':checked')) {
      if (!rsiChart) {
        const rsiContainer = document.getElementById('rsichart');
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

  function computeIndicators(bars) {
    const closes = bars.map(b => b.close);
    const vol = bars.map(b => b.volume);
    const rsiP = parseInt($('#rsiPeriod').val(), 10) || 14;
    const ma7P = parseInt($('#ma7Period').val(), 10) || 7;
    const ma25P = parseInt($('#ma25Period').val(), 10) || 25;
    const ma99P = parseInt($('#ma99Period').val(), 10) || 99;
    const useEma = $('#emaMode').is(':checked');
    const maFn = useEma ? ema : sma;
    return {
      rsi: rsi(bars.map(b=>b.close), rsiP),
      ma7: maFn(closes, ma7P),
      ma25: maFn(closes, ma25P),
      ma99: maFn(closes, ma99P),
      volSma20: sma(vol, 20),
    };
  }

  function drawSeries(bars) {
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
      const data = await $.getJSON('/api/klines', current);
      const bars = data.map(toBar);
      lastData = bars;
      drawSeries(bars);
      connectWs();
      refreshScalp();
    } catch (e) {
      showError('Məlumat yüklənmədi');
    }
  }

  function connectWs() {
    if (ws) { ws.close(); ws = null; }
    const stream = `${current.symbol.toLowerCase()}@kline_${current.interval}`;
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
        if (lastData.length === 0 || bar.time > lastData[lastData.length - 1].time) {
          lastData.push(bar);
        } else {
          lastData[lastData.length - 1] = bar;
        }
        drawSeries(lastData);
      } catch {}
    };
    ws.onerror = () => {};
  }

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
      const resp = await $.getJSON('/api/scalp30s', { symbol: current.symbol, tf });
      $('#scalpMode').text(resp.mode);
      $('#scalpTrend').text(resp.trend);
      $('#scalpSignal').text(resp.signal);
      if (resp.suggestion) {
        const s = resp.suggestion;
        const planHtml = renderPlan(s.side, s.entry);
        $('#scalpSuggestion').html(planHtml + `<div class="small text-secondary">Risk/Mükafat nisbəti: ${s.rr}. Müddət: təxminən 30s.</div>`);
      } else {
        const last = lastData.length ? lastData[lastData.length - 1].close : null;
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
      const last = lastData.length ? lastData[lastData.length - 1].close : null;
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
      const ai = await $.getJSON('/api/deepseek', { symbol: current.symbol, tf });
      const stats = ai.stats || {};
      const lines = Object.entries(stats).map(([s, st]) => `${s}: ${st.lastClose != null ? st.lastClose.toFixed(6) : '-'} (${st.changePct != null ? (st.changePct>=0?'+':'')+st.changePct.toFixed(2)+'%' : '-'})`);
      if (lines.length) {
        $('#scalpContext').html(`<div class="small text-secondary">Nəzərə alınan simvollar:</div><pre class="mb-0">${lines.join('\n')}</pre>`);
      } else {
        $('#scalpContext').empty();
      }
    } catch { $('#scalpContext').empty(); }
  }

  async function refreshAI(showLoadingText = false) {
    try {
      $('#aiLoading').removeClass('d-none');
      const tf = $('#scalpTf').val() || '30s';
      const symbol = current.symbol;
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

  function setupAutoReload() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    const enabled = $('#aoutoReloadToggle').is(':checked');
    if (!enabled) return;
    const tf = $('#scalpTf').val() || '30s';
    const periodMs = tfToMs(tf);
    autoTimer = setInterval(() => {
      refreshScalp();
      refreshAI();
    }, periodMs);
  }

  function bindEvents() {
    $('#btnLoad').on('click', () => {
      current.symbol = $('#symbol').val();
      current.interval = $('#interval').val();
      current.limit = Math.min(Math.max(parseInt($('#limit').val(), 10) || 500, 50), 1000);
      writePrefs({ symbol: current.symbol, interval: current.interval, limit: current.limit });
      loadData();
    });
    $('#symbol, #interval').on('change', () => {
      writePrefs({ symbol: $('#symbol').val(), interval: $('#interval').val() });
      $('#btnLoad').click();
    });
    $('#rsiToggle, #rsiPeriod, #ma7Toggle, #ma7Period, #ma25Toggle, #ma25Period, #ma99Toggle, #ma99Period, #emaMode').on('change input', () => {
      writePrefs({
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
      if (lastData.length) drawSeries(lastData);
    });
    $('#btnScalpRefresh').on('click', () => refreshScalp());
    $('#scalpTf').on('change', () => { writePrefs({ scalpTf: $('#scalpTf').val() }); refreshScalp(); refreshAI(false); setupAutoReload(); });
    $('#aoutoReloadToggle').on('change', () => { writePrefs({ autoReload: $('#aoutoReloadToggle').is(':checked') }); setupAutoReload(); });
    $('#btnAiAnalyze').on('click', () => refreshAI(true));
    window.addEventListener('resize', () => chart && chart.timeScale().fitContent());
    // init tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((el) => { new bootstrap.Tooltip(el); });
  }

  $(async function init() {
    setupIntervals();
    await loadSymbols();
    applyPrefsToUI();
    createCharts();
    bindEvents();
    $('#btnLoad').click();
    // initial AI analysis with loading text
    refreshAI(true);
    setupAutoReload();
  });
})();


