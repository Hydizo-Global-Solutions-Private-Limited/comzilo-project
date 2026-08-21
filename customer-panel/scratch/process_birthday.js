import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function processBirthdayArtwork() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787298805113.png';
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

      // Sample background from top-left corner
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];

      // Flood fill from edges to remove outer white background
      const visited = new Uint8Array(w * h);
      const isOuterBg = new Uint8Array(w * h);
      const queue = [];

      function pushPixel(x, y) {
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        const idx = y * w + x;
        if (visited[idx]) return;
        visited[idx] = 1;

        const pIdx = idx * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];

        // Match white background
        const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
        if (dist < 35 || (r > 245 && g > 245 && b > 245)) {
          isOuterBg[idx] = 1;
          queue.push(x, y);
        }
      }

      // Seed all edges
      for (let x = 0; x < w; x++) {
        pushPixel(x, 0);
        pushPixel(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        pushPixel(0, y);
        pushPixel(w - 1, y);
      }

      let head = 0;
      while (head < queue.length) {
        const x = queue[head++];
        const y = queue[head++];

        pushPixel(x + 1, y);
        pushPixel(x - 1, y);
        pushPixel(x, y + 1);
        pushPixel(x, y - 1);
      }

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      // Bounding box calculation for trimming
      let minX = w, maxX = 0, minY = h, maxY = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const pIdx = idx * 4;

          if (isOuterBg[idx]) {
            out[pIdx + 3] = 0; // Pure transparent background
          } else {
            out[pIdx] = data[pIdx];
            out[pIdx + 1] = data[pIdx + 1];
            out[pIdx + 2] = data[pIdx + 2];
            out[pIdx + 3] = 255;

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      ctx.putImageData(outData, 0, 0);

      // Crop to content with comfortable padding
      const pad = 20;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(w - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(h - cropY, (maxY - minY) + pad * 2);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cCtx = cropCanvas.getContext('2d');
      cCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(cropCanvas, 0, 0);

      window.__DONE = true;
    };
    img.src = "${dataUri}";
  </script>
</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => window.__DONE === true);

  const outputPath = path.resolve('public/pod/pod_tmpl_birthday.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Successfully saved transparent birthday girl artwork to:', outputPath);
  }

  await browser.close();
}

processBirthdayArtwork().catch(err => {
  console.error('Error processing birthday artwork:', err);
  process.exit(1);
});
