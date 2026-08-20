/*
 * 生成本课图集素材(纯 Node,无第三方依赖):
 * - atlas-sheet.png:256×256 手工图集,网格内画 6 个可辨识的纯色几何块;
 * - single-block.png:64×64 单图对照(与图集中的 square-red 完全同款)。
 * 帧坐标与同目录 atlas.json / atlas-hash.json 的 frames 一一对应;
 * 改动任意一侧时必须同步另一侧。
 * 运行:node generate-atlas.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const RED = [239, 68, 68];
const BLUE = [59, 130, 246];
const YELLOW = [250, 204, 21];
const GREEN = [34, 197, 94];
const PURPLE = [168, 85, 247];
const ORANGE = [249, 115, 22];

function createImage(w, h) {
  const data = new Uint8Array(w * h * 4); // 初始全透明
  const setPx = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  return {
    w,
    h,
    data,
    rect(x, y, rw, rh, color) {
      for (let yy = y; yy < y + rh; yy++)
        for (let xx = x; xx < x + rw; xx++) setPx(xx, yy, color);
    },
    circle(x, y, d, color) {
      const cx = x + d / 2;
      const cy = y + d / 2;
      for (let yy = y; yy < y + d; yy++)
        for (let xx = x; xx < x + d; xx++) {
          const dx = xx + 0.5 - cx;
          const dy = yy + 0.5 - cy;
          if (dx * dx + dy * dy <= (d / 2) ** 2) setPx(xx, yy, color);
        }
    },
    triangle(x, y, tw, th, color) {
      // 顶点:上中、左下、右下
      const a = [x + tw / 2, y];
      const b = [x, y + th];
      const c = [x + tw, y + th];
      const sign = (p1, p2, p3) =>
        (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
      for (let yy = y; yy < y + th; yy++)
        for (let xx = x; xx < x + tw; xx++) {
          const p = [xx + 0.5, yy + 0.5];
          const d1 = sign(p, a, b);
          const d2 = sign(p, b, c);
          const d3 = sign(p, c, a);
          const neg = d1 < 0 || d2 < 0 || d3 < 0;
          const pos = d1 > 0 || d2 > 0 || d3 > 0;
          if (!(neg && pos)) setPx(xx, yy, color);
        }
    },
    diamond(x, y, d, color) {
      const cx = x + d / 2;
      const cy = y + d / 2;
      for (let yy = y; yy < y + d; yy++)
        for (let xx = x; xx < x + d; xx++)
          if (Math.abs(xx + 0.5 - cx) + Math.abs(yy + 0.5 - cy) <= d / 2)
            setPx(xx, yy, color);
    },
  };
}

/* ---- 与 atlas.json 的 frames 坐标一一对应 ---- */
const atlas = createImage(256, 256);
atlas.rect(4, 4, 64, 64, RED); // square-red
atlas.circle(76, 4, 48, BLUE); // circle-blue
atlas.triangle(132, 4, 80, 56, YELLOW); // triangle-yellow
atlas.circle(224, 8, 16, ORANGE); // dot-orange
atlas.diamond(4, 76, 56, GREEN); // diamond-green
atlas.rect(4, 148, 160, 24, PURPLE); // bar-purple(trimmed:逻辑框高 32,上下各 4px 透明)

const single = createImage(64, 64);
single.rect(0, 0, 64, 64, RED); // square-red 的单图版

/* ---- 极简 PNG 编码:RGBA8,每行 filter 0 ---- */
function crc32(bytes) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < bytes.length; n++) {
    c = (crc ^ bytes[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(img) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; // 位深
  ihdr[9] = 6; // 颜色类型 RGBA
  const stride = 1 + img.w * 4;
  const raw = Buffer.alloc(img.h * stride);
  for (let y = 0; y < img.h; y++) {
    raw[y * stride] = 0; // filter: None
    Buffer.from(img.data.buffer, y * img.w * 4, img.w * 4).copy(
      raw,
      y * stride + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL('./atlas-sheet.png', import.meta.url), encodePng(atlas));
writeFileSync(
  new URL('./single-block.png', import.meta.url),
  encodePng(single),
);
console.log('已生成 atlas-sheet.png(256×256)与 single-block.png(64×64)');
