import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function processVintageHorse() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787297913425.png';
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

      // Sample pure black background from corners
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      for (let i = 0; i < w * h; i++) {
        const pIdx = i * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];

        // Luminance or distance from black
        const dist = Math.sqrt((r - bgR)**2 + (g - bgG)**2 + (b - bgB)**2);

        if (dist > 18 || r > 20 || g > 15 || b > 10) {
          out[pIdx] = r;
          out[pIdx + 1] = g;
          out[pIdx + 2] = b;
          // Smooth alpha for edge pixels
          const alpha = Math.min(255, Math.floor((dist / 30) * 255));
          out[pIdx + 3] = dist > 35 ? 255 : alpha;
        } else {
          out[pIdx + 3] = 0; // Pure transparent
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

  const outputPath = path.resolve('public/pod/pod_tmpl_vintage.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Successfully saved transparent vintage horse artwork to:', outputPath);
  }

  await browser.close();
}

processVintageHorse().catch(err => {
  console.error('Error processing vintage horse artwork:', err);
  process.exit(1);
});
