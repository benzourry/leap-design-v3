import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgCmComponent } from '../ng-cm/ng-cm.component';

type QueryCondition = '$and' | '$or';
type QueryOperator = '' | 'not' | 'in' | 'notin' | 'has' | 'nothas' | 'contain' | 'notcontain'
  | 'from' | 'to' | 'between' | 'null' | 'notnull';
type QueryValueSource = 'runtime' | 'fixed' | 'template';

interface QueryGroup {
  id: number;
  kind: 'group';
  condition: QueryCondition;
  children: QueryNode[];
}

interface QueryCriterion {
  id: number;
  kind: 'criterion';
  field: string;
  operator: QueryOperator;
  valueSource: QueryValueSource;
  value: string;
  secondValue: string;
  originalScalar?: number | boolean;
}

type QueryNode = QueryGroup | QueryCriterion;

interface QueryFieldOption {
  path: string;
  label: string;
  group: string;
  type: string;
}

const OPERATORS: Array<{ value: QueryOperator; label: string }> = [
  { value: '', label: 'Equals' },
  { value: 'not', label: 'Does not equal' },
  { value: 'in', label: 'Is in' },
  { value: 'notin', label: 'Is not in' },
  { value: 'has', label: 'Has' },
  { value: 'nothas', label: 'Does not have' },
  { value: 'contain', label: 'Contains' },
  { value: 'notcontain', label: 'Does not contain' },
  { value: 'from', label: 'Greater than or equal to' },
  { value: 'to', label: 'Less than or equal to' },
  { value: 'between', label: 'Between' },
  { value: 'null', label: 'Is empty' },
  { value: 'notnull', label: 'Is not empty' }
];

@Component({
  selector: 'app-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgTemplateOutlet, FaIconComponent, NgCmComponent]
})
export class QueryBuilderComponent {
  query = model<string>('');
  formHolder = input<Record<string, any>>({});
  sectionItems = input<Record<string, any[]>>({});
  extraAutoComplete = input<unknown[]>([]);

  advanced = signal(false);
  parseError = signal('');
  root = signal<QueryGroup>({
    id: 1,
    kind: 'group',
    condition: '$and',
    children: []
  });

  readonly operators = OPERATORS;
  readonly queryAutoComplete = [
    { c: 1, detail: '$and', type: 'text', apply: '$and: [{#{filters}}]', label: 'And condition for query builder' },
    { c: 1, detail: '$or', type: 'text', apply: '$or: [{#{filters}}]', label: 'Or condition for query builder' }
  ];
  readonly allQueryAutoComplete = computed(() => [...this.queryAutoComplete, ...this.extraAutoComplete()]);
  readonly queryPlaceholder = `Q Walker composition, ie:
[
  {
    "$and": [
      { "$.age~between": null },
      { "$.gender.code": "M" }
    ]
  },
  {
    "$or": [
      { "$.email": "{{$user$.email}}" },
      { "$_.email": "{{$user$.email}}" }
    ]
  }
]`;
  private nextId = 2;
  private lastEmitted = '';
  readonly fieldOptions = computed(() => this.buildFieldOptions());

  constructor() {
    effect(() => {
      const queryText = this.query();
      if (queryText === this.lastEmitted) {
        return;
      }

      this.loadQuery(queryText);
    });
  }

  isKnownField(fieldPath: string): boolean {
    return this.fieldOptions().some(option => option.path === fieldPath);
  }

  fieldFor(path: string): QueryFieldOption | undefined {
    return this.fieldOptions().find(option => option.path === path);
  }

  operatorsFor(node: QueryCriterion): Array<{ value: QueryOperator; label: string }> {
    const type = this.fieldFor(node.field)?.type ?? '';
    const numeric = ['date', 'number', 'scale', 'scaleTo5', 'scaleTo10'].includes(type);
    const text = !numeric && !['checkbox'].includes(type);

    return this.operators.filter(operator => {
      if (['from', 'to', 'between'].includes(operator.value)) {
        return numeric || !type;
      }
      if (['contain', 'notcontain'].includes(operator.value)) {
        return text;
      }
      if (['has', 'nothas'].includes(operator.value)) {
        return text;
      }
      return true;
    });
  }

  addCriterion(group: QueryGroup): void {
    group.children.push(this.createCriterion());
    this.changed();
  }

  addGroup(group: QueryGroup): void {
    group.children.push({
      id: this.nextId++,
      kind: 'group',
      condition: '$and',
      children: []
    });
    this.changed();
  }

  removeNode(group: QueryGroup, index: number): void {
    group.children.splice(index, 1);
    this.changed();
  }

  fieldChanged(node: QueryCriterion, field: string): void {
    node.field = field === '__custom' ? '' : field;
    const supported = this.operatorsFor(node).map(operator => operator.value);
    if (!supported.includes(node.operator)) {
      node.operator = '';
    }
    this.changed();
  }

