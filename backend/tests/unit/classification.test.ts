/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { SlugService } from '../../src/services/slug.service';
import { CategoryService } from '../../src/services/category.service';
import { categoryValidation } from '../../src/validations/category.validation';
import { collectionValidation } from '../../src/validations/collection.validation';

describe('Unit Tests: Classification Module', () => {
  describe('SlugService', () => {
    let slugService: SlugService;

    beforeAll(() => {
      // Mock sequelize parameter since we only call normalise
      slugService = new SlugService(null as any);
    });

    it('should normalise string to slug correctly', () => {
      expect(slugService.normalise('  Test Brand  ')).toBe('test-brand');
      expect(slugService.normalise('Category & Kids 123!_')).toBe('category-kids-123');
      expect(slugService.normalise('Multiple---Hyphens')).toBe('multiple-hyphens');
    });

    it('should throw error when base slug is empty', async () => {
      await expect(slugService.generateUniqueSlug(null as any, '', 1, 1)).rejects.toThrow(
        'Base slug cannot be empty'
      );
    });
  });

  describe('Category Cycle Detection', () => {
    let categoryService: CategoryService;

    beforeAll(() => {
      categoryService = new CategoryService();
    });

    it('should detect direct self circular parent relation', () => {
      const map = new Map<number, any>();
      map.set(1, { id: 1, parentId: 1 });
      expect(categoryService.detectCycle(1, 1, map)).toBe(true);
    });

    it('should detect circular dependency path', () => {
      // A -> B -> C -> A
      // A (id=1, parent=3), B (id=2, parent=1), C (id=3, parent=2)
      const map = new Map<number, any>();
      map.set(1, { id: 1, parentId: 3 });
      map.set(2, { id: 2, parentId: 1 });
      map.set(3, { id: 3, parentId: 2 });

      // If we try to set parent of 1 (A) to 3 (C), it should detect cycle
      expect(categoryService.detectCycle(3, 1, map)).toBe(true);
    });

    it('should return false for valid linear hierarchy', () => {
      // Root (id=1, parent=null) -> Child (id=2, parent=1) -> Grandchild (id=3, parent=2)
      const map = new Map<number, any>();
      map.set(1, { id: 1, parentId: null });
      map.set(2, { id: 2, parentId: 1 });
      map.set(3, { id: 3, parentId: 2 });

      expect(categoryService.detectCycle(2, 4, map)).toBe(false);
    });
  });

  describe('Validation Whitelists & Unique Array Checks', () => {
    it('should reject duplicate IDs in reorder validation', () => {
      const payload = {
        orders: [
          { id: 1, sortOrder: 0 },
          { id: 1, sortOrder: 1 }, // duplicate id
        ],
      };
      const { error } = categoryValidation.reorderCategories.validate(payload);
      expect(error).toBeDefined();
    });

    it('should accept valid reorder array', () => {
      const payload = {
        orders: [
          { id: 1, sortOrder: 0 },
          { id: 2, sortOrder: 1 },
        ],
      };
      const { error } = categoryValidation.reorderCategories.validate(payload);
      expect(error).toBeUndefined();
    });

    it('should reject duplicate IDs in collection product replacement', () => {
      const payload = {
        productIds: [1, 2, 2],
      };
      const { error } = collectionValidation.replaceProducts.validate(payload);
      expect(error).toBeDefined();
    });
  });
});
