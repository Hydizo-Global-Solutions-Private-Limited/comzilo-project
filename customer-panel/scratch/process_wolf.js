import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function processWolfArtwork() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787297175904.png';
  const sourceBase64 = fs.readFileSync(sourceImagePath).toString('base64');
  const dataUri = `data:image/png;base64,${sourceBase64}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('c');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      const srcData = ctx.getImageData(0, 0, w, h);
      const data = srcData.data;

      const bgR = 13, bgG = 18, bgB = 24;

      // 1. Identify cyan / white / glowing detail pixels
      const isFeature = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
        
        if ((b > 45 && b > r + 8) || dist > 22 || r > 35 || g > 35) {
          isFeature[i] = 1;
        }
      }

      // 2. Compute smooth perimeter contour of wolf head
      const cx = w * 0.5;
      const cy = h * 0.52;
      const angleCount = 360;
      const maxRadius = Math.min(w, h) * 0.38;
      const contourPoints = [];

      for (let i = 0; i < angleCount; i++) {
        const angle = (i * 2 * Math.PI) / angleCount;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        let maxR = 40;
        for (let r = 40; r < maxRadius; r += 2) {
          const x = Math.round(cx + cos * r);
          const y = Math.round(cy + sin * r);

          if (x >= 0 && x < w && y >= 0 && y < h) {
            const isText = (y < h * 0.32 && (x < w * 0.28 || x > w * 0.72 || y < h * 0.16));
            if (isFeature[y * w + x] && !isText) {
              maxR = r;
            }
          }
        }

        contourPoints.push({
          x: cx + cos * (maxR + 5),
          y: cy + sin * (maxR + 5)
        });
      }

      // 3. Draw solid mask on separate canvas
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.fillStyle = '#000000';

      // Fill wolf head polygon
      mCtx.beginPath();
      mCtx.moveTo(contourPoints[0].x, contourPoints[0].y);
      for (let i = 1; i < contourPoints.length; i++) {
        mCtx.lineTo(contourPoints[i].x, contourPoints[i].y);
      }
      mCtx.closePath();
      mCtx.fill();

      // Also fill bottom geometric neck diamond
      mCtx.beginPath();
      mCtx.moveTo(w * 0.35, h * 0.78);
      mCtx.lineTo(w * 0.65, h * 0.78);
      mCtx.lineTo(w * 0.55, h * 0.94);
      mCtx.lineTo(w * 0.45, h * 0.94);
      mCtx.closePath();
      mCtx.fill();

      const maskData = mCtx.getImageData(0, 0, w, h).data;

      // 4. Output final pixels
      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      for (let i = 0; i < w * h; i++) {
        const pIdx = i * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];

        if (isFeature[i]) {
          // Sharp text, cyan outlines, eyes, whiskers
          out[pIdx] = r;
          out[pIdx + 1] = g;
          out[pIdx + 2] = b;
          out[pIdx + 3] = 255;
        } else if (maskData[pIdx + 3] > 128) {
          // Solid rich black/navy fur within wolf contour
          out[pIdx] = Math.max(10, r);
          out[pIdx + 1] = Math.max(14, g);
          out[pIdx + 2] = Math.max(20, b);
          out[pIdx + 3] = 255;
        } else {
          // 100% transparent background
          out[pIdx + 3] = 0;
        }
      }

      ctx.putImageData(outData, 0, 0);
      window.__DONE = true;
    };
    img.src = "${dataUri}";
  </script>
</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => window.__DONE === true);

  const outputPath = path.resolve('public/pod/pod_tmpl_typography.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Successfully saved transparent wolf artwork to:', outputPath);
  }

  await browser.close();
}

processWolfArtwork().catch(err => {
  console.error('Error processing wolf artwork:', err);
  process.exit(1);
});
