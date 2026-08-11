-- 020_create_enterprise_pod_tables.sql
-- Enterprise-Grade Product-Agnostic Print-on-Demand (POD) Engine Migration

-- 1. POD PRODUCT TYPES
CREATE TABLE IF NOT EXISTS pod_product_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. POD ASSET LIBRARY
CREATE TABLE IF NOT EXISTS pod_assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  asset_type ENUM('base_mockup', 'mask', 'shadow', 'highlight', 'texture', 'overlay', 'clipart') NOT NULL,
  storage_provider ENUM('local', 's3', 'r2', 'azure') DEFAULT 'local',
  bucket VARCHAR(100) DEFAULT 'default',
  object_key VARCHAR(255) NOT NULL,
  public_url TEXT NOT NULL,
  mime_type VARCHAR(100) DEFAULT 'image/png',
  width INT DEFAULT 0,
  height INT DEFAULT 0,
  checksum VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. POD REUSABLE TEMPLATES
CREATE TABLE IF NOT EXISTS pod_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  product_type_id INT NOT NULL,
  parent_id INT NULL,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  rendering_profile ENUM('garment', 'mug_wrap', 'phone_case', 'canvas', 'sticker_sheet') DEFAULT 'garment',
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  status ENUM('draft', 'published', 'archived') DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_type_id) REFERENCES pod_product_types(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES pod_templates(id) ON DELETE SET NULL
);

-- 4. POD TEMPLATE DYNAMIC VIEWS
CREATE TABLE IF NOT EXISTS pod_template_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  template_id INT NOT NULL,
  view_name VARCHAR(100) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES pod_templates(id) ON DELETE CASCADE
);

-- 5. POD VIEW ORDERED LAYERS
CREATE TABLE IF NOT EXISTS pod_view_layers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  view_id INT NOT NULL,
  asset_id INT NOT NULL,
  layer_type ENUM('base_mockup', 'mask', 'shadow', 'highlight', 'texture', 'stitch', 'overlay') NOT NULL,
  blend_mode VARCHAR(50) DEFAULT 'normal',
  opacity DECIMAL(3,2) DEFAULT 1.00,
  display_order INT DEFAULT 0,
  FOREIGN KEY (view_id) REFERENCES pod_template_views(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES pod_assets(id) ON DELETE CASCADE
);

-- 6. POD PRINT AREAS WITH RESTRICTIONS
CREATE TABLE IF NOT EXISTS pod_print_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  view_id INT NOT NULL,
  name VARCHAR(100) DEFAULT 'Main Print Area',
  x DECIMAL(8,2) NOT NULL,
  y DECIMAL(8,2) NOT NULL,
  width DECIMAL(8,2) NOT NULL,
  height DECIMAL(8,2) NOT NULL,
  rotation DECIMAL(5,2) DEFAULT 0,
  shape ENUM('rectangle', 'circle', 'ellipse') DEFAULT 'rectangle',
  safe_area_margin DECIMAL(5,2) DEFAULT 5.0,
  bleed_area_margin DECIMAL(5,2) DEFAULT 3.0,
  minimum_scale DECIMAL(4,2) DEFAULT 0.10,
  maximum_scale DECIMAL(4,2) DEFAULT 5.00,
  allow_rotation BOOLEAN DEFAULT TRUE,
  allow_flip BOOLEAN DEFAULT TRUE,
  allow_outside_bounds BOOLEAN DEFAULT FALSE,
  allowed_print_methods JSON,
  default_alignment ENUM('center', 'top_left', 'top_center', 'custom') DEFAULT 'center',
  FOREIGN KEY (view_id) REFERENCES pod_template_views(id) ON DELETE CASCADE
);

-- 7. POD TEMPLATE COLOR SWATCHES
CREATE TABLE IF NOT EXISTS pod_template_colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  hex_code VARCHAR(20) NOT NULL,
  display_order INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  FOREIGN KEY (template_id) REFERENCES pod_templates(id) ON DELETE CASCADE
);
