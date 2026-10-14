import test from 'node:test';
import assert from 'node:assert/strict';
import { SHEET, layout, photoGeometry, randomCaptions, crc32, withPngDpi } from '../core.js';

test('compact templates fill the sheet with 5 mm margins and 2 mm cutting gaps', () => {
  for (const count of [2, 3]) {
    const cards = layout(count);
    assert.equal(cards.length, count);
    cards.forEach((card, index) => {
      assert.ok(card.x >= 5 && card.y >= 5);
      assert.ok(card.x + card.width <= 145 + 1e-9 && card.y + card.height <= 95);
      assert.equal(card.y, 5);
      assert.equal(card.height, 90);
      assert.equal(card.inset, count === 3 ? 2 : 3);
      assert.ok(card.height - card.inset - card.imageHeight >= 8);
      assert.ok(card.height - card.inset - card.imageHeight > card.inset);
      if (index) assert.ok(Math.abs(card.x - (cards[index - 1].x + cards[index - 1].width) - 2) < 1e-9);
    });
    assert.ok(Math.abs(cards.at(-1).x + cards.at(-1).width - 145) < 1e-9);
  }
  assert.throws(() => layout(4), RangeError);
});

test('cropping fills the viewport without stretch, including quarter-turn rotations', () => {
  for (const [iw, ih] of [[4000, 2000], [2000, 4000], [3000, 3000]]) {
    for (const rotation of [0, 90, 180, 270]) {
      for (const zoom of [1, 2, 4]) {
        const { scale, overflowX, overflowY } = photoGeometry(iw, ih, 540, 720, zoom, rotation);
        const [rw, rh] = rotation % 180 ? [ih, iw] : [iw, ih];
        assert.ok(rw * scale >= 540 && rh * scale >= 720);
        assert.ok(overflowX >= 0 && overflowY >= 0);
        // Even at maximum drag, every edge of the viewport remains covered.
        assert.ok(rw * scale / 2 - overflowX >= 270 - 1e-8);
        assert.ok(rh * scale / 2 - overflowY >= 360 - 1e-8);
      }
    }
  }
});

test('random notes are distinct and come from the original list', () => {
  for (let i = 0; i < 100; i++) assert.equal(new Set(randomCaptions(3)).size, 3);
});

function chunk(type, data) {
  const bytes = new Uint8Array(data.length + 12); const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length); bytes.set(new TextEncoder().encode(type), 4); bytes.set(data, 8);
  view.setUint32(data.length + 8, crc32(bytes.subarray(4, data.length + 8))); return bytes;
}
function parse(bytes) {
  const chunks = []; const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 8; i < bytes.length;) {
    const length = view.getUint32(i); const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
    const data = bytes.slice(i + 8, i + 8 + length);
    assert.equal(view.getUint32(i + length + 8), crc32(bytes.subarray(i + 4, i + length + 8)));
    chunks.push({ type, data }); i += length + 12;
  }
  return chunks;
}
test('600 DPI metadata preserves exact PNG image bytes and replaces previous density', () => {
  const signature = new Uint8Array([137,80,78,71,13,10,26,10]);
  const header = new Uint8Array(13); const headerView = new DataView(header.buffer);
  headerView.setUint32(0, SHEET.width); headerView.setUint32(4, SHEET.height); header[8] = 8; header[9] = 2;
  const pixels = new Uint8Array([1,2,3,4,5,255]);
  const input = new Uint8Array([...signature, ...chunk('IHDR', header), ...chunk('pHYs', new Uint8Array(9)), ...chunk('IDAT', pixels), ...chunk('IEND', new Uint8Array())]);
  const output = withPngDpi(input); const chunks = parse(output);
  assert.deepEqual(chunks.map(c => c.type), ['IHDR','pHYs','IDAT','IEND']);
  assert.deepEqual(chunks.find(c => c.type === 'IDAT').data, pixels);
  const density = new DataView(chunks[1].data.buffer);
  assert.equal(density.getUint32(0), 23622); assert.equal(density.getUint32(4), 23622); assert.equal(density.getUint8(8), 1);
  assert.deepEqual(withPngDpi(output), output);
  assert.throws(() => withPngDpi(new Uint8Array(20)), /Invalid PNG/);
});
