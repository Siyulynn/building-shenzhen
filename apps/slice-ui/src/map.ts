/**
 * The planning map (phase1-slice.md §11.1, §11.2): Spike A's technique, not its code. Each layer is an offscreen
 * canvas at one pixel per 100 m cell, drawn under one pan-and-zoom transform over the whole window. It only reads the
 * scene main.ts hands it (built from sim state and the pure views) and turns pointer events into gestures; it never
 * changes the session. Canvas text is limited to place labels, which stay bilingual (§11.1).
 */
import { isFormable, landCoverAt, type GameState, type Slice, type StartSite } from '@sz/sim-core';
import { bi } from './strings.js';
import { REFERENCE_COLOR, USE_COLOR, areaAt, areaBox, areaName, playableBox, siteName, sliceBox, type HistoricalRoad, type HistoricalZone } from './views.js';

/** The present-day Shenzhen limit, loaded from data/starts/slice_city_border.json (reference only). */
export interface CityBorder {
  readonly source: string;
  readonly reference: string;
  readonly rings: readonly (readonly (readonly [number, number])[])[];
}

export interface Cell { x: number; y: number; area: number }
export interface MapHandlers {
  hover(cell: Cell | null, client: { x: number; y: number }): void;
  click(cell: Cell): void;
  /** A drag with a build tool: called as it moves and once when it ends. */
  drag(from: Cell, to: Cell, done: boolean): void;
}
/** What the map draws: all of it read from the state and the views. */
export interface Scene {
  state: GameState;
  overlay: Uint8ClampedArray | null;       // the chosen overlay, one RGBA pixel per cell
  zones: Uint8ClampedArray;                // zones by use and stage, always drawn
  planned: readonly number[];              // works cells not started: hatched at zoom
  roads: readonly number[];                // built road cells (start roads draw as their routes)
  building: readonly { cell: number; bridge: boolean }[];   // live road orders' unbuilt path cells
  bridges: ReadonlySet<number>;            // built road cells off the buildable layer
  structures: readonly { cell: number; kind: string; built: boolean }[];
  queued: readonly number[];               // cells this turn's queue would touch, drawn dashed
  preview: { cells: readonly number[]; ok: boolean } | null;
  guide: readonly number[] | null;         // the fallback historical footprint; commits nothing
  historical: readonly HistoricalZone[] | null;   // R11.2: the 1984 proposal's named zones
  historicalRoads: readonly HistoricalRoad[] | null;   // R11.2: the 1984 road plan
  selected: { x: number; y: number } | null;
  tutorial: { cells: readonly number[]; label: string } | null;   // R11.1: the suggested first block
  floor: ReadonlyMap<number, number>;      // core zoom: each developable cell's share of its zone's floor
  floorUse: ReadonlyMap<number, string>;
  villages: ReadonlyMap<number, number>;   // core zoom: village floor over footprint, by area
}

/** R11.2: a 1-cell dark edge around each zone, so zone blocks read at fit-playable zoom. */
function zoneEdgeLayer(W: number, H: number, px: Uint8ClampedArray): HTMLCanvasElement {
  const out = new Uint8ClampedArray(W * H * 4);
  const same = (a: number, b: number) => px[a * 4] === px[b * 4] && px[a * 4 + 1] === px[b * 4 + 1] && px[a * 4 + 2] === px[b * 4 + 2];
  for (let c = 0; c < W * H; c++) {
    if (px[c * 4 + 3] === 0) continue;
    const x = c % W;
    const ns = [x > 0 ? c - 1 : -1, x < W - 1 ? c + 1 : -1, c - W, c + W];
    if (ns.some((n) => n < 0 || n >= W * H || px[n * 4 + 3] === 0 || !same(c, n))) out.set([92, 31, 36, 190], c * 4);
  }
  return layerOf(W, H, out);
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
    if ((id[i] !== r || id[i] !== d) && (id[i]! || r || d)) px.set([168, 50, 45, 170], i * 4);   // the planning red line (红线)
  }
  return layerOf(W, H, px);
}

/**
 * R11.1: the cover over everything that is not playable. Card-only Shekou and Nantou and the wider
 * city stay legible but recede, so the first view cannot be mistaken for nine equal areas.
 */
function shadowLayer(s: GameState): HTMLCanvasElement {
  const { width: W, height: H } = s.grid;
  const playable = new Set<number>();
  for (const a of s.areas) if (a.access === 'playable') for (const c of a.cells) playable.add(c);
  const edge = new Set<number>();
  for (const c of playable) for (const n of [c - 1, c + 1, c - W, c + W]) {
    if (n >= 0 && n < W * H && !playable.has(n)) edge.add(n);
  }
  const px = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (playable.has(i)) continue;
    const alpha = edge.has(i) ? 78 : 132;
    px.set([31, 26, 21, alpha], i * 4);
  }
  return layerOf(W, H, px);
}

