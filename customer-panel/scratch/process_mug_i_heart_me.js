import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function processMugArtwork() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787306308086.png';
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

      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      let minX = w, maxX = 0, minY = h, maxY = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const pIdx = idx * 4;
          const r = data[pIdx];
          const g = data[pIdx + 1];
          const b = data[pIdx + 2];

          // Distance from white background
          const dist = Math.sqrt((r - 255)**2 + (g - 255)**2 + (b - 255)**2);

          if (dist > 25 || r < 240 || g < 240 || b < 240) {
            out[pIdx] = r;
            out[pIdx + 1] = g;
            out[pIdx + 2] = b;
            const alpha = Math.min(255, Math.floor((dist / 35) * 255));
            out[pIdx + 3] = dist > 45 ? 255 : alpha;

            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          } else {
            out[pIdx + 3] = 0;
          }
        }
      }

      ctx.putImageData(outData, 0, 0);

      // Crop to artwork content with 20px padding
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

  const outputPath1 = path.resolve('public/pod/pod_tmpl_mug_i_heart_me.png');
  const outputPath2 = path.resolve('public/pod/pod_tmpl_mug_photo.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath1,
      omitBackground: true,
    });
    await canvasElement.screenshot({
      path: outputPath2,
      omitBackground: true,
    });
    console.log('Successfully saved transparent I ❤️ ME artwork to:', outputPath1);
  }

  await browser.close();
}

processMugArtwork().catch(err => {
  console.error('Error processing mug artwork:', err);
  process.exit(1);
});
