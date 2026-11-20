export interface UmlForm {
  id: number;
  title?: string;
  prev?: number | string | { id?: number | string } | null;
  items?: Record<string, UmlFormItem> | UmlFormItem[] | null;
}

export interface UmlFormItem {
  code?: string;
  label?: string;
  type?: string;
  subType?: string;
  dataSource?: number | string | null;
}

export interface UmlLookup {
  id: number;
  name?: string;
  dataFields?: string | null;
}

export interface UmlDataset {
  id: number;
  title?: string;
  form?: number | string | { id?: number | string } | null;
  formId?: number | string | null;
}

export interface UmlRelationship {
  fromClassId: string;
  toClassId: string;
  fromCardinality: string;
  toCardinality: string;
  arrow: '-->' | '<--';
  label: string;
  edgeId: string;
}

export const UML_FORM_FIELD_LIMIT = 10;

const excludedFormItemTypes = new Set([
  'static',
  'speech',
  'speechtotext',
  'imagepreview',
  'btn',
  'button',
  'dataset',
  'screen'
]);

function referenceId(reference: unknown): number | undefined {
  const value = typeof reference === 'object' && reference !== null
    ? (reference as { id?: unknown }).id
    : reference;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function displayText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\r\n"]/g, ' ')
    .replace(/[{}[\]<>`\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function umlIdentifier(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9_$]/g, '_');
}

function formClassId(form: UmlForm): string {
  return `Form_${form.id}`;
}

function formClassLabel(form: UmlForm): string {
  return `${displayText(form.title) || `Form ${form.id}`} (${form.id})`;
}

function lookupClassId(lookup: UmlLookup): string {
  return `Lookup_${lookup.id}`;
}

function lookupClassLabel(lookup: UmlLookup): string {
  return `${displayText(lookup.name) || `Lookup ${lookup.id}`} (${lookup.id})`;
}

function formItems(form: UmlForm): Array<[string, UmlFormItem]> {
  if (!form.items) return [];
  return Array.isArray(form.items)
    ? form.items.map((item, index) => [item.code || `field_${index + 1}`, item])
    : Object.entries(form.items);
}

function isDiagramItem(item: UmlFormItem): boolean {
  const type = item.type?.toLowerCase().replace(/[-_\s]/g, '') ?? '';
  return !excludedFormItemTypes.has(type);
}

export function getUmlFormFieldCount(form: UmlForm): number {
  return formItems(form).filter(([, item]) => isDiagramItem(item)).length;
}

export function getUmlFormActionMarker(expanded: boolean, fieldCount: number): string {
  return expanded ? 'show_fewer_fields' : `show_all_${fieldCount}_fields`;
}

function lookupFields(dataFields?: string | null): Array<[string, string]> {
  if (!dataFields) return [];
  return dataFields.split(',').flatMap((definition) => {
    const column = definition.split('@')[0].trim();
    if (!column) return [];
    const [name, type] = column.split(':').map(part => part.trim());
    return name ? [[name, type || 'text'] as [string, string]] : [];
  });
}

export function getUmlRelationships(
  forms: UmlForm[],
  lookups: UmlLookup[],
  datasets: UmlDataset[]
): UmlRelationship[] {
  const formById = new Map(forms.map(form => [form.id, form]));
  const lookupById = new Map(lookups.map(lookup => [lookup.id, lookup]));
  const datasetById = new Map(datasets.map(dataset => [dataset.id, dataset]));
  const relationships: UmlRelationship[] = [];

  const addRelationship = (
    fromClassId: string,
    toClassId: string,
    fromCardinality: string,
    toCardinality: string,
    arrow: UmlRelationship['arrow'],
    label: string
  ) => {
    const edgeNumber = relationships.length + 1;
    relationships.push({
      fromClassId,
      toClassId,
      fromCardinality,
      toCardinality,
      arrow,
      label,
      edgeId: `id_${fromClassId}_${toClassId}_${edgeNumber}`
    });
  };

  for (const form of forms) {
    const previousId = referenceId(form.prev);
    const previousForm = previousId ? formById.get(previousId) : undefined;
    if (previousForm) {
      addRelationship(formClassId(previousForm), formClassId(form), '1', '*', '<--', 'previous form');
    }

    for (const [key, item] of formItems(form)) {
      if (!isDiagramItem(item)) continue;
      const field = umlIdentifier(item.code || key);
      const dataSourceId = referenceId(item.dataSource);
      if (!field || !dataSourceId) continue;
      const cardinality = item.subType?.toLowerCase() === 'multiple' ? '*' : '1';

      if (item.type?.toLowerCase() === 'modelpicker') {
        const dataset = datasetById.get(dataSourceId);
        const targetFormId = referenceId(dataset?.form) ?? referenceId(dataset?.formId);
        const targetForm = targetFormId ? formById.get(targetFormId) : undefined;
        if (targetForm) {
          const datasetLabel = displayText(dataset?.title);
          const label = datasetLabel ? `${field} via ${datasetLabel}` : field;
          addRelationship(formClassId(form), formClassId(targetForm), '*', cardinality, '-->', label);
        }
      } else {
        const lookup = lookupById.get(dataSourceId);
        if (lookup) {
          addRelationship(formClassId(form), lookupClassId(lookup), '*', cardinality, '-->', field);
        }
      }
    }
  }

  return relationships;
}

export function buildUmlClassDiagram(
  forms: UmlForm[],
  lookups: UmlLookup[],
  datasets: UmlDataset[],
  expandedFormIds: ReadonlySet<number> = new Set()
): string {
  const lines = ['classDiagram', '  direction TB'];

  for (const form of forms) {
    lines.push(`  class ${formClassId(form)}["${formClassLabel(form)}"] {`);

    const items = formItems(form).filter(([, item]) => isDiagramItem(item));
    const visibleItems = expandedFormIds.has(form.id)
      ? items
      : items.slice(0, UML_FORM_FIELD_LIMIT);

    for (const [key, item] of visibleItems) {
      const code = umlIdentifier(item.code || key);
      if (!code) continue;
      const type = umlIdentifier([item.type, item.subType].filter(Boolean).join('_')) || 'any';
      lines.push(`    +${code}: ${type}`);
    }

    if (items.length > UML_FORM_FIELD_LIMIT) {
      lines.push(`    +${getUmlFormActionMarker(expandedFormIds.has(form.id), items.length)}`);
    }

    lines.push('  }');
  }

  for (const lookup of lookups) {
    lines.push(`  class ${lookupClassId(lookup)}["${lookupClassLabel(lookup)}"] {`);
    lines.push('    +code: string');
    lines.push('    +name: string');
    lines.push('    +extra: string');

    const seenFields = new Set(['code', 'name', 'extra']);
    for (const [field, type] of lookupFields(lookup.dataFields)) {
      const code = umlIdentifier(field);
      if (!code || seenFields.has(code.toLowerCase())) continue;
      seenFields.add(code.toLowerCase());
      lines.push(`    +${code}: ${umlIdentifier(type) || 'text'}`);
    }

    lines.push('  }');
  }

  for (const relationship of getUmlRelationships(forms, lookups, datasets)) {
    lines.push(
      `  ${relationship.fromClassId} "${relationship.fromCardinality}" ${relationship.arrow} ` +
      `"${relationship.toCardinality}" ${relationship.toClassId} : ${relationship.label}`
    );
  }

  return lines.length > 1 ? lines.join('\n') : '';
}
