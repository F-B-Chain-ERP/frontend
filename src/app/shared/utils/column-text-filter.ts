export type FilterStrategy<T> = (
  fieldValue: unknown,
  filterValue: unknown,
  item: T
) => boolean;

export type FilterStrategyName =
  | 'contains'
  | 'equals'
  | 'date-range'
  | 'number-range';

export class ColumnTextFilter<T extends Record<string, any>> {
  private readonly activeFilters: Partial<Record<keyof T, unknown>> = {};
  private readonly displayValues: Partial<Record<keyof T, unknown>> = {};

  /**
   * Chỉ khai báo cho các field đặc biệt.
   * Field không khai báo sẽ tự động dùng strategy mặc định.
   */
  constructor(
    private readonly getSource: () => T[],
    private readonly fieldStrategies: Partial<
      Record<keyof T, FilterStrategyName>
    > = {}
  ) {
  }

  /**
   * Registry các strategy
   */
  private readonly strategies: Record<
    FilterStrategyName,
    FilterStrategy<T>
  > = {
    contains: (fieldValue, filterValue) => {
      return String(fieldValue ?? '')
        .toLowerCase()
        .includes(String(filterValue));
    },

    equals: (fieldValue, filterValue) => {
      return fieldValue === filterValue;
    },

    'date-range': (fieldValue, filterValue) => {
      if (
        !Array.isArray(filterValue) ||
        filterValue.length !== 2 ||
        !fieldValue
      ) {
        return true;
      }

      const [from, to] = filterValue;

      const current = new Date(fieldValue as string);

      if (isNaN(current.getTime())) {
        return false;
      }

      const fromDate = new Date(from as string);
      fromDate.setHours(0, 0, 0, 0);

      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);

      return (
        current.getTime() >= fromDate.getTime() &&
        current.getTime() <= toDate.getTime()
      );
    },

    'number-range': (fieldValue, filterValue) => {
      if (
        !Array.isArray(filterValue) ||
        filterValue.length !== 2
      ) {
        return true;
      }

      const [min, max] = filterValue;

      const value = Number(fieldValue);

      return value >= Number(min) && value <= Number(max);
    }
  };

  getValue(field: keyof T): unknown {
    return this.displayValues[field] ?? '';
  }

  get hasActiveFilters(): boolean {
    return Object.keys(this.activeFilters).length > 0;
  }

  setField(field: keyof T, value: unknown): T[] {
    this.displayValues[field] = value;

    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      delete this.activeFilters[field];
    } else {
      this.activeFilters[field] =
        typeof value === 'string'
          ? value.trim().toLowerCase()
          : value;
    }

    return this.apply();
  }

  apply(): T[] {
    const source = this.getSource();

    const entries = Object.entries(this.activeFilters) as [
      keyof T,
      unknown
    ][];

    if (!entries.length) {
      return source;
    }

    return source.filter(item =>
      entries.every(([field, filterValue]) => {
        const fieldValue = item[field];

        const strategyName: FilterStrategyName =
          this.fieldStrategies[field] ??
          (typeof filterValue === 'string'
            ? 'contains'
            : 'equals');

        return this.strategies[strategyName](
          fieldValue,
          filterValue,
          item
        );
      })
    );
  }

  reset(): T[] {
    (Object.keys(this.displayValues) as (keyof T)[]).forEach(key => {
      delete this.displayValues[key];
    });

    (Object.keys(this.activeFilters) as (keyof T)[]).forEach(key => {
      delete this.activeFilters[key];
    });

    return this.apply();
  }
}
