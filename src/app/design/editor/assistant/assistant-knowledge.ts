/**
 * Single source of truth for "what LEAP Design accepts".
 *
 * Two consumers:
 *  - the design editors (palette, size lists, chart types) - so manual creation and AI creation
 *    can never diverge;
 *  - AssistantContextService, which ships a compact copy to the backend so the LLM writes valid
 *    payloads for this exact build.
 *
 * Keep this module dependency free (no Angular, no HTTP) so it stays safe to import from anywhere.
 */

export interface Option {
  name: string;
  value: string;
}

export const FIELD_TYPE_LIST: Option[] = [
  { name: 'Text', value: 'text' },
  { name: 'Number', value: 'number' },
  { name: 'Date Picker', value: 'date' },
  { name: 'Dropdown', value: 'select' },
  { name: 'Radio Option', value: 'radio' },
  { name: 'Checkbox', value: 'checkbox' },
  { name: 'Checkbox Option', value: 'checkboxOption' },
  { name: 'Simple Option', value: 'simpleOption' },
  { name: 'Scale 1-5', value: 'scaleTo5' },
  { name: 'Scale 1-10', value: 'scaleTo10' },
  { name: 'Scale', value: 'scale' },
  { name: 'File Upload', value: 'file' },
  { name: 'Image Preview', value: 'imagePreview' },
  { name: 'Evaluated Field', value: 'eval' },
  { name: 'Static Element', value: 'static' },
  { name: 'QR Scanner', value: 'qr' },
  { name: 'Model Picker', value: 'modelPicker' },
  { name: 'Color Picker', value: 'color' },
  { name: 'Button', value: 'btn' },
  { name: 'Dataset', value: 'dataset' },
  { name: 'Screen', value: 'screen' },
  { name: 'Map Picker', value: 'map' },
  { name: 'Speech To Text', value: 'speech' },
];

export interface SubTypeOption {
  name: string;
  code: string;
}

export const FIELD_SUB_TYPE_MAP: Record<string, SubTypeOption[]> = {
  text: [
    { name: 'Simple Text', code: 'input' },
    { name: 'Long text', code: 'textarea' },
    { name: 'Rich text', code: 'richtext' },
  ],
  select: [
    { name: 'Dropdown (Single)', code: 'single' },
    { name: 'Dropdown (Multiple)', code: 'multiple' },
  ],
  modelPicker: [
    { name: 'Model Picker (Single)', code: 'single' },
    { name: 'Model Picker (Multiple)', code: 'multiple' },
  ],
  radio: [
    { name: 'Toggle Button', code: 'btn' },
    { name: 'Radio Option', code: 'radio' },
  ],
  checkboxOption: [
    { name: 'Checkbox Button', code: 'btn' },
    { name: 'Checkbox Option', code: 'checkbox' },
  ],
  checkbox: [
    { name: 'Checkbox (Normal)', code: 'check' },
    { name: 'Checkbox (Switch)', code: 'switch' },
  ],
  number: [
    { name: 'Number Input', code: 'number' },
    { name: 'Range Slider', code: 'range' },
  ],
  file: [
    { name: 'Image File (Single)', code: 'image' },
    { name: 'Image File (Multiple)', code: 'imagemulti' },
    { name: 'Other File (Single)', code: 'other' },
    { name: 'Other File (Multiple)', code: 'othermulti' },
  ],
  simpleOption: [
    { name: 'Simple Toggle Button', code: 'btn' },
    { name: 'Simple Radio', code: 'radio' },
    { name: 'Simple Dropdown', code: 'select' },
  ],
  date: [
    { name: 'Date Picker', code: 'date' },
    { name: 'Date Time Picker', code: 'datetime' },
    { name: 'Date (inline)', code: 'date-inline' },
    { name: 'Date Time (inline)', code: 'datetime-inline' },
    { name: 'Time Picker', code: 'time' },
  ],
  eval: [
    { name: 'Evaluated Text', code: 'text' },
    { name: 'Evaluated QR Code', code: 'qr' },
  ],
  static: [
    { name: 'HTML Text', code: 'html' },
    { name: 'HTML Text (keep value)', code: 'htmlSave' },
    { name: 'Clearfix', code: 'clearfix' },
  ],
  map: [
    { name: 'Map (Single)', code: 'single' },
    { name: 'Map (Multiple)', code: 'multiple' },
  ],
};

/** Bootstrap column widths offered by the form editor. */
export const SIZE_LIST: Option[] = [
  { name: '100%', value: 'col-sm-12' },
  { name: '75%', value: 'col-sm-9' },
  { name: '67%', value: 'col-sm-8' },
  { name: '58%', value: 'col-sm-7' },
  { name: '50%', value: 'col-sm-6' },
  { name: '42%', value: 'col-sm-5' },
  { name: '33%', value: 'col-sm-4' },
  { name: '25%', value: 'col-sm-3' },
];

