// Spike A (throwaway): render the 100 m grid with pan, zoom, land colouring and overlays.
// M1b adds the 1979 Landsat scene, the coastline change since 1979 and the 1979 site register flags.
// M1c adds the KH-9 1980-09-11 mosaic, the Landsat 1984-11-22 scene and the 1979->1984 change map.
interface Named { id: number; name: string; en: string; label: [number, number] }
interface Meta {
  cell_m: number; width: number; height: number;
  districts: (Named & { land_km2: number })[]; subdistricts: Named[];
}

/** The slice areas compiled from content/slice/areas.yaml by pipeline/m1_areas.py (phase1-slice.md §3, §5.1). */
interface AreaRec { id: number; key: string; name: { zh: string; en: string }; access: 'playable' | 'card_only';
  runs: [number, number, number][] }
async function loadAreas(W: number, H: number) {
  const res = await fetch('/grid/areas.json');
  if (!res.ok) return null;
  const d: { grid: { width: number; height: number }; areas: AreaRec[] } = await res.json();
  if (d.grid.width !== W || d.grid.height !== H) return null;
  const cell = new Uint8Array(W * H);
  const label: [number, number][] = [];
  for (const a of d.areas) {
    let sx = 0, sy = 0, n = 0;
    for (const [y, x0, x1] of a.runs) {
      cell.fill(a.id, y * W + x0, y * W + x1 + 1);
      sx += ((x0 + x1) / 2) * (x1 - x0 + 1); sy += y * (x1 - x0 + 1); n += x1 - x0 + 1;
    }
    label.push([sx / n, sy / n]);
  }
  return { areas: d.areas, cell, label };
}
type Areas = NonNullable<Awaited<ReturnType<typeof loadAreas>>>;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('map');
const ctx = canvas.getContext('2d')!;

async function load() {
  const meta: Meta = await (await fetch('/grid/meta.json')).json();
  const buf = await (await fetch('/grid/grid.bin')).arrayBuffer();
  const n = meta.width * meta.height;
  return {
    meta,
    elev: new Int16Array(buf, 0, n),
    water: new Uint8Array(buf, 2 * n, n),
    dist: new Uint8Array(buf, 3 * n, n),
    sub: new Uint16Array(buf, 4 * n, n),
  };
}
type Grid = Awaited<ReturnType<typeof load>>;

interface SiteClaim { id: string; use: string; status: string; summary?: string; source?: string }
interface Site {
  id: string; name: { zh: string; en: string }; kind: string; area: number; in_start_state: string;
  research?: string[]; placeholder: boolean; evidence_status: string; claims: SiteClaim[];
  geometry: { kind: string; confidence?: number }; cell: [number, number] | null;
  landsat_check: { water_1979: string; change: string } | null;
}
const STATUS_COLOR: Record<string, string> = { lead: '#d9473a', disputed: '#d9473a', sourced: '#e0a63a', verified: '#4caf6a' };

/** 1984 reported buildings: a calibration checklist, not a site register (data/calibration/buildings_1984.yaml). */
interface B1984 {
  id: string; name: { zh: string; en: string }; kind: string; area?: number;
  status_1984: 'built' | 'under_construction' | 'planned';
  by_1984?: { date?: string; note?: string };
  later?: { state?: string; note?: string };
  cell: [number, number] | null; flags: string[]; claims: string[];
}
const B84_COLOR: Record<string, string> = { built: '#4caf6a', under_construction: '#e0a63a', planned: '#8fa3b3' };
async function loadB1984(): Promise<B1984[]> {
  const res = await fetch('/grid/buildings_1984.json');
  if (!res.ok) return [];
  const d: { buildings: B1984[] } = await res.json();
  return d.buildings;
}

interface M1982 {
  id: string; name: { zh: string; en: string };
  category: 'building' | 'village' | 'hill' | 'hydro'; kind: string;
  cell: [number, number] | null; landcover_1979?: string;
}
const M82_COLOR: Record<string, string> = { building: '#56c2d6', village: '#e8b84b', hill: '#b08968', hydro: '#4a90e2' };
async function loadM1982(): Promise<M1982[]> {
  const res = await fetch('/grid/map_1982_labels.json');
  if (!res.ok) return [];
  const d: { labels: M1982[] } = await res.json();
  return d.labels;
}

