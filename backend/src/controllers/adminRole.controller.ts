import { Request, Response, NextFunction } from 'express';
import { AdminRoleService } from '../services/adminRole.service';
import { success, created } from '../shared/responses';

export class AdminRoleController {
  private service = new AdminRoleService();

  public listRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.service.listRoles();
      success(res, 'Roles retrieved successfully', roles);
    } catch (error) {
      next(error);
    }
  };

  public getRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const role = await this.service.getRoleById(id);
      success(res, 'Role details retrieved successfully', role);
    } catch (error) {
      next(error);
    }
  };

  public createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.service.createRole(req.body, req.context);
      created(res, 'Role created successfully', role);
    } catch (error) {
      next(error);
    }
  };

  public updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const role = await this.service.updateRole(id, req.body, req.context);
      success(res, 'Role updated successfully', role);
    } catch (error) {
      next(error);
    }
  };

  public deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      await this.service.deleteRole(id, req.context);
      success(res, 'Role deleted successfully', { id });
    } catch (error) {
      next(error);
    }
  };

  public listPermissions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const perms = await this.service.listAllPermissions();
      success(res, 'Enterprise permissions matrix retrieved successfully', perms);
    } catch (error) {
      next(error);
    }
  };

  public assignUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { userId, roleCode } = req.body;
      const result = await this.service.assignUserRole(Number(userId), roleCode, req.context);
      success(res, 'User role updated successfully', result);
    } catch (error) {
      next(error);
    }
  };
}
