// Indexed PNG-8 encoder for YoWorld paint boards.
// Produces a color-type 3 PNG with a multi-level tRNS alpha table and no dithering.

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const DEFAULT_WIDTH = 390;
const DEFAULT_HEIGHT = 260;
const DEFAULT_MAX_COLORS = 256;

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint32(target, offset, value) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function asciiBytes(text) {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i);
  return out;
}

function makeChunk(type, data) {
  const typeBytes = asciiBytes(type);
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  writeUint32(out, 8 + data.length, crc32(crcInput));
  return out;
}

function concatBytes(parts) {
  let length = 0;
  for (const part of parts) length += part.length;
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function deflateZlib(bytes) {
  if (typeof CompressionStream !== 'function') {
    throw new Error('This Chrome version does not support PNG compression.');
  }
  const stream = new CompressionStream('deflate');
  const writer = stream.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

function colorKey(r, g, b, a) {
  return ((((r << 24) >>> 0) | (g << 16) | (b << 8) | a) >>> 0);
}

function keyToColor(key, count) {
  return {
    r: (key >>> 24) & 0xff,
    g: (key >>> 16) & 0xff,
    b: (key >>> 8) & 0xff,
    a: key & 0xff,
    count
  };
}

function premultipliedComponents(color) {
  const scale = color.a / 255;
  return [color.r * scale, color.g * scale, color.b * scale, color.a];
}

function makeBox(colors) {
  const box = {
    colors,
    count: 0,
    min: [255, 255, 255, 255],
    max: [0, 0, 0, 0],
    score: 0,
    splitChannel: 0
  };

  for (const color of colors) {
    const v = premultipliedComponents(color);
    box.count += color.count;
    for (let channel = 0; channel < 4; channel += 1) {
      if (v[channel] < box.min[channel]) box.min[channel] = v[channel];
      if (v[channel] > box.max[channel]) box.max[channel] = v[channel];
    }
  }

  const ranges = box.max.map((value, index) => value - box.min[index]);
  const channelWeights = [1, 1.15, 0.8, 1.35];
  let bestRange = -1;
  for (let channel = 0; channel < 4; channel += 1) {
    const weighted = ranges[channel] * channelWeights[channel];
    if (weighted > bestRange) {
      bestRange = weighted;
      box.splitChannel = channel;
    }
  }
  box.score = box.count * Math.max(1, bestRange);
  return box;
}

function splitBox(box) {
  if (!box || box.colors.length < 2) return null;
  const channel = box.splitChannel;
  const sorted = box.colors.slice().sort((left, right) => {
    const lv = premultipliedComponents(left)[channel];
    const rv = premultipliedComponents(right)[channel];
    return lv - rv;
  });

  const halfway = box.count / 2;
  let cumulative = 0;
  let splitAt = 1;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    cumulative += sorted[i].count;
    if (cumulative >= halfway) {
      splitAt = i + 1;
      break;
    }
  }

  if (splitAt <= 0 || splitAt >= sorted.length) splitAt = Math.floor(sorted.length / 2);
  return [makeBox(sorted.slice(0, splitAt)), makeBox(sorted.slice(splitAt))];
}

function paletteColorForBox(box) {
  let total = 0;
  let alphaSum = 0;
  let premulR = 0;
  let premulG = 0;
  let premulB = 0;

  for (const color of box.colors) {
    const weight = color.count;
    const alphaScale = color.a / 255;
    total += weight;
    alphaSum += color.a * weight;
    premulR += color.r * alphaScale * weight;
    premulG += color.g * alphaScale * weight;
    premulB += color.b * alphaScale * weight;
  }

  const a = total ? Math.round(alphaSum / total) : 0;
  if (!total || a === 0) return { r: 0, g: 0, b: 0, a: 0 };

  const averageAlphaScale = a / 255;
  return {
    r: Math.max(0, Math.min(255, Math.round((premulR / total) / averageAlphaScale))),
    g: Math.max(0, Math.min(255, Math.round((premulG / total) / averageAlphaScale))),
    b: Math.max(0, Math.min(255, Math.round((premulB / total) / averageAlphaScale))),
    a
  };
}

function colorDistance(left, right) {
  const la = left.a / 255;
  const ra = right.a / 255;
  const dr = (left.r * la) - (right.r * ra);
  const dg = (left.g * la) - (right.g * ra);
  const db = (left.b * la) - (right.b * ra);
  const da = left.a - right.a;
  return (dr * dr * 0.9) + (dg * dg * 1.15) + (db * db * 0.65) + (da * da * 1.35);
}

function buildPaletteAndIndices(rgba, maxColors) {
  const histogram = new Map();
  const pixelKeys = new Uint32Array(rgba.length / 4);
  let hasTransparent = false;

  for (let pixel = 0, offset = 0; offset < rgba.length; pixel += 1, offset += 4) {
    let r = rgba[offset];
    let g = rgba[offset + 1];
    let b = rgba[offset + 2];
    const a = rgba[offset + 3];
    if (a === 0) {
      r = 0;
      g = 0;
      b = 0;
      hasTransparent = true;
    }
    const key = colorKey(r, g, b, a);
    pixelKeys[pixel] = key;
    histogram.set(key, (histogram.get(key) || 0) + 1);
  }

  const transparentKey = colorKey(0, 0, 0, 0);
  const exactColors = [];
  for (const [key, count] of histogram.entries()) {
    if (hasTransparent && key === transparentKey) continue;
    exactColors.push(keyToColor(key, count));
  }

  const palette = hasTransparent ? [{ r: 0, g: 0, b: 0, a: 0 }] : [];
  const available = Math.max(1, maxColors - palette.length);

  if (exactColors.length <= available) {
    exactColors.sort((left, right) => right.count - left.count);
    palette.push(...exactColors.map(({ r, g, b, a }) => ({ r, g, b, a })));
  } else {
    const boxes = [makeBox(exactColors)];
    while (boxes.length < available) {
      let bestIndex = -1;
      let bestScore = -1;
      for (let i = 0; i < boxes.length; i += 1) {
        if (boxes[i].colors.length > 1 && boxes[i].score > bestScore) {
          bestIndex = i;
          bestScore = boxes[i].score;
        }
      }
      if (bestIndex < 0) break;
      const pieces = splitBox(boxes[bestIndex]);
      if (!pieces) break;
      boxes.splice(bestIndex, 1, pieces[0], pieces[1]);
    }
    boxes.sort((left, right) => right.count - left.count);
    palette.push(...boxes.map(paletteColorForBox));
  }

  if (palette.length > maxColors) palette.length = maxColors;
  if (palette.length === 0) palette.push({ r: 0, g: 0, b: 0, a: 0 });

  const keyToIndex = new Map();
  if (hasTransparent) keyToIndex.set(transparentKey, 0);

  for (const [key] of histogram.entries()) {
    if (keyToIndex.has(key)) continue;
    const color = keyToColor(key, 1);
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = hasTransparent ? 1 : 0; index < palette.length; index += 1) {
      const distance = colorDistance(color, palette[index]);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
        if (distance === 0) break;
      }
    }
    keyToIndex.set(key, nearest);
  }

  const indices = new Uint8Array(pixelKeys.length);
  for (let i = 0; i < pixelKeys.length; i += 1) indices[i] = keyToIndex.get(pixelKeys[i]);

  return { palette, indices };
}

