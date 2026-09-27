const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Gera PNG binário puro com cor sólida ou gradiente usando zlib nativo do Node.js
function createPng(width, height, r, g, b, a = 255) {
  // Assinatura PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  // Linhas de pixel brutas com filtro 0 (None)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filtro None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Círculo Laranja (#f97316)
        // Adiciona um micro-detalhe branco no centro para simular o microfone
        const isMicBody = Math.abs(dx) <= (width * 0.12) && dy >= -(height * 0.22) && dy <= (height * 0.10);
        const isMicBase = Math.abs(dx) <= (width * 0.20) && dy >= (height * 0.20) && dy <= (height * 0.26);

        if (isMicBody || isMicBase) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = a;
        }
      } else {
        // Fundo transparente
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // Monta Chunks com CRC32
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const buf = Buffer.alloc(8 + length + 4);
  buf.writeUInt32BE(length, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.slice(4, 8 + length));
  buf.writeInt32BE(crc, 8 + length);
  return buf;
}

// Implementação simples de CRC32 para PNG
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ -1;
}

const iconsDir = __dirname;
// Laranja ALR Oficial: #f97316 -> (249, 115, 22)
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createPng(16, 16, 249, 115, 22));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createPng(48, 48, 249, 115, 22));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createPng(128, 128, 249, 115, 22));
console.log('Ícones PNG gerados com sucesso!');
