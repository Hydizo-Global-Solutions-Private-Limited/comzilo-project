import { chromium } from 'playwright';
import fs from 'fs';

async function analyzeColors() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const sourceImagePath = 'C:/Users/Hydizo/.gemini/antigravity-ide/brain/ef9e7781-502e-4e1a-8fee-ad44d8143541/.user_uploaded/media_1787297175904.png';
  const sourceBase64 = fs.readFileSync(sourceImagePath).toString('base64');
  const dataUri = `data:image/png;base64,${sourceBase64}`;

  const html = `
<!DOCTYPE html>
<html>
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

      const p1 = ctx.getImageData(5, 5, 1, 1).data;
      const p2 = ctx.getImageData(img.width - 5, 5, 1, 1).data;
      const p3 = ctx.getImageData(img.width / 2, 20, 1, 1).data;
      const p4 = ctx.getImageData(img.width / 2, img.height / 2, 1, 1).data;

      console.log('Corner 1:', p1[0], p1[1], p1[2]);
      console.log('Corner 2:', p2[0], p2[1], p2[2]);
      console.log('Top center:', p3[0], p3[1], p3[2]);
      console.log('Center wolf:', p4[0], p4[1], p4[2]);
      window.__RESULT = { p1: Array.from(p1), p2: Array.from(p2), p3: Array.from(p3), p4: Array.from(p4) };
    };
    img.src = "${dataUri}";
  </script>
</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => !!window.__RESULT);
  const result = await page.evaluate(() => window.__RESULT);
  console.log('Analysis result:', result);
  await browser.close();
}

analyzeColors().catch(console.error);