  operatorChanged(node: QueryCriterion): void {
    if (node.operator !== 'between') {
      node.secondValue = '';
    }
    if (node.operator === 'null' || node.operator === 'notnull') {
      node.valueSource = 'fixed';
      node.value = '';
    }
    this.changed();
  }

  valueSourceChanged(node: QueryCriterion): void {
    if (node.valueSource === 'runtime') {
      node.value = '';
      node.secondValue = '';
    } else if (node.valueSource === 'template' && !node.value.startsWith('{{')) {
      node.value = '{{$user$.email}}';
    }
    this.changed();
  }

  changed(): void {
    this.parseError.set('');
    this.root.set({ ...this.root() });
    this.emitQuery();
  }

  toggleAdvanced(): void {
    if (this.advanced() && this.parseError()) {
      return;
    }
    this.advanced.update(value => !value);
  }

  updateAdvanced(queryText: string): void {
    this.lastEmitted = queryText;
    this.query.set(queryText);
    this.validateAdvanced(queryText);
  }

  private loadQuery(queryText: string): void {
    if (!queryText?.trim()) {
      this.parseError.set('');
      this.root.set(this.createGroup());
      return;
    }

    try {
      const parsed: unknown = JSON.parse(queryText);
      if (!Array.isArray(parsed)) {
        throw new Error('The query must be a JSON array.');
      }

      this.nextId = 2;
      const rootGroup = this.unwrapRootGroup(parsed);
      this.root.set(rootGroup);
      this.parseError.set('');
    } catch (error) {
      this.parseError.set(error instanceof Error ? error.message : 'Invalid query JSON.');
      this.advanced.set(true);
    }
  }

  private validateAdvanced(queryText: string): void {
    if (!queryText?.trim()) {
      this.parseError.set('');
      this.root.set(this.createGroup());
      return;
    }

    try {
      const parsed: unknown = JSON.parse(queryText);
      if (!Array.isArray(parsed)) {
        throw new Error('The query must be a JSON array.');
      }
      this.parseError.set('');
      this.nextId = 2;
      this.root.set(this.unwrapRootGroup(parsed));
    } catch (error) {
      this.parseError.set(error instanceof Error ? error.message : 'Invalid query JSON.');
    }
  }

