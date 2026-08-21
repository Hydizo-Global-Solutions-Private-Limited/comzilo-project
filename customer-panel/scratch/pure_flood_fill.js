import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function pureFloodFill() {
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

      const visited = new Uint8Array(w * h);
      const queue = [];

      function isBg(idx) {
        const x = idx % w;
        const y = Math.floor(idx / w);
        const r = data[idx * 4];
        const g = data[idx * 4 + 1];
        const b = data[idx * 4 + 2];
        const br = (r + g + b) / 3;

        // Top rim
        if (y < 165 && x > 780) return true;
        if (y < 175 && x >= 310) {
          const rimDist = ((x - 575)/245)**2 + ((y - 175)/60)**2;
          if (rimDist > 1.0) return true;
        }

        // Clean boundary cutoffs
        if (y > 825) return true;
        if (x >= 235 && x <= 308 && y >= 680 && br < 60) return true;
        if (x > 820) return true;

        // Base bottom curve
        if (x >= 312 && x <= 820) {
          const arcY = 770 + 55 * Math.sqrt(Math.max(0, 1 - ((x - 565)/255)**2));
          if (y > arcY) return true;
        } else if (y > 770 && x >= 312) {
          return true;
        }

        return br < 25;
      }

      // Add borders
      for (let x = 0; x < w; x++) {
        queue.push(x);
        queue.push((h - 1) * w + x);
        visited[x] = 1;
        visited[(h - 1) * w + x] = 1;
      }
      for (let y = 0; y < h; y++) {
        queue.push(y * w);
        queue.push(y * w + (w - 1));
        visited[y * w] = 1;
        visited[y * w + (w - 1)] = 1;
      }

      // Handle hole center
      const handleHoleSeed = 475 * w + 215;
      queue.push(handleHoleSeed);
      visited[handleHoleSeed] = 1;

      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        const neighbors = [
          cy > 0 ? (cy - 1) * w + cx : -1,
          cy < h - 1 ? (cy + 1) * w + cx : -1,
          cx > 0 ? cy * w + (cx - 1) : -1,
          cx < w - 1 ? cy * w + (cx + 1) : -1,
        ];

        for (const n of neighbors) {
          if (n !== -1 && !visited[n]) {
            if (isBg(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
      }

      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      for (let i = 0; i < w * h; i++) {
        const p = i * 4;
        if (visited[i]) {
          out[p + 3] = 0;
        } else {
          out[p] = data[p];
          out[p + 1] = data[p + 1];
          out[p + 2] = data[p + 2];
          out[p + 3] = 255;
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
    console.log('Final pure flood fill complete:', outputPath);
  }

  await browser.close();
}

pureFloodFill().catch(err => {
  console.error(err);
  process.exit(1);
});
