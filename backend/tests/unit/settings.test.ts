/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { SettingsService } from '../../src/services/settings.service';
import { ConfigurationService } from '../../src/services/configuration.service';

describe('Unit Tests: Settings & Configuration Module', () => {
  let settingsService: SettingsService;
  let configService: ConfigurationService;

  beforeAll(() => {
    settingsService = new SettingsService();
    configService = new ConfigurationService();
  });

  describe('Settings Resolution Hierarchy', () => {
    it('should return default fallback value when no key exists in any scope', async () => {
      const value = await settingsService.resolveSetting(
        999,
        999,
        'non_existent_key_xyz',
        'default_val'
      );
      expect(value).toBe('default_val');
    });
  });

  describe('Feature Flag Management Logic', () => {
    it('should return default feature flag map', async () => {
      const flags = await configService.getFeatureFlags();
      expect(flags).toHaveProperty('pos');
      expect(flags).toHaveProperty('inventory');
      expect(flags).toHaveProperty('reports');
      expect(flags).toHaveProperty('notifications');
      expect(flags).toHaveProperty('loyalty');
      expect(flags).toHaveProperty('coupons');
      expect(flags).toHaveProperty('multi_store');
      expect(flags).toHaveProperty('multi_currency');
    });
  });
});
