import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function perfectMugCutout() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/realistic_ceramic_mug_1787306969619.jpg';
  const sourceBase64 = fs.readFileSync(sourceImagePath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${sourceBase64}`;

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

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      // Bottom curve of mug base:
      // Base center is at x = 530, y = 840. Base radius is approx 220px.
      // Base bottom is an ellipse: cx = 535, cy = 825, rx = 215, ry = 42
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // 1. Below mug base curve?
          const baseEllipseDist = ((x - 535) / 216)**2 + ((y - 820) / 45)**2;
          if (y > 820 && (baseEllipseDist > 1.05 || x < 320 || x > 750)) {
            // Soft contact shadow directly under bottom center
            if (y <= 855 && x >= 340 && x <= 745 && baseEllipseDist <= 1.35) {
              const shadowAlpha = Math.max(0, (1 - (baseEllipseDist - 1) / 0.35) * 80);
              out[idx] = 30;
              out[idx + 1] = 30;
              out[idx + 2] = 35;
              out[idx + 3] = shadowAlpha;
            } else {
              out[idx + 3] = 0;
            }
            continue;
          }

          // 2. Outside top rim?
          if (y < 205) {
            out[idx + 3] = 0;
            continue;
          }

          // 3. To the right of mug?
          if (x > 735) {
            out[idx + 3] = 0;
            continue;
          }

          // 4. Handle region & Left of mug
          if (x < 318) {
            // Handle outer loop is roughly x: 100 to 318, y: 310 to 720
            const inHandle = (x >= 100 && x <= 318 && y >= 310 && y <= 720);
            if (!inHandle) {
              out[idx + 3] = 0;
              continue;
            }

            // Hole inside handle:
            // Hole center: cx = 220, cy = 505, rx = 70, ry = 145
            const holeDist = ((x - 225) / 72)**2 + ((y - 505) / 145)**2;
            if (holeDist < 0.92) {
              out[idx + 3] = 0;
              continue;
            }
          }

          // Copy pixel
          out[idx] = r;
          out[idx + 1] = g;
          out[idx + 2] = b;
          out[idx + 3] = 255;
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

  const outputPath = path.resolve('public/pod/pod_mug_realistic.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Saved perfect transparent mug cutout to:', outputPath);
  }

  await browser.close();
}

perfectMugCutout().catch(err => {
  console.error(err);
  process.exit(1);
});
