import { Request, Response, NextFunction } from 'express';
import { AttributeManagementService } from '../services/attributeManagement.service';
import { success } from '../shared/responses';

const service = new AttributeManagementService();

export class AttributeManagementController {
  // Attribute Groups
  public getAttributeGroups = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const groups = await service.getAttributeGroups(tenantId);
      success(res, 'Attribute groups retrieved successfully', groups);
    } catch (error) {
      next(error);
    }
  };

  public createAttributeGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const group = await service.createAttributeGroup(tenantId, req.body, (req as any).context);
      success(res, 'Attribute group created successfully', group, 201);
    } catch (error) {
      next(error);
    }
  };

  public updateAttributeGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      const updated = await service.updateAttributeGroup(
        id,
        tenantId,
        req.body,
        (req as any).context
      );
      success(res, 'Attribute group updated successfully', updated);
    } catch (error) {
      next(error);
    }
  };

  public deleteAttributeGroup = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      await service.deleteAttributeGroup(id, tenantId, (req as any).context);
      success(res, 'Attribute group deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // Attribute Values
  public getAttributeValues = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const groupId = Number(req.params.groupId);
      const values = await service.getAttributeValues(groupId);
      success(res, 'Attribute values retrieved successfully', values);
    } catch (error) {
      next(error);
    }
  };

  public createAttributeValue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const val = await service.createAttributeValue(tenantId, req.body, (req as any).context);
      success(res, 'Attribute value created successfully', val, 201);
    } catch (error) {
      next(error);
    }
  };

  public updateAttributeValue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      const updated = await service.updateAttributeValue(
        id,
        tenantId,
        req.body,
        (req as any).context
      );
      success(res, 'Attribute value updated successfully', updated);
    } catch (error) {
      next(error);
    }
  };

  public deleteAttributeValue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      await service.deleteAttributeValue(id, tenantId, (req as any).context);
      success(res, 'Attribute value deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // Category Attributes
  public getCategoryAttributes = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const tenantId = (req as any).tenantId || null;
      const attributes = await service.getCategoryAttributes(categoryId, tenantId);
      success(res, 'Category attributes retrieved successfully', attributes);
    } catch (error) {
      next(error);
    }
  };

  public createCategoryAttribute = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || null;
      const attr = await service.createCategoryAttribute(tenantId, req.body, (req as any).context);
      success(res, 'Category attribute created successfully', attr, 201);
    } catch (error) {
      next(error);
    }
  };

  public updateCategoryAttribute = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      const updated = await service.updateCategoryAttribute(
        id,
        tenantId,
        req.body,
        (req as any).context
      );
      success(res, 'Category attribute updated successfully', updated);
    } catch (error) {
      next(error);
    }
  };

  public deleteCategoryAttribute = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const tenantId = (req as any).tenantId || null;
      await service.deleteCategoryAttribute(id, tenantId, (req as any).context);
      success(res, 'Category attribute deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}
