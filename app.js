import { SHEET, layout, clamp, photoGeometry, randomCaptions } from './core.js';
import { withPngDpi } from './core.js';

const $ = selector => document.querySelector(selector);
const preview = $('#preview');
const ctx = preview.getContext('2d', { alpha: false });
const state = { count: 2, selected: 0, cutLines: true, exporting: false, frames: [] };
const emptyFrame = caption => ({ image: null, url: null, name: '', caption, zoom: 1, x: 0, y: 0, rotation: 0, request: 0 });
state.frames = randomCaptions(3).map(emptyFrame);
let pickerIndex = 0;
let drag = null;
let renderPending = false;

function status(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}

function ready() { return state.frames.slice(0, state.count).every(frame => frame.image); }

function renderCaption(context, text, card, sx, sy) {
  if (!text.trim()) return;
  const maxWidth = (card.width - 7) * sx;
  const top = card.y + card.inset + card.imageHeight;
  const centerY = (top + (card.y + card.height)) / 2;
  let fontSize = 3.05 * sy;
  const wrap = () => {
    const lines = [''];
    for (const word of text.trim().split(/\s+/)) {
      const last = lines.length - 1;
      const next = lines[last] ? `${lines[last]} ${word}` : word;
      if (lines[last] && context.measureText(next).width > maxWidth) lines.push(word);
      else lines[last] = next;
    }
    return lines;
  };
  let lines;
  do {
    context.font = `500 ${fontSize}px Caveat, 'Segoe Print', cursive`;
    lines = wrap();
    if (lines.length <= 2 && lines.every(line => context.measureText(line).width <= maxWidth)) break;
    fontSize -= .1 * sy;
  } while (fontSize > 1.3 * sy);
  context.save();
  context.beginPath();
  context.rect(card.x * sx, top * sy, card.width * sx, (card.height - card.inset - card.imageHeight) * sy);
  context.clip();
  context.fillStyle = '#303b32';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, i) => context.fillText(line, (card.x + card.width / 2) * sx, centerY * sy + (i - (lines.length - 1) / 2) * fontSize * 1.05));
  context.restore();
}

function drawSheet(context, width, height, placeholders = false) {
  const sx = width / SHEET.widthMM;
  const sy = height / SHEET.heightMM;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  layout(state.count).forEach((card, index) => {
    const frame = state.frames[index];
    const x = (card.x + card.inset) * sx;
    const y = (card.y + card.inset) * sy;
    const w = card.imageWidth * sx;
    const h = card.imageHeight * sy;
    if (frame.image) {
      const { naturalWidth: iw, naturalHeight: ih } = frame.image;
      const geometry = photoGeometry(iw, ih, w, h, frame.zoom, frame.rotation);
      context.save();
      context.beginPath(); context.rect(x, y, w, h); context.clip();
      context.translate(x + w / 2 + frame.x * geometry.overflowX, y + h / 2 + frame.y * geometry.overflowY);
      context.rotate(frame.rotation * Math.PI / 180);
      context.drawImage(frame.image, -iw * geometry.scale / 2, -ih * geometry.scale / 2, iw * geometry.scale, ih * geometry.scale);
      context.restore();
    } else if (placeholders) {
      context.fillStyle = '#f0f1ea'; context.fillRect(x, y, w, h);
    }
    if (state.cutLines) {
      context.strokeStyle = '#c4c7bd'; context.lineWidth = .07 * sx;
      context.strokeRect(card.x * sx, card.y * sy, card.width * sx, card.height * sy);
    }
    renderCaption(context, frame.caption, card, sx, sy);
  });
}

function render() { drawSheet(ctx, preview.width, preview.height, true); }
function scheduleRender() {
  if (!renderPending) {
    renderPending = true;
    requestAnimationFrame(() => { renderPending = false; render(); });
  }
}

function updateControls() {
  const frame = state.frames[state.selected];
  $('#zoom').disabled = !frame.image;
  $('#zoom').value = frame.zoom;
  $('#zoom-value').value = `${Math.round(frame.zoom * 100)}%`;
  ['rotate-left', 'rotate-right', 'reset-photo', 'remove-photo'].forEach(id => $(`#${id}`).disabled = !frame.image);
  $('#caption').value = frame.caption;
  $('#add-photo').innerHTML = frame.image ? '<span aria-hidden="true">＋</span> Replace photo' : '<span aria-hidden="true">＋</span> Add a photo';
  $('#edit-hint').textContent = frame.image ? `Frame ${state.selected + 1} · drag the photo to position it.` : `Frame ${state.selected + 1} is waiting for a memory.`;
  $('#gesture-hint').textContent = frame.image ? 'Drag to move · double-click to replace' : 'Click a frame. Add a memory.';
  $('#download').disabled = !ready() || state.exporting;
  document.querySelectorAll('.frame-tabs button').forEach((button, index) => {
    button.classList.toggle('active', index === state.selected);
    button.setAttribute('aria-pressed', index === state.selected);
  });
  document.querySelectorAll('.photo-target').forEach((button, index) => {
    button.classList.toggle('selected', index === state.selected);
    button.classList.toggle('empty', !state.frames[index].image);
    button.setAttribute('aria-label', `${state.frames[index].image ? 'Adjust' : 'Add photo to'} frame ${index + 1}`);
    button.querySelector('.placeholder').hidden = !!state.frames[index].image;
  });
}

