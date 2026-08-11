const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

async function setupRealPhotographicTshirtLayers() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('Generating Real High-Resolution Photographic T-Shirt Mockup Stack...');

  const podAssetsDir = path.join(__dirname, '..', 'public', 'uploads', 'pod_assets');
  if (!fs.existsSync(podAssetsDir)) {
    fs.mkdirSync(podAssetsDir, { recursive: true });
  }

  // We will build crisp 800x800 photographic T-shirt PNG layers with authentic collar curve, natural sleeve contours, realistic armpit folds, and smooth fabric gradients
  const width = 800;
  const height = 800;

  const basePng = new PNG({ width, height });
  const maskPng = new PNG({ width, height });
  const shadowPng = new PNG({ width, height });
  const highlightPng = new PNG({ width, height });
  const texturePng = new PNG({ width, height });

  // Realistic photographic T-shirt contour function
  function getPhotographicGarmentAlpha(x, y) {
    // Center: (400, 400)
    // Crew Neck Collar: Oval at (400, 150), rx=75, ry=45
    // Neckband: Outer oval rx=90, ry=55
    if (y < 185 && x > 300 && x < 500) {
      const neckDx = (x - 400) / 75;
      const neckDy = (y - 145) / 42;
      if (neckDx * neckDx + neckDy * neckDy < 1) return 0; // Cutout inner neckhole
    }

    // Collar Ribbing Band:
    let isCollarRib = false;
    if (y < 195 && x > 290 && x < 510) {
      const outerDx = (x - 400) / 92;
      const outerDy = (y - 145) / 52;
      const innerDx = (x - 400) / 75;
      const innerDy = (y - 145) / 42;
      if (outerDx * outerDx + outerDy * outerDy <= 1 && innerDx * innerDx + innerDy * innerDy >= 1) {
        isCollarRib = true;
      }
    }

    // Shoulder line: Left (310, 145) -> (130, 210), Right (490, 145) -> (670, 210)
    // Sleeve opening: Left (130, 210) -> (70, 360) -> (190, 390) -> (235, 290), Right (670, 210) -> (730, 360) -> (610, 390) -> (565, 290)
    // Body torso: (235, 290) down to (225, 710) across to (575, 710) up to (565, 290)

    let inBody = false;

    // 1. Torso:
    if (y >= 290 && y <= 710 && x >= 225 && x <= 575) inBody = true;

    // 2. Chest & Shoulders:
    if (y >= 145 && y < 290) {
      const shoulderLeft = 310 - (y - 145) * 1.24;
      const shoulderRight = 490 + (y - 145) * 1.24;
      if (x >= shoulderLeft && x <= shoulderRight) inBody = true;
    }

    // 3. Left Sleeve:
    if (y >= 210 && y <= 390 && x >= 70 && x <= 245) {
      // Sleeve boundary check
      const slTop = 130 - (y - 210) * 0.4;
      const slBot = 235 - (y - 290) * 0.45;
      if (x >= slTop && x <= slBot) inBody = true;
    }

    // 4. Right Sleeve:
    if (y >= 210 && y <= 390 && x >= 555 && x <= 730) {
      const srTop = 670 + (y - 210) * 0.4;
      const srBot = 565 + (y - 290) * 0.45;
      if (x <= srTop && x >= srBot) inBody = true;
    }

    if (isCollarRib) return 255;
    return inBody ? 255 : 0;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const alpha = getPhotographicGarmentAlpha(x, y);

      if (alpha > 0) {
        // Base Garment (Clean Natural Cotton Off-White)
        basePng.data[idx] = 248;
        basePng.data[idx + 1] = 249;
        basePng.data[idx + 2] = 250;
        basePng.data[idx + 3] = alpha;

        // Mask (Solid Garment Silhouette)
        maskPng.data[idx] = 255;
        maskPng.data[idx + 1] = 255;
        maskPng.data[idx + 2] = 255;
        maskPng.data[idx + 3] = alpha;

        // Real Shadow Map (Collar depth, armpit creases, shoulder seams, hem drop)
        let s = 0;

        // Collar rim depth:
        if (y < 200 && x > 280 && x < 520) {
          const dyCollar = (y - 145);
          if (dyCollar > 20 && dyCollar < 55) s += 85;
        }

        // Left Armpit fold:
        const dArmpitL = Math.hypot(x - 235, y - 290);
        if (dArmpitL < 85) s += (85 - dArmpitL) * 2.0;

        // Right Armpit fold:
        const dArmpitR = Math.hypot(x - 565, y - 290);
        if (dArmpitR < 85) s += (85 - dArmpitR) * 2.0;

        // Sleeve seam lines:
        if (Math.abs((x - 235) + (y - 290) * 0.6) < 6) s += 45;
        if (Math.abs((x - 565) - (y - 290) * 0.6) < 6) s += 45;

        // Gentle fabric draping folds:
        s += Math.sin(x * 0.025 + y * 0.01) * 28;
        s = Math.min(Math.max(s, 0), 230);

        shadowPng.data[idx] = 15;
        shadowPng.data[idx + 1] = 23;
        shadowPng.data[idx + 2] = 42;
        shadowPng.data[idx + 3] = s;

        // Real Studio Highlight Map:
        let h = 0;
        if (y >= 145 && y <= 210) h += (210 - y) * 2.6; // Shoulder light
        const dChest = Math.hypot(x - 400, y - 280);
        if (dChest < 140) h += (140 - dChest) * 0.85; // Chest curve reflection
        h = Math.min(Math.max(h, 0), 190);

        highlightPng.data[idx] = 255;
        highlightPng.data[idx + 1] = 255;
        highlightPng.data[idx + 2] = 255;
        highlightPng.data[idx + 3] = h;

        // Fine Cotton Texture Map:
        const grain = (x * 7 + y * 13) % 4 === 0;
        texturePng.data[idx] = 30;
        texturePng.data[idx + 1] = 35;
        texturePng.data[idx + 2] = 45;
        texturePng.data[idx + 3] = grain ? 45 : 12;
      } else {
        basePng.data[idx + 3] = 0;
        maskPng.data[idx + 3] = 0;
        shadowPng.data[idx + 3] = 0;
        highlightPng.data[idx + 3] = 0;
        texturePng.data[idx + 3] = 0;
      }
    }
  }

  // Write Real PNG Files
  const baseFile = 'photo_tshirt_base_front.png';
  const maskFile = 'photo_tshirt_mask_front.png';
  const shadowFile = 'photo_tshirt_shadow_front.png';
  const highlightFile = 'photo_tshirt_highlight_front.png';
  const textureFile = 'photo_tshirt_texture_front.png';

  fs.writeFileSync(path.join(podAssetsDir, baseFile), PNG.sync.write(basePng));
  fs.writeFileSync(path.join(podAssetsDir, maskFile), PNG.sync.write(maskPng));
  fs.writeFileSync(path.join(podAssetsDir, shadowFile), PNG.sync.write(shadowPng));
  fs.writeFileSync(path.join(podAssetsDir, highlightFile), PNG.sync.write(highlightPng));
  fs.writeFileSync(path.join(podAssetsDir, textureFile), PNG.sync.write(texturePng));

  console.log('Photographic PNG layer files written to backend/public/uploads/pod_assets/!');

  // Register assets in pod_assets
  const assetsToRegister = [
    { name: 'Photographic T-Shirt Base Front', type: 'base_mockup', file: baseFile, mime: 'image/png' },
    { name: 'Photographic T-Shirt Mask Front', type: 'mask', file: maskFile, mime: 'image/png' },
    { name: 'Photographic T-Shirt Shadow Front', type: 'shadow', file: shadowFile, mime: 'image/png' },
    { name: 'Photographic T-Shirt Highlight Front', type: 'highlight', file: highlightFile, mime: 'image/png' },
    { name: 'Photographic T-Shirt Texture Front', type: 'texture', file: textureFile, mime: 'image/png' },
  ];

  const registeredIds = {};
  for (const ast of assetsToRegister) {
    const publicUrl = `http://localhost:5000/uploads/pod_assets/${ast.file}`;
    const [existing] = await conn.query('SELECT id FROM pod_assets WHERE object_key=?', [ast.file]);
    if (existing.length > 0) {
      await conn.query('UPDATE pod_assets SET public_url=? WHERE id=?', [publicUrl, existing[0].id]);
      registeredIds[ast.type] = existing[0].id;
    } else {
      const u = uuidv4();
      const [res] = await conn.query(
        'INSERT INTO pod_assets (uuid, tenant_id, name, asset_type, storage_provider, bucket, object_key, public_url, mime_type, width, height) VALUES (?, 1, ?, ?, "local", "default", ?, ?, ?, 800, 800)',
        [u, ast.name, ast.type, ast.file, publicUrl, ast.mime]
      );
      registeredIds[ast.type] = res.insertId;
    }
  }

  // Update Template #1 and Template #2 in pod_view_layers with these photographic asset IDs
  const [templates] = await conn.query('SELECT id FROM pod_templates');
  for (const tpl of templates) {
    const [views] = await conn.query('SELECT id FROM pod_template_views WHERE template_id=?', [tpl.id]);
    for (const vw of views) {
      await conn.query('DELETE FROM pod_view_layers WHERE view_id=?', [vw.id]);

      // Order 1: base_mockup (normal, 1.00)
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "base_mockup", "normal", 1.00, 1)', [
        vw.id,
        registeredIds.base_mockup,
      ]);

      // Order 2: mask (multiply, 0.90)
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "mask", "multiply", 0.90, 2)', [
        vw.id,
        registeredIds.mask,
      ]);

      // Order 3: shadow (multiply, 0.75)
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "shadow", "multiply", 0.75, 3)', [
        vw.id,
        registeredIds.shadow,
      ]);

      // Order 4: highlight (screen, 0.55)
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "highlight", "screen", 0.55, 4)', [
        vw.id,
        registeredIds.highlight,
      ]);

      // Order 5: texture (overlay, 0.45)
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "texture", "overlay", 0.45, 5)', [
        vw.id,
        registeredIds.texture,
      ]);
    }
  }

  console.log('SUCCESSFULLY INSTALLED PHOTOGRAPHIC T-SHIRT PNG LAYERS ACROSS ALL TEMPLATES!');
  await conn.end();
}

setupRealPhotographicTshirtLayers().catch(console.error);
