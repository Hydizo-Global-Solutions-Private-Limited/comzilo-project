const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function diagnose() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'comzilo_db',
  });

  console.log('=== STEP 1: PRODUCTS TABLE RECORD ===');
  const [products] = await conn.query('SELECT id, name, sku, pod_template_id FROM products WHERE id=20');
  console.log(products);

  if (!products.length || !products[0].pod_template_id) {
    console.log('pod_template_id is NULL or Product 20 not found.');
    await conn.end();
    return;
  }

  const templateId = products[0].pod_template_id;

  console.log('\n=== STEP 3: POD_TEMPLATES ===');
  const [templates] = await conn.query('SELECT * FROM pod_templates WHERE id=?', [templateId]);
  console.log(templates);

  console.log('\n=== STEP 3: POD_TEMPLATE_VIEWS ===');
  const [views] = await conn.query('SELECT * FROM pod_template_views WHERE template_id=?', [templateId]);
  console.log(views);

  const viewIds = views.map((v) => v.id);

  console.log('\n=== STEP 3 & 4: POD_VIEW_LAYERS & ASSETS ===');
  const [layers] = await conn.query(
    'SELECT l.id as layer_id, l.view_id, v.view_name, l.layer_type, l.blend_mode, l.opacity, l.display_order, a.id as asset_id, a.name as asset_name, a.asset_type, a.object_key, a.public_url FROM pod_view_layers l JOIN pod_template_views v ON l.view_id=v.id JOIN pod_assets a ON l.asset_id=a.id WHERE l.view_id IN (?) ORDER BY v.display_order, l.display_order',
    [viewIds]
  );
  console.log(layers);

  console.log('\n=== STEP 4: FILE EXISTENCE AUDIT ===');
  for (const lyr of layers) {
    let fileExists = false;
    if (lyr.public_url.startsWith('http://localhost:5000/uploads/')) {
      const relPath = lyr.public_url.replace('http://localhost:5000/uploads/', '');
      const localPath = path.join(__dirname, '..', 'public', 'uploads', relPath);
      fileExists = fs.existsSync(localPath);
      console.log(`Layer ${lyr.layer_id} (${lyr.view_name} - ${lyr.layer_type}): object_key="${lyr.object_key}", fileExists=${fileExists ? 'YES' : 'NO'}, localPath="${localPath}"`);
    } else {
      console.log(`Layer ${lyr.layer_id} (${lyr.view_name} - ${lyr.layer_type}): Remote URL="${lyr.public_url}"`);
    }
  }

  console.log('\n=== STEP 3: POD_TEMPLATE_COLORS ===');
  const [colors] = await conn.query('SELECT * FROM pod_template_colors WHERE template_id=?', [templateId]);
  console.log(colors);

  console.log('\n=== STEP 3: POD_PRINT_AREAS ===');
  const [areas] = await conn.query('SELECT * FROM pod_print_areas WHERE view_id IN (?)', [viewIds]);
  console.log(areas);

  await conn.end();
}

diagnose().catch(console.error);
