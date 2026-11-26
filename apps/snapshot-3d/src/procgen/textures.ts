// Canvas facades for the procedural kits. Each atlas is 2 × 2 tiles of one bay by one storey:
// left = plain bay, right = door bay; top = upper floor, bottom = ground floor (after flipY).
// Hybrid palette: muted plaster, grey brick and dark openings. Generic, not photo-matched.
import * as T from 'three';
import {ARCH, type Arch} from './fabric';

type Ctx = CanvasRenderingContext2D;
type Tile = (c: Ctx, px: number, py: number) => void; // px, py: pixels per metre
const S = 128;

function atlas(arch: Arch, wall: string, plain: {ground: Tile; upper: Tile}, door: Tile, grain?: (c: Ctx) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2 * S;
  const c = canvas.getContext('2d');
  if (!c) throw Error('Canvas unavailable');
  const {bay, storey} = ARCH[arch], px = S / bay, py = S / storey;
  const tile = (x: number, y: number, draw: Tile) => {
    c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, S, S); c.clip();
    c.fillStyle = wall; c.fillRect(0, 0, S, S); grain?.(c);
    draw(c, px, py); c.restore();
  };
  tile(0, 0, plain.upper); tile(S, 0, plain.upper);
  tile(0, S, plain.ground); tile(S, S, door);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
  t.minFilter = T.LinearMipmapLinearFilter;
  return t;
}
const rect = (c: Ctx, fill: string, x: number, y: number, w: number, h: number) => { c.fillStyle = fill; c.fillRect(x, y, w, h); };
const window_ = (c: Ctx, px: number, py: number, x: number, y: number, w: number, h: number, frame = '#e9e1cc', glass = '#3c4a4a') => {
  rect(c, frame, x * px - 2, y * py - 2, w * px + 4, h * py + 4);
  rect(c, glass, x * px, y * py, w * px, h * py);
  rect(c, frame, (x + w / 2) * px - 1, y * py, 2, h * py);
};
const band = (c: Ctx, py: number, y: number, h: number, colour: string) => rect(c, colour, 0, y * py, S, h * py);