/** Optional M1b layers: a missing file disables its toggle. */
async function load1979(n: number) {
  const img = new Image();
  const landsat = await new Promise<HTMLImageElement | null>((ok) => {
    img.onload = () => ok(img); img.onerror = () => ok(null); img.src = '/grid/landsat1979.png';
  });
  const res = await fetch('/grid/coast_change.bin');
  const change = res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  const sres = await fetch('/grid/sites.json');
  const sites: Site[] = sres.ok ? (await sres.json()).sites : [];
  return { landsat, change: change && change.length === n ? change : null, sites };
}

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((ok) => {
  const img = new Image(); img.onload = () => ok(img); img.onerror = () => ok(null); img.src = src;
});

/** Optional M1c layers (pipeline/m1c_*.py): KH-9 1980-09-11 mosaic, Landsat 1984-11-22, change 1979->1984. */
async function loadM1c(n: number) {
  const kres = await fetch('/grid/kh9_1980.json');
  const kmeta: { slice: { cell_box: [number, number, number, number] } } | null = kres.ok ? await kres.json() : null;
  const [kh9, kh9slice, landsat84] = await Promise.all([
    kmeta ? loadImage('/grid/kh9_1980.png') : null, kmeta ? loadImage('/grid/kh9_1980_slice.png') : null,
    loadImage('/grid/landsat1984.png')]);
  const cres = await fetch('/grid/change_79_84.bin');
  const change = cres.ok ? new Uint8Array(await cres.arrayBuffer()) : null;
  return { kh9, kh9slice, box: kmeta?.slice.cell_box ?? null, landsat84, change: change && change.length === n ? change : null };
}
const CHANGE_7984: Record<number, [string, [number, number, number, number]]> = {
  0: ['no data or excluded (hill, shadow)', [0, 0, 0, 0]], 1: ['stable land', [0, 0, 0, 0]],
  2: ['greener', [92, 170, 84, 150]], 3: ['cleared or built (lead)', [232, 74, 60, 220]],
  4: ['water then, land later (level change or fill)', [240, 160, 46, 220]],
  5: ['land then, water later (ponds, level change)', [63, 170, 230, 220]],
  6: ['water both dates', [40, 80, 140, 90]],
};

function buildChange(W: number, H: number, change: Uint8Array,
  colors: Record<number, [number, number, number]> = { 1: [240, 140, 46], 2: [170, 110, 220], 3: [63, 199, 214] },
  alpha = 210): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const img = off.getContext('2d')!.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const c = colors[change[i]!];
    if (c) img.data.set([...c, alpha], i * 4);
  }
  off.getContext('2d')!.putImageData(img, 0, 0);
  return off;
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ESC[c]!);
function showSite(s: Site | null) {
  const el = $('site');
  if (!s) { el.style.display = 'none'; return; }
  const claims = s.claims.map((c) => `<div class="claim" style="border-color:${STATUS_COLOR[c.status] ?? '#555'}">
      <b>${esc(c.status)}</b> · ${esc(c.use)} · <code>${esc(c.id)}</code><br>${esc(c.summary ?? '')}
      ${c.source ? `<div class="muted">source: ${esc(c.source)}</div>` : ''}</div>`).join('');
  const lc = s.landsat_check;
  el.innerHTML = `<button id="siteclose" title="Close">✕</button>
    <h3>${esc(s.name.zh)} ${esc(s.name.en)}</h3>
    <div class="muted">${esc(s.kind)} · slice area ${s.area || '–'} · enters the start state as ${esc(s.in_start_state)}${s.placeholder ? ' (placeholder)' : ''}</div>
    <div style="margin-top:6px">Flag: <b style="color:${STATUS_COLOR[s.evidence_status]}">${esc(s.evidence_status)}</b></div>
    <div class="muted">${s.cell ? `Proxy point, cell ${s.cell.join(',')}, confidence ${s.geometry.confidence ?? '?'}` : 'Not placed yet'}</div>
    ${lc ? `<div class="muted">Landsat 1979 at this cell: ${esc(lc.water_1979)}, ${esc(lc.change)}</div>` : ''}
    ${claims}
    <div class="muted">Still to research: ${esc((s.research ?? []).join('; '))}</div>`;
  el.style.display = 'block';
  $('siteclose').onclick = () => showSite(null);
}

