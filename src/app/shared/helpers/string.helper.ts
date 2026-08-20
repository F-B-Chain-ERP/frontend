export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