/** The outer edge of the playable union, drawn as the gold planning edge over the shadow. */
function playableEdgeLayer(s: GameState): HTMLCanvasElement {
  const { width: W, height: H } = s.grid;
  const playable = new Set<number>();
  for (const a of s.areas) if (a.access === 'playable') for (const c of a.cells) playable.add(c);
  const px = new Uint8ClampedArray(W * H * 4);
  for (const c of playable) {
    const x = c % W, y = Math.floor(c / W);
    const out = (n: number) => n < 0 || n >= W * H || !playable.has(n);
    const left = x > 0 ? c - 1 : -1, right = x < W - 1 ? c + 1 : -1;
    if (out(c - W) || out(c + W) || out(left) || out(right)) px.set([92, 31, 36, 235], c * 4);
  }
  return layerOf(W, H, px);
}

/** A cell's fixed pseudo-random numbers for roof layouts: a hash of the index, never the sim's RNG (§11.2). */
function hash(c: number, k: number): number {
  let h = (c * 374761393 + k * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const ROOF: Record<string, string> = { industrial: '#8f6ab0', commercial: '#4f79b8', residential: '#d8c49a' };
/** A cell at least this many screen pixels wide is core zoom. */
export const CORE_ZOOM_PX = 14;

export class SliceMap {
  private ctx: CanvasRenderingContext2D;
  private view = { scale: 1, ox: 0, oy: 0 };
  /** Until the player pans or zooms, a resize refits the slice to the window (a page that opens at zero size too). */
  private moved = false;
  private ground: HTMLCanvasElement | null = null;
  private lines: HTMLCanvasElement;
  private shadow: HTMLCanvasElement;
  private playableEdge: HTMLCanvasElement;
  private farms = new Set<number>();                 // lowland farmland: buildable, but compensation is owed
  private nonFormable = new Map<number, 'village' | 'hill' | 'other'>();   // a zone cannot form here
  private overlay: HTMLCanvasElement | null = null;
  private zones: HTMLCanvasElement | null = null;
  private zoneEdges: HTMLCanvasElement | null = null;
  private scene: Scene | null = null;
  private pending = false;
  /** Left drags draw with a build tool; otherwise they pan. Right-drag always pans, even while building (R11.1). */
  drawMode = false;
  private zoneMode = false;

  constructor(private canvas: HTMLCanvasElement, private slice: Slice, s: GameState, private border: CityBorder,
    private h: MapHandlers) {
    this.ctx = canvas.getContext('2d')!;
    this.lines = outlines(s);
    this.shadow = shadowLayer(s);
    this.playableEdge = playableEdgeLayer(s);
    const lc = slice.tick.landcover;
    if (lc) for (let c = 0; c < lc.classOf.length; c++) {
      const k = landCoverAt(lc, c);
      if (k === 'lowland_farm') this.farms.add(c);
      else if (k !== undefined && !isFormable(lc, c)) this.nonFormable.set(c, k === 'village' ? 'village' : k === 'hill' ? 'hill' : 'other');
    }
    void terrain(s.grid.width, s.grid.height).then((t) => { this.ground = t; this.request(); });
    this.resize(); this.fitPlayable(s);
    addEventListener('resize', () => { this.resize(); if (!this.moved || !(this.view.scale > 0)) this.fitPlayable(s); this.request(); });
    this.bind();
  }

  setScene(sc: Scene) {
    const { width: W, height: H } = sc.state.grid;
    if (sc.overlay !== this.scene?.overlay) this.overlay = sc.overlay ? layerOf(W, H, sc.overlay) : null;
    if (sc.zones !== this.scene?.zones) {
      this.zones = layerOf(W, H, sc.zones);
      this.zoneEdges = zoneEdgeLayer(W, H, sc.zones);
    }
    this.scene = sc;
    this.request();
  }
  setDrawMode(on: boolean) { this.drawMode = on; this.canvas.classList.toggle('drawing', on); }
  /** R11.1: the Zoning tool marks the land a zone cannot use, like the farmland cover does. */
  setZoneMode(on: boolean) { this.zoneMode = on; this.request(); }
  /** Screen pixels per cell. */
  get cellPx() { return this.view.scale / devicePixelRatio; }

  private resize() { this.canvas.width = innerWidth * devicePixelRatio; this.canvas.height = innerHeight * devicePixelRatio; }

  /** Fit a cell box into the window at `fill` of the available width or height. */
  private fitBox([x0, y0, x1, y1]: readonly [number, number, number, number], fill = 0.9) {
    const w = this.canvas.width, hgt = this.canvas.height;
    this.view.scale = Math.max(1e-3, Math.min(w / (x1 - x0 + 1), hgt / (y1 - y0 + 1)) * fill);
    this.view.ox = (w - (x1 - x0 + 1) * this.view.scale) / 2 - x0 * this.view.scale;
    this.view.oy = (hgt - (y1 - y0 + 1) * this.view.scale) / 2 - y0 * this.view.scale;
    this.moved = false;
    this.request();
  }

  /** R11.1: the opening and "Fit playable" view is the seven playable areas, not the whole territory. */
  fitPlayable(s = this.scene?.state) {
    if (!s) return;
    this.fitBox(playableBox(s));
  }
  /** The whole territory, including card-only Shekou and Nantou and the present-day city limit. */
  fitAll(s = this.scene?.state) {
    if (!s) return;
    this.fitBox(sliceBox(s));
  }
  /** Focus one area from the map key. Card-only areas open at a comfortable scale too. */
  focusArea(id: number) {
    const s = this.scene?.state;
    const box = s ? areaBox(s, id) : undefined;
    if (!box) return;
    this.fitBox(box, 0.78);
  }
  /** Zoom about the canvas centre, for the + / − controls. */
  zoomBy(factor: number) {
    const mx = this.canvas.width / 2, my = this.canvas.height / 2;
    const ns = Math.min(90 * devicePixelRatio, Math.max(0.5, this.view.scale * factor));
    this.view.ox = mx - ((mx - this.view.ox) * ns) / this.view.scale;
    this.view.oy = my - ((my - this.view.oy) * ns) / this.view.scale;
    this.view.scale = ns; this.moved = true; this.request();
  }
  /** A build tool opens on a readable cell size; panned-away or zoomed-out views are brought back. */
  ensureBuildView() {
    const s = this.scene?.state;
    if (!s) return;
    if (this.cellPx < 9) {
      this.fitPlayable(s);
      // put the core to the right of the open tool flyout instead of under it
      this.panBy(Math.min(140, innerWidth * 0.14), 0);
    }
  }
  panBy(dx: number, dy: number) {
    this.view.ox += dx * devicePixelRatio;
    this.view.oy += dy * devicePixelRatio;
    this.moved = true;
    this.request();
  }
  /** R11.1: put a few cells in the clear part of the map, right of the tool flyout. */
  centerOn(cells: readonly (readonly [number, number])[], screenX = innerWidth * 0.66, screenY = innerHeight * 0.58, minCellPx = 10) {
    if (!cells.length) return;
    const cx = cells.reduce((n, c) => n + c[0], 0) / cells.length;
    const cy = cells.reduce((n, c) => n + c[1], 0) / cells.length;
    if (this.cellPx < minCellPx) this.view.scale = minCellPx * devicePixelRatio;
    this.view.ox = screenX * devicePixelRatio - cx * this.view.scale;
    this.view.oy = screenY * devicePixelRatio - cy * this.view.scale;
    this.moved = true;
    this.request();
  }
  private request() { if (!this.pending) { this.pending = true; requestAnimationFrame(() => { this.pending = false; this.draw(); }); } }

  private draw() {
    const sc = this.scene;
    if (!sc) return;
    const { ctx, view } = this, { width: W, height: H } = sc.state.grid;
    const px = devicePixelRatio / view.scale;                  // one screen pixel, in cells
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#cfc3a5'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);   // the drafting table
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.imageSmoothingEnabled = false;
    if (this.ground) ctx.drawImage(this.ground, 0, 0); else { ctx.fillStyle = '#b9ae90'; ctx.fillRect(0, 0, W, H); }
    ctx.drawImage(this.lines, 0, 0);
    if (this.zones) ctx.drawImage(this.zones, 0, 0);
    if (this.overlay) ctx.drawImage(this.overlay, 0, 0);
    if (this.zoneEdges && this.cellPx >= 2) ctx.drawImage(this.zoneEdges, 0, 0);
    this.drawFarms();                    // fields are buildable, but the cover warns before a drag
    this.drawNonFormable();              // Zoning: water, hills and villages cannot be formed
    // R11.1: the city exists around the seven playable areas; only the playable land stays lit.
    ctx.drawImage(this.shadow, 0, 0);
    ctx.drawImage(this.playableEdge, 0, 0);
    this.drawCityBorder();
    this.drawAreaLabels(sc);
    if (this.drawMode) this.drawBuildGrid(sc);
    const at = (c: number): [number, number] => [c % W, Math.floor(c / W)];
    if (this.cellPx >= 5) {                                    // planned cells hatched
      ctx.strokeStyle = 'rgba(20,30,60,.7)'; ctx.lineWidth = Math.max(px, 0.06);
      ctx.beginPath();
      for (const c of sc.planned) { const [x, y] = at(c); ctx.moveTo(x, y + 1); ctx.lineTo(x + 1, y); ctx.moveTo(x, y + .5); ctx.lineTo(x + .5, y); ctx.moveTo(x + .5, y + 1); ctx.lineTo(x + 1, y + .5); }
      ctx.stroke();
    }
    if (this.cellPx >= CORE_ZOOM_PX) this.drawCore(sc);
    this.drawRoutes();
    this.drawRoads(sc);
    this.drawStructures(sc);
    this.drawSites(sc);
    const outline = (cells: readonly number[], color: string, dash: number[]) => {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = Math.max(px * 1.5, 0.08); ctx.setLineDash(dash.map((d) => d * px));
      for (const c of cells) { const [x, y] = at(c); ctx.strokeRect(x + .08, y + .08, .84, .84); }
      ctx.restore();
    };
    if (sc.guide) { ctx.fillStyle = 'rgba(255,120,220,.25)'; for (const c of sc.guide) { const [x, y] = at(c); ctx.fillRect(x, y, 1, 1); } }
    if (sc.historical) this.drawHistorical(sc, sc.historical, sc.historicalRoads);
    outline(sc.queued, 'rgba(120,230,255,.95)', [4, 3]);
    if (sc.preview) {
      ctx.fillStyle = sc.preview.ok ? 'rgba(120,230,255,.55)' : 'rgba(255,90,80,.55)';
      for (const c of sc.preview.cells) { const [x, y] = at(c); ctx.fillRect(x, y, 1, 1); }
      if (!sc.preview.ok) {                                    // refused cells are crossed, not only red
        ctx.save(); ctx.strokeStyle = 'rgba(92,20,20,.9)'; ctx.lineWidth = Math.max(1.5 * px, .07); ctx.setLineDash([]); ctx.beginPath();
        for (const c of sc.preview.cells) { const [x, y] = at(c); ctx.moveTo(x + .2, y + .2); ctx.lineTo(x + .8, y + .8); ctx.moveTo(x + .8, y + .2); ctx.lineTo(x + .2, y + .8); }
        ctx.stroke(); ctx.restore();
      }
    }
    if (sc.selected) {
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f3ecd8'; ctx.lineWidth = Math.max(4 * px, 0.18); ctx.strokeRect(sc.selected.x, sc.selected.y, 1, 1);
      ctx.strokeStyle = '#5c1f24'; ctx.lineWidth = Math.max(2 * px, 0.08); ctx.strokeRect(sc.selected.x, sc.selected.y, 1, 1);
    }
    if (sc.tutorial) {
      // R11.1: the suggested first block, drawn as a gold surveyed outline with its label.
      ctx.save();
      ctx.setLineDash([4 * px, 2.5 * px]);
      ctx.strokeStyle = '#e2c07a'; ctx.lineWidth = Math.max(4 * px, 0.2);
      for (const c of sc.tutorial.cells) { const [x, y] = at(c); ctx.strokeRect(x + .06, y + .06, .88, .88); }
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(226,192,122,.18)';
      for (const c of sc.tutorial.cells) { const [x, y] = at(c); ctx.fillRect(x, y, 1, 1); }
      const first = sc.tutorial.cells[0];
      if (first !== undefined) {
        const [x, y] = at(first);
        ctx.font = `bold ${11 * px}px "Courier New", Courier, ui-monospace, SimHei, "Heiti SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3.5 * px; ctx.strokeStyle = 'rgba(243,236,216,.95)'; ctx.lineJoin = 'round';
        ctx.strokeText(sc.tutorial.label, x + 1, y + 1.5);
        ctx.fillStyle = '#5c1f24'; ctx.fillText(sc.tutorial.label, x + 1, y + 1.5);
      }
      ctx.restore();
    }
  }

  /** R11.1: lowland farmland gets a faint cover; a build tool adds a hatch because compensation is owed. */
  private drawFarms() {
    if (!this.farms.size) return;
    const { ctx } = this, W = this.scene?.state.grid.width ?? 1, px = devicePixelRatio / this.view.scale;
    ctx.save();
    ctx.fillStyle = this.drawMode ? 'rgba(232,190,80,.42)' : 'rgba(232,190,80,.18)';
    for (const c of this.farms) ctx.fillRect(c % W, Math.floor(c / W), 1, 1);
    if (this.drawMode) {
      ctx.strokeStyle = 'rgba(120,80,20,.55)';
      ctx.lineWidth = Math.max(px, 0.025);
      ctx.beginPath();
      for (const c of this.farms) {
        const x = c % W, y = Math.floor(c / W);
        ctx.moveTo(x + .12, y + .88); ctx.lineTo(x + .88, y + .12);
        ctx.moveTo(x + .5, y + .95); ctx.lineTo(x + .95, y + .5);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** R11.2: while zoning, red stripes over the beige village cell or the bare hill terrain. */
  private drawNonFormable() {
    if (!this.zoneMode || !this.nonFormable.size) return;
    const { ctx } = this, W = this.scene?.state.grid.width ?? 1, px = devicePixelRatio / this.view.scale;
    ctx.save();
    ctx.fillStyle = 'rgba(224,206,166,.58)';
    for (const [c, kind] of this.nonFormable) if (kind === 'village') ctx.fillRect(c % W, Math.floor(c / W), 1, 1);
    ctx.strokeStyle = 'rgba(166,34,30,.72)';
    ctx.lineWidth = Math.max(px * 1.1, .035);
    ctx.beginPath();
    for (const c of this.nonFormable.keys()) {
      const x = c % W, y = Math.floor(c / W);
      ctx.moveTo(x + .1, y + .9); ctx.lineTo(x + .9, y + .1);
      ctx.moveTo(x + .5, y + .95); ctx.lineTo(x + .95, y + .5);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** R11.2: the 1984 proposal, coloured by use, with works zones hatched and bilingual labels. */
  private drawHistorical(sc: Scene, zones: readonly HistoricalZone[], roads: readonly HistoricalRoad[] | null) {
    const { ctx } = this, W = sc.state.grid.width, px = devicePixelRatio / this.view.scale;
    const playable = new Set<number>();
    for (const a of sc.state.areas) if (a.access === 'playable') for (const c of a.cells) playable.add(c);
    ctx.save();
    ctx.lineJoin = 'round';
    for (const zone of zones) {
      if (zone.stage === 'reference') {                         // R12: park, civic ground and yards; no game effect
        const c = REFERENCE_COLOR[zone.use] ?? [140, 120, 100];
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},.4)`;
        for (const i of zone.cells) if (playable.has(i)) ctx.fillRect(i % W, Math.floor(i / W), 1, 1);
        ctx.strokeStyle = `rgba(${c[0] * .6 | 0},${c[1] * .6 | 0},${c[2] * .6 | 0},.85)`;
        ctx.lineWidth = Math.max(px, .05);
        ctx.beginPath();
        for (const i of zone.cells) {
          if (!playable.has(i)) continue;
          const x = i % W, y = Math.floor(i / W);
          if (zone.use === 'park') { ctx.moveTo(x + .5, y + .2); ctx.lineTo(x + .5, y + .8); ctx.moveTo(x + .2, y + .5); ctx.lineTo(x + .8, y + .5); }
          else if (zone.use === 'yard') { ctx.moveTo(x + .15, y + .85); ctx.lineTo(x + .85, y + .15); }
          else ctx.rect(x + .2, y + .2, .6, .6);
        }
        ctx.stroke();
        continue;
      }
      const c = USE_COLOR[zone.use] ?? [140, 120, 100, 180];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${zone.stage === 'works' ? .35 : .45})`;
      for (const i of zone.cells) if (playable.has(i)) ctx.fillRect(i % W, Math.floor(i / W), 1, 1);
      ctx.strokeStyle = zone.stage === 'works' ? 'rgba(92,31,36,.9)' : 'rgba(36,71,107,.85)';
      ctx.lineWidth = Math.max(px, .06);
      ctx.setLineDash(zone.stage === 'works' ? [2 * px, 1.5 * px] : [4 * px, 2 * px]);
      ctx.beginPath();
      for (const i of zone.cells) {
        if (!playable.has(i)) continue;
        const x = i % W, y = Math.floor(i / W);
        ctx.rect(x + .08, y + .08, .84, .84);
        if (zone.stage === 'works') { ctx.moveTo(x + .15, y + .85); ctx.lineTo(x + .85, y + .15); }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // the 1984 road plan: avenues, streets and tracks are the plan, not built roads
    if (roads) for (const road of roads) {
      const color = road.class === 'avenue' ? '#24476b' : road.class === 'street' ? '#4a6f8f'
        : road.class === 'rail' ? '#2b1d17' : '#7a8b70';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max((road.class === 'avenue' ? .2 : road.class === 'rail' ? .16 : .12), px * 1.2);
      ctx.setLineDash(road.class === 'track' ? [3 * px, 2 * px] : road.class === 'rail' ? [5 * px, 2 * px] : []);
      ctx.beginPath();
      road.points.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const zone of zones) {
      if (this.cellPx >= 8 && !this.drawMode) {                 // labels at a readable zoom; the flyout lists them before that
        const [lx, ly] = zone.label;
        ctx.font = `bold ${10 * px}px "Courier New", Courier, ui-monospace, SimHei, "Heiti SC", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'left';
        ctx.lineWidth = 3.5 * px; ctx.strokeStyle = 'rgba(243,236,216,.95)';
        ctx.strokeText(bi(zone.name), lx + .4, ly + .3);
        ctx.fillStyle = '#5c1f24'; ctx.fillText(bi(zone.name), lx + .4, ly + .3);
      }
    }
    ctx.restore();
  }

  /** R11.1: the present-day city limit, a blue dashed reference line over the shadow. */
  private drawCityBorder() {
    if (!this.border.rings.length) return;
    const { ctx } = this, px = devicePixelRatio / this.view.scale;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const ring of this.border.rings) {
      if (ring.length < 4) continue;
      ctx.beginPath();
      ring.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.closePath();
      ctx.setLineDash([]);
      ctx.lineWidth = Math.max(3.4 * px, 0.18); ctx.strokeStyle = 'rgba(243,236,216,.72)'; ctx.stroke();
      ctx.setLineDash([7 * px, 4 * px]);
      ctx.lineWidth = Math.max(1.7 * px, 0.09); ctx.strokeStyle = 'rgba(36,71,107,.9)'; ctx.stroke();
    }
    // one bilingual reference label at the northernmost point of the largest ring
    const main = this.border.rings[0];
    if (main && this.cellPx >= 3) {
      const top = main.reduce((a, b) => (b[1] < a[1] ? b : a), main[0]!);
      const label = '深圳市界 Shenzhen city limit';
      ctx.setLineDash([]);
      ctx.font = `italic ${10 * px}px "Courier New", Courier, ui-monospace, SimHei, "Heiti SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3 * px; ctx.strokeStyle = 'rgba(243,236,216,.9)'; ctx.lineJoin = 'round';
      ctx.strokeText(label, top[0], top[1] - 0.8);
      ctx.fillStyle = 'rgba(36,71,107,.9)'; ctx.fillText(label, top[0], top[1] - 0.8);
    }
    ctx.restore();
  }

  /** R11.1: every area named on the map, so the player never has to guess what the red lines enclose. */
  private drawAreaLabels(sc: Scene) {
    const { ctx } = this, px = devicePixelRatio / this.view.scale;
    if (this.cellPx < 2.2) return;
    const offset: Record<number, [number, number]> = {
      1: [2, -1], 2: [0, 2], 3: [-3, -1], 4: [3, 0], 5: [-2, -2], 6: [4, -1], 7: [-2, 2], 8: [0, 0], 9: [0, 0],
    };
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const a of sc.state.areas) {
      if (!a.cells.length) continue;
      let sx = 0, sy = 0;
      for (const c of a.cells) { sx += c % sc.state.grid.width; sy += Math.floor(c / sc.state.grid.width); }
      const x = sx / a.cells.length + (offset[a.id]?.[0] ?? 0);
      const y = sy / a.cells.length + (offset[a.id]?.[1] ?? 0);
      const playable = a.access === 'playable';
      ctx.font = `${playable ? 'bold ' : ''}${(playable ? 11 : 9.5) * px}px "Courier New", Courier, ui-monospace, SimHei, "Heiti SC", "Microsoft YaHei", sans-serif`;
      ctx.globalAlpha = playable ? 1 : 0.72;
      ctx.lineWidth = 3.5 * px; ctx.strokeStyle = playable ? 'rgba(243,236,216,.92)' : 'rgba(31,26,21,.85)'; ctx.lineJoin = 'round';
      const label = areaName(sc.state, a.id).en;
      ctx.strokeText(label, x, y);
      ctx.fillStyle = playable ? '#2b1d17' : '#f0e3c4';
      ctx.fillText(label, x, y);
    }
    ctx.restore();
  }

  /** R11.1: a faint 100 m grid while a build tool is open, so a drag can be aimed at cells. */
  private drawBuildGrid(sc: Scene) {
    if (this.cellPx < 4) return;
    const { ctx } = this, px = devicePixelRatio / this.view.scale;
    ctx.save();
    ctx.beginPath();
    for (const a of sc.state.areas) {
      if (a.access !== 'playable') continue;
      for (const c of a.cells) {
        const x = c % sc.state.grid.width, y = Math.floor(c / sc.state.grid.width);
        ctx.moveTo(x, y); ctx.lineTo(x + 1, y);
        ctx.moveTo(x, y); ctx.lineTo(x, y + 1);
      }
    }
    ctx.lineWidth = Math.max(px, 0.03);
    ctx.strokeStyle = 'rgba(243,236,216,.26)';
    ctx.stroke();
    ctx.restore();
  }

  /** The start routes, in their temporary styles (keyed in the overlay switcher). */
  private drawRoutes() {
    const { ctx, view } = this, px = devicePixelRatio / view.scale, width = this.slice.startNetwork ? this.scene!.state.grid.width : 0;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const r of this.slice.startNetwork.routes) {
      const rail = r.kind === 'railway', weight = Math.max(.28, 2 * px);
      ctx.beginPath();
      r.cells.forEach((c, i) => {
        const x = c % width + .5, y = Math.floor(c / width) + .5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.setLineDash([]); ctx.lineWidth = weight + px; ctx.strokeStyle = '#312e31'; ctx.stroke();
      ctx.setLineDash(rail ? [weight * 2, weight] : [weight * 3, weight * 0.8]);
      ctx.lineWidth = weight; ctx.strokeStyle = rail ? '#c6d9ef' : '#eab977'; ctx.stroke();
    }
    ctx.restore();
  }

  /** Built roads autotiled from their four-neighbours; bridges edged; unbuilt path cells dashed. */
  private drawRoads(sc: Scene) {
    const { ctx } = this, W = sc.state.grid.width, px = devicePixelRatio / this.view.scale;
    const start = new Set(this.slice.startNetwork.routes.filter((r) => r.kind === 'road').flatMap((r) => r.cells));
    const all = new Set([...sc.roads, ...start]);
    const half = Math.max(.22, 1.8 * px);
    ctx.save();
    // R11.2: a dark casing and a warm centre, so a built road is not mistaken for a planning boundary.
    for (const c of sc.roads) {
      const x = c % W + .5, y = Math.floor(c / W) + .5, h = half * 1.35;
      ctx.fillStyle = sc.bridges.has(c) ? '#5a4a3a' : '#4d3c31';
      ctx.fillRect(x - h, y - h, 2 * h, 2 * h);
      if (all.has(c - 1) && c % W > 0) ctx.fillRect(x - .5, y - h, .5, 2 * h);
      if (all.has(c + 1) && (c + 1) % W > 0) ctx.fillRect(x, y - h, .5, 2 * h);
      if (all.has(c - W)) ctx.fillRect(x - h, y - .5, 2 * h, .5);
      if (all.has(c + W)) ctx.fillRect(x - h, y, 2 * h, .5);
    }
    for (const c of sc.roads) {
      const x = c % W + .5, y = Math.floor(c / W) + .5;
      ctx.fillStyle = '#f7edd6';
      ctx.fillRect(x - half, y - half, 2 * half, 2 * half);
      if (all.has(c - 1) && c % W > 0) ctx.fillRect(x - .5, y - half, .5, 2 * half);
      if (all.has(c + 1) && (c + 1) % W > 0) ctx.fillRect(x, y - half, .5, 2 * half);
      if (all.has(c - W)) ctx.fillRect(x - half, y - .5, 2 * half, .5);
      if (all.has(c + W)) ctx.fillRect(x - half, y, 2 * half, .5);
    }
    ctx.strokeStyle = 'rgba(77,60,49,.9)'; ctx.lineWidth = Math.max(px, .05); ctx.setLineDash([3 * px, 2 * px]);
    for (const b of sc.building) {
      const x = b.cell % W, y = Math.floor(b.cell / W);
      ctx.strokeRect(x + .5 - half, y + .5 - half, 2 * half, 2 * half);
      if (b.bridge) ctx.strokeRect(x + .2, y + .2, .6, .6);
    }
    ctx.restore();
  }

  private drawStructures(sc: Scene) {
    const { ctx } = this, W = sc.state.grid.width, px = devicePixelRatio / this.view.scale;
    const color: Record<string, string> = { power_source: '#ffd83c', power_substation: '#ffd83c', power_station: '#ff963c', water_source: '#50aaff', facility: '#c878ff' };
    ctx.save();
    for (const s of sc.structures) {
      const x = s.cell % W, y = Math.floor(s.cell / W), size = Math.max(.7, 5 * px);
      ctx.fillStyle = color[s.kind] ?? '#fff';
      if (s.built) ctx.fillRect(x + (1 - size) / 2, y + (1 - size) / 2, size, size);
      else { ctx.strokeStyle = color[s.kind] ?? '#fff'; ctx.lineWidth = Math.max(px, .05); ctx.strokeRect(x + (1 - size) / 2, y + (1 - size) / 2, size, size); }
    }
    ctx.restore();
  }

  /** Core zoom (§11.2): roofs for each cell's share of its zone's floor, and village thickening at settlements. */
  private drawCore(sc: Scene) {
    const { ctx } = this, W = sc.state.grid.width;
    ctx.save();
    for (const [c, share] of sc.floor) {
      const x = c % W, y = Math.floor(c / W), n = Math.max(1, Math.round(share * 6));
      ctx.fillStyle = ROOF[sc.floorUse.get(c) ?? ''] ?? '#ddd';
      for (let k = 0; k < n; k++) {
        const gx = k % 3, gy = Math.floor(k / 3);
        const w = .22 + .08 * hash(c, k), hh = .3 + .1 * hash(c, k + 7);
        ctx.fillRect(x + .06 + gx * .31, y + .08 + gy * .45, w, hh);
      }
      ctx.fillStyle = 'rgba(40,40,40,.35)'; ctx.fillRect(x, y + .47, 1, .04);   // an internal lane
    }
    for (const s of this.slice.startSites) {
      if (s.layer !== 'settlement') continue;
      const floors = sc.villages.get(s.area) ?? 0;
      const ring = Math.min(8, Math.floor(floors * 2));
      const cells = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].slice(0, 1 + ring);
      for (const [dx, dy] of cells) {
        const x = s.cell[0] + dx!, y = s.cell[1] + dy!, c = y * W + x;
        ctx.fillStyle = '#57473d'; ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = '#ffc78e';
        const n = 3 + Math.floor(hash(c, 1) * 3);
        for (let k = 0; k < n; k++) ctx.fillRect(x + .05 + hash(c, 10 + k) * .6, y + .05 + hash(c, 20 + k) * .6, .26, .24);
      }
    }
    ctx.restore();
  }

  /** Fixed point symbols for the start anchors; their labels (place names, bilingual) at zoom. */
  private drawSites(sc: Scene) {
    const { ctx, view } = this, px = devicePixelRatio / view.scale;
    ctx.save();
    for (const s of this.slice.startSites as readonly StartSite[]) {
      const [x, y] = s.cell;
      const size = Math.max(.9, 3 * px);
      ctx.fillStyle = s.layer === 'settlement' ? '#ffc78e' : s.layer === 'landmark' ? '#a3e7ff' : '#c3df92';
      if (!(s.layer === 'settlement' && this.cellPx >= CORE_ZOOM_PX)) ctx.fillRect(x + (1 - size) / 2, y + (1 - size) / 2, size, size);
      if (px <= 1 / 20) {
        ctx.font = `bold ${11 * px}px "Courier New", Courier, ui-monospace, SimHei, "Heiti SC", "Microsoft YaHei", sans-serif`;
        ctx.strokeStyle = 'rgba(243,236,216,.92)'; ctx.lineWidth = 3.5 * px; ctx.lineJoin = 'round';
        const label = bi(siteName(s));                  // a place label: bilingual in both languages (§11.1)
        ctx.strokeText(label, x + 1.1, y + .7);
        ctx.fillStyle = '#2b1d17'; ctx.fillText(label, x + 1.1, y + .7);
      }
    }
    void sc;
    ctx.restore();
  }

  private cellAt(e: PointerEvent | WheelEvent): Cell | null {
    const s = this.scene?.state;
    if (!s) return null;
    const x = Math.floor((e.offsetX * devicePixelRatio - this.view.ox) / this.view.scale);
    const y = Math.floor((e.offsetY * devicePixelRatio - this.view.oy) / this.view.scale);
    if (x < 0 || y < 0 || x >= s.grid.width || y >= s.grid.height) return null;
    return { x, y, area: areaAt(s, y * s.grid.width + x) };
  }

  private bind() {
    const c = this.canvas;
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = Math.exp(-e.deltaY * 0.0015), mx = e.offsetX * devicePixelRatio, my = e.offsetY * devicePixelRatio;
      const ns = Math.min(90 * devicePixelRatio, Math.max(0.5, this.view.scale * k));
      this.view.ox = mx - ((mx - this.view.ox) * ns) / this.view.scale;
      this.view.oy = my - ((my - this.view.oy) * ns) / this.view.scale;
      this.view.scale = ns; this.moved = true; this.request();
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    let down: { x: number; y: number; button: number } | null = null, from: Cell | null = null, pan: { x: number; y: number } | null = null, last: Cell | null = null;
    c.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, button: e.button };
      c.setPointerCapture(e.pointerId);
      const cell = this.cellAt(e);
      // R11.1: left draws, any other button pans, even while a build tool is open.
      if (this.drawMode && e.button === 0 && cell) { from = cell; last = cell; this.h.drag(cell, cell, false); return; }
      pan = { x: e.clientX, y: e.clientY }; c.classList.add('dragging');
    });
    c.addEventListener('pointermove', (e) => {
      const cell = this.cellAt(e);
      this.h.hover(cell, { x: e.clientX, y: e.clientY });
      if (from && cell && (cell.x !== last?.x || cell.y !== last?.y)) { last = cell; this.h.drag(from, cell, false); return; }
      if (pan) {
        this.view.ox += (e.clientX - pan.x) * devicePixelRatio; this.view.oy += (e.clientY - pan.y) * devicePixelRatio;
        pan = { x: e.clientX, y: e.clientY }; this.moved = true; this.request();
      }
    });
    c.addEventListener('pointerup', (e) => {
      const f = from, cell = this.cellAt(e) ?? last;
      from = null; pan = null; last = null; c.classList.remove('dragging');
      if (f && cell) { this.h.drag(f, cell, true); return; }
      if (down?.button === 0 && cell && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) this.h.click(cell);
    });
    c.addEventListener('pointerleave', () => this.h.hover(null, { x: 0, y: 0 }));
  }
}
