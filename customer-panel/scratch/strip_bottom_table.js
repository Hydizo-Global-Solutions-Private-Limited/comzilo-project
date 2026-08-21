import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function stripBottomTable() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = path.resolve('public/pod/pod_mug_realistic.png');
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

      // Clean bottom curve:
      // Mug bottom base goes from x=318 to x=748.
      // Arc bottom: y = 780 + 46 * Math.sqrt(Math.max(0, 1 - ((x - 533)/215)**2))
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;

          if (x < 318 || x > 748) {
            if (y > 730) {
              data[idx + 3] = 0;
            }
          } else {
            const arcY = 780 + 46 * Math.sqrt(Math.max(0, 1 - ((x - 533) / 215)**2));
            if (y > arcY + 2) {
              data[idx + 3] = 0;
            }
          }
        }
      }

      ctx.putImageData(srcData, 0, 0);
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
    console.log('Stripped bottom table platform to:', outputPath);
  }

  await browser.close();
}

stripBottomTable().catch(err => {
  console.error(err);
  process.exit(1);
});