function select(index) {
  state.selected = index;
  updateControls();
}

function pick(index) {
  pickerIndex = index;
  $('#file-input').value = '';
  $('#file-input').click();
}

async function loadPhoto(file, index) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    status('Please choose a JPG, PNG or WebP photo. Convert HEIC photos to JPG first.', true); return;
  }
  const frame = state.frames[index];
  const request = ++frame.request;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    if (frame.request !== request || state.frames[index] !== frame) { URL.revokeObjectURL(url); return; }
    if (frame.url) URL.revokeObjectURL(frame.url);
    Object.assign(frame, { image, url, name: file.name, zoom: 1, rotation: 0, x: 0, y: 0 });
    select(Math.min(index, state.count - 1));
    render();
    const remaining = state.frames.slice(0, state.count).filter(item => !item.image).length;
    status(remaining ? `Lovely. Add ${remaining} more photo${remaining === 1 ? '' : 's'} to finish your sheet.` : 'All set. Add a little note, or save your frames.');
  } catch {
    URL.revokeObjectURL(url);
    status('That photo could not be opened. Try a JPG, PNG or WebP file.', true);
  }
}

function frameGeometry(index, element) {
  const frame = state.frames[index];
  const box = element.getBoundingClientRect();
  return photoGeometry(frame.image.naturalWidth, frame.image.naturalHeight, box.width, box.height, frame.zoom, frame.rotation);
}

function buildFrames() {
  const host = $('#frames');
  host.replaceChildren();
  const tabs = $('.frame-tabs'); tabs.replaceChildren();
  layout(state.count).forEach((card, index) => {
    const tab = document.createElement('button'); tab.type = 'button'; tab.textContent = index + 1;
    tab.setAttribute('aria-label', `Select frame ${index + 1}`);
    tab.addEventListener('click', () => select(index)); tabs.append(tab);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'photo-target';
    Object.assign(button.style, { left: `${(card.x + card.inset) / 1.5}%`, top: `${card.y + card.inset}%`, width: `${card.imageWidth / 1.5}%`, height: `${card.imageHeight}%` });
    button.innerHTML = `<span class="placeholder"><svg viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="5" width="27" height="30" rx="1"/><path d="m8 27 8-10 7 8 4-5 5 7M23 11h6m-3-3v6"/></svg><strong>Add a memory</strong><small>click or drop a photo</small></span><span class="frame-number" aria-hidden="true">${index + 1}</span>`;
    button.addEventListener('click', () => { select(index); if (!state.frames[index].image) pick(index); });
    button.addEventListener('dblclick', () => { if (state.frames[index].image) pick(index); });
    button.addEventListener('keydown', event => {
      const frame = state.frames[index];
      if (!frame.image) return;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(index); pick(index); }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault(); select(index);
        const delta = event.shiftKey ? .15 : .03;
        if (event.key === 'ArrowLeft') frame.x = clamp(frame.x - delta);
        if (event.key === 'ArrowRight') frame.x = clamp(frame.x + delta);
        if (event.key === 'ArrowUp') frame.y = clamp(frame.y - delta);
        if (event.key === 'ArrowDown') frame.y = clamp(frame.y + delta);
        scheduleRender();
      }
    });
    button.addEventListener('pointerdown', event => {
      select(index);
      const frame = state.frames[index];
      if (!frame.image || event.button !== 0) return;
      drag = { index, id: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: frame.x, y: frame.y, geometry: frameGeometry(index, button) };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId || drag.index !== index) return;
      const frame = state.frames[index];
      frame.x = drag.geometry.overflowX > .01 ? clamp(drag.x + (event.clientX - drag.clientX) / drag.geometry.overflowX) : 0;
      frame.y = drag.geometry.overflowY > .01 ? clamp(drag.y + (event.clientY - drag.clientY) / drag.geometry.overflowY) : 0;
      scheduleRender();
    });
    const endDrag = () => { drag = null; };
    button.addEventListener('pointerup', endDrag); button.addEventListener('pointercancel', endDrag); button.addEventListener('lostpointercapture', endDrag);
    button.addEventListener('dragover', event => { event.preventDefault(); button.classList.add('drag-over'); });
    button.addEventListener('dragleave', () => button.classList.remove('drag-over'));
    button.addEventListener('drop', event => {
      event.preventDefault(); button.classList.remove('drag-over'); select(index); loadPhoto(event.dataTransfer.files[0], index);
    });
    host.append(button);
  });
  $('#frame-size').textContent = state.count === 2 ? 'two 62 × 86 mm keepsakes' : 'three 42 × 62 mm keepsakes';
  updateControls(); render();
}