  private parseNodes(values: unknown[]): QueryNode[] {
    const nodes: QueryNode[] = [];

    values.forEach(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Every query item must be a JSON object.');
      }

      Object.entries(value as Record<string, unknown>).forEach(([key, rawValue]) => {
        if (key === '$and' || key === '$or') {
          if (!Array.isArray(rawValue)) {
            throw new Error(`${key} must contain an array.`);
          }
          nodes.push(this.createGroup(key, this.parseNodes(rawValue)));
          return;
        }

        nodes.push(this.parseCriterion(key, rawValue));
      });
    });

    return nodes;
  }

  private parseCriterion(key: string, rawValue: unknown): QueryCriterion {
    if (rawValue !== null && !['string', 'number', 'boolean'].includes(typeof rawValue)) {
      throw new Error('Visual mode supports only string, number, boolean, or null criterion values.');
    }
    const specialValue = rawValue === '~null' ? 'null' : rawValue === '~notnull' ? 'notnull' : null;
    const suffixMatch = key.match(/~(notcontain|nothas|notin|contain|between|from|to|has|in|not)$/);
    const operator = specialValue ?? (suffixMatch?.[1] as QueryOperator | undefined) ?? '';
    if (specialValue && suffixMatch) {
      throw new Error('A null value with an operator cannot be represented in visual mode.');
    }
    if (operator === 'between' && rawValue !== null &&
        (typeof rawValue !== 'string' || rawValue.split(',').length !== 2)) {
      throw new Error('A between value must contain exactly two comma-separated values in visual mode.');
    }
    const field = suffixMatch ? key.slice(0, -(suffixMatch[0].length)) : key;
    const runtime = rawValue === null;
    const textValue = rawValue === null ? '' : String(rawValue);
    const range = operator === 'between' ? textValue.split(',', 2) : [textValue, ''];
    const value = range[0] ?? '';

    return {
      id: this.nextId++,
      kind: 'criterion',
      field,
      operator,
      valueSource: runtime ? 'runtime' : value.includes('{{') ? 'template' : 'fixed',
      value: specialValue ? '' : value,
      secondValue: specialValue ? '' : range[1] ?? '',
      originalScalar: typeof rawValue === 'number' || typeof rawValue === 'boolean' ? rawValue : undefined
    };
  }

  private emitQuery(): void {
    const root = this.root();
    const children = root.children.map(node => this.serializeNode(node));
    const query = root.condition === '$or'
      ? [{ $or: children }]
      : children;
    this.lastEmitted = query.length ? JSON.stringify(query, null, 2) : '';
    this.query.set(this.lastEmitted);
  }

  private unwrapRootGroup(values: unknown[]): QueryGroup {
    if (values.length === 1) {
      const onlyValue = values[0];
      if (onlyValue && typeof onlyValue === 'object' && !Array.isArray(onlyValue)) {
        const entries = Object.entries(onlyValue as Record<string, unknown>);
        if (entries.length === 1 && (entries[0][0] === '$and' || entries[0][0] === '$or')) {
          const [condition, children] = entries[0];
          if (!Array.isArray(children)) {
            throw new Error(`${condition} must contain an array.`);
          }
          return this.createGroup(condition as QueryCondition, this.parseNodes(children));
        }
      }
    }

    return this.createGroup('$and', this.parseNodes(values));
  }

  private serializeNode(node: QueryNode): Record<string, unknown> {
    if (node.kind === 'group') {
      return {
        [node.condition]: node.children.map(child => this.serializeNode(child))
      };
    }

    const decoratedField = node.operator && node.operator !== 'null' && node.operator !== 'notnull'
      ? `${node.field}~${node.operator}`
      : node.field;
    let value: string | number | boolean | null = node.value;

    if (node.operator === 'null') {
      value = '~null';
    } else if (node.operator === 'notnull') {
      value = '~notnull';
    } else if (node.valueSource === 'runtime') {
      value = null;
    } else if (node.operator === 'between') {
      value = `${node.value},${node.secondValue}`;
    }

    if (node.valueSource === 'fixed' && node.originalScalar !== undefined &&
        value === String(node.originalScalar)) {
      value = node.originalScalar;
    }

    return { [decoratedField]: value };
  }

  private createCriterion(): QueryCriterion {
    return {
      id: this.nextId++,
      kind: 'criterion',
      field: this.fieldOptions()[0]?.path ?? '',
      operator: '',
      valueSource: 'fixed',
      value: '',
      secondValue: ''
    };
  }

  private createGroup(condition: QueryCondition = '$and', children: QueryNode[] = []): QueryGroup {
    return {
      id: this.nextId++,
      kind: 'group',
      condition,
      children
    };
  }

  private buildFieldOptions(): QueryFieldOption[] {
    const options: QueryFieldOption[] = [
      { path: '$_.email', label: 'Entry owner email', group: 'Entry properties', type: 'text' },
      { path: '$_.currentStatus', label: 'Current status', group: 'Entry properties', type: 'text' },
      { path: '$_.id', label: 'System entry ID', group: 'Entry properties', type: 'number' },
      { path: '$_.submissionDate', label: 'Submission date', group: 'Entry properties', type: 'date' },
      { path: '$_.resubmissionDate', label: 'Resubmission date', group: 'Entry properties', type: 'date' },
      { path: '$_.modifiedDate', label: 'Modified date', group: 'Entry properties', type: 'date' },
      { path: '$_.createdDate', label: 'Created date', group: 'Entry properties', type: 'date' }
    ];
    const excluded = ['static', 'file', 'imagePreview', 'btn', 'dataset', 'screen', 'map'];

    (['data', 'prev'] as const).forEach(rootName => {
      const form = this.formHolder()[rootName];
      const sections = this.sectionItems()[rootName] ?? [];
      if (!form) {
        return;
      }

      sections.forEach(sectionHolder => {
        const section = sectionHolder?.section;
        if (!section || excluded.includes(section.type)) {
          return;
        }

        let prefix = rootName === 'data' ? '$' : '$prev$';
        if (section.type === 'approval') {
          const tier = form.tiers?.find((candidate: any) => candidate.section?.id === section.id);
          if (!tier || rootName === 'prev') {
            return;
          }
          prefix = `$$.${tier.id}`;
        } else if (section.type === 'list') {
          prefix = `${prefix}.${section.code}*`;
        }

        (section.items ?? []).forEach((item: any) => {
          const field = form.items?.[item.code];
          if (!field || excluded.includes(field.type)) {
            return;
          }

          let path = `${prefix}.${field.code}`;
          if (field.type === 'select' || field.type === 'radio') {
            path += `${field.subType === 'multiple' ? '*' : ''}.code`;
          } else if (field.type === 'checkboxOption') {
            path += '*.code';
          } else if (field.type === 'modelPicker' && field.bindLabel) {
            path += `.${field.bindLabel}`;
          }

          options.push({
            path,
            label: field.label || field.title || field.code,
            group: `${form.title || rootName} — ${section.title || section.type}`,
            type: field.type || ''
          });
        });
      });
    });

    return options;
  }
}
