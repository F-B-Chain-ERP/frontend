import {toCamelCase, toPascalCase} from './string.helper';

export function transformToCamelObject(value: any): any {
  if (Array.isArray(value)) return value.map(item => transformToCamelObject(item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toCamelCase(k), transformToCamelObject(v)]),
    );
  }
  return value;
}

export function transformToPascalObject(value: any): any {
  if (Array.isArray(value)) return value.map(item => transformToPascalObject(item));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toPascalCase(k), transformToPascalObject(v)]),
    );
  }
  return value;
}
