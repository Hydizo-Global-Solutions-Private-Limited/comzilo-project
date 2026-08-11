const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

async function createPodDemoProduct() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
    multipleStatements: true,
  });

  console.log('Creating Reference Enterprise POD Demo Product & Separated Assets...');

  // 1. Ensure directory exists
  const podAssetsDir = path.join(__dirname, '..', 'public', 'uploads', 'pod_assets');
  if (!fs.existsSync(podAssetsDir)) {
    fs.mkdirSync(podAssetsDir, { recursive: true });
  }

  // 2. Generate clean SVG/PNG layer assets for Front & Back
  const baseMockupSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <path d="M 150 50 L 200 90 C 225 100 275 100 300 90 L 350 50 L 460 125 L 400 200 L 360 170 L 360 450 L 140 450 L 140 170 L 100 200 L 40 125 Z" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="2"/>
  </svg>`;

  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <path d="M 150 50 L 200 90 C 225 100 275 100 300 90 L 350 50 L 460 125 L 400 200 L 360 170 L 360 450 L 140 450 L 140 170 L 100 200 L 40 125 Z" fill="#FFFFFF"/>
  </svg>`;

  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <path d="M 180 120 Q 250 200 320 120" stroke="#1F2937" stroke-width="8" opacity="0.3" fill="none"/>
    <path d="M 210 250 Q 250 350 290 250" stroke="#1F2937" stroke-width="6" opacity="0.2" fill="none"/>
  </svg>`;

  const highlightSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <path d="M 160 80 Q 250 50 340 80" stroke="#FFFFFF" stroke-width="12" opacity="0.5" fill="none"/>
  </svg>`;

  const textureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
    <pattern id="grain" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#374151" opacity="0.15"/>
      <circle cx="7" cy="7" r="1" fill="#374151" opacity="0.15"/>
    </pattern>
    <rect width="500" height="500" fill="url(#grain)"/>
  </svg>`;

  fs.writeFileSync(path.join(podAssetsDir, 'demo_base_front.svg'), baseMockupSvg);
  fs.writeFileSync(path.join(podAssetsDir, 'demo_mask_front.svg'), maskSvg);
  fs.writeFileSync(path.join(podAssetsDir, 'demo_shadow_front.svg'), shadowSvg);
  fs.writeFileSync(path.join(podAssetsDir, 'demo_highlight_front.svg'), highlightSvg);
  fs.writeFileSync(path.join(podAssetsDir, 'demo_texture_front.svg'), textureSvg);

  // 3. Register Assets in pod_assets
  const assetsToRegister = [
    { name: 'Demo Base Mockup Front', type: 'base_mockup', key: 'demo_base_front.svg' },
    { name: 'Demo Mask Front', type: 'mask', key: 'demo_mask_front.svg' },
    { name: 'Demo Shadow Front', type: 'shadow', key: 'demo_shadow_front.svg' },
    { name: 'Demo Highlight Front', type: 'highlight', key: 'demo_highlight_front.svg' },
    { name: 'Demo Texture Front', type: 'texture', key: 'demo_texture_front.svg' },
  ];

  const registeredAssetIds = {};
  for (const ast of assetsToRegister) {
    const publicUrl = `http://localhost:5000/uploads/pod_assets/${ast.key}`;
    const [existing] = await conn.query('SELECT id FROM pod_assets WHERE object_key=?', [ast.key]);
    if (existing.length > 0) {
      registeredAssetIds[ast.type] = existing[0].id;
    } else {
      const u = uuidv4();
      const [res] = await conn.query(
        'INSERT INTO pod_assets (uuid, tenant_id, name, asset_type, storage_provider, bucket, object_key, public_url, mime_type, width, height) VALUES (?, 1, ?, ?, "local", "default", ?, ?, "image/svg+xml", 800, 800)',
        [u, ast.name, ast.type, ast.key, publicUrl]
      );
      registeredAssetIds[ast.type] = res.insertId;
    }
  }

  // 4. Create Reusable Template
  let templateId;
  const [existingTpl] = await conn.query('SELECT id FROM pod_templates WHERE name="Enterprise Reference POD T-Shirt Template"');
  if (existingTpl.length > 0) {
    templateId = existingTpl[0].id;
  } else {
    const u = uuidv4();
    const [res] = await conn.query(
      'INSERT INTO pod_templates (uuid, product_type_id, tenant_id, name, rendering_profile, description, version, status) VALUES (?, 1, 1, "Enterprise Reference POD T-Shirt Template", "garment", "Complete 5-layer separated POD reference template", 1, "published")',
      [u]
    );
    templateId = res.insertId;
  }

  // 5. Create Views & 5-Layer Stack
  const viewNames = ['Front', 'Back'];
  for (let i = 0; i < viewNames.length; i++) {
    const vName = viewNames[i];
    let viewId;
    const [existingVw] = await conn.query('SELECT id FROM pod_template_views WHERE template_id=? AND view_name=?', [templateId, vName]);
    if (existingVw.length > 0) {
      viewId = existingVw[0].id;
    } else {
      const u = uuidv4();
      const [res] = await conn.query('INSERT INTO pod_template_views (uuid, template_id, view_name, display_order) VALUES (?, ?, ?, ?)', [
        u,
        templateId,
        vName,
        i + 1,
      ]);
      viewId = res.insertId;
    }

    // Clean existing layers for view
    await conn.query('DELETE FROM pod_view_layers WHERE view_id=?', [viewId]);

    // Insert 5 Separated Layers in strict order
    // Order 1: base_mockup
    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "base_mockup", "normal", 1.00, 1)', [
      viewId,
      registeredAssetIds.base_mockup,
    ]);

    // Order 2: mask
    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "mask", "multiply", 0.90, 2)', [
      viewId,
      registeredAssetIds.mask,
    ]);

    // Order 3: shadow
    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "shadow", "multiply", 0.70, 3)', [
      viewId,
      registeredAssetIds.shadow,
    ]);

    // Order 4: highlight
    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "highlight", "screen", 0.50, 4)', [
      viewId,
      registeredAssetIds.highlight,
    ]);

    // Order 5: texture
    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "texture", "multiply", 0.40, 5)', [
      viewId,
      registeredAssetIds.texture,
    ]);

    // Print Area
    const [existingArea] = await conn.query('SELECT id FROM pod_print_areas WHERE view_id=?', [viewId]);
    if (existingArea.length === 0) {
      const u = uuidv4();
      const methodsJson = JSON.stringify(['DTG', 'DTF', 'Screen Printing']);
      await conn.query(
        'INSERT INTO pod_print_areas (uuid, view_id, name, x, y, width, height, rotation, shape, safe_area_margin, bleed_area_margin, minimum_scale, maximum_scale, allow_rotation, allow_flip, allow_outside_bounds, allowed_print_methods, default_alignment) VALUES (?, ?, "Chest Print Area", 100.00, 100.00, 300.00, 320.00, 0.00, "rectangle", 5.00, 3.00, 0.10, 5.00, true, true, false, ?, "center")',
        [u, viewId, methodsJson]
      );
    }
  }

  // 6. Template Color Swatches
  const swatches = [
    { name: 'Default White', hex: '#FFFFFF', order: 1 },
    { name: 'Jet Black', hex: '#111827', order: 2 },
    { name: 'Royal Blue', hex: '#1D4ED8', order: 3 },
    { name: 'Heather Gray', hex: '#64748B', order: 4 },
    { name: 'Crimson Red', hex: '#DC2626', order: 5 },
    { name: 'Cyan Blue', hex: '#0891B2', order: 6 },
    { name: 'Blush Pink', hex: '#DB2777', order: 7 },
    { name: 'Forest Green', hex: '#15803D', order: 8 },
  ];

  await conn.query('DELETE FROM pod_template_colors WHERE template_id=?', [templateId]);
  for (const sw of swatches) {
    await conn.query('INSERT INTO pod_template_colors (template_id, name, hex_code, display_order, status) VALUES (?, ?, ?, ?, "active")', [
      templateId,
      sw.name,
      sw.hex,
      sw.order,
    ]);
  }

  // 7. Create Dedicated "Enterprise POD Demo T-Shirt" Product
  let productId;
  const [existingProd] = await conn.query('SELECT id FROM products WHERE slug="enterprise-pod-demo-tshirt" OR name="Enterprise POD Demo T-Shirt"');
  if (existingProd.length > 0) {
    productId = existingProd[0].id;
    await conn.query('UPDATE products SET pod_template_id=? WHERE id=?', [templateId, productId]);
  } else {
    const [res] = await conn.query(
      'INSERT INTO products (tenant_id, store_id, name, slug, description, price, sku, pod_template_id, status) VALUES (3, 1, "Enterprise POD Demo T-Shirt", "enterprise-pod-demo-tshirt", "Reference POD Demo product with 5-layer separated template stack for rendering verification.", 499.00, "POD-DEMO-001", ?, "published")',
      [templateId]
    );
    productId = res.insertId;

    // Add primary product image to product_images
    await conn.query('INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, "http://localhost:5000/uploads/pod_assets/demo_base_front.svg", 1, 1)', [
      productId,
    ]);
  }

  console.log(`\nSUCCESSFULLY CREATED POD DEMO PRODUCT: Product ID = ${productId}, pod_template_id = ${templateId}`);
  await conn.end();
}

createPodDemoProduct().catch(console.error);