export function facadeTextures(): Record<Arch | 'track', T.Texture> {
  const brickGrain = (c: Ctx) => {
    c.strokeStyle = 'rgba(80,74,64,.16)'; c.lineWidth = 1;
    for (let y = 4; y < S; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(S, y); c.stroke(); }
  };
  const village = atlas('village_row', '#d6d0c2', {
    // Grey-brick house: small high windows; upper storey on the rare two-storey house.
    ground: (c, px, py) => { window_(c, px, py, 1.4, 0.9, 1.2, 0.8, '#bdb6a6'); band(c, py, 3.0, 0.2, '#8b8577'); },
    upper: (c, px, py) => { window_(c, px, py, 1.5, 0.9, 1.0, 0.9, '#bdb6a6'); band(c, py, 3.0, 0.2, '#8b8577'); },
  }, (c, px, py) => {
    rect(c, '#b8ad98', 1.05 * px, 0.4 * py, 1.9 * px, 2.8 * py);
    rect(c, '#4a4036', 1.3 * px, 0.75 * py, 1.4 * px, 2.45 * py);
    band(c, py, 3.0, 0.2, '#8b8577');
  }, brickGrain);
  const lingnan = atlas('lingnan_block', '#ece4cf', {
    // Market-town terrace: open shopfront below, shuttered pair above, string course between.
    ground: (c, px, py) => {
      rect(c, '#5b4a3a', 0.35 * px, 0.6 * py, 3.3 * px, 2.8 * py);
      for (let x = 0.55; x < 3.6; x += 0.55) rect(c, '#7c6a52', x * px, 0.6 * py, 2, 2.8 * py);
      band(c, py, 0.25, 0.3, '#b9ab8e');
    },
    upper: (c, px, py) => {
      window_(c, px, py, 0.6, 0.7, 1.0, 1.7, '#d7c9a8', '#4d5a52');
      window_(c, px, py, 2.4, 0.7, 1.0, 1.7, '#d7c9a8', '#4d5a52');
      band(c, py, 0.15, 0.25, '#c2b493');
    },
  }, (c, px, py) => {
    rect(c, '#3f352c', 0.6 * px, 0.7 * py, 2.8 * px, 2.7 * py);
    rect(c, '#8c3f2d', 0.4 * px, 0.35 * py, 3.2 * px, 0.35 * py);
    band(c, py, 0.25, 0.3, '#b9ab8e');
  });
  const danwei = atlas('danwei_slab', '#e1dccb', {
    // Walk-up slab: one framed window per bay, a slab edge per storey.
    ground: (c, px, py) => { window_(c, px, py, 0.8, 0.9, 2.0, 1.4); band(c, py, 0, 0.18, '#b3ad9c'); },
    upper: (c, px, py) => { window_(c, px, py, 0.8, 0.9, 2.0, 1.4); band(c, py, 0, 0.18, '#b3ad9c'); },
  }, (c, px, py) => {
    rect(c, '#c9c3b1', 0.9 * px, 0.3 * py, 1.8 * px, 2.7 * py);
    rect(c, '#4b524d', 1.1 * px, 0.6 * py, 1.4 * px, 2.4 * py);
    band(c, py, 0, 0.18, '#b3ad9c');
  });
  const shed = atlas('worksite_shed', '#b9b29f', {
    ground: (c, px, py) => { for (let x = 0; x < 6; x += 0.5) rect(c, 'rgba(70,66,58,.22)', x * px, 0, 2, S); window_(c, px, py, 2.2, 0.6, 1.6, 0.7, '#a59f8e'); },
    upper: (c, px) => { for (let x = 0; x < 6; x += 0.5) rect(c, 'rgba(70,66,58,.22)', x * px, 0, 2, S); },
  }, (c, px, py) => {
    rect(c, '#6e6a5f', 1 * px, 0.8 * py, 4 * px, 3.7 * py);
    for (let x = 1; x < 5; x += 0.5) rect(c, 'rgba(30,30,28,.3)', x * px, 0.8 * py, 2, 3.7 * py);
  });
  // The strip runs across bay boundaries; the smaller mullions only break the glass.
  const factoryBay: Tile = (c,px,py) => {
    band(c,py,.84,1.5,'#54605e');
    for(const x of [.05,2,4])rect(c,'#aeb1a3',x*px,.84*py,.13*px,1.5*py);
    band(c,py,2.82,.14,'#aaa99d'); band(c,py,0,.24,'#aea99a');
  };
  const hallBay: Tile = (c,px,py) => {
    band(c,py,.72,.76,'#576863');
    for(const x of [.1,1.55,3.05,4.55])rect(c,'#aeb4aa',x*px,.72*py,.12*px,.76*py);
    band(c,py,4.65,.55,'#a4aaa0');
  };
  const estateBay: Tile = (c,px,py) => {
    window_(c,px,py,.38,.62,1.37,1.34,'#d2cbb7','#56635e');
    window_(c,px,py,2.02,.62,1.16,1.34,'#d2cbb7','#66716b');
    band(c,py,2.72,.13,'#aea89b');
  };
  const dormBay: Tile = (c,px,py) => {
    rect(c,'#c6c2b4',.18*px,.24*py,3.24*px,2.64*py);
    window_(c,px,py,.42,.68,1.55,1.28); rect(c,'#626861',2.24*px,.48*py,.94*px,2.52*py);
  };
  const villaBay: Tile = (c,px,py) => {
    window_(c,px,py,.61,.72,1.78,1.52,'#ddd8c7','#566658'); band(c,py,0,.13,'#b5b1a4');
  };
  const towerBay: Tile = (c,px,py) => {
    rect(c,'#b6b6aa',.36*px,0,2.48*px,S); window_(c,px,py,.57,.4,2.06,1.76,'#cacabc','#586666');
  };
  const entry: Tile = (c,px,py) => {
    rect(c,'#a9a99b',.76*px,S-2.55*py,1.64*px,2.55*py);
    rect(c,'#555c53',.9*px,S-2.38*py,1.36*px,2.38*py);
  };
  // Track ribbon: U across 2.7 m, V along in metres. Sleepers at 0.6 m on ballast, two rails.
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const c = canvas.getContext('2d')!;
  rect(c, '#8c8376', 0, 0, 64, 64);
  for (let y = 0; y < 64; y += 16) rect(c, '#6c5a48', 4, y + 4, 56, 7);
  for (const x of [17, 45]) rect(c, '#4a4e50', x, 0, 3, 64);
  const track = new T.CanvasTexture(canvas);
  track.wrapS = track.wrapT = T.RepeatWrapping; track.colorSpace = T.SRGBColorSpace; track.anisotropy = 8;
  track.repeat.set(1 / 2.7, 1 / 2.4);
  return {village_row: village, lingnan_block: lingnan, danwei_slab: danwei, worksite_shed: shed, track,
    standard_factory:atlas('standard_factory','#dedacb',{ground:factoryBay,upper:factoryBay},(c,px,py)=>{
      factoryBay(c,px,py);rect(c,'#80867e',.35*px,1.04*py,5.3*px,3.16*py);
      for(let y=1.18;y<4.2;y+=.27) rect(c,'#6f776f',.35*px,y*py,5.3*px,.05*py);
    }),
    factory_hall:atlas('factory_hall','#e2e0d4',{ground:hallBay,upper:hallBay},(c,px,py)=>{
      hallBay(c,px,py);rect(c,'#6c7770',.95*px,2.15*py,4.1*px,3.05*py);
      for(let y=2.35;y<5.2;y+=.24)rect(c,'#87918a',.95*px,y*py,4.1*px,.07*py);
    }),
    early_highrise:atlas('early_highrise','#dedbcc',{ground:towerBay,upper:towerBay},towerBay),
    worker_dorm:atlas('worker_dorm','#e9e4d5',{ground:dormBay,upper:dormBay},entry),
    estate_slab:atlas('estate_slab','#e9e5d8',{ground:estateBay,upper:estateBay},entry),
    village_villa:atlas('village_villa','#eee9da',{ground:villaBay,upper:villaBay},entry)};
}
