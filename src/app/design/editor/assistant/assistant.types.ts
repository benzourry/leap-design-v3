/**
 * Types for the AI app-builder assistant.
 *
 * The backend proposes an ordered list of `AssistantAction`s; the browser validates and applies
 * them through the existing design services. Nothing here talks HTTP by itself.
 *
 * References: any payload field ending in `Ref` is either a numeric id of an entity that already
 * exists in the app, or `"$<actionId>"` pointing at an entity created earlier in the same plan
 * (resolved by AssistantExecutorService while applying).
 */

export type EntityRef = string;

export type AssistantActionKind =
  | 'create_form'
  | 'create_tab'
  | 'update_tab'
  | 'remove_tab'
  | 'assign_section_to_tab'
  | 'update_form'
  | 'add_section'
  | 'update_section'
  | 'add_section_item'
  | 'update_item'
  | 'remove_item'
  | 'remove_section'
  | 'create_tier'
  | 'update_tier'
  | 'remove_tier'
  | 'create_dataset'
  | 'add_dataset_item'
  | 'update_dataset_item'
  | 'remove_dataset_item'
  | 'create_dashboard'
  | 'add_chart'
  | 'create_screen'
  | 'add_screen_action'
  | 'update_screen'
  | 'remove_screen'
  | 'create_navi_group'
  | 'update_navi_group'
  | 'remove_navi_group'
  | 'add_navi_item'
  | 'update_navi_item'
  | 'remove_navi_item';

interface ActionBase {
  /** Unique inside the plan. Target of `$id` references. */
  id: string;
  kind: AssistantActionKind;
  /** Short human label for the review card, e.g. "Section: Leave details". */
  title?: string;
  /** Why the assistant proposes this step. */
  note?: string;
  /** Forces an explicit per-action confirmation in the review card. */
  destructive?: boolean;
}

export interface CreateFormAction extends ActionBase {
  kind: 'create_form';
  payload: {
    title: string;
    code?: string;
    description?: string;
    nav?: string;
    type?: string;
    icon?: string;
    x?: Record<string, unknown>;
  };
}

export interface CreateTabAction extends ActionBase {
  kind: 'create_tab';
  payload: { formRef: EntityRef; title: string; code?: string };
}

export interface UpdateTabAction extends ActionBase {
  kind: 'update_tab';
  payload: { formRef: EntityRef; tabRef: EntityRef; patch: Record<string, unknown> & { x?: Record<string, unknown> } };
}

export interface RemoveTabAction extends ActionBase {
  kind: 'remove_tab';
  payload: { formRef: EntityRef; tabRef: EntityRef };
}

export interface AssignSectionToTabAction extends ActionBase {
  kind: 'assign_section_to_tab';
  payload: { formRef: EntityRef; sectionRef: EntityRef; tabRef: EntityRef };
}

export interface UpdateFormAction extends ActionBase {
  kind: 'update_form';
  payload: {
    formRef: EntityRef;
    patch: {
      title?: string;
      description?: string;
      nav?: string;
      align?: string;
      icon?: string;
      onInit?: string;
      onSave?: string;
      onSubmit?: string;
      onView?: string;
      x?: Record<string, unknown>;
    };
  };
}

export interface AddSectionAction extends ActionBase {
  kind: 'add_section';
  payload: {
    formRef: EntityRef;
    /** Tab id, or '-1' for the header slot, '-999' for the footer slot. */
    parentRef?: EntityRef;
    title: string;
    description?: string;
    type?: 'section' | 'list' | 'approval';
    size?: string;
    icon?: string;
    style?: string;
    altClass?: string;
    hideHeader?: boolean;
    x?: Record<string, unknown>;
  };
}

export interface UpdateSectionAction extends ActionBase {
  kind: 'update_section';
  payload: {
    formRef: EntityRef;
    sectionRef: EntityRef;
    patch: {
      title?: string;
      code?: string;
      description?: string;
      type?: 'section' | 'list' | 'approval';
      size?: string;
      align?: string;
      parent?: EntityRef;
      inline?: boolean;
      maxChild?: number | string;
      addLabel?: string;
      orderable?: boolean;
      confirmable?: boolean;
      hideHeader?: boolean;
      hidden?: boolean;
      pre?: string;
      enabledFor?: string;
      icon?: string;
      style?: string;
      altClass?: string;
      x?: Record<string, unknown>;
    };
  };
}

