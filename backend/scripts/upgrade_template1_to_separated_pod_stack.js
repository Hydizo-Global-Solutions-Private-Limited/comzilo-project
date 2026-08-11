const mysql = require('mysql2/promise');

async function upgradeTemplate1() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('Upgrading Template #1 to 5-Layer Separated POD Mockup Stack for Product #19...');

  // 1. Fetch asset IDs for separated layers
  const [baseAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="demo_base_front.svg"');
  const [maskAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="demo_mask_front.svg"');
  const [shadowAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="demo_shadow_front.svg"');
  const [highlightAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="demo_highlight_front.svg"');
  const [textureAst] = await conn.query('SELECT id FROM pod_assets WHERE object_key="demo_texture_front.svg"');

  const baseAssetId = baseAst[0].id;
  const maskAssetId = maskAst[0].id;
  const shadowAssetId = shadowAst[0].id;
  const highlightAssetId = highlightAst[0].id;
  const textureAssetId = textureAst[0].id;

  // 2. Fetch views for Template #1
  const [views] = await conn.query('SELECT id, view_name FROM pod_template_views WHERE template_id=1');

  for (const vw of views) {
    // Delete old unseparated layers for view
    await conn.query('DELETE FROM pod_view_layers WHERE view_id=?', [vw.id]);

    // Insert 5 separated layers in strict display order
    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "base_mockup", "normal", 1.00, 1)', [
      vw.id,
      baseAssetId,
    ]);

    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "mask", "multiply", 0.90, 2)', [
      vw.id,
      maskAssetId,
    ]);

    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "shadow", "multiply", 0.70, 3)', [
      vw.id,
      shadowAssetId,
    ]);

    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "highlight", "screen", 0.50, 4)', [
      vw.id,
      highlightAssetId,
    ]);

    await conn.query('INSERT INTO pod_view_layers (view_id, asset_id, layer_type, blend_mode, opacity, display_order) VALUES (?, ?, "texture", "multiply", 0.40, 5)', [
      vw.id,
      textureAssetId,
    ]);
  }

  // 3. Update Product #19 to link to pod_template_id = 1
  await conn.query('UPDATE products SET pod_template_id=1, product_type="print_on_demand", status="active" WHERE id=19');

  // 4. Update Product #19 storefront image in product_images
  await conn.query('DELETE FROM product_images WHERE product_id=19');
  await conn.query(
    'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (19, "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800", 1, 1)'
  );

  console.log('SUCCESSFULLY UPGRADED TEMPLATE #1 TO 5-LAYER POD STACK FOR PRODUCT #19!');

  await conn.end();
}

upgradeTemplate1().catch(console.error);