export const SIZE_FIX_LIST: Option[] = [
  { name: '100%', value: 'col-12' },
  { name: '75%', value: 'col-9' },
  { name: '67%', value: 'col-8' },
  { name: '58%', value: 'col-7' },
  { name: '50%', value: 'col-6' },
  { name: '42%', value: 'col-5' },
  { name: '33%', value: 'col-4' },
  { name: '25%', value: 'col-3' },
];

/** Height presets used by the form grid and the dashboard grid. */
export const HEIGHT_LIST: Option[] = [
  { name: '1w x 1h', value: '100' },
  { name: '2w x 1h', value: '50' },
  { name: '1w x 2h', value: '200' },
  { name: '3w x 1h', value: '33' },
  { name: '1h x 3w', value: '300' },
];

export const CHART_HEIGHT_LIST = [
  { name: 'Normal', value: 450 },
  { name: 'High', value: 650 },
  { name: 'Double (2x)', value: 900 },
  { name: 'Triple (3x)', value: 1350 },
  { name: 'Quadruple (4x)', value: 1800 },
];

/** Column widths offered by the dashboard chart dialog (narrower set than the form editor). */
export const DASHBOARD_SIZE_LIST: Option[] = [
  { name: '100%', value: 'col-sm-12' },
  { name: '67%', value: 'col-sm-8' },
  { name: '58%', value: 'col-sm-7' },
  { name: '50%', value: 'col-sm-6' },
  { name: '42%', value: 'col-sm-5' },
  { name: '33%', value: 'col-sm-4' },
];

/** Section kinds a creator can pick in the section dialog. */
export const SECTION_TYPE_LIST = [
  { name: 'Section', value: 'section', description: 'Normal section' },
  { name: 'Child', value: 'list', description: 'Child section (one-to-many rows)' },
  { name: 'Approval', value: 'approval', description: 'Used for approval' },
];

export const SCREEN_TYPE_LIST = [
  { name: 'Static Page', value: 'static', description: 'Custom page built from scratch (no form)' },
  { name: 'Entry Page', value: 'page', description: 'Custom entry form page; requires a form' },
  { name: 'Entry List', value: 'list', description: 'Custom list page; requires a dataset' },
];

export const CHART_TYPE_LIST = [
  { code: 'pie', name: 'Pie', parent: 'chart', icon: ['fas', 'chart-pie'], noseries: true },
  { code: 'doughnut', name: 'Doughnut', parent: 'chart', icon: ['far', 'circle'], noseries: true },
  { code: 'rose', name: 'Nightingale Rose', parent: 'chart', icon: ['fas', 'chart-pie'], noseries: true },
  { code: 'bar', name: 'Vertical Bar', parent: 'chart', icon: ['fas', 'chart-bar'], transform: 'rotate-90 flip-v' },
  { code: 'line', name: 'Vertical Line', parent: 'chart', icon: ['fas', 'chart-line'], transform: 'rotate-90 flip-v' },
  { code: 'hbar', name: 'Horizontal Bar', parent: 'chart', icon: ['fas', 'chart-bar'] },
  { code: 'hline', name: 'Horizontal Line', parent: 'chart', icon: ['fas', 'chart-line'] },
  { code: 'area', name: 'Area', parent: 'chart', icon: ['fas', 'chart-area'] },
  { code: 'radar', name: 'Radar', parent: 'chart', icon: ['fas', 'circle-nodes'] },
  { code: 'gauge', name: 'Gauge', parent: 'chart', icon: ['fas', 'tachometer-alt'], noseries: true },
];

export const CHART_AGG_LIST = [
  { code: 'sum', name: 'Sum' },
  { code: 'count', name: 'Count' },
  { code: 'avg', name: 'Average' },
  { code: 'max', name: 'Max' },
  { code: 'min', name: 'Min' },
  { code: 'stddev', name: 'Standard Deviation' },
  { code: 'variance', name: 'Variance' },
  { code: 'median', name: 'Median' },
];

export const DATASET_TYPE_LIST = [
  { name: 'All entries', value: 'all' },
  { name: 'User entries', value: 'user' },
  { name: 'Action entries', value: 'action' },
];

/**
 * Cheat-sheet for the screen template language compiled by `compileTpl` (see _shared/utils.ts).
 * Sent verbatim to the LLM; keep it short and factual.
 */