function hypso(e: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [150, 176, 120]], [20, [176, 190, 128]], [80, [190, 180, 130]],
    [250, [160, 140, 100]], [500, [130, 110, 85]], [950, [220, 215, 205]],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [e1, c1] = stops[i]!; const [e0, c0] = stops[i - 1]!;
    if (e <= e1) {
      const t = Math.max(0, (e - e0) / (e1 - e0));
      return [0, 1, 2].map((k) => c0[k]! + (c1[k]! - c0[k]!) * t) as [number, number, number];
    }
  }
  return stops[stops.length - 1]![1];
}

function buildBase(g: Grid, opts: { hill: boolean; dist: boolean; sub: boolean; slice: boolean },
  sa: Areas | null): HTMLCanvasElement {
  const { width: W, height: H } = g.meta;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const img = off.getContext('2d')!.createImageData(W, H);
  const px = img.data;
  const cardOnly = new Set(sa?.areas.filter((a) => a.access === 'card_only').map((a) => a.id) ?? []);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let r: number, gg: number, b: number;
      const inside = g.dist[i]! > 0;
      if (g.water[i]) {
        [r, gg, b] = inside ? [58, 98, 128] : [44, 78, 104];
      } else {
        [r, gg, b] = hypso(g.elev[i]!);
        if (opts.hill) {
          // simple hillshade from the NW, 100 m cells
          const ex = g.elev[i + (x < W - 1 ? 1 : 0)]! - g.elev[i - (x > 0 ? 1 : 0)]!;
          const ey = g.elev[i + (y < H - 1 ? W : 0)]! - g.elev[i - (y > 0 ? W : 0)]!;
          const shade = Math.max(0.55, Math.min(1.35, 1 + (-ex - ey) / 160));
          r *= shade; gg *= shade; b *= shade;
        }
        if (!inside) { const m = (r + gg + b) / 3; r = m * 0.75; gg = m * 0.75; b = m * 0.78; } // Hong Kong, Dongguan, Huizhou
      }
      const area = sa ? sa.cell[i]! : 0;
      if (opts.slice && sa && inside && !g.water[i]) {
        if (!area) { r *= 0.5; gg *= 0.5; b *= 0.5; }                       // locked
        else if (cardOnly.has(area)) { r = r * 0.6 + 90; gg = gg * 0.6 + 60; b = b * 0.6 + 20; }  // card only
      }
      const edge = (a: ArrayLike<number>) =>
        x < W - 1 && y < H - 1 && (a[i] !== a[i + 1] || a[i] !== a[i + W]) && (a[i]! > 0 || a[i + 1]! > 0 || a[i + W]! > 0);
      if (opts.slice && sa && edge(sa.cell)) { r = 255; gg = 236; b = 120; }
      if (opts.sub && edge(g.sub)) { r = 250; gg = 240; b = 215; }
      if (opts.dist && edge(g.dist)) { r = 196; gg = 60; b = 48; }
      px[i * 4] = r; px[i * 4 + 1] = gg; px[i * 4 + 2] = b; px[i * 4 + 3] = 255;
    }
  }
  off.getContext('2d')!.putImageData(img, 0, 0);
  return off;
}

