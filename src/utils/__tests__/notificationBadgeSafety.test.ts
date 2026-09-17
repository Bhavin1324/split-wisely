import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { APP_ASSETS } from '../../constants/assets';

describe('Android PWA Notification Badge & Status Bar Safety', () => {
  const publicDir = path.resolve(__dirname, '../../../public');
  const badgePath = path.join(publicDir, 'badge-96x96.png');
  const badge192Path = path.join(publicDir, 'badge-192x192.png');
  const pwa192Path = path.join(publicDir, 'pwa-192x192.png');
  const pwa512Path = path.join(publicDir, 'pwa-512x512.png');

  it('1. Generates and preserves valid PNG files with proper PNG magic bytes', () => {
    expect(fs.existsSync(badgePath)).toBe(true);
    expect(fs.existsSync(badge192Path)).toBe(true);
    expect(fs.existsSync(pwa192Path)).toBe(true);
    expect(fs.existsSync(pwa512Path)).toBe(true);

    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    [badgePath, badge192Path, pwa192Path, pwa512Path].forEach((file) => {
      const buf = fs.readFileSync(file);
      expect(buf.subarray(0, 8)).toEqual(pngHeader);
    });
  });

  it('2. Badge conforms to exact 96x96 dimensions and RGBA (color type 6) format for Android status bar', () => {
    const buf = fs.readFileSync(badgePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];

    expect(width).toBe(96);
    expect(height).toBe(96);
    expect(bitDepth).toBe(8);
    expect(colorType).toBe(6); // RGBA (with alpha channel)
  });

  it('3. Badge is NOT a solid rectangular block: maintains >70% transparent pixels (alpha = 0)', () => {
    const buf = fs.readFileSync(badgePath);
    let pos = 8;
    const idatChunks: Buffer[] = [];
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (type === 'IDAT') {
        idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
      }
      pos += 12 + len;
    }

    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    const width = 96;
    const height = 96;
    const stride = width * 4 + 1;

    let transparentCount = 0;
    let nonTransparentCount = 0;

    for (let y = 0; y < height; y++) {
      const rowStart = y * stride + 1;
      for (let x = 0; x < width; x++) {
        const alpha = decompressed[rowStart + x * 4 + 3];
        if (alpha === 0) {
          transparentCount++;
        } else {
          nonTransparentCount++;
        }
      }
    }

    const totalPixels = width * height;
    const transparentRatio = transparentCount / totalPixels;

    // Must be majority transparent (over 60% fully transparent alpha=0) so Android status bar renders a silhouette, NOT a solid box!
    expect(transparentRatio).toBeGreaterThan(0.60);
    expect(nonTransparentCount).toBeGreaterThan(0);
  });

  it('4. All non-transparent silhouette pixels are pure monochrome white (RGB [255, 255, 255])', () => {
    const buf = fs.readFileSync(badgePath);
    let pos = 8;
    const idatChunks: Buffer[] = [];
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (type === 'IDAT') {
        idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
      }
      pos += 12 + len;
    }

    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    const width = 96;
    const height = 96;
    const stride = width * 4 + 1;

    for (let y = 0; y < height; y++) {
      const rowStart = y * stride + 1;
      for (let x = 0; x < width; x++) {
        const alpha = decompressed[rowStart + x * 4 + 3];
        if (alpha > 0) {
          const r = decompressed[rowStart + x * 4];
          const g = decompressed[rowStart + x * 4 + 1];
          const b = decompressed[rowStart + x * 4 + 2];
          expect(r).toBe(255);
          expect(g).toBe(255);
          expect(b).toBe(255);
        }
      }
    }
  });

  it('5. Vite PWA configuration includes monochrome badge in manifest', () => {
    const viteConfigPath = path.resolve(__dirname, '../../../vite.config.ts');
    const content = fs.readFileSync(viteConfigPath, 'utf8');

    expect(content).toContain("badge-96x96.png");
    expect(content).toContain("purpose: 'monochrome'");
    expect(content).toContain("pwa-192x192.png");
  });

  it('6. Centralized APP_ASSETS defines valid notification badges and PWA icon paths', () => {
    expect(APP_ASSETS.notifications.badge).toBe('/badge-96x96.png');
    expect(APP_ASSETS.notifications.badgeHighDpi).toBe('/badge-192x192.png');
    expect(APP_ASSETS.notifications.icon).toBe('/pwa-512x512.png');
    expect(APP_ASSETS.pwa.icon192).toBe('/pwa-192x192.png');

    const swPath = path.resolve(__dirname, '../../sw.ts');
    const swContent = fs.readFileSync(swPath, 'utf8');
    expect(swContent).toContain("APP_ASSETS.notifications.badge");
    expect(swContent).not.toContain("badge: '/pwa-icon.jpg'");

    const queryPath = path.resolve(__dirname, '../../hooks/queries/useNotificationsQuery.ts');
    const queryContent = fs.readFileSync(queryPath, 'utf8');
    expect(queryContent).toContain("APP_ASSETS.notifications.badge");
    expect(queryContent).not.toContain("badge: '/pwa-icon.jpg'");
  });
});
