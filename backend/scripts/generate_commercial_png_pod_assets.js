const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

function inGarmentBody(x, y, w, h) {
  // 800x800 resolution garment silhouette coordinates
  // Collar: (320, 100) to (480, 100), depth at (400, 160)
  // Left Shoulder: (320, 100) to (160, 180)
  // Right Shoulder: (480, 100) to (640, 180)
  // Left Sleeve: (160, 180) to (80, 300) to (180, 340) to (240, 260)
  // Right Sleeve: (640, 180) to (720, 300) to (620, 340) to (560, 260)
  // Torso: (240, 260) down to (230, 720) across to (570, 720) up to (560, 260)

  // Neckhole exclusion:
  if (y < 160 && x > 310 && x < 490) {
    const dx = (x - 400) / 90;
    const dy = (y - 100) / 60;
    if (dx * dx + dy * dy < 1) return false;
  }

  // Shoulders & Chest Top:
  if (y >= 100 && y <= 180) {
    if (x >= 320 - (y - 100) * 2 && x <= 480 + (y - 100) * 2) return true;
  }

  // Sleeves & Upper Torso:
  if (y > 180 && y <= 340) {
    if (x >= 80 && x <= 720) {
      // Sleeve angles
      const leftBoundary = 80 + (340 - y) * 0.6;
      const rightBoundary = 720 - (340 - y) * 0.6;
      if (x >= leftBoundary && x <= rightBoundary) return true;
    }
  }

  // Main Torso:
  if (y > 340 && y <= 720) {
    if (x >= 230 && x <= 570) return true;
  }

  return false;
}

function createBasePng(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (inGarmentBody(x, y, width, height)) {
        png.data[idx] = 245;     // R (Neutral Light Gray Garment)
        png.data[idx + 1] = 246; // G
        png.data[idx + 2] = 248; // B
        png.data[idx + 3] = 255; // Alpha
      } else {
        png.data[idx + 3] = 0;   // Transparent
      }
    }
  }
  return png;
}

function createMaskPng(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (inGarmentBody(x, y, width, height)) {
        png.data[idx] = 255;     // R
        png.data[idx + 1] = 255; // G
        png.data[idx + 2] = 255; // B
        png.data[idx + 3] = 255; // Alpha
      } else {
        png.data[idx + 3] = 0;   // Transparent
      }
    }
  }
  return png;
}

function createShadowPng(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (inGarmentBody(x, y, width, height)) {
        // Compute realistic fabric folds, collar depth, armpit shadows
        let shadowIntensity = 0;

        // 1. Collar shadow:
        if (y >= 150 && y <= 210 && x >= 300 && x <= 500) {
          shadowIntensity += (210 - y) * 1.8;
        }
        // 2. Left Armpit fold:
        const distLeftArmpit = Math.hypot(x - 240, y - 280);
        if (distLeftArmpit < 90) {
          shadowIntensity += (90 - distLeftArmpit) * 1.5;
        }
        // 3. Right Armpit fold:
        const distRightArmpit = Math.hypot(x - 560, y - 280);
        if (distRightArmpit < 90) {
          shadowIntensity += (90 - distRightArmpit) * 1.5;
        }
        // 4. Vertical fabric wrinkles:
        const foldPattern = Math.sin(x * 0.04) * Math.cos(y * 0.02);
        if (foldPattern > 0.3) {
          shadowIntensity += (foldPattern - 0.3) * 80;
        }
        // 5. Outer edge drop shadow contouring:
        if (x < 250 || x > 550 || y > 680) {
          shadowIntensity += 25;
        }

        const alpha = Math.min(Math.max(shadowIntensity, 0), 220);
        png.data[idx] = 15;        // R
        png.data[idx + 1] = 23;    // G
        png.data[idx + 2] = 42;    // B
        png.data[idx + 3] = alpha; // Alpha gradient
      } else {
        png.data[idx + 3] = 0;     // Transparent
      }
    }
  }
  return png;
}

