// Generate PWA icons for MemoAle
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const outDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Generate a minimal memo/notebook icon
function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const p = size / 100; // proportion unit

  // Background
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(p * 10, p * 10, p * 80, p * 80, p * 14);
  ctx.fill();

  // Notebook cover
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(p * 18, p * 18, p * 64, p * 64, p * 8);
  ctx.fill();

  // Pages (white area)
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(p * 24, p * 24, p * 52, p * 52, p * 4);
  ctx.fill();

  // Lines on page
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = p * 1.5;
  for (let i = 0; i < 4; i++) {
    const y = p * 34 + i * p * 9;
    ctx.beginPath();
    ctx.moveTo(p * 30, y);
    ctx.lineTo(p * 70, y);
    ctx.stroke();
  }

  // Pencil diagonal
  ctx.save();
  ctx.translate(p * 55, p * 35);
  ctx.rotate(-0.4);
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.roundRect(-p * 2, -p * 2, p * 30, p * 5, p * 2);
  ctx.fill();
  // Pencil tip
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(p * 28, -p * 4);
  ctx.lineTo(p * 34, 0);
  ctx.lineTo(p * 28, p * 4);
  ctx.closePath();
  ctx.fill();
  // Pencil lead
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(p * 30, -p * 2);
  ctx.lineTo(p * 34, 0);
  ctx.lineTo(p * 30, p * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  return canvas.toBuffer('image/png');
}

for (const s of sizes) {
  const buf = drawIcon(s);
  fs.writeFileSync(path.join(outDir, `icon-${s}.png`), buf);
  console.log(`✓ Generated icon-${s}.png`);
}

console.log('Done!');