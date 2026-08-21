import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function perfectFloodFillMug() {
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

      // Flood fill from (0,0) and (w-1, 0) and inside handle
      const visited = new Uint8Array(w * h);
      const queue = [];

      function isBgPixel(idx) {
        const r = data[idx * 4];
        const g = data[idx * 4 + 1];
        const b = data[idx * 4 + 2];
        // Background white/light grey check
        return (r > 244 && g > 244 && b > 244) || (r > 238 && g > 238 && b > 238 && (idx % w < 110 || idx % w > 745 || Math.floor(idx / w) < 200 || Math.floor(idx / w) > 850));
      }

      // Add borders to queue
      for (let x = 0; x < w; x++) {
        queue.push(x); // top row
        queue.push((h - 1) * w + x); // bottom row
        visited[x] = 1;
        visited[(h - 1) * w + x] = 1;
      }
      for (let y = 0; y < h; y++) {
        queue.push(y * w); // left col
        queue.push(y * w + (w - 1)); // right col
        visited[y * w] = 1;
        visited[y * w + (w - 1)] = 1;
      }

      // Also add center of handle hole (x = 225, y = 505)
      const handleSeed = 505 * w + 225;
      queue.push(handleSeed);
      visited[handleSeed] = 1;

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
            if (isBgPixel(n)) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
      }

      // Create transparent output
      const outData = ctx.createImageData(w, h);
      const out = outData.data;

      for (let i = 0; i < w * h; i++) {
        const p = i * 4;
        if (visited[i]) {
          out[p + 3] = 0; // transparent
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
    console.log('Saved flood-filled transparent mug to:', outputPath);
  }

  await browser.close();
}

perfectFloodFillMug().catch(err => {
  console.error(err);
  process.exit(1);
});
