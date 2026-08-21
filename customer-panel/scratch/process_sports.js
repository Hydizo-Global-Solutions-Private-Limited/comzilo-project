import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function processSportsArtwork() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787298358912.png';
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

      const cx = w * 0.5;
      const cy = h * 0.44;
      const sunRadius = w * 0.30;

      // Identify each horizontal stripe's y-bounds and rounded pill extents
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const pIdx = i * 4;
          const r = data[pIdx];
          const g = data[pIdx + 1];
          const b = data[pIdx + 2];

          const distFromBg = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);
          const isColoredInk = distFromBg > 22 || r > 30 || g > 25 || b > 20;

          // Check if pixel is inside the circular sun top (y <= cy)
          const distFromSun = Math.sqrt((x - cx)**2 + (y - cy)**2);
          const isInsideSunTop = distFromSun <= sunRadius && y <= cy + 5;

          // Check if pixel is within the player's core body region between stripes
          const isInsidePlayerBody = y > cy && y < h * 0.64 && distFromSun <= sunRadius - 10;

          if (isColoredInk) {
            // Keep original distressed colors
            out[pIdx] = r;
            out[pIdx + 1] = g;
            out[pIdx + 2] = b;
            const alpha = Math.min(255, Math.floor((distFromBg / 30) * 255));
            out[pIdx + 3] = distFromBg > 35 ? 255 : alpha;
          } else if (isInsideSunTop || isInsidePlayerBody) {
            // Player silhouette inside the sun
            out[pIdx] = Math.max(10, r);
            out[pIdx + 1] = Math.max(10, g);
            out[pIdx + 2] = Math.max(10, b);
            out[pIdx + 3] = 255;
          } else {
            // Clean transparent background
            out[pIdx + 3] = 0;
          }
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

  const outputPath = path.resolve('public/pod/pod_tmpl_sports.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Successfully saved transparent sports artwork to:', outputPath);
  }

  await browser.close();
}

processSportsArtwork().catch(err => {
  console.error('Error processing sports artwork:', err);
  process.exit(1);
});
