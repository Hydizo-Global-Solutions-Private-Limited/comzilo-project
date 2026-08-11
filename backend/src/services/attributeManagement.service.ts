import { AttributeGroup, CategoryAttribute, AttributeValue, Category } from '../database/models';
import { NotFoundError, ValidationError } from '../shared/errors/AppError';
import { createAuditLog } from '../utils/auditHelper';

export class AttributeManagementService {
  // --- ATTRIBUTE GROUPS ---
  public async getAttributeGroups(tenantId?: number | null) {
    const whereClause: any = {};
    if (tenantId) whereClause.tenantId = tenantId;

    return await AttributeGroup.findAll({
      where: whereClause,
      include: [
        { model: AttributeValue, as: 'values' },
        { model: CategoryAttribute, as: 'categoryAttributes' },
      ],
      order: [
        ['displayOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  public async createAttributeGroup(tenantId: number | null, data: any, context?: any) {
    if (!data.name || !data.code) {
      throw new ValidationError('Group Name and Code are required');
    }

    const existingCode = await AttributeGroup.findOne({
      where: { code: data.code, ...(tenantId ? { tenantId } : {}) },
    });
    if (existingCode) {
      throw new ValidationError(`Attribute Group Code "${data.code}" already exists`);
    }

    const group = await AttributeGroup.create({
      tenantId,
      name: data.name,
      code: data.code,
      displayOrder: data.displayOrder || 0,
      status: data.status || 'active',
    });

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_GROUP_CREATED',
        entityType: 'AttributeGroup',
        entityId: String(group.id),
        newValues: group.get({ plain: true }),
      },
      context
    );

    return group;
  }

  public async updateAttributeGroup(id: number, tenantId: number | null, data: any, context?: any) {
    const group = await AttributeGroup.findByPk(id);
    if (!group) throw new NotFoundError('Attribute Group not found');

    if (data.code && data.code !== group.code) {
      const existing = await AttributeGroup.findOne({
        where: { code: data.code, ...(tenantId ? { tenantId } : {}) },
      });
      if (existing) throw new ValidationError(`Attribute Group Code "${data.code}" already exists`);
    }

    const oldValues = group.get({ plain: true });
    await group.update(data);

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_GROUP_UPDATED',
        entityType: 'AttributeGroup',
        entityId: String(id),
        previousValues: oldValues,
        newValues: group.get({ plain: true }),
      },
      context
    );

    return group;
  }

