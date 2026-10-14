export const SHEET = Object.freeze({ width: 3543, height: 2362, widthMM: 150, heightMM: 100, dpi: 600 });
export const CAPTIONS = Object.freeze([
  'Little moments, big memories', 'Forever my favorite', 'The good old days',
  'A moment worth keeping', 'Our little forever', 'Happiness looks like this',
  'One for the memories', 'Wish we were here again', 'Just like yesterday',
  "Life's beautiful little moments",
]);

export function layout(count) {
  if (count !== 2 && count !== 3) throw new RangeError('Choose two or three photos.');
  const margin = 5;
  const gap = 5;
  const inset = count === 3 ? 2 : 3;
  const width = (SHEET.widthMM - margin * 2 - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({
    x: margin + index * (width + gap), y: margin,
    width, height: 90, inset, imageWidth: width - inset * 2, imageHeight: count === 3 ? 80 : 76,
  }));
}

export const clamp = (value, min = -1, max = 1) => Math.max(min, Math.min(max, value));

export function photoGeometry(imageWidth, imageHeight, viewportWidth, viewportHeight, zoom = 1, rotation = 0) {
  const swapped = Math.abs(rotation / 90) % 2 === 1;
  const rotatedWidth = swapped ? imageHeight : imageWidth;
  const rotatedHeight = swapped ? imageWidth : imageHeight;
  const scale = Math.max(viewportWidth / rotatedWidth, viewportHeight / rotatedHeight) * zoom;
  return {
    scale,
    overflowX: Math.max(0, (rotatedWidth * scale - viewportWidth) / 2),
    overflowY: Math.max(0, (rotatedHeight * scale - viewportHeight) / 2),
  };
}

export function randomCaptions(count, random = Math.random) {
  const pool = [...CAPTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Insert density metadata without touching or re-compressing image data.
export function withPngDpi(buffer, dpi = SHEET.dpi) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, i) => bytes[i] === byte)) throw new Error('Invalid PNG.');
  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4); // pHYs
  const ppm = Math.round(dpi / 0.0254);
  chunkView.setUint32(8, ppm);
  chunkView.setUint32(12, ppm);
  chunk[16] = 1; // pixels per metre
  chunkView.setUint32(17, crc32(chunk.subarray(4, 17)));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pieces = [bytes.subarray(0, 8)];
  let position = 8;
  let inserted = false;
  while (position < bytes.length) {
    if (position + 12 > bytes.length) throw new Error('Truncated PNG.');
    const length = view.getUint32(position);
    const end = position + length + 12;
    if (end > bytes.length) throw new Error('Truncated PNG chunk.');
    const type = String.fromCharCode(...bytes.subarray(position + 4, position + 8));
    if (type !== 'pHYs') pieces.push(bytes.subarray(position, end));
    if (type === 'IHDR') { pieces.push(chunk); inserted = true; }
    position = end;
  }
  if (!inserted) throw new Error('Missing PNG header.');
  const output = new Uint8Array(pieces.reduce((sum, piece) => sum + piece.length, 0));
  let offset = 0;
  for (const piece of pieces) { output.set(piece, offset); offset += piece.length; }
  return output;
}
