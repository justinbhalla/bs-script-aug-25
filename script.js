/* --------- bataSutra app (hardened) ---------- */
(() => {
  console.info("[bataSutra] app.js loading…");

  // ====== CONFIG ======
  const SHEET_ID = '1WN8151jGQjqbfO0Aj2tK-79yJ9gCD_z0DLCdxs_higg';

  // ====== DEMO FALLBACKS (used if Sheets fail) ======
  const DEMO = {
    headlinesTop: [
      "Infosys & Airtel firm; HDFC Bank soft",
      "Reliance modestly green; autos mixed",
      "IT steady; VIX subdued"
    ],
    headlinesBottom: [
      "PSUs mixed; energy heavyweights stable",
      "Broader market outperforms; mid/small +0.8%"
    ],
    indices: [
      { Name:"Nifty 50", Value:"24,980", ChangePct:"0.42", Spark:"24810,24855,24900,24960,24930,24980" },
      { Name:"Sensex",  Value:"81,644", ChangePct:"0.46", Spark:"81400,81450,81600,81680,81620,81644" },
      { Name:"Bank Nifty", Value:"51,900", ChangePct:"0.30", Spark:"51700,51760,51820,51920,51860,51900" },
      { Name:"Nifty IT", Value:"43,300", ChangePct:"0.55", Spark:"43100,43180,43240,43340,43290,43300" }
    ],
    heatmap: [
      { Label:"RELI", ChangePct:"0.6" }, { Label:"HDFB", ChangePct:"-0.4" },
      { Label:"INFY", ChangePct:"0.7" }, { Label:"TCS",  ChangePct:"0.3" },
      { Label:"SBIN", ChangePct:"-0.2" },{ Label:"ITC",  ChangePct:"0.1" }
    ],
    commodities: [
      { Name:"WTI Crude ($)", Last:"61.90", Change:"-0.40", Pct:"-0.64" },
      { Name:"Brent ($)",     Last:"65.10", Change:"-0.35", Pct:"-0.53" },
      { Name:"Gold ($/oz)",   Last:"3387.00", Change:"5.00", Pct:"0.15" }
    ]
  };

  // ====== LOCAL ARTICLES ======
  const ARTICLES = [
    {
      href: "ia-ra-deposit-liquid-overnight-mf-how-to.html",
      title: "IA/RA Compliance Hack — Deposits via Liquid/Overnight MFs: Cashflow Relief, Risks & How-To",
      blurb: "SEBI lets RA/IA deposits sit in liquid/overnight MFs—cashflow relief, risks, and a practical how-to."
    },
    {
      href: "t0-optional-margin-pledge-extension-retail-two-speed.html",
      title: "T+0 (Optional) & Pledge Extension: Two-Speed Retail Should Navigate",
      blurb: "Same-day pledge/withdrawal basics, collateral haircuts, broker ops, and how funding costs shift for small investors."
    }
  ];

  // ====== UTILITIES ======
  const $ = (id) => document.getElementById(id);

  const csvUrl = (sheet, range) =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}&t=${Date.now()}`;

  function parseCsv(text){
    const rows=[]; let row=[], cur='', inQuotes=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(inQuotes){
        if(ch === '"'){ if(text[i+1] === '"'){ cur+='"'; i++; } else { inQuotes=false; } }
        else cur+=ch;
      } else {
        if(ch === '"'){ inQuotes=true; }
        else if(ch === ','){ row.push(cur); cur=''; }
        else if(ch === '\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
        else if(ch !== '\r'){ cur+=ch; }
      }
    }
    if(cur.length>0 || row.length>0){ row.push(cur); rows.push(row); }
    return rows;
  }

  const normKey = (k) => String(k||'').replace(/^\uFEFF/,'').replace(/\u00A0/g,' ').trim().replace(/\s+/g,' ').toLowerCase();

  function pickField(row, candidates){
    const map = new Map();
    Object.keys(row).forEach(k => map.set(normKey(k), row[k]));
    for (const c of candidates){
      const v = map.get(normKey(c));
      if (v != null && String(v).trim() !== '') return v;
    }
    const want = normKey(candidates[0]||'');
    for (const [k,v] of map){ if (k.includes(want) && String(v).trim() !== '') return v; }
    return undefined;
  }

  async function fetchSheetObjects(sheet, range){
    try{
      const res = await fetch(csvUrl(sheet, range), { cache: "no-store" });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      if (txt.trim().startsWith('<')) { // sharing misconfigured
        console.warn(`[Sheets] ${sheet}: Received HTML (likely private). Using fallback.`);
        return null;
      }
      const rows = parseCsv(txt);
      if(!rows.length) return [];
      const headers = rows[0].map(h => h.replace(/^\uFEFF/,'').replace(/\u00A0/g,' ').trim());
      return rows.slice(1)
        .filter(r => r.some(x => (x??'').toString().trim()!==''))
        .map(r => Object.fromEntries(headers.map((h,i)=>[h, (r[i]??'').toString().trim()])));
    }catch(err){
      console.error(`[Sheets] ${sheet} failed:`, err);
      return null;
    }
  }

  const toNumLoose = (x) => {
    if (x == null) return NaN;
    const s = String(x).trim();
    if (!s) return NaN;
    const cleaned = s.replace(/[,%\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const fmtNum=(n,d=2)=> (n==null||n===''||!Number.isFinite(Number(n))) ? "—" : Number(n).toLocaleString('en-IN',{maximumFractionDigits:d,minimumFractionDigits:d});
  const fmtPct=p=>{
    const num = Number(p);
    if (!Number.isFinite(num)) return "—";
    const sign = num>=0 ? "+" : "";
    return sign + num.toFixed(2) + "%";
  };

  function badge(el,val){
    const num = Number(val);
    if (!el) return;
    if (!Number.isFinite(num)) {
      el.textContent = "—";
      el.style.background = 'rgba(107,114,128,.12)';
      el.style.color = '#374151';
      return;
    }
    el.textContent = fmtPct(num);
    el.style.background = num>=0?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)';
    el.style.color = num>=0?'#16a34a':'#dc2626';
  }

  function heatColor(pct){
    const v = Number(pct);
    if(!Number.isFinite(v)) return '#f4f4f5';
    const c=Math.max(-3,Math.min(3,v));
    const t=(c+3)/6;
    const r=Math.round(251*(1-t)+230*t), g=Math.round(234*(1-t)+246*t), b=Math.round(234*(1-t)+230*t);
    return `rgb(${r},${g},${b})`;
  }

  function sparkPath(values){
    if(!values||!values.length) return '';
    const nums = values.map(v=>toNumLoose(v)).filter(v=>Number.isFinite(v));
    if(!nums.length) return '';
    const w=100,h=30,pad=2,min=Math.min(...nums),max=Math.max(...nums),span=(max-min)||1;
    return nums.map((v,i)=>{
      const x=(i/(nums.length-1))*w;
      const y=h-pad-((v-min)/span)*(h-2*pad);
      return (i?' L':'M')+x.toFixed(2)+','+y.toFixed(2);
    }).join('');
  }

  // ====== RENDERERS ======
  function renderTicker(id, items, dir='right'){
    const el = $(id);
    if (!el) return;
    el.className = (dir==='right'?'ticker-right':'ticker-left') + " text-sm font-medium space-x-10";
    el.innerHTML = '';
    const loop = [...items, ...items];
    loop.forEach(t => {
      const s=document.createElement('span');
      s.textContent=t;
      el.appendChild(s);
    });
  }

  function renderIndices(indices){
    const grid = $('indicesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    indices.forEach((x, idx)=>{
      const name = pickField(x, ['Name']);
      const value = toNumLoose(pickField(x, ['Value']));
      const chg   = toNumLoose(pickField(x, ['ChangePct']));

      let sparkVals = [];
      const sparkRaw = pickField(x, ['Spark']);
      if (sparkRaw) sparkVals = String(sparkRaw).split(',').map(s=>s.trim());
      else {
        const keys = Object.keys(x).filter(k => /^s\d+$/i.test(normKey(k)))
          .sort((a,b)=>Number(normKey(a).slice(1))-Number(normKey(b).slice(1)));
        sparkVals = keys.map(k => x[k]).filter(Boolean);
      }

      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="card">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600">${name || '—'}</p>
            <span id="chg-${idx}" class="text-xs font-semibold px-2 py-0.5 rounded">—</span>
          </div>
          <p class="text-2xl font-bold mt-1">${fmtNum(value,2)}</p>
          <svg class="spark w-full h-12 mt-2" viewBox="0 0 100 30" preserveAspectRatio="none">
            <path id="spark-${idx}" d=""/>
          </svg>
        </div>`;
      grid.appendChild(wrap.firstElementChild);

      badge($(`chg-${idx}`), chg);
      const p = $(`spark-${idx}`);
      if (p){ p.setAttribute('d', sparkPath(sparkVals)); p.setAttribute('stroke', (Number.isFinite(chg) && chg>=0)?'#16a34a':'#dc2626'); }
    });
  }

  function renderHeatmap(rows){
    const grid = $('heatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';
    rows.forEach(t=>{
      const label = pickField(t, ['Label']);
      const pct = toNumLoose(pickField(t, ['ChangePct']));
      const a = document.createElement('div');
      a.className = 'heat-tile';
      a.style.background = heatColor(pct);
      const color = (Number.isFinite(pct) && pct>=0)?'#16a34a':'#dc2626';
      a.innerHTML = `${label || '—'}<br><span class="text-xs text-gray-700 font-normal" style="color:${Number.isFinite(pct)?color:'#6b7280'}">${fmtPct(pct)}</span>`;
      grid.appendChild(a);
    });
  }

  function renderCommodities(rows){
    const tbody = $('commoditiesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    rows.forEach((row, i) => {
      const name = pickField(row, ['Name','Instrument','Commodity','Label']) || `Item ${i+1}`;
      const last = toNumLoose(pickField(row, ['Last','Price','Close','Value']));
      const chg  = toNumLoose(pickField(row, ['Change','Chg']));
      const pct  = toNumLoose(pickField(row, ['Pct','PctChg','%Chg','Percent','Change%']));
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-4 py-3">${name}</td>
        <td class="px-4 py-3 text-right">${fmtNum(last,2)}</td>
        <td class="px-4 py-3 text-right ${Number.isFinite(chg) && chg>=0?'text-green-600':'text-red-600'}">${(Number.isFinite(chg)&&chg>=0?'+':'') + fmtNum(chg,2)}</td>
        <td class="px-4 py-3 text-right ${Number.isFinite(pct) && pct>=0?'text-green-600':'text-red-600'}">${fmtPct(pct)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderArticles(rows){
    const box = $('articlesList');
    if (!box) return;
    box.innerHTML = '';
    rows.forEach(a=>{
      const href  = a.href  || a.Href;
      const title = a.title || a.Title;
      const blurb = a.blurb || a.Blurb;
      const el = document.createElement('a');
      el.href = href;
      el.className = 'block border rounded-xl p-5 shadow-sm hover:shadow-md transition space-y-1';
      el.innerHTML = `<h3 class="text-lg font-semibold">${title}</h3><p class="text-sm text-gray-600">${blurb}</p>`;
      box.appendChild(el);
    });
  }

  // ====== SUBSCRIBE HANDLER ======
  const scriptURL = "https://script.google.com/macros/s/AKfycbwT4FQr2Qb91fiqEgeUQMdnD5dDACtWyFnktA5MUp8sHHVebvFIOq4k3yMGKqJmlPJ_MA/exec";
  function subscribeUser(e){
    e.preventDefault();
    const input = $('emailInput');
    const message=$('subscribeMessage');
    const error=$('errorMessage');
    if(!input) return;
    const email=input.value;
    const formData=new FormData(); formData.append("email",email);
    fetch(scriptURL,{method:"POST",body:formData})
      .then(r=>r.text())
      .then(t=>{
        const ok = (t||'').toLowerCase();
        if(message && error){
          if(ok.includes('success')){ message.textContent = "✅ Subscribed successfully!"; message.classList.remove('hidden'); error.classList.add('hidden'); }
          else if(ok.includes('already')){ message.textContent="⚠️ You're already subscribed."; message.classList.remove('hidden'); error.classList.add('hidden'); }
          else throw new Error(t);
        }
        const form = e.target; if (form && form.reset) form.reset();
      })
      .catch(()=>{ if($('errorMessage')){ $('errorMessage').classList.remove('hidden'); } if($('subscribeMessage')){ $('subscribeMessage').classList.add('hidden'); } });
  }
  // keep available for inline onsubmit
  window.subscribeUser = subscribeUser;

  // ====== SHEETS HYDRATION ======
  async function hydrateFromSheets(){
    console.info("[bataSutra] Hydrating from Sheets…");
    // Headlines
    const headlines = await fetchSheetObjects('Headlines','A:B');
    if (headlines === null){
      renderTicker('topTicker', DEMO.headlinesTop, 'right');
      renderTicker('bottomTicker', DEMO.headlinesBottom, 'left');
    } else {
      const top    = (headlines||[]).filter(h=>/^top$/i.test((h.Section||'').toString())).map(h=>h.Text);
      const bottom = (headlines||[]).filter(h=>/^bottom$/i.test((h.Section||'').toString())).map(h=>h.Text);
      renderTicker('topTicker', top.length?top:DEMO.headlinesTop, 'right');
      renderTicker('bottomTicker', bottom.length?bottom:DEMO.headlinesBottom, 'left');
    }

    // Indices
    const indices = await fetchSheetObjects('Indices','A:Z');
    renderIndices(indices===null || indices.length===0 ? DEMO.indices : indices);

    // Heatmap
    const heat = await fetchSheetObjects('Heatmap','A:B');
    renderHeatmap(heat===null || heat.length===0 ? DEMO.heatmap : heat);

    // Commodities
    const comm = await fetchSheetObjects('Commodities','A1:D');
    renderCommodities(comm===null || comm.length===0 ? DEMO.commodities : comm);

    console.info("[bataSutra] Hydration done.");
  }

  // ====== INIT AFTER DOM READY ======
  window.addEventListener('DOMContentLoaded', () => {
    console.info("[bataSutra] DOM ready.");
    const yearEl = $('year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Smooth reveal + spark default stroke
    document.querySelectorAll('.reveal').forEach(el=>el.classList.add('show'));
    document.querySelectorAll('.spark path').forEach(p=>p.setAttribute('stroke','#4b5563'));

    // Articles
    renderArticles(ARTICLES);

    // If inline onsubmit isn't used, also wire up here
    const form = document.querySelector('form[onsubmit*="subscribeUser"]') || document.querySelector('form');
    if (form && !form.__wired){
      form.addEventListener('submit', subscribeUser);
      form.__wired = true;
    }

    // Warn if running from file:// which can trip CORS on some setups
    if (location.protocol === 'file:') {
      console.warn("You are opening via file:// — use a local server if Sheets requests fail.");
    }

    // Hydrate & auto-refresh
    hydrateFromSheets().catch(console.error);
    setInterval(()=>hydrateFromSheets().catch(console.error), 5 * 60 * 1000);
  });
})();
