import {NzTableSortFn} from 'ng-zorro-antd/table';

export function createSortFn<T>(key: keyof T): NzTableSortFn<T> {
  return (a: T, b: T) => {
    return String(a[key] ?? '').localeCompare(String(b[key] ?? ''));
  };
}
