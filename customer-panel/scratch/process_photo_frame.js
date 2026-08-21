import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function processPhotoFrame() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787299857775.png';
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

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      // Extract gold color pixels (gold has high red, medium-high green, and significantly lower blue than white)
      for (let i = 0; i < w * h; i++) {
        const pIdx = i * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];

        // Pure white is ~ (255, 255, 255). Gold is ~ (210..240, 165..195, 40..90)
        // Check if pixel is gold:
        const isWhite = r > 240 && g > 240 && b > 240;
        const isGold = (r - b > 40) && (g - b > 25);

        if (isGold) {
          out[pIdx] = r;
          out[pIdx + 1] = g;
          out[pIdx + 2] = b;
          // Smooth anti-aliased alpha
          const goldIntensity = Math.min(255, (r - b) * 2.5);
          out[pIdx + 3] = Math.max(120, Math.min(255, Math.floor(goldIntensity)));
        } else {
          // Inside and outside white area is completely transparent
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

  const outputPath = path.resolve('public/pod/pod_tmpl_photo_print.png');
  const canvasElement = await page.$('#c');
  if (canvasElement) {
    await canvasElement.screenshot({
      path: outputPath,
      omitBackground: true,
    });
    console.log('Successfully saved transparent gold photo frame to:', outputPath);
  }

  await browser.close();
}

processPhotoFrame().catch(err => {
  console.error('Error processing photo frame:', err);
  process.exit(1);
});