function createHighlightPng(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (inGarmentBody(x, y, width, height)) {
        let highlightIntensity = 0;

        // Shoulder studio light highlights:
        if (y >= 100 && y <= 160) {
          highlightIntensity += (160 - y) * 2.2;
        }
        // Chest curvature highlight:
        const chestDist = Math.hypot(x - 400, y - 280);
        if (chestDist < 120) {
          highlightIntensity += (120 - chestDist) * 0.8;
        }

        const alpha = Math.min(Math.max(highlightIntensity, 0), 180);
        png.data[idx] = 255;       // R
        png.data[idx + 1] = 255;   // G
        png.data[idx + 2] = 255;   // B
        png.data[idx + 3] = alpha; // Alpha gradient
      } else {
        png.data[idx + 3] = 0;     // Transparent
      }
    }
  }
  return png;
}

function createTexturePng(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      if (inGarmentBody(x, y, width, height)) {
        // Fine cotton weave micro-texture
        const isWeave = (x + y) % 3 === 0;
        const alpha = isWeave ? 45 : 10;
        png.data[idx] = 30;        // R
        png.data[idx + 1] = 40;    // G
        png.data[idx + 2] = 55;    // B
        png.data[idx + 3] = alpha; // Alpha micro-texture
      } else {
        png.data[idx + 3] = 0;     // Transparent
      }
    }
  }
  return png;
}

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('Generating Commercial High-Res Transparent PNG Layer Assets (800x800)...');

  const podAssetsDir = path.join(__dirname, '..', 'public', 'uploads', 'pod_assets');
  if (!fs.existsSync(podAssetsDir)) {
    fs.mkdirSync(podAssetsDir, { recursive: true });
  }

  const baseFile = 'commercial_base_front.png';
  const maskFile = 'commercial_mask_front.png';
  const shadowFile = 'commercial_shadow_front.png';
  const highlightFile = 'commercial_highlight_front.png';
  const textureFile = 'commercial_texture_front.png';

  fs.writeFileSync(path.join(podAssetsDir, baseFile), PNG.sync.write(createBasePng(800, 800)));
  fs.writeFileSync(path.join(podAssetsDir, maskFile), PNG.sync.write(createMaskPng(800, 800)));
  fs.writeFileSync(path.join(podAssetsDir, shadowFile), PNG.sync.write(createShadowPng(800, 800)));
  fs.writeFileSync(path.join(podAssetsDir, highlightFile), PNG.sync.write(createHighlightPng(800, 800)));
  fs.writeFileSync(path.join(podAssetsDir, textureFile), PNG.sync.write(createTexturePng(800, 800)));

  console.log('PNG files written successfully to backend/public/uploads/pod_assets/!');

  // Register PNG assets in pod_assets
  const assetsToRegister = [
    { name: 'Commercial Base Mockup Front', type: 'base_mockup', file: baseFile, mime: 'image/png' },
    { name: 'Commercial Garment Mask Front', type: 'mask', file: maskFile, mime: 'image/png' },
    { name: 'Commercial Fabric Shadow Front', type: 'shadow', file: shadowFile, mime: 'image/png' },
    { name: 'Commercial Lighting Highlight Front', type: 'highlight', file: highlightFile, mime: 'image/png' },
    { name: 'Commercial Cotton Texture Front', type: 'texture', file: textureFile, mime: 'image/png' },
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

  // Update Template #1 and Template #2 in pod_view_layers with the new PNG asset IDs
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

      // Order 5: texture (multiply, 0.45)
      await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "texture", "multiply", 0.45, 5)', [
        vw.id,
        registeredIds.texture,
      ]);
    }
  }

  console.log('SUCCESSFULLY UPGRADED ALL POD TEMPLATES TO COMMERCIAL HIGH-RES TRANSPARENT PNG LAYERS!');
  await conn.end();
}

run().catch(console.error);
