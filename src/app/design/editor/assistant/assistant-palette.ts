export interface AssistantPaletteItem {
  type?: string;
  title?: string;
  label?: string;
  item?: { type?: string };
  [key: string]: unknown;
}

export interface AssistantPaletteGroup<T extends AssistantPaletteItem> {
  label: string;
  items: T[];
}

export const ASSISTANT_PALETTE_DRAG_DELAY = { mouse: 0, touch: 150 };

const COMPONENT_CATEGORY: Record<string, string> = {
  add: 'Forms',
  'edit-single': 'Forms',
  'view-single': 'Forms',
  form: 'Forms',
  'form-single': 'Forms',
  dataset: 'Datasets',
  dashboard: 'Dashboards',
  screen: 'Screens',
  lookup: 'Lookups',
  user: 'Users & access',
  profile: 'Users & access',
  start: 'Users & access',
  lambda: 'Lambdas',
};

const FORM_CATEGORY: Record<string, string> = {
  text: 'Common',
  number: 'Common',
  scale: 'Common',
  scaleTo5: 'Common',
  scaleTo10: 'Common',
  color: 'Common',
  date: 'Common',
  file: 'File Uploads',
  select: 'Choices',
  radio: 'Choices',
  checkbox: 'Choices',
  checkboxOption: 'Choices',
  simpleOption: 'Choices',
  modelPicker: 'Choices',
  speech: 'Special',
  qr: 'Special',
  eval: 'Special',
  imagePreview: 'Special',
  static: 'Special',
  btn: 'Special',
  map: 'Special',
  dataset: 'Embeddable',
  screen: 'Embeddable',
};

export function groupAssistantPalette<T extends AssistantPaletteItem>(
  items: T[] = [],
  filter = '',
  formFields = false
): AssistantPaletteGroup<T>[] {
  const normalizedFilter = filter.trim().toLocaleLowerCase();
  const grouped = new Map<string, T[]>();

  for (const paletteItem of items) {
    const searchableText = `${paletteItem.title ?? ''} ${paletteItem.label ?? ''}`.toLocaleLowerCase();
    if (normalizedFilter && !searchableText.includes(normalizedFilter)) continue;

    const type = paletteItem.item?.type ?? paletteItem.type ?? '';
    const label = formFields
      ? FORM_CATEGORY[type] ?? 'Other'
      : COMPONENT_CATEGORY[type] ?? 'Other';
    const group = grouped.get(label) ?? [];
    group.push(paletteItem);
    grouped.set(label, group);
  }

  return Array.from(grouped, ([label, groupedItems]) => ({ label, items: groupedItems }));
}

export function flattenAssistantPalette<T extends AssistantPaletteItem>(
  groups: AssistantPaletteGroup<T>[]
): T[] {
  return groups.flatMap((group) => group.items);
}