export interface AddSectionItemAction extends ActionBase {
  kind: 'add_section_item';
  payload: {
    /** Form that owns the section. Required so the executor can resolve existing sections. */
    formRef: EntityRef;
    sectionRef: EntityRef;
    label: string;
    code?: string;
    type: string;
    subType?: string;
    size?: string;
    required?: boolean;
    readOnly?: boolean;
    hideLabel?: boolean;
    /** dataset / model picker / lookup binding. */
    lookupRef?: EntityRef;
    /** For select / radio / checkboxOption / simpleOption fields. */
    options?: string[];
    x?: Record<string, unknown>;
  };
}

export interface UpdateItemAction extends ActionBase {
  kind: 'update_item';
  payload: {
    formRef: EntityRef;
    itemRef: EntityRef;
    patch: {
      label?: string;
      size?: string;
      required?: boolean;
      readOnly?: boolean;
      hidden?: boolean;
      hideLabel?: boolean;
      placeholder?: string;
      options?: string;
      x?: Record<string, unknown>;
      v?: Record<string, unknown>;
    };
  };
}

export interface RemoveItemAction extends ActionBase {
  kind: 'remove_item';
  payload: { formRef: EntityRef; itemRef: EntityRef };
}

export interface RemoveSectionAction extends ActionBase {
  kind: 'remove_section';
  payload: { formRef: EntityRef; sectionRef: EntityRef };
}

export interface CreateTierAction extends ActionBase {
  kind: 'create_tier';
  payload: {
    formRef: EntityRef;
    name: string;
    sectionRef?: EntityRef;
    type?: string;
    approver?: string;
    approverGroupRef?: EntityRef;
    orgMap?: string;
    orgMapPointer?: string;
    orgMapParam?: Record<string, unknown>;
    canRemark?: boolean;
    alwaysApprove?: boolean;
    showApprover?: boolean;
    pre?: string;
    post?: string;
    x?: Record<string, unknown>;
  };
}

export interface UpdateTierAction extends ActionBase {
  kind: 'update_tier';
  payload: {
    formRef: EntityRef;
    tierRef: EntityRef;
    patch: Record<string, unknown> & {
      sectionRef?: EntityRef;
      approverGroupRef?: EntityRef;
      x?: Record<string, unknown>;
    };
  };
}

export interface RemoveTierAction extends ActionBase {
  kind: 'remove_tier';
  payload: { formRef: EntityRef; tierRef: EntityRef };
}

export interface CreateDatasetAction extends ActionBase {
  kind: 'create_dataset';
  payload: {
    title: string;
    code?: string;
    description?: string;
    /** Entry scope of the dataset: all entries, this user's entries, or action entries. */
    type?: 'all' | 'user' | 'action';
    /** Form the dataset exposes. Columns are derived server side from the form fields. */
    formRef?: EntityRef;
  };
}

export interface AddDatasetItemAction extends ActionBase {
  kind: 'add_dataset_item';
  payload: {
    datasetRef: EntityRef;
    label: string;
    code?: string;
    sortOrder?: number;
    formId?: number;
    root?: string;
    prefix?: string;
    type?: string;
    pre?: string;
    subs?: unknown;
    x?: Record<string, unknown>;
  };
}

export interface UpdateDatasetItemAction extends ActionBase {
  kind: 'update_dataset_item';
  payload: {
    datasetRef: EntityRef;
    itemRef: EntityRef;
    patch: { label?: string; pre?: string; subs?: unknown; x?: Record<string, unknown> };
  };
}

export interface RemoveDatasetItemAction extends ActionBase {
  kind: 'remove_dataset_item';
  payload: { datasetRef: EntityRef; itemRef: EntityRef };
}

export interface CreateDashboardAction extends ActionBase {
  kind: 'create_dashboard';
  payload: {
    title: string;
    code?: string;
    description?: string;
    wide?: boolean;
    x?: Record<string, unknown>;
  };
}

