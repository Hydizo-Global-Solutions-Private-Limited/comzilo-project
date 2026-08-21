import { chromium } from 'playwright';
import path from 'path';

async function checkCoordinates() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const imgPath = path.resolve('public/pod/pod_mug_realistic.png');

  await page.setContent(`
    <img id="mug" src="file://${imgPath}" style="width: 460px; height: 460px;" />
  `);

  const bbox = await page.locator('#mug').boundingBox();
  console.log('Mug Box:', bbox);

  await browser.close();
}

checkCoordinates();
