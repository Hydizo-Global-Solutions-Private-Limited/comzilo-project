import { chromium } from 'playwright';
import path from 'path';

async function generateMinimalArtwork() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Great+Vibes&family=Kaushan+Script&family=Satisfy&family=Cookie&family=Allura&family=Rouge+Script&family=Alex+Brush&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1000px;
      height: 1000px;
    }
  </style>
</head>
<body>
  <svg width="1000" height="1000" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Arc path for "WE ARE ALL IN THIS" -->
      <!-- Curves smoothly downwards over the script word -->
      <path id="textArc" d="M 160 410 A 380 380 0 0 1 840 410" fill="none" />
    </defs>

    <!-- 1. ARCHED TEXT -->
    <text font-family="'Montserrat', sans-serif" font-size="46" font-weight="800" fill="#000000" letter-spacing="11">
      <textPath href="#textArc" startOffset="50%" text-anchor="middle">
        WE ARE ALL IN THIS
      </textPath>
    </text>

    <!-- 2. DELICATE LINE HEART ICON -->
    <g transform="translate(540, 360) rotate(-4) scale(1.4)">
      <path d="M22 34 C 22 34, 3 21, 3 11 C 3 4.5, 7.5 0.5, 13.5 0.5 C 18 0.5, 20.8 3.5, 22 6 C 23.2 3.5, 26 0.5, 30.5 0.5 C 36.5 0.5, 41 4.5, 41 11 C 41 21, 22 34, 22 34 Z"
            fill="none"
            stroke="#000000"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round" />
    </g>

    <!-- 3. CURSIVE SCRIPT "Together" -->
    <text x="500" y="580"
          font-family="'Great Vibes', 'Alex Brush', cursive"
          font-size="200"
          font-weight="bold"
          fill="#000000"
          text-anchor="middle">
      Together
    </text>
  </svg>
</body>
</html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(2000);

  const targetPath = path.resolve('public/pod/pod_tmpl_minimal.png');
  await page.screenshot({
    path: targetPath,
    omitBackground: true,
    clip: { x: 80, y: 150, width: 840, height: 600 }
  });

  console.log('Successfully generated transparent PNG at:', targetPath);
  await browser.close();
}

generateMinimalArtwork().catch(err => {
  console.error('Error generating artwork:', err);
  process.exit(1);
});