export interface AddChartAction extends ActionBase {
  kind: 'add_chart';
  payload: {
    dashboardRef: EntityRef;
    title: string;
    type: string;
    /** 'db' charts read an internal form; 'rest' charts read an endpoint. */
    sourceType?: 'db' | 'rest';
    formRef?: EntityRef;
    endpoint?: string;
    fieldCode?: string[];
    fieldValue?: string[];
    /** Group the value axis by a second field (enables `fieldSeries`). */
    series?: boolean;
    fieldSeries?: string;
    showAgg?: boolean;
    agg?: string;
    size?: string;
    height?: number;
    x?: Record<string, unknown>;
  };
}

export interface CreateScreenAction extends ActionBase {
  kind: 'create_screen';
  payload: {
    title: string;
    description?: string;
    /** 'combine' is composed from existing app entities and stores them in data.comps. */
    type?: 'static' | 'page' | 'list' | 'map' | 'combine';
    formRef?: EntityRef;
    datasetRef?: EntityRef;
    wide?: boolean;
    /** LEAP screen template (DSL); required except for 'combine'. */
    content?: string;
    /** Screen init JavaScript, stored at data.f. */
    f?: string;
    comps?: {
      type: 'add' | 'edit-single' | 'view-single' | 'dataset' | 'dashboard' | 'screen' | 'lookup' | 'user';
      targetRef?: EntityRef;
      title?: string;
      icon?: string;
    }[];
  };
}

export interface AddScreenActionAction extends ActionBase {
  kind: 'add_screen_action';
  payload: {
    screenRef: EntityRef;
    label: string;
    nextType: string;
    targetRef?: EntityRef;
    appId?: number;
    params?: string;
    f?: string;
    x?: Record<string, unknown>;
  };
}

export interface UpdateScreenAction extends ActionBase {
  kind: 'update_screen';
  payload: {
    screenRef: EntityRef;
    title?: string;
    /** LEAP screen template (DSL), stored at data.content. */
    content?: string;
    /** Screen init JavaScript, stored at data.f. */
    f?: string;
  };
}

export interface RemoveScreenAction extends ActionBase {
  kind: 'remove_screen';
  payload: { screenRef: EntityRef };
}

export interface CreateNaviGroupAction extends ActionBase {
  kind: 'create_navi_group';
  payload: { title: string; pre?: string; sortOrder?: number; x?: Record<string, unknown> };
}

export interface UpdateNaviGroupAction extends ActionBase {
  kind: 'update_navi_group';
  payload: { groupRef: EntityRef; patch: Record<string, unknown> & { x?: Record<string, unknown> } };
}

export interface RemoveNaviGroupAction extends ActionBase {
  kind: 'remove_navi_group';
  payload: { groupRef: EntityRef };
}

export interface AddNaviItemAction extends ActionBase {
  kind: 'add_navi_item';
  payload: {
    groupRef: EntityRef;
    title: string;
    type: string;
    targetRef?: EntityRef;
    url?: string;
    icon?: string;
    appId?: number;
    fl?: boolean;
    pre?: string;
    x?: Record<string, unknown>;
  };
}

export interface UpdateNaviItemAction extends ActionBase {
  kind: 'update_navi_item';
  payload: {
    itemRef: EntityRef;
    groupRef?: EntityRef;
    patch: Record<string, unknown> & { targetRef?: EntityRef; x?: Record<string, unknown> };
  };
}

export interface RemoveNaviItemAction extends ActionBase {
  kind: 'remove_navi_item';
  payload: { itemRef: EntityRef };
}

export type AssistantAction =
  | CreateFormAction
  | CreateTabAction
  | UpdateTabAction
  | RemoveTabAction
  | AssignSectionToTabAction
  | UpdateFormAction
  | AddSectionAction
  | UpdateSectionAction
  | AddSectionItemAction
  | UpdateItemAction
  | RemoveItemAction
  | RemoveSectionAction
  | CreateTierAction
  | UpdateTierAction
  | RemoveTierAction
  | CreateDatasetAction
  | AddDatasetItemAction
  | UpdateDatasetItemAction
  | RemoveDatasetItemAction
  | CreateDashboardAction
  | AddChartAction
  | CreateScreenAction
  | AddScreenActionAction
  | UpdateScreenAction
  | RemoveScreenAction
  | CreateNaviGroupAction
  | UpdateNaviGroupAction
  | RemoveNaviGroupAction
  | AddNaviItemAction
  | UpdateNaviItemAction
  | RemoveNaviItemAction;

