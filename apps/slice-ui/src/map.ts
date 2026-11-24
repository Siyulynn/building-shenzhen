/**
 * The map (phase1-slice.md §11, §11.1): Spike A's technique, not its code. Each layer is an offscreen canvas at one
 * pixel per 100 m cell, drawn under one pan-and-zoom transform. The base is the committed slice areas on a flat
 * ground; terrain draws under it only when the git-ignored Spike A grid is served.
 */
import type { CellRuns, GameState, StartSite, StartRoute } from '@sz/sim-core';
import { bi } from './strings.js';
import { areaAt, sliceBox } from './views.js';

export interface MapHandlers {
  hover(cell: { x: number; y: number; area: number } | null): void;
  click(cell: { x: number; y: number; area: number }): void;
  /** A finished drag while drawing: the rectangle's corner cells. */
  drew(x0: number, y0: number, x1: number, y1: number): void;
  /** While drawing: the rectangle so far, to preview. */
  drawing(x0: number, y0: number, x1: number, y1: number): CellRuns;
}

const layerOf = (W: number, H: number, px: Uint8ClampedArray) => {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px), W, H), 0, 0);
  return c;
};

/** Terrain from the Spike A grid, when it is served and matches the slice's grid; otherwise null. */
async function terrain(W: number, H: number): Promise<HTMLCanvasElement | null> {
  try {
    const meta = await (await fetch('/grid/meta.json')).json() as { width: number; height: number };
    if (meta.width !== W || meta.height !== H) return null;
    const res = await fetch('/grid/grid.bin');
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const n = W * H, elev = new Int16Array(buf, 0, n), water = new Uint8Array(buf, 2 * n, n);
    const px = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) {
      const x = i % W;
      const ex = elev[i + (x < W - 1 ? 1 : 0)]! - elev[i - (x > 0 ? 1 : 0)]!;
      const shade = Math.max(0.6, Math.min(1.3, 1 - ex / 160));
      const e = Math.min(1, Math.max(0, elev[i]! / 400));
      const rgb = water[i] ? [44, 78, 104] : [(120 + 60 * e) * shade, (140 + 20 * e) * shade, (100 + 10 * e) * shade];
      px.set([...rgb, 255], i * 4);
    }
    return layerOf(W, H, px);
  } catch { return null; }
}

/** The area outlines, from the state's areas. */
function outlines(s: GameState): HTMLCanvasElement {
  const { width: W, height: H } = s.grid;
  const id = new Uint8Array(W * H);
  for (const a of s.areas) for (const c of a.cells) id[c] = a.id;
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const x = i % W;
    const r = x < W - 1 ? id[i + 1]! : id[i]!, d = i + W < W * H ? id[i + W]! : id[i]!;
    if ((id[i] !== r || id[i] !== d) && (id[i]! || r || d)) px.set([255, 236, 120, 230], i * 4);
  }
  return layerOf(W, H, px);
}

export class SliceMap {
  private ctx: CanvasRenderingContext2D;
  private view = { scale: 1, ox: 0, oy: 0 };
  private ground: HTMLCanvasElement | null = null;
  private lines: HTMLCanvasElement;
  private overlay: HTMLCanvasElement | null = null;
  private zones: { runs: CellRuns; color: string }[] = [];
  private drag: { x: number; y: number } | null = null;
  private rect: { x0: number; y0: number; x1: number; y1: number; runs: CellRuns } | null = null;
  private pending = false;
  drawMode = false;

  constructor(private canvas: HTMLCanvasElement, private s: GameState, private sites: readonly StartSite[],
    private routes: readonly StartRoute[], private h: MapHandlers) {
    this.ctx = canvas.getContext('2d')!;
    this.lines = outlines(s);
    void terrain(s.grid.width, s.grid.height).then((t) => { this.ground = t; this.request(); });
    this.resize(); this.fit();
    addEventListener('resize', () => { this.resize(); this.fit(); this.request(); });
    this.bind();
  }

  setState(s: GameState, overlay: Uint8ClampedArray | null, zones: { runs: CellRuns; color: string }[]) {
    this.s = s;
    this.overlay = overlay ? layerOf(s.grid.width, s.grid.height, overlay) : null;
    this.zones = zones;
    this.request();
  }

  private resize() { this.canvas.width = innerWidth * devicePixelRatio; this.canvas.height = innerHeight * devicePixelRatio; }
  private fit() {
    const [x0, y0, x1, y1] = sliceBox(this.s);
    const side = 400 * devicePixelRatio;                       // the two panels
    const w = Math.max(100, this.canvas.width - 2 * side), hgt = this.canvas.height;
    this.view.scale = Math.min(w / (x1 - x0 + 1), hgt / (y1 - y0 + 1)) * 0.92;
    this.view.ox = side + (w - (x1 - x0 + 1) * this.view.scale) / 2 - x0 * this.view.scale;
    this.view.oy = (hgt - (y1 - y0 + 1) * this.view.scale) / 2 - y0 * this.view.scale;
  }
  private request() { if (!this.pending) { this.pending = true; requestAnimationFrame(() => { this.pending = false; this.draw(); }); } }

