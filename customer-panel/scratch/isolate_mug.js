import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function isolateMug() {
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

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Mug outline check
          const inMug = (x >= 98 && x <= 750 && y >= 200 && y <= 840);
          const inBottomShadow = (x >= 280 && x <= 750 && y >= 820 && y <= 880);

          if (!inMug && !inBottomShadow) {
            out[idx + 3] = 0;
            continue;
          }

          // In bottom shadow region
          if (inBottomShadow && !inMug) {
            const shadowIntensity = (255 - ((r + g + b) / 3));
            if (shadowIntensity > 10) {
              out[idx] = 0;
              out[idx + 1] = 0;
              out[idx + 2] = 0;
              out[idx + 3] = Math.min(180, shadowIntensity * 1.5);
            } else {
              out[idx + 3] = 0;
            }
            continue;
          }

          // Inside mug region:
          // Check background white around handle
          const isWhite = (r > 242 && g > 242 && b > 242);
          const inHandleHole = (x >= 135 && x <= 305 && y >= 340 && y <= 670);

          if (isWhite && inHandleHole) {
            out[idx + 3] = 0;
          } else if (isWhite && (x < 315 && y < 330)) {
            out[idx + 3] = 0;
          } else if (isWhite && (x < 315 && y > 675)) {
            out[idx + 3] = 0;
          } else {
            out[idx] = r;
            out[idx + 1] = g;
            out[idx + 2] = b;
            out[idx + 3] = 255;
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

  const outputPath = path.resolve('public/pod/pod_mug_realistic.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Saved clean isolated mug to:', outputPath);
  }

  await browser.close();
}

isolateMug().catch(err => {
  console.error(err);
  process.exit(1);
});