// ==========================
// Backend contract (/assistant/*)
// ==========================

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantFormSummary {
  id: number;
  title: string;
  fullData?: unknown;
  code?: string;
  onInit?: string;
  onSave?: string;
  onSubmit?: string;
  onView?: string;
  tabs?: { id: number; title?: string; code?: string; pre?: string; x?: Record<string, unknown> }[];
  tiers?: {
    id: number;
    name?: string;
    type?: string;
    sectionRef?: EntityRef;
    approverGroupRef?: EntityRef;
    sortOrder?: number;
  }[];
  sections?: {
    id: number;
    title?: string;
    type?: string;
    parentRef?: EntityRef;
    items?: {
      id: number;
      label?: string;
      code?: string;
      type?: string;
      subType?: string;
      required?: boolean;
      options?: string;
    }[];
    code?: string;
    description?: string;
    size?: string;
    align?: string;
    inline?: boolean;
    maxChild?: number | string;
    addLabel?: string;
    orderable?: boolean;
    confirmable?: boolean;
    hideHeader?: boolean;
    hidden?: boolean;
    pre?: string;
    enabledFor?: string;
    icon?: string;
    style?: string;
    altClass?: string;
    x?: Record<string, unknown>;
  }[];
}

export interface AssistantEntitySummary {
  id: number;
  fullData?: unknown;
  title?: string;
  name?: string;
  code?: string;
  type?: string;
  items?: {
    id: number;
    label?: string;
    code?: string;
    type?: string;
    sortOrder?: number;
  }[];
  itemsTruncated?: number;
  itemsMayBeIncomplete?: boolean;
}

export interface AssistantScreenSummary extends AssistantEntitySummary {
  data?: { content?: string; f?: string };
}

export interface AssistantNaviGroupSummary {
  id: number;
  fullData?: unknown;
  title?: string;
  items: {
    id: number;
    title?: string;
    type?: string;
    targetId?: number;
    appId?: number;
    url?: string;
  }[];
}

export interface AssistantContextEntities {
  forms: AssistantFormSummary[];
  datasets: AssistantEntitySummary[];
  dashboards: AssistantEntitySummary[];
  screens: AssistantScreenSummary[];
  lookups: AssistantEntitySummary[];
  groups: AssistantEntitySummary[];
  navigation: AssistantNaviGroupSummary[];
}

export interface AssistantContext {
  app: { id: number; title?: string; description?: string };
  entities: AssistantContextEntities;
  knowledge: Record<string, unknown>;
  selectedFormId?: number;
  selectedDatasetId?: number;
  selectedScreenId?: number;
}

export interface AssistantPlanRequest {
  prompt: string;
  assistantId: number;
  history: AssistantChatMessage[];
  context: AssistantContext;
  attachments?: AssistantAttachment[];
}

export interface AssistantAttachment {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export type AssistantPromptEntityType = 'form' | 'dataset' | 'dashboard' | 'screen' | 'navigation';

export interface AssistantPromptEntityOption {
  id: number;
  label: string;
}

export interface AssistantPromptEntity {
  type: AssistantPromptEntityType;
  id: number;
  label: string;
  data: unknown;
}

export interface AssistantHealth {
  version?: string;
  enabled?: boolean;
}

export interface AssistantPlanResponse {
  planId?: string;
  message: string;
  actions: AssistantAction[];
  warnings?: string[];
  needsUserInput?: boolean;
  clarificationQuestion?: string;
}

// ==========================
// Client-side execution state
// ==========================

export type AssistantActionStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export interface AssistantActionResult {
  actionId: string;
  kind: AssistantActionKind;
  status: AssistantActionStatus;
  /** Id of the entity created / affected, once known. */
  entityId?: number;
  error?: string;
}

export interface AssistantApplyOptions {
  /** Action ids the creator ticked in the review card. Defaults to every non-destructive action. */
  includeIds?: string[];
  /** Action ids the creator explicitly confirmed (required for destructive actions). */
  confirmedIds?: string[];
  /** Do not apply a plan while the assistant is waiting for clarification. */
  requiresResponse?: boolean;
  email: string;
}

export interface AssistantApplyResult {
  results: AssistantActionResult[];
  failed: number;
}

/** What the assistant touched, so editors can reload only the affected panes. */
export interface AssistantChanged {
  forms: number;
  datasets: number;
  dashboards: number;
  screens: number;
  navigation: number;
}
