import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, text) {
  // Minimal PNG generator in pure Node with zlib
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8; // 8-bit depth
  IHDR[9] = 2; // Truecolor (RGB)
  IHDR[10] = 0; // Deflate compression
  IHDR[11] = 0; // Filter method
  IHDR[12] = 0; // Interlace: none

  // Raw pixel data: 1 byte filter (0 = None) + width * 3 bytes per scanline
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // Border or tactical crosshair pattern
      const isBorder = x < 6 || x >= width - 6 || y < 6 || y >= height - 6;
      const isCross = Math.abs(x - width / 2) < 2 || Math.abs(y - height / 2) < 2;
      
      if (isBorder) {
        rawData[pixelOffset] = 78;     // Tactical accent
        rawData[pixelOffset + 1] = 107;
        rawData[pixelOffset + 2] = 76;
      } else if (isCross) {
        rawData[pixelOffset] = 129;    // #81c784
        rawData[pixelOffset + 1] = 199;
        rawData[pixelOffset + 2] = 132;
      } else {
        rawData[pixelOffset] = r;      // Background #212121
        rawData[pixelOffset + 1] = g;
        rawData[pixelOffset + 2] = b;
      }
    }
  }

  const IDAT = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const bit = (crc ^ byte) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(8 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
    return chunk;
  }

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', IHDR);
  const idatChunk = makeChunk('IDAT', IDAT);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPNG(192, 192, 33, 33, 33, 'VTT'));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPNG(512, 512, 33, 33, 33, 'VTT'));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512x512.png'), createPNG(512, 512, 46, 74, 49, 'VTT'));

console.log('Iconos PWA generados con éxito en public/icons/');