  public async deleteAttributeGroup(id: number, tenantId: number | null, context?: any) {
    const group = await AttributeGroup.findByPk(id);
    if (!group) throw new NotFoundError('Attribute Group not found');

    const oldValues = group.get({ plain: true });
    await group.destroy();

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_GROUP_DELETED',
        entityType: 'AttributeGroup',
        entityId: String(id),
        previousValues: oldValues,
      },
      context
    );

    return true;
  }

  // --- ATTRIBUTE VALUES ---
  public async getAttributeValues(groupId: number) {
    return await AttributeValue.findAll({
      where: { attributeGroupId: groupId },
      order: [
        ['displayOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  public async createAttributeValue(tenantId: number | null, data: any, context?: any) {
    if (!data.attributeGroupId || !data.value) {
      throw new ValidationError('Attribute Group ID and Value are required');
    }

    const existingVal = await AttributeValue.findOne({
      where: { attributeGroupId: data.attributeGroupId, value: data.value },
    });
    if (existingVal) {
      throw new ValidationError(`Attribute Value "${data.value}" already exists in this group`);
    }

    const val = await AttributeValue.create({
      tenantId,
      attributeGroupId: data.attributeGroupId,
      value: data.value,
      hexCode: data.hexCode || null,
      displayOrder: data.displayOrder || 0,
    });

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_VALUE_CREATED',
        entityType: 'AttributeValue',
        entityId: String(val.id),
        newValues: val.get({ plain: true }),
      },
      context
    );

    return val;
  }

  public async updateAttributeValue(id: number, tenantId: number | null, data: any, context?: any) {
    const val = await AttributeValue.findByPk(id);
    if (!val) throw new NotFoundError('Attribute Value not found');

    if (data.value && data.value !== val.value) {
      const existing = await AttributeValue.findOne({
        where: { attributeGroupId: val.attributeGroupId, value: data.value },
      });
      if (existing)
        throw new ValidationError(`Attribute Value "${data.value}" already exists in this group`);
    }

    const oldValues = val.get({ plain: true });
    await val.update(data);

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_VALUE_UPDATED',
        entityType: 'AttributeValue',
        entityId: String(id),
        previousValues: oldValues,
        newValues: val.get({ plain: true }),
      },
      context
    );

    return val;
  }

  public async deleteAttributeValue(id: number, tenantId: number | null, context?: any) {
    const val = await AttributeValue.findByPk(id);
    if (!val) throw new NotFoundError('Attribute Value not found');

    const oldValues = val.get({ plain: true });
    await val.destroy();

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_VALUE_DELETED',
        entityType: 'AttributeValue',
        entityId: String(id),
        previousValues: oldValues,
      },
      context
    );

    return true;
  }

  // --- CATEGORY ATTRIBUTES & MAPPINGS ---
  public async getCategoryAttributes(categoryId?: number, tenantId?: number | null) {
    const whereClause: any = {};
    if (categoryId) whereClause.categoryId = categoryId;
    if (tenantId) whereClause.tenantId = tenantId;

    return await CategoryAttribute.findAll({
      where: whereClause,
      include: [
        { model: AttributeGroup, as: 'group', include: [{ model: AttributeValue, as: 'values' }] },
      ],
      order: [
        ['displayOrder', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  public async createCategoryAttribute(tenantId: number | null, data: any, context?: any) {
    if (!data.categoryId || !data.attributeName) {
      throw new ValidationError('Category ID and Attribute Name are required');
    }

    const attrCode = data.code || data.attributeName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const existingAttr = await CategoryAttribute.findOne({
      where: { categoryId: data.categoryId, attributeName: data.attributeName },
    });
    if (existingAttr) {
      throw new ValidationError(
        `Attribute "${data.attributeName}" is already assigned to this category`
      );
    }

    let groupId = data.attributeGroupId || null;
    if (!groupId) {
      const groupName = data.displayName || data.attributeName;
      let group = await AttributeGroup.findOne({
        where: { code: attrCode, ...(tenantId ? { tenantId } : {}) },
      });
      if (!group) {
        group = await AttributeGroup.create({
          tenantId,
          name: groupName,
          code: attrCode,
          displayOrder: 0,
          status: 'active',
        });
      }
      groupId = group.id;
    }

    const attr = await CategoryAttribute.create({
      tenantId,
      categoryId: data.categoryId,
      attributeGroupId: groupId,
      attributeName: data.attributeName,
      displayName: data.displayName || data.attributeName,
      code: attrCode,
      description: data.description || null,
      attributeType: data.attributeType || 'select',
      placeholder: data.placeholder || null,
      defaultValue: data.defaultValue || null,
      isRequired: data.isRequired || false,
      isUnique: data.isUnique || false,
      isSearchable: data.isSearchable ?? true,
      isFilterable: data.isFilterable ?? true,
      isSortable: data.isSortable || false,
      isVisible: data.isVisible ?? true,
      displayOrder: data.displayOrder || 0,
      status: data.status || 'active',
    });

    await createAuditLog(
      {
        tenantId,
        action: 'CATEGORY_ATTRIBUTE_ASSIGNED',
        entityType: 'CategoryAttribute',
        entityId: String(attr.id),
        newValues: attr.get({ plain: true }),
      },
      context
    );

    return attr;
  }

  public async updateCategoryAttribute(
    id: number,
    tenantId: number | null,
    data: any,
    context?: any
  ) {
    const attr = await CategoryAttribute.findByPk(id);
    if (!attr) throw new NotFoundError('Category Attribute not found');

    const oldValues = attr.get({ plain: true });
    await attr.update(data);

    await createAuditLog(
      {
        tenantId,
        action: 'ATTRIBUTE_UPDATED',
        entityType: 'CategoryAttribute',
        entityId: String(id),
        previousValues: oldValues,
        newValues: attr.get({ plain: true }),
      },
      context
    );

    return attr;
  }

  public async deleteCategoryAttribute(id: number, tenantId: number | null, context?: any) {
    const attr = await CategoryAttribute.findByPk(id);
    if (!attr) throw new NotFoundError('Category Attribute not found');

    const oldValues = attr.get({ plain: true });
    await attr.destroy();

    await createAuditLog(
      {
        tenantId,
        action: 'CATEGORY_ATTRIBUTE_REMOVED',
        entityType: 'CategoryAttribute',
        entityId: String(id),
        previousValues: oldValues,
      },
      context
    );

    return true;
  }
}