async function main() {
  const g = await load();
  const { meta } = g;
  const opts = { hill: true, dist: true, sub: false, slice: false };
  const sa = await loadAreas(meta.width, meta.height);
  if (!sa) { $<HTMLInputElement>('slice').disabled = true; }
  let base = buildBase(g, opts, sa);
  const y79 = await load1979(meta.width * meta.height);
  const b84 = await loadB1984();
  const m82 = await loadM1982();
  const changeLayer = y79.change ? buildChange(meta.width, meta.height, y79.change) : null;
  const m1c = await loadM1c(meta.width * meta.height);
  const change7984 = m1c.change ? (() => {
    const off = document.createElement('canvas'); off.width = meta.width; off.height = meta.height;
    const img = off.getContext('2d')!.createImageData(meta.width, meta.height);
    for (let i = 0; i < m1c.change!.length; i++) img.data.set(CHANGE_7984[m1c.change![i]!]![1], i * 4);
    off.getContext('2d')!.putImageData(img, 0, 0);
    return off;
  })() : null;
  const LAYER_KEYS = ['landsat', 'coast', 'sites', 'm82', 'b84', 'kh9', 'landsat84', 'change84'] as const;
  const layers = { landsat: false, coast: false, sites: true, m82: false, b84: true, kh9: false, landsat84: false, change84: false };
  const present = { landsat: !!y79.landsat, coast: !!changeLayer, sites: y79.sites.length > 0,
    m82: m82.length > 0, b84: b84.length > 0,
    kh9: !!m1c.kh9, landsat84: !!m1c.landsat84, change84: !!change7984 };
  for (const key of LAYER_KEYS) {
    if (!present[key]) { $<HTMLInputElement>(key).disabled = true; $<HTMLInputElement>(key).checked = false; layers[key] = false; }
  }
  const unplaced = y79.sites.filter((s) => !s.cell);
  $('unplaced').textContent = unplaced.length
    ? `${y79.sites.length - unplaced.length} placed, ${unplaced.length} not placed yet: ${unplaced.map((s) => s.name.zh).join('、')}` : '';
  const b84unplaced = b84.filter((b) => !b.cell);
  $('m82count').textContent = m82.length ? `(${m82.length} labels, ±201 m RMS)` : '';
  $('b84count').textContent = `(${b84.length} reported, ${b84.length - b84unplaced.length} placed)`;
  $('b84unplaced').textContent = b84unplaced.length
    ? `${b84.length - b84unplaced.length} placed, ${b84unplaced.length} not placed: ${b84unplaced.map((b) => b.name.zh).join('、')}` : '';
  let selected: string | null = null;
  const view = { scale: 1, ox: 0, oy: 0 };

  const resize = () => {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
  };
  const fit = () => {
    view.scale = Math.min(canvas.width / meta.width, canvas.height / meta.height) * 0.95;
    view.ox = (canvas.width - meta.width * view.scale) / 2;
    view.oy = (canvas.height - meta.height * view.scale) / 2;
  };
  resize(); fit();

  let frames = 0, worst = 0, last = performance.now();
  const draw = () => {
    const t0 = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1a24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = view.scale < 1;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.drawImage(base, 0, 0);
    if (layers.landsat && y79.landsat) ctx.drawImage(y79.landsat, 0, 0, meta.width, meta.height);
    if (layers.landsat84 && m1c.landsat84) ctx.drawImage(m1c.landsat84, 0, 0, meta.width, meta.height);
    if (layers.kh9 && m1c.kh9) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(m1c.kh9, 0, 0, meta.width, meta.height);
      const b = m1c.box;  // the 6.25 m crop over the playable areas, once zoomed in past 25 m per screen pixel
      if (b && m1c.kh9slice && view.scale > 4) ctx.drawImage(m1c.kh9slice, b[0], b[1], b[2] - b[0], b[3] - b[1]);
      ctx.imageSmoothingEnabled = view.scale < 1;
    }
    if (layers.coast && changeLayer) ctx.drawImage(changeLayer, 0, 0);
    if (layers.change84 && change7984) ctx.drawImage(change7984, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (layers.m82) {
      const dpr = devicePixelRatio;
      ctx.textAlign = 'left';
      for (const m of m82) {
        if (!m.cell) continue;
        const sx = view.ox + (m.cell[0] + 0.5) * view.scale, sy = view.oy + (m.cell[1] + 0.5) * view.scale;
        const r = Math.max(3.5 * dpr, Math.min(7 * dpr, view.scale * 0.55));
        ctx.beginPath();
        ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy); ctx.closePath();
        ctx.fillStyle = M82_COLOR[m.category] ?? '#999';
        ctx.strokeStyle = 'rgba(14,26,36,.9)'; ctx.lineWidth = 1.1 * dpr;
        ctx.fill(); ctx.stroke();
        if (view.scale > 3) {
          ctx.font = `${10 * dpr}px system-ui, sans-serif`;
          ctx.lineWidth = 2.5 * dpr; ctx.strokeStyle = 'rgba(14,26,36,.8)'; ctx.fillStyle = '#d9f0ff';
          ctx.strokeText(m.name.zh, sx + 6 * dpr, sy + 3 * dpr); ctx.fillText(m.name.zh, sx + 6 * dpr, sy + 3 * dpr);
        }
      }
    }
    if (layers.b84) {
      const dpr = devicePixelRatio;
      ctx.textAlign = 'left';
      for (const b of b84) {
        if (!b.cell) continue;
        const sx = view.ox + (b.cell[0] + 0.5) * view.scale, sy = view.oy + (b.cell[1] + 0.5) * view.scale;
        const s = Math.max(4 * dpr, Math.min(9 * dpr, view.scale * 0.7));
        ctx.fillStyle = B84_COLOR[b.status_1984] ?? '#999';
        ctx.strokeStyle = 'rgba(14,26,36,.9)'; ctx.lineWidth = 1.2 * dpr;
        ctx.fillRect(sx - s / 2, sy - s / 2, s, s); ctx.strokeRect(sx - s / 2, sy - s / 2, s, s);
        if (view.scale > 2.5) {
          ctx.font = `${11 * dpr}px system-ui, sans-serif`;
          ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(14,26,36,.8)'; ctx.fillStyle = '#f4ecd8';
          ctx.strokeText(b.name.zh, sx + 7 * dpr, sy - 5 * dpr); ctx.fillText(b.name.zh, sx + 7 * dpr, sy - 5 * dpr);
        }
      }
    }
    if (layers.sites) {
      const dpr = devicePixelRatio;
      ctx.font = `${11 * dpr}px system-ui, sans-serif`; ctx.textAlign = 'left';
      for (const s of y79.sites) {
        if (!s.cell) continue;
        const sx = view.ox + (s.cell[0] + 0.5) * view.scale, sy = view.oy + (s.cell[1] + 0.5) * view.scale;
        ctx.beginPath(); ctx.arc(sx, sy, 5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = STATUS_COLOR[s.evidence_status] ?? '#999'; ctx.fill();
        ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = s.id === selected ? '#fff' : 'rgba(14,26,36,.9)'; ctx.stroke();
        if (view.scale > 3) {
          ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(14,26,36,.8)'; ctx.fillStyle = '#f4ecd8';
          ctx.strokeText(s.name.zh, sx + 8 * dpr, sy + 4 * dpr); ctx.fillText(s.name.zh, sx + 8 * dpr, sy + 4 * dpr);
        }
      }
    }
    ctx.textAlign = 'center';
    const dpr = devicePixelRatio;
    const labels = (items: Named[], size: number, color: string) => {
      ctx.font = `${size * dpr}px system-ui, sans-serif`;
      for (const it of items) {
        const sx = view.ox + it.label[0] * view.scale, sy = view.oy + it.label[1] * view.scale;
        ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(14,26,36,.8)'; ctx.fillStyle = color;
        const text = `${it.name} ${it.en.replace(/ Sub-?[Dd]istrict| District/, '')}`;
        ctx.strokeText(text, sx, sy); ctx.fillText(text, sx, sy);
      }
    };
    if (opts.sub && view.scale > 1.2) labels(meta.subdistricts, 11, '#f4ecd8');
    if (opts.dist) labels(meta.districts, 14, '#ffd9c9');
    if (opts.slice && sa && view.scale > 1.5) {
      ctx.font = `${12 * dpr}px system-ui, sans-serif`;
      sa.areas.forEach((a, k) => {
        const [lx, ly] = sa.label[k]!;
        const sx = view.ox + (lx + 0.5) * view.scale, sy = view.oy + (ly + 0.5) * view.scale;
        const text = `${a.id} ${a.name.zh}${a.access === 'card_only' ? ' (card only)' : ''}`;
        ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(14,26,36,.85)'; ctx.fillStyle = '#ffec78';
        ctx.strokeText(text, sx, sy); ctx.fillText(text, sx, sy);
      });
    }
    const dt = performance.now() - t0;
    worst = Math.max(worst, dt); frames++;
    if (performance.now() - last > 1000) {
      $('perf').textContent = `draw: worst ${worst.toFixed(1)} ms over ${frames} frames · ${meta.width}×${meta.height} cells`;
      frames = 0; worst = 0; last = performance.now();
    }
  };
  let pending = false;
  const request = () => { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; draw(); }); } };

  addEventListener('resize', () => { resize(); fit(); request(); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = Math.exp(-e.deltaY * 0.0015);
    const mx = e.offsetX * devicePixelRatio, my = e.offsetY * devicePixelRatio;
    const ns = Math.min(40, Math.max(0.3, view.scale * k));
    view.ox = mx - ((mx - view.ox) * ns) / view.scale;
    view.oy = my - ((my - view.oy) * ns) / view.scale;
    view.scale = ns; request();
  }, { passive: false });
  let drag: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId); });
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    drag = null; canvas.classList.remove('dragging');
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4 || !layers.sites) return;
    const mx = e.offsetX * devicePixelRatio, my = e.offsetY * devicePixelRatio;
    let best: Site | null = null, bestD = 10 * devicePixelRatio;
    for (const s of y79.sites) {
      if (!s.cell) continue;
      const d = Math.hypot(view.ox + (s.cell[0] + 0.5) * view.scale - mx, view.oy + (s.cell[1] + 0.5) * view.scale - my);
      if (d < bestD) { best = s; bestD = d; }
    }
    selected = best?.id ?? null; showSite(best); request();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      view.ox += (e.clientX - drag.x) * devicePixelRatio; view.oy += (e.clientY - drag.y) * devicePixelRatio;
      drag = { x: e.clientX, y: e.clientY }; request();
    }
    const cx = Math.floor((e.offsetX * devicePixelRatio - view.ox) / view.scale);
    const cy = Math.floor((e.offsetY * devicePixelRatio - view.oy) / view.scale);
    if (cx < 0 || cy < 0 || cx >= meta.width || cy >= meta.height) return;
    const i = cy * meta.width + cx;
    const d = meta.districts.find((x) => x.id === g.dist[i]);
    const s = meta.subdistricts.find((x) => x.id === g.sub[i]);
    const THEN: Record<number, string> = { 1: ' · 1979: sea', 2: ' · 1979: land', 3: ' · 1979: inland water', 255: ' · 1979: no data' };
    const then = y79.change ? (THEN[y79.change[i]!] ?? '') : '';
    const c84 = m1c.change ? ` · 1979→1984: ${CHANGE_7984[m1c.change[i]!]?.[0] ?? '?'}` : '';
    const ar = sa?.areas.find((a) => a.id === sa.cell[i]);
    const sl = ar ? ` · area ${ar.id} ${ar.name.zh} (${ar.access === 'card_only' ? 'card only' : 'playable'})` : '';
    const b84here = layers.b84 ? b84.filter((b) => b.cell?.[0] === cx && b.cell[1] === cy)
      .map((b) => `${b.name.zh} / ${b.name.en}`).join('、') : '';
    const m82here = layers.m82 ? m82.find((m) => m.cell && m.cell[0] === cx && m.cell[1] === cy) : null;
    $('hover').textContent = `cell ${cx},${cy} · ${g.water[i] ? 'water' : `${g.elev[i]} m`} · ${d ? `${d.name} ${d.en}` : 'outside Shenzhen'}${s ? ` · ${s.name}` : ''}${b84here ? ` · 1984: ${b84here}` : ''}${m82here ? ` · 1982:${m82here.name.zh}` : ''}${sl}${then}${c84}`;
  });
  for (const key of ['hill', 'dist', 'sub', 'slice'] as const) {
    $<HTMLInputElement>(key).addEventListener('change', (e) => {
      opts[key] = (e.target as HTMLInputElement).checked;
      base = buildBase(g, opts, sa); request();
    });
  }
  for (const key of LAYER_KEYS) {
    $<HTMLInputElement>(key).addEventListener('change', (e) => {
      layers[key] = (e.target as HTMLInputElement).checked;
      if (key === 'sites' && !layers.sites) { selected = null; showSite(null); }
      request();
    });
  }
  draw();
}

main().catch((e) => { document.body.textContent = `Failed to load the grid. Run "npm run spike:grid" first. ${e}`; });