export const SCREEN_DSL_CHEATSHEET = `
SCREEN TEMPLATE (HTML + inline JS expressions, compiled at runtime)

Data variables available in expressions:
  $this$        component scope object; assign state here, e.g. $this$.rows = res.content
  $user$        current user, e.g. $user$.email, $user$.name
  $conf$        platform configuration
  $.            initial data passed to the screen (:key arguments)
  $_            current entry (edit screens)
  $prev$        previous entry value
  $go['key']    navigate to a configured action; $popup['key']() opens it as a popup

Directives (attributes on any element):
  x-if="$=\"<expression>\""        conditional block, close with </x-if>
  x-else-if="$=\"<expression>\""   alternative branch
  x-else                           fallback branch
  x-for="$=\"<for header>\""       loop, close with </x-for>
  x-foreach="$=\"row of $.rows\""  loop over an array, close with </x-foreach>

Interpolation and scripts:
  {{ <expression> }}      value interpolation
  [# <statements> #]      multi-statement script block
  <x-markdown>...</x-markdown>   renders markdown

HTTP helper:
  $http$("<url>", res => { ... }, err => { ... })

Example list screen:
  <div class="p-3">
    <h4>{{ $user$.name }} - Leave requests</h4>
    <x-foreach $="row of $.rows">
      <div class="card p-2 mb-2">
        <strong>{{ row.code }}</strong> &mdash; {{ row.status }}
        <button class="btn btn-sm btn-outline-primary" onclick="$popup['edit']()">Open</button>
      </div>
    </x-foreach>
  </div>

Load data on first paint with a script block:
  [# $http$("/api/entry/list?datasetId=1&email="+$user$.email, res=>{ $this$.rows = res.content }) #]

Rules:
  - Use Bootstrap 5 utility classes only; the app theme is Bootstrap based.
  - Never use Angular syntax (no *ngIf / *ngFor / [(ngModel)]).
  - Every x-if / x-for / x-foreach must be closed with its matching end tag.
`.trim();

/**
 * Suggests a code from a human title: "Leave Type" -> "leave_type".
 * Codes are used as field / section identifiers inside expressions, so keep them simple.
 */
export function suggestCode(title: string, fallback = 'item'): string {
  const code = (title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!code) return fallback;
  return /^[0-9]/.test(code) ? `${fallback}_${code}` : code;
}

/** Resolves the default sub type for a field type. */
export function defaultSubType(type: string): string | undefined {
  const list = FIELD_SUB_TYPE_MAP[type];
  return Array.isArray(list) && list.length ? list[0].code : undefined;
}

// ==========================
// Payload builders
//
// Each mirrors the object the matching editor sends, so an AI-created entity is indistinguishable
// from a hand-made one. Only defaults live here; caller supplied values always win.
// ==========================

const clean = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export function buildFormPayload(input: {
  title: string;
  code?: string;
  description?: string;
  nav?: string;
  type?: string;
  icon?: string;
  x?: Record<string, unknown>;
}) {
  return clean({
    title: input.title,
    code: input.code ?? suggestCode(input.title, 'form'),
    description: input.description,
    nav: input.nav ?? 'simple',
    type: input.type ?? 'db',
    icon: input.icon,
    canEdit: true,
    canRetract: true,
    canSave: true,
    canSubmit: true,
    validateSave: true,
    x: {
      facet: 'add,edit,view',
      restrictAccess: true,
      accessByUser: true,
      accessByApprover: true,
      autoSync: true,
      ...(input.x ?? {}),
    },
  });
}

export function buildSectionPayload(input: {
  title: string;
  code?: string;
  description?: string;
  type?: string;
  size?: string;
  parent?: string | number;
  sortOrder?: number;
  icon?: string;
  style?: string;
  altClass?: string;
  hideHeader?: boolean;
  x?: Record<string, unknown>;
}) {
  return clean({
    title: input.title,
    code: input.code ?? suggestCode(input.title, 'section'),
    description: input.description,
    type: input.type ?? 'section',
    size: input.size ?? 'col-sm-12',
    parent: input.parent ?? '-1',
    sortOrder: input.sortOrder ?? 0,
    icon: input.icon,
    style: input.style,
    altClass: input.altClass,
    hideHeader: input.hideHeader,
    x: { facet: {}, ...(input.x ?? {}) },
  });
}

