import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function perfectTransparentMug() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/isolated_white_ceramic_mug_1787308217010.jpg';
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

      // Mug rim outer top arc:
      // Center cx = 560, cy = 180, rx = 250, ry = 65
      // Mug base bottom arc:
      // Center cx = 565, cy = 790, rx = 245, ry = 42

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // 1. Outside top rim curve?
          if (x >= 310) {
            const rimTopDist = ((x - 560) / 252)**2 + ((y - 180) / 65)**2;
            if (y < 180 && rimTopDist > 1.0) {
              out[idx + 3] = 0;
              continue;
            }

            // 2. Below base bottom curve?
            const baseBottomDist = ((x - 565) / 248)**2 + ((y - 790) / 42)**2;
            if (y > 790 && baseBottomDist > 1.0) {
              out[idx + 3] = 0;
              continue;
            }
          }

          // 3. Left of handle & outside handle loop
          if (x < 310) {
            if (y < 240 || y > 720 || x < 70) {
              out[idx + 3] = 0;
              continue;
            }
            // Hole inside handle (center cx: 215, cy: 475)
            const holeDist = ((x - 215) / 75)**2 + ((y - 475) / 155)**2;
            if (holeDist < 0.95) {
              out[idx + 3] = 0;
              continue;
            }
          }

          // 4. Right of cylinder body
          if (x > 815) {
            out[idx + 3] = 0;
            continue;
          }

          // In inner cavity or on mug body
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
    console.log('Saved 100% perfect transparent mug to:', outputPath);
  }

  await browser.close();
}

perfectTransparentMug().catch(err => {
  console.error(err);
  process.exit(1);
});
