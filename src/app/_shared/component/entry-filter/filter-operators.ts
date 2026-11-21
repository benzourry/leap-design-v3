export interface FilterField {
  type?: string;
  subType?: string;
}

export type FilterOperator = 'default' | 'range' | 'not' | 'in' | 'notin' | 'has' | 'nothas'
  | 'contain' | 'notcontain' | 'from' | 'to';

export interface FilterOperatorOption {
  value: FilterOperator;
  label: string;
}

const numericTypes = ['number', 'date', 'scale', 'scaleTo5', 'scaleTo10'];

export function isRangeFilter(field: FilterField): boolean {
  return numericTypes.includes(field.type ?? '');
}

export function filterOperatorOptions(field: FilterField, path: string): FilterOperatorOption[] {
  if (path.includes('*') && isRangeFilter(field)) {
    return [{ value: 'range', label: 'From / To (legacy list match)' }];
  }
  if (path.includes('*') || field.type === 'checkbox') {
    return [{ value: 'default', label: 'Default match' }];
  }

  if (isRangeFilter(field)) {
    return [
      { value: 'range', label: 'From / To' },
      { value: 'default', label: 'Equals' },
      { value: 'not', label: 'Does not equal' },
      { value: 'from', label: 'Greater than or equal to' },
      { value: 'to', label: 'Less than or equal to' }
    ];
  }

  if (['text', 'textarea', 'eval', 'qr', 'select', 'radio', 'simpleOption', 'modelPicker'].includes(field.type ?? '')) {
    return [
      { value: 'default', label: 'Default match' },
      { value: 'not', label: 'Does not equal' },
      { value: 'contain', label: 'Contains' },
      { value: 'notcontain', label: 'Does not contain' },
      { value: 'in', label: 'Is in (comma-separated)' },
      { value: 'notin', label: 'Is not in (comma-separated)' },
      { value: 'has', label: 'Has (comma-separated)' },
      { value: 'nothas', label: 'Does not have (comma-separated)' }
    ];
  }

  return [{ value: 'default', label: 'Default match' }];
}

export function operatorSettingKey(path: string): string {
  return `filterOperator.${path}`;
}

export function getFilterOperator(
  presets: Record<string, unknown>, field: FilterField, path: string
): FilterOperator {
  const saved = presets?.[operatorSettingKey(path)];
  const options = filterOperatorOptions(field, path);
  return options.find(option => option.value === saved)?.value
    ?? (isRangeFilter(field) ? 'range' : 'default');
}

export function filterKey(path: string, operator: FilterOperator): string {
  return operator === 'default' || operator === 'range' ? path : `${path}~${operator}`;
}