document.querySelectorAll('.template').forEach(button => button.addEventListener('click', () => {
  state.count = Number(button.dataset.count);
  state.selected = Math.min(state.selected, state.count - 1);
  document.querySelectorAll('.template').forEach(option => {
    const active = Number(option.dataset.count) === state.count;
    option.classList.toggle('active', active); option.setAttribute('aria-pressed', active);
  });
  buildFrames();
  const remaining = state.frames.slice(0, state.count).filter(frame => !frame.image).length;
  status(remaining ? `Add ${remaining} photo${remaining === 1 ? '' : 's'} to finish your sheet.` : 'Your photos are ready in this layout.');
}));
$('#add-photo').addEventListener('click', () => pick(state.selected));
$('#file-input').addEventListener('change', event => loadPhoto(event.target.files[0], pickerIndex));
$('#zoom').addEventListener('input', event => {
  state.frames[state.selected].zoom = Number(event.target.value);
  $('#zoom-value').value = `${Math.round(Number(event.target.value) * 100)}%`; scheduleRender();
});
function rotate(degrees) {
  const frame = state.frames[state.selected]; frame.rotation = (frame.rotation + degrees + 360) % 360;
  frame.x = frame.y = 0; scheduleRender();
}
$('#rotate-left').addEventListener('click', () => rotate(-90));
$('#rotate-right').addEventListener('click', () => rotate(90));
$('#reset-photo').addEventListener('click', () => {
  Object.assign(state.frames[state.selected], { x: 0, y: 0, zoom: 1, rotation: 0 }); updateControls(); scheduleRender();
});
$('#remove-photo').addEventListener('click', () => {
  const frame = state.frames[state.selected];
  frame.request++; if (frame.url) URL.revokeObjectURL(frame.url);
  Object.assign(frame, { image: null, url: null, name: '', x: 0, y: 0, zoom: 1, rotation: 0 });
  updateControls(); render(); status('Photo removed. Your caption is still here.');
});
$('#caption').addEventListener('input', event => { state.frames[state.selected].caption = event.target.value; scheduleRender(); });
$('#shuffle').addEventListener('click', () => {
  randomCaptions(3).forEach((caption, index) => state.frames[index].caption = caption);
  updateControls(); render(); status('A fresh little note for every frame.');
});
$('#cut-lines').addEventListener('change', event => { state.cutLines = event.target.checked; render(); });
$('#help-toggle').addEventListener('click', () => {
  $('#help').hidden = !$('#help').hidden;
  $('#help-toggle').setAttribute('aria-expanded', !$('#help').hidden);
});
$('#clear').addEventListener('click', () => $('#clear-dialog').showModal());
$('#cancel-clear').addEventListener('click', () => $('#clear-dialog').close());
$('#confirm-clear').addEventListener('click', () => {
  state.frames.forEach(frame => { frame.request++; if (frame.url) URL.revokeObjectURL(frame.url); });
  state.frames = randomCaptions(3).map(emptyFrame); state.selected = 0;
  $('#clear-dialog').close(); buildFrames(); status(`Add ${state.count} photos to make your print sheet.`);
});
$('#download').addEventListener('click', async () => {
  if (!ready() || state.exporting) return;
  state.exporting = true; updateControls(); status('Making your full-resolution print sheet…');
  try {
    await document.fonts.load('500 40px Caveat');
    await document.fonts.ready;
    const canvas = document.createElement('canvas'); canvas.width = SHEET.width; canvas.height = SHEET.height;
    drawSheet(canvas.getContext('2d', { alpha: false }), canvas.width, canvas.height);
    const png = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not export PNG.')), 'image/png'));
    const output = new Blob([withPngDpi(await png.arrayBuffer())], { type: 'image/png' });
    const url = URL.createObjectURL(output);
    const link = document.createElement('a'); link.href = url; link.download = `little-frames-${state.count}-photos-600dpi.png`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status('Saved with love. Print on 15 × 10 cm paper at 100% / actual size.');
  } catch (error) {
    status('Your PNG could not be saved. Please try again.', true);
    console.error(error);
  } finally { state.exporting = false; updateControls(); }
});

window.addEventListener('beforeunload', event => {
  if (state.frames.some(frame => frame.image)) { event.preventDefault(); event.returnValue = ''; }
});
buildFrames();
document.fonts.ready.then(render);
