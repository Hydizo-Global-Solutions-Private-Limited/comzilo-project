import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'comzilo_db',
  waitForConnections: true,
  connectionLimit: 10,
});

export interface PodTemplateBundle {
  template: {
    id: number;
    uuid: string;
    name: string;
    renderingProfile: string;
    version: number;
    status: string;
  };
  productType: {
    name: string;
    slug: string;
  };
  views: Array<{
    id: number;
    uuid: string;
    viewName: string;
    displayOrder: number;
    layers: Array<{
      id: number;
      layerType: string;
      blendMode: string;
      opacity: number;
      displayOrder: number;
      assetUrl: string;
      assetType: string;
    }>;
    printAreas: Array<{
      id: number;
      uuid: string;
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      shape: string;
      safeAreaMargin: number;
      bleedAreaMargin: number;
      allowedPrintMethods: string[];
    }>;
  }>;
  swatches: Array<{
    id: number;
    name: string;
    hexCode: string;
    displayOrder: number;
  }>;
}

export async function getTemplateBundleByProductId(productId: number, tenantId: number = 1): Promise<PodTemplateBundle | null> {
  // 1. Resolve pod_template_id for product
  const [prodRows]: any = await pool.query('SELECT pod_template_id FROM products WHERE id=?', [productId]);
  if (!prodRows || prodRows.length === 0 || !prodRows[0].pod_template_id) {
    return null;
  }

  const templateId = prodRows[0].pod_template_id;

  // 2. Fetch pod_templates
  const [tplRows]: any = await pool.query(
    'SELECT t.*, pt.name as product_type_name, pt.slug as product_type_slug FROM pod_templates t LEFT JOIN pod_product_types pt ON t.product_type_id = pt.id WHERE t.id=? AND t.tenant_id=?',
    [templateId, tenantId]
  );

  if (!tplRows || tplRows.length === 0) return null;
  const tpl = tplRows[0];

  // 3. Fetch pod_template_views
  const [viewRows]: any = await pool.query('SELECT * FROM pod_template_views WHERE template_id=? ORDER BY display_order ASC', [templateId]);

  const views = [];
  for (const vw of viewRows) {
    // Fetch layers for this view
    const [layerRows]: any = await pool.query(
      'SELECT l.*, a.public_url as asset_url, a.asset_type FROM pod_view_layers l JOIN pod_assets a ON l.asset_id = a.id WHERE l.view_id=? ORDER BY l.display_order ASC',
      [vw.id]
    );

    const layers = layerRows.map((l: any) => ({
      id: l.id,
      layerType: l.layer_type,
      blendMode: l.blend_mode,
      opacity: Number(l.opacity),
      displayOrder: l.display_order,
      assetUrl: l.asset_url,
      assetType: l.asset_type,
    }));

    // Fetch print areas for this view
    const [areaRows]: any = await pool.query('SELECT * FROM pod_print_areas WHERE view_id=?', [vw.id]);

    const printAreas = areaRows.map((a: any) => {
      let allowedMethods = [];
      try {
        allowedMethods = typeof a.allowed_print_methods === 'string' ? JSON.parse(a.allowed_print_methods) : a.allowed_print_methods || [];
      } catch {
        allowedMethods = ['DTG', 'DTF'];
      }

      return {
        id: a.id,
        uuid: a.uuid,
        name: a.name,
        x: Number(a.x),
        y: Number(a.y),
        width: Number(a.width),
        height: Number(a.height),
        rotation: Number(a.rotation),
        shape: a.shape,
        safeAreaMargin: Number(a.safe_area_margin),
        bleedAreaMargin: Number(a.bleed_area_margin),
        allowedPrintMethods: allowedMethods,
      };
    });

    views.push({
      id: vw.id,
      uuid: vw.uuid,
      viewName: vw.view_name,
      displayOrder: vw.display_order,
      layers,
      printAreas,
    });
  }

  // 4. Fetch pod_template_colors
  const [swatchRows]: any = await pool.query('SELECT * FROM pod_template_colors WHERE template_id=? AND status="active" ORDER BY display_order ASC', [
    templateId,
  ]);

  const swatches = swatchRows.map((s: any) => ({
    id: s.id,
    name: s.name,
    hexCode: s.hex_code,
    displayOrder: s.display_order,
  }));

  return {
    template: {
      id: tpl.id,
      uuid: tpl.uuid,
      name: tpl.name,
      renderingProfile: tpl.rendering_profile,
      version: tpl.version,
      status: tpl.status,
    },
    productType: {
      name: tpl.product_type_name || 'Apparel',
      slug: tpl.product_type_slug || 'apparel',
    },
    views,
    swatches,
  };
}