  private draw() {
    const { ctx, view } = this, { width: W, height: H } = this.s.grid;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1a24'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.imageSmoothingEnabled = false;
    if (this.ground) ctx.drawImage(this.ground, 0, 0); else { ctx.fillStyle = '#26343c'; ctx.fillRect(0, 0, W, H); }
    ctx.drawImage(this.lines, 0, 0);
    if (this.overlay) ctx.drawImage(this.overlay, 0, 0);
    const fillRuns = (runs: CellRuns, color: string) => {
      ctx.fillStyle = color;
      for (const [y, x0, x1] of runs) ctx.fillRect(x0, y, x1 - x0 + 1, 1);
    };
    for (const z of this.zones) fillRuns(z.runs, z.color);
    this.drawRoutes();
    this.drawSites();
    if (this.rect) fillRuns(this.rect.runs, 'rgba(120,230,255,.75)');
  }

  private drawRoutes() {
    const { ctx, view } = this, px = devicePixelRatio / view.scale, width = this.s.grid.width;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const r of this.routes) {
      const rail = r.kind === 'railway', weight = Math.max(.28, 2 * px);
      ctx.beginPath();
      r.cells.forEach((c, i) => {
        const x = c % width + .5, y = Math.floor(c / width) + .5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.setLineDash([]); ctx.lineWidth = weight + px; ctx.strokeStyle = '#312e31'; ctx.stroke();
      if (rail) ctx.setLineDash([weight * 2, weight]);
      ctx.lineWidth = weight; ctx.strokeStyle = rail ? '#c6d9ef' : '#eab977'; ctx.stroke();
    }
    ctx.restore();
  }

  /** Fixed point symbols at overview; at core zoom the lanes between roofs are purely illustrative. */
  private drawSites() {
    const { ctx, view } = this, px = devicePixelRatio / view.scale;
    ctx.save();
    for (const s of this.sites) {
      const [x, y] = s.cell;
      const size = Math.max(.9, 3 * px);
      ctx.fillStyle = s.layer === 'settlement' ? '#ffc78e' : s.layer === 'landmark' ? '#a3e7ff' : '#c3df92';
      if (s.layer === 'settlement' && px <= 1 / 16) {
        ctx.fillStyle = '#57473d'; ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#ffc78e';
        ctx.fillRect(x + .07, y + .08, .34, .29); ctx.fillRect(x + .54, y + .12, .36, .35);
        ctx.fillRect(x + .09, y + .54, .38, .32); ctx.fillRect(x + .6, y + .59, .26, .29);
      } else {
        ctx.fillRect(x + (1 - size) / 2, y + (1 - size) / 2, size, size);
      }
      if (px <= 1 / 20) {
        ctx.font = `${11 * px}px sans-serif`;
        ctx.strokeStyle = '#19232a'; ctx.lineWidth = 3 * px;
        const label = `≈ ${bi(s.name)}`;                // a place label: bilingual in both languages (§11.1)
        ctx.strokeText(label, x + 1.1, y + .7);
        ctx.fillStyle = '#fff'; ctx.fillText(label, x + 1.1, y + .7);
      }
    }
    ctx.restore();
  }

  private cellAt(e: PointerEvent | WheelEvent) {
    const x = Math.floor((e.offsetX * devicePixelRatio - this.view.ox) / this.view.scale);
    const y = Math.floor((e.offsetY * devicePixelRatio - this.view.oy) / this.view.scale);
    if (x < 0 || y < 0 || x >= this.s.grid.width || y >= this.s.grid.height) return null;
    return { x, y, area: areaAt(this.s, y * this.s.grid.width + x) };
  }

  private bind() {
    const c = this.canvas;
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = Math.exp(-e.deltaY * 0.0015), mx = e.offsetX * devicePixelRatio, my = e.offsetY * devicePixelRatio;
      const ns = Math.min(60, Math.max(0.5, this.view.scale * k));
      this.view.ox = mx - ((mx - this.view.ox) * ns) / this.view.scale;
      this.view.oy = my - ((my - this.view.oy) * ns) / this.view.scale;
      this.view.scale = ns; this.request();
    }, { passive: false });
    let down: { x: number; y: number } | null = null;
    c.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
      c.setPointerCapture(e.pointerId);
      const cell = this.cellAt(e);
      if (this.drawMode && cell) { this.rect = { x0: cell.x, y0: cell.y, x1: cell.x, y1: cell.y, runs: [] }; return; }
      this.drag = { x: e.clientX, y: e.clientY }; c.classList.add('dragging');
    });
    c.addEventListener('pointermove', (e) => {
      const cell = this.cellAt(e);
      this.h.hover(cell);
      if (this.rect && cell) {
        this.rect = { ...this.rect, x1: cell.x, y1: cell.y };
        this.rect.runs = this.h.drawing(this.rect.x0, this.rect.y0, this.rect.x1, this.rect.y1);
        this.request(); return;
      }
      if (this.drag) {
        this.view.ox += (e.clientX - this.drag.x) * devicePixelRatio; this.view.oy += (e.clientY - this.drag.y) * devicePixelRatio;
        this.drag = { x: e.clientX, y: e.clientY }; this.request();
      }
    });
    c.addEventListener('pointerup', (e) => {
      const r = this.rect;
      this.rect = null; this.drag = null; c.classList.remove('dragging');
      if (r) { this.h.drew(r.x0, r.y0, r.x1, r.y1); this.request(); return; }
      const cell = this.cellAt(e);
      if (down && cell && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) this.h.click(cell);
    });
  }

  setDrawMode(on: boolean) { this.drawMode = on; this.canvas.classList.toggle('drawing', on); }
}
