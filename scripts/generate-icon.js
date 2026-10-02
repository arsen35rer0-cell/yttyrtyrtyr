const fs = require('fs/promises');
const path = require('path');

let sharp;

try {
  sharp = require('sharp');
} catch (error) {
  console.error('sharp не установлен. Выполни: npm install');
  process.exit(1);
}

const sizes = [256, 128, 64, 48, 32, 16];

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>

  <rect x="16" y="16" width="480" height="480" rx="96" fill="#0b1020"/>
  <rect x="36" y="36" width="440" height="440" rx="80" fill="url(#g)" opacity="0.16"/>

  <path
    d="M180 170 L110 256 L180 342"
    fill="none"
    stroke="url(#g)"
    stroke-width="34"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <path
    d="M332 170 L402 256 L332 342"
    fill="none"
    stroke="url(#g)"
    stroke-width="34"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <path
    d="M282 148 L230 364"
    fill="none"
    stroke="#e2e8f0"
    stroke-width="28"
    stroke-linecap="round"
  />
</svg>
`;

let canUseSvg = true;

async function renderPng(size) {
  if (canUseSvg) {
    try {
      return await sharp(Buffer.from(svg), { density: 300 })
        .resize(size, size)
        .png()
        .toBuffer();
    } catch (error) {
      canUseSvg = false;
      console.warn('SVG рендер недоступен, использую запасную иконку.');
    }
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: {
        r: 79,
        g: 70,
        b: 229,
        alpha: 1
      }
    }
  })
    .png()
    .toBuffer();
}

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6 + count * 16);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = header.length;

  pngBuffers.forEach((png, index) => {
    const size = sizes[index];
    const dimension = size >= 256 ? 0 : size;

    const entry = Buffer.alloc(16);

    entry.writeUInt8(dimension, 0);
    entry.writeUInt8(dimension, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);

    entry.copy(header, 6 + index * 16);

    offset += png.length;
  });

  return Buffer.concat([header, ...pngBuffers]);
}

async function main() {
  const buildDir = path.join(__dirname, '..', 'build');

  await fs.mkdir(buildDir, { recursive: true });

  const pngBuffers = [];

  for (const size of sizes) {
    pngBuffers.push(await renderPng(size));
  }

  const png256 = pngBuffers[0];
  const ico = buildIco(pngBuffers);

  await fs.writeFile(path.join(buildDir, 'icon.png'), png256);
  await fs.writeFile(path.join(buildDir, 'icon.ico'), ico);

  console.log('Иконка успешно создана: build/icon.ico');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
