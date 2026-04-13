import { describe, it, expect } from 'vitest';
import { mapToCamelCase } from './index';

describe('API Data Mapping Utilities', () => {
  describe('mapToCamelCase', () => {
    it('should convert specific snake_case keys to camelCase', () => {
      const input = {
        dealerid: '123',
        registrationapproved: true,
        reputationscore: 95,
        createdat: '2023-01-01'
      };
      
      const expected = {
        dealerId: '123',
        registrationApproved: true,
        reputationScore: 95,
        createdAt: '2023-01-01'
      };
      
      expect(mapToCamelCase(input)).toEqual(expected);
    });

    it('should leave unmapped keys unchanged', () => {
      const input = {
        unknown_key: 'value',
        name: 'John'
      };
      
      const expected = {
        unknown_key: 'value',
        name: 'John'
      };
      
      expect(mapToCamelCase(input)).toEqual(expected);
    });

    it('should handle null or undefined input', () => {
      expect(mapToCamelCase(null)).toBeNull();
      expect(mapToCamelCase(undefined)).toBeUndefined();
    });
  });
});