export function buildItemPayload(input: {
  label: string;
  code?: string;
  type: string;
  subType?: string;
  size?: string;
  required?: boolean;
  readOnly?: boolean;
  hideLabel?: boolean;
  hidden?: boolean;
  options?: { label: string; value: string }[];
  datasetId?: number | string;
  x?: Record<string, unknown>;
  v?: Record<string, unknown>;
}) {
  const isEval = input.type === 'eval';
  return clean({
    label: input.label,
    code: input.code ?? suggestCode(input.label, 'field'),
    type: input.type,
    subType: input.subType ?? defaultSubType(input.type),
    size: input.size ?? 'col-sm-12',
    readOnly: input.readOnly ?? isEval,
    hideLabel: input.hideLabel,
    hidden: input.hidden,
    datasetId: input.datasetId,
    options: input.options?.length ? input.options : undefined,
    x: { ...(input.x ?? {}) },
    // `required` is evaluated at runtime from v.required (see run/form)
    v: {
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.v ?? {}),
    },
  });
}

export function buildDatasetPayload(input: {
  title: string;
  code?: string;
  description?: string;
  type?: string;
  /** Full form object; the dataset dialog stores the form, not just its id. */
  form?: Record<string, unknown>;
  formId?: number;
  x?: Record<string, unknown>;
}) {
  return clean({
    title: input.title,
    code: input.code ?? suggestCode(input.title, 'dataset'),
    description: input.description,
    type: input.type ?? 'all',
    form: input.form ?? (input.formId ? { id: input.formId } : undefined),
    x: input.x,
  });
}

export function buildDashboardPayload(input: {
  title: string;
  code?: string;
  description?: string;
  wide?: boolean;
  x?: Record<string, unknown>;
}) {
  return clean({
    title: input.title,
    code: input.code ?? suggestCode(input.title, 'dashboard'),
    description: input.description,
    wide: input.wide,
    x: input.x,
  });
}

export function buildChartPayload(input: {
  title: string;
  type: string;
  form?: Record<string, unknown>;
  formId?: number;
  sourceType?: string;
  fieldCode?: string[];
  fieldValue?: string[];
  series?: boolean;
  fieldSeries?: string;
  showAgg?: boolean;
  agg?: string;
  endpoint?: string;
  size?: string;
  height?: number | string;
  sortOrder?: number;
  filters?: unknown[];
  x?: Record<string, unknown>;
}) {
  return clean({
    title: input.title,
    type: input.type,
    form: input.form ?? (input.formId ? { id: input.formId } : undefined),
    sourceType: input.sourceType ?? 'db',
    // the chart dialog keeps these as arrays but posts them comma-joined
    fieldCode: (input.fieldCode ?? []).join(','),
    fieldValue: (input.fieldValue ?? []).join(','),
    series: input.series,
    fieldSeries: input.fieldSeries,
    showAgg: input.showAgg ?? false,
    agg: input.agg,
    endpoint: input.endpoint,
    size: input.size ?? 'col-sm-12',
    // the dashboard editor posts height as a string ('450')
    height: String(input.height ?? 450),
    sortOrder: input.sortOrder ?? 0,
    filters: input.filters ?? [],
    x: input.x ?? {},
  });
}

export function buildScreenPayload(input: {
  title: string;
  description?: string;
  /** Screen kind, see SCREEN_TYPE_LIST. 'static' is a page built from scratch. */
  type?: string;
  /** Screen template (DSL). Stored at data.content, see screen-editor.component.html. */
  content?: string;
  formId?: number;
  datasetId?: number;
  wide?: boolean;
  canPrint?: boolean;
  email?: string;
  sortOrder?: number;
  data?: Record<string, unknown>;
}) {
  return clean({
    title: input.title,
    description: input.description,
    type: input.type ?? 'static',
    canPrint: input.canPrint ?? false,
    wide: input.wide,
    sortOrder: input.sortOrder,
    form: input.formId ? { id: input.formId } : undefined,
    dataset: input.datasetId ? { id: input.datasetId } : undefined,
    email: input.email,
    data: {
      ...(input.data ?? {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
    },
  });
}

/**
 * Compact capability description handed to the backend so the LLM emits payloads this build accepts.
 */
export function assistantKnowledge() {
  return {
    fieldTypes: FIELD_TYPE_LIST.map((t) => ({
      type: t.value,
      name: t.name,
      subTypes: (FIELD_SUB_TYPE_MAP[t.value] ?? []).map((s) => s.code),
    })),
    sectionTypes: SECTION_TYPE_LIST.map((t) => t.value),
    sizes: SIZE_LIST.map((s) => s.value),
    chartTypes: CHART_TYPE_LIST.map((c) => c.code),
    chartAggs: CHART_AGG_LIST.map((a) => a.code),
    datasetTypes: DATASET_TYPE_LIST.map((d) => d.value),
    screenTypes: SCREEN_TYPE_LIST.map((t) => t.value),
    screenDsl: SCREEN_DSL_CHEATSHEET,
  };
}