export async function encodeIndexedPngFromRgba(rgba, width, height, maxColors = DEFAULT_MAX_COLORS) {
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray)) {
    throw new TypeError('RGBA pixel data must be a Uint8Array.');
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new TypeError('PNG dimensions must be positive integers.');
  }
  if (rgba.length !== width * height * 4) {
    throw new Error('RGBA pixel data does not match the requested dimensions.');
  }

  const safeColorCount = Math.max(2, Math.min(256, Math.round(maxColors || DEFAULT_MAX_COLORS)));
  const { palette, indices } = buildPaletteAndIndices(rgba, safeColorCount);

  const scanlines = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width + 1);
    scanlines[rowOffset] = 0; // PNG filter: None. No dithering is applied.
    scanlines.set(indices.subarray(y * width, (y + 1) * width), rowOffset + 1);
  }

  const ihdr = new Uint8Array(13);
  writeUint32(ihdr, 0, width);
  writeUint32(ihdr, 4, height);
  ihdr[8] = 8; // 8-bit palette indices
  ihdr[9] = 3; // indexed-color PNG
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const plte = new Uint8Array(palette.length * 3);
  const trns = new Uint8Array(palette.length);
  const alphaLevels = new Set();
  for (let index = 0; index < palette.length; index += 1) {
    const color = palette[index];
    plte[index * 3] = color.r;
    plte[(index * 3) + 1] = color.g;
    plte[(index * 3) + 2] = color.b;
    trns[index] = color.a;
    alphaLevels.add(color.a);
  }

  const compressed = await deflateZlib(scanlines);
  const bytes = concatBytes([
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdr),
    makeChunk('PLTE', plte),
    makeChunk('tRNS', trns),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', new Uint8Array(0))
  ]);

  return {
    blob: new Blob([bytes], { type: 'image/png' }),
    paletteSize: palette.length,
    alphaLevels: alphaLevels.size,
    byteLength: bytes.length
  };
}

async function loadImageBitmap(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected image could not be decoded.'));
    };
    image.src = url;
  });
}

export async function prepareYoWorldIndexedPng(file, options = {}) {
  if (!(file instanceof Blob)) throw new TypeError('Select an image file first.');

  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;
  const allowResize = options.allowResize === true;
  const image = await loadImageBitmap(file);
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const needsResize = sourceWidth !== width || sourceHeight !== height;

  try {
    if (needsResize && !allowResize) {
      const error = new Error(`YoWorld-compatible mode requires ${width}×${height}. Turn on Auto-resize or prepare the image in Tools.`);
      error.code = 'YWP_DIMENSIONS';
      throw error;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas image processing is unavailable.');

    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    if (needsResize) {
      const scale = Math.min(width / sourceWidth, height / sourceHeight);
      const drawWidth = sourceWidth * scale;
      const drawHeight = sourceHeight * scale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    } else {
      context.drawImage(image, 0, 0, width, height);
    }

    const imageData = context.getImageData(0, 0, width, height);
    const encoded = await encodeIndexedPngFromRgba(imageData.data, width, height, options.maxColors || DEFAULT_MAX_COLORS);
    return {
      ...encoded,
      width,
      height,
      sourceWidth,
      sourceHeight,
      resized: needsResize
    };
  } finally {
    if (image && typeof image.close === 'function') image.close();
  }
}
