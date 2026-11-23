// Spike A (throwaway): render the 100 m grid with pan, zoom, land colouring and overlays.
// M1b adds the 1979 Landsat scene, the coastline change since 1979 and the 1979 site register flags.
interface Named { id: number; name: string; en: string; label: [number, number] }
interface Meta {
  cell_m: number; width: number; height: number;
  districts: (Named & { land_km2: number })[]; subdistricts: Named[];
}

const SLICE_DISTRICTS = new Set(['Luohu']);
const SLICE_SUBDISTRICTS = new Set(['蛇口街道', '招商街道']);

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

function buildChange(W: number, H: number, change: Uint8Array): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const img = off.getContext('2d')!.createImageData(W, H);
  const colors: Record<number, [number, number, number]> = { 1: [240, 140, 46], 2: [170, 110, 220], 3: [63, 199, 214] };
  for (let i = 0; i < W * H; i++) {
    const c = colors[change[i]!];
    if (c) img.data.set([...c, 210], i * 4);
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

function buildBase(g: Grid, opts: { hill: boolean; dist: boolean; sub: boolean; slice: boolean }): HTMLCanvasElement {
  const { width: W, height: H } = g.meta;
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const img = off.getContext('2d')!.createImageData(W, H);
  const px = img.data;
  const sliceIds = new Set(g.meta.subdistricts.filter((s) => SLICE_SUBDISTRICTS.has(s.name)).map((s) => s.id));
  const sliceDist = new Set(g.meta.districts.filter((d) => SLICE_DISTRICTS.has(d.en)).map((d) => d.id));
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
      const inSlice = sliceDist.has(g.dist[i]!) || sliceIds.has(g.sub[i]!);
      if (opts.slice && inside && !g.water[i] && !inSlice) { r *= 0.55; gg *= 0.55; b *= 0.55; }
      const edge = (a: ArrayLike<number>) =>
        x < W - 1 && y < H - 1 && (a[i] !== a[i + 1] || a[i] !== a[i + W]) && (a[i]! > 0 || a[i + 1]! > 0 || a[i + W]! > 0);
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
  let base = buildBase(g, opts);
  const y79 = await load1979(meta.width * meta.height);
  const changeLayer = y79.change ? buildChange(meta.width, meta.height, y79.change) : null;
  const layers = { landsat: false, coast: false, sites: true };
  const present = { landsat: !!y79.landsat, coast: !!changeLayer, sites: y79.sites.length > 0 };
  for (const key of ['landsat', 'coast', 'sites'] as const) {
    if (!present[key]) { $<HTMLInputElement>(key).disabled = true; $<HTMLInputElement>(key).checked = false; layers[key] = false; }
  }
  const unplaced = y79.sites.filter((s) => !s.cell);
  $('unplaced').textContent = unplaced.length
    ? `${y79.sites.length - unplaced.length} placed, ${unplaced.length} not placed yet: ${unplaced.map((s) => s.name.zh).join('、')}` : '';
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
    if (layers.coast && changeLayer) ctx.drawImage(changeLayer, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    $('hover').textContent = `cell ${cx},${cy} · ${g.water[i] ? 'water' : `${g.elev[i]} m`} · ${d ? `${d.name} ${d.en}` : 'outside Shenzhen'}${s ? ` · ${s.name}` : ''}${then}`;
  });
  for (const key of ['hill', 'dist', 'sub', 'slice'] as const) {
    $<HTMLInputElement>(key).addEventListener('change', (e) => {
      opts[key] = (e.target as HTMLInputElement).checked;
      base = buildBase(g, opts); request();
    });
  }
  for (const key of ['landsat', 'coast', 'sites'] as const) {
    $<HTMLInputElement>(key).addEventListener('change', (e) => {
      layers[key] = (e.target as HTMLInputElement).checked;
      if (key === 'sites' && !layers.sites) { selected = null; showSite(null); }
      request();
    });
  }
  draw();
}

main().catch((e) => { document.body.textContent = `Failed to load the grid. Run "npm run spike:grid" first. ${e}`; });
