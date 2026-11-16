import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { AppService } from '../../../service/app.service';
import { compileTpl } from '../../../_shared/utils';
import {
  buildChartPayload,
  buildDashboardPayload,
  buildDatasetPayload,
  buildFormPayload,
  buildItemPayload,
  buildScreenPayload,
  buildSectionPayload,
  defaultSubType,
  suggestCode,
} from './assistant-knowledge';
import {
  AddChartAction,
  AddSectionAction,
  AddSectionItemAction,
  AssistantAction,
  AssistantActionResult,
  AssistantApplyOptions,
  AssistantApplyResult,
  AssistantChanged,
  CreateDatasetAction,
  CreateDashboardAction,
  CreateFormAction,
  CreateScreenAction,
  CreateTabAction,
  EntityRef,
  RemoveItemAction,
  RemoveScreenAction,
  RemoveSectionAction,
  UpdateItemAction,
  UpdateScreenAction,
} from './assistant.types';

/** Where a plan-local id (`$step`) ended up after it was applied. */
interface ResolvedRef {
  id: number;
  formId?: number;
  sectionId?: number;
}

/**
 * Applies an approved plan through the normal design services, so the backend sees exactly the same
 * calls the editors make. Runs sequentially because later steps reference entities created earlier.
 */
@Injectable({ providedIn: 'root' })
export class AssistantExecutorService {
  private formService = inject(FormService);
  private datasetService = inject(DatasetService);
  private dashboardService = inject(DashboardService);
  private screenService = inject(ScreenService);
  private appService = inject(AppService);

  async apply(appId: number, actions: AssistantAction[], options: AssistantApplyOptions): Promise<AssistantApplyResult> {
    const results: AssistantActionResult[] = [];
    const changed: AssistantChanged = { forms: 0, datasets: 0, dashboards: 0, screens: 0 };
    const refs = new Map<string, ResolvedRef>();

    const runnable = actions.filter((action) => this.isRunnable(action, options));
    for (const action of actions) {
      if (!runnable.includes(action)) {
        results.push({ actionId: action.id, kind: action.kind, status: 'skipped' });
      }
    }
    if (!runnable.length) return { results, failed: 0 };

    let restorePointId: number | undefined;
    try {
      restorePointId = await this.createRestorePoint(appId, options.email);
    } catch {
      throw new Error('Could not create a restore point, so nothing was changed. Check your connection and try again.');
    }

    const forms = new Map<number, any>();

    for (const action of runnable) {
      const base = { actionId: action.id, kind: action.kind };
      try {
        const entityId = await this.runAction(appId, action, refs, forms, changed, options);
        results.push({ ...base, status: 'done', entityId });
      } catch (e) {
        results.push({ ...base, status: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    }

    results.sort((a, b) => actions.findIndex((x) => x.id === a.actionId) - actions.findIndex((x) => x.id === b.actionId));
    return { results, restorePointId, failed: results.filter((r) => r.status === 'failed').length };
  }

  // ==========================
  // Per-action execution
  // ==========================

  private async runAction(
    appId: number,
    action: AssistantAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged,
    options: AssistantApplyOptions
  ): Promise<number | undefined> {
    switch (action.kind) {
      case 'create_form':
        return this.createForm(appId, action, refs, changed);
      case 'create_tab':
        return this.createTab(action, refs, forms);
      case 'add_section':
        return this.addSection(action, refs, forms);
      case 'add_section_item':
        return this.addSectionItem(action, refs, forms);
      case 'update_item':
        return this.updateItem(action, refs, forms);
      case 'remove_item':
        return this.removeItem(action, refs);
      case 'remove_section':
        return this.removeSection(action, refs);
      case 'create_dataset':
        return this.createDataset(appId, action, refs, forms, changed);
      case 'create_dashboard':
        return this.createDashboard(appId, action, refs, changed);
      case 'add_chart':
        return this.addChart(action, refs, forms, changed);
      case 'create_screen':
        return this.createScreen(appId, action, refs, changed, options);
      case 'update_screen':
        return this.updateScreen(appId, action, refs, changed);
      case 'remove_screen':
        return this.removeScreen(action, refs, changed);
      default:
        throw new Error('Unsupported step.');
    }
  }

  private async createForm(appId: number, action: CreateFormAction, refs: Map<string, ResolvedRef>, changed: AssistantChanged) {
    const res = await firstValueFrom(this.formService.saveForm(appId, buildFormPayload(action.payload)));
    const id = requireId(res, 'form');
    refs.set(action.id, { id });
    changed.forms++;
    return id;
  }

  private async createTab(action: CreateTabAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const form = await this.snapshot(formId, forms);
    const tab = await firstValueFrom(
      this.formService.saveTab(formId, {
        title: action.payload.title,
        code: action.payload.code ?? suggestCode(action.payload.title, 'tab'),
        sortOrder: form?.tabs?.length ?? 0,
        x: { facet: {} },
      })
    );
    const id = requireId(tab, 'tab');
    refs.set(action.id, { id, formId });
    forms.delete(formId);
    return id;
  }

  private async addSection(action: AddSectionAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const form = await this.snapshot(formId, forms);
    const parent = action.payload.parentRef ? String(this.resolveId(action.payload.parentRef, refs)) : String(form?.tabs?.[0]?.id ?? '-1');
    const siblings = (form?.sections ?? []).filter((s: any) => String(s.parent?.id ?? s.parent ?? '-1') === parent);

    const payload = buildSectionPayload({ ...action.payload, parent, sortOrder: siblings.length });
    const section = await firstValueFrom(this.formService.saveSection(formId, payload));
    const id = requireId(section, 'section');
    refs.set(action.id, { id, formId });
    forms.delete(formId);
    return id;
  }

  private async addSectionItem(action: AddSectionItemAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const sectionId = this.resolveId(action.payload.sectionRef, refs);
    const form = await this.snapshot(formId, forms);
    const section = (form?.sections ?? []).find((s: any) => Number(s.id) === sectionId);
    const sortOrder = section?.items?.length ?? 0;

    const payload = buildItemPayload({
      label: action.payload.label,
      code: this.uniqueCode(action.payload.code ?? suggestCode(action.payload.label, 'field'), form),
      type: action.payload.type,
      subType: action.payload.subType ?? defaultSubType(action.payload.type),
      size: action.payload.size,
      required: action.payload.required,
      readOnly: action.payload.readOnly,
      hideLabel: action.payload.hideLabel,
      options: action.payload.options,
      x: action.payload.x,
    });

    const item = await firstValueFrom(this.formService.saveItem(formId, sectionId, payload, sortOrder));
    const id = requireId(item, 'field');
    refs.set(action.id, { id, formId, sectionId });
    forms.delete(formId);
    return id;
  }

  private async updateItem(action: UpdateItemAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const itemId = this.resolveId(action.payload.itemRef, refs);
    const form = await this.snapshot(formId, forms);
    const existing = (form?.sections ?? [])
      .flatMap((s: any) => s.items ?? [])
      .find((i: any) => Number(i.id) === itemId);
    if (!existing) throw new Error('The field to update is no longer in this form.');

    const patch = action.payload.patch ?? {};
    const item = {
      ...existing,
      ...('label' in patch ? { label: patch.label } : {}),
      ...('size' in patch ? { size: patch.size } : {}),
      ...('hideLabel' in patch ? { hideLabel: patch.hideLabel } : {}),
      ...('hidden' in patch ? { hidden: patch.hidden } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
      v: { ...(existing.v ?? {}), ...(patch.required !== undefined ? { required: patch.required } : {}), ...(patch.v ?? {}) },
    };
    await firstValueFrom(this.formService.saveItemOnly(formId, item));
    forms.delete(formId);
    return itemId;
  }

  private async removeItem(action: RemoveItemAction, refs: Map<string, ResolvedRef>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const itemId = this.resolveId(action.payload.itemRef, refs);
    await firstValueFrom(this.formService.removeItem(formId, itemId));
    return itemId;
  }

  private async removeSection(action: RemoveSectionAction, refs: Map<string, ResolvedRef>) {
    const sectionId = this.resolveId(action.payload.sectionRef, refs);
    await firstValueFrom(this.formService.removeSection(sectionId));
    return sectionId;
  }

  private async createDataset(
    appId: number,
    action: CreateDatasetAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const formId = action.payload.formRef ? this.resolveId(action.payload.formRef, refs) : undefined;
    // the dataset dialog stores the whole form object (see edit-dataset.component.ts)
    const form = formId ? await this.snapshot(formId, forms) : undefined;
    const res = await firstValueFrom(
      this.datasetService.saveDataset(appId, buildDatasetPayload({ ...action.payload, form: form?.data ?? form, formId }))
    );
    const id = requireId(res, 'dataset');
    refs.set(action.id, { id });
    changed.datasets++;
    return id;
  }

  private async createDashboard(appId: number, action: CreateDashboardAction, refs: Map<string, ResolvedRef>, changed: AssistantChanged) {
    const res = await firstValueFrom(this.dashboardService.saveDashboard(appId, buildDashboardPayload(action.payload)));
    const id = requireId(res, 'dashboard');
    refs.set(action.id, { id });
    changed.dashboards++;
    return id;
  }

  private async addChart(
    action: AddChartAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const dashboardId = this.resolveId(action.payload.dashboardRef, refs);
    const dashboard: any = await firstValueFrom(this.dashboardService.getDashboard(dashboardId));
    const formId = action.payload.formRef ? this.resolveId(action.payload.formRef, refs) : undefined;
    const form = formId ? await this.snapshot(formId, forms) : undefined;
    const formData: any = form?.data ?? form;

    const payload = buildChartPayload({
      ...action.payload,
      // the chart binds to a form object from the form list, so keep id/code/title
      form: formData ? { id: formData.id ?? formId, code: formData.code, title: formData.title } : undefined,
      formId,
      sortOrder: dashboard?.charts?.length ?? 0,
      sourceType: action.payload.sourceType ?? (formId ? 'db' : 'rest'),
    });
    const chart = await firstValueFrom(this.dashboardService.saveChart(dashboardId, payload));
    const id = requireId(chart, 'chart');
    refs.set(action.id, { id });
    changed.dashboards++;
    return id;
  }

  private async createScreen(
    appId: number,
    action: CreateScreenAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    options: AssistantApplyOptions
  ) {
    assertValidTemplate(action.payload.content);
    const res = await firstValueFrom(
      this.screenService.saveScreen(
        appId,
        buildScreenPayload({
          title: action.payload.title,
          description: action.payload.description,
          type: action.payload.type,
          content: action.payload.content,
          wide: action.payload.wide,
          formId: action.payload.formRef ? this.resolveId(action.payload.formRef, refs) : undefined,
          datasetId: action.payload.datasetRef ? this.resolveId(action.payload.datasetRef, refs) : undefined,
          email: options.email,
        })
      )
    );
    const id = requireId(res, 'screen');
    refs.set(action.id, { id });
    changed.screens++;
    return id;
  }

  private async updateScreen(
    appId: number,
    action: UpdateScreenAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const screenId = this.resolveId(action.payload.screenRef, refs);
    if (action.payload.content !== undefined) assertValidTemplate(action.payload.content);

    const existing: any = await firstValueFrom(this.screenService.getScreen(screenId));
    if (!existing) throw new Error('The screen to update no longer exists.');

    const merged = {
      ...existing,
      title: action.payload.title ?? existing.title,
      // the template is read from data.content, never from a root `content` field
      data: {
        ...(existing.data ?? {}),
        ...(action.payload.content !== undefined ? { content: action.payload.content } : {}),
      },
    };
    await firstValueFrom(this.screenService.saveScreen(appId, merged));
    refs.set(action.id, { id: screenId });
    changed.screens++;
    return screenId;
  }

  private async removeScreen(action: RemoveScreenAction, refs: Map<string, ResolvedRef>, changed: AssistantChanged) {
    const screenId = this.resolveId(action.payload.screenRef, refs);
    await firstValueFrom(this.screenService.removeScreen(screenId));
    changed.screens++;
    return screenId;
  }

  // ==========================
  // Helpers
  // ==========================

  private isRunnable(action: AssistantAction, options: AssistantApplyOptions): boolean {
    const included = !options.includeIds || options.includeIds.includes(action.id);
    if (!included) return false;
    if (!action.destructive) return true;
    return (options.confirmedIds ?? []).includes(action.id);
  }

  /** `"$step"` refers to an entity created earlier in this plan; anything else is a real id. */
  private resolveId(ref: EntityRef | undefined, refs: Map<string, ResolvedRef>): number {
    if (ref === undefined || ref === null) throw new Error('A step is missing its target.');
    if (String(ref).startsWith('$')) {
      const resolved = refs.get(String(ref).slice(1));
      if (!resolved) throw new Error(`Step ${ref} was not applied, so this step cannot run.`);
      return resolved.id;
    }
    const id = Number(ref);
    if (!Number.isFinite(id)) throw new Error(`Unknown target "${ref}".`);
    return id;
  }

  private async snapshot(formId: number, forms: Map<number, any>) {
    let form = forms.get(formId);
    if (!form) {
      form = await firstValueFrom(this.formService.getForm(formId));
      forms.set(formId, form);
    }
    return form;
  }

  /** Field codes are unique per form; a generated duplicate would silently overwrite a column. */
  private uniqueCode(code: string, form: any): string {
    const taken = new Set<string>();
    Object.keys(form?.items ?? {}).forEach((k) => taken.add(k));
    (form?.sections ?? []).forEach((s: any) => (s.items ?? []).forEach((i: any) => taken.add(String(i.code))));
    if (!taken.has(code)) return code;
    let n = 2;
    while (taken.has(`${code}_${n}`)) n++;
    return `${code}_${n}`;
  }

  private async createRestorePoint(appId: number, email: string): Promise<number | undefined> {
    const res: any = await firstValueFrom(
      this.appService.createRestorePoint(
        appId,
        { name: `Before assistant changes ${new Date().toLocaleString()}`, includeApp: true, includeUsers: false, includeEntry: false },
        email
      )
    );
    return res?.id;
  }
}

function requireId(res: any, label: string): number {
  const id = res?.id ?? res?.data?.id;
  if (!Number.isFinite(Number(id))) throw new Error(`The ${label} was saved but the server did not return its id.`);
  return Number(id);
}

/** Screens are executable templates, so compile before saving instead of shipping a broken page. */
function assertValidTemplate(content: string) {
  if (!content || !content.trim()) throw new Error('The generated screen template is empty.');
  try {
    compileTpl(content, {}, 'assistant-validate');
  } catch (e) {
    throw new Error(`The generated screen template is not valid: ${e instanceof Error ? e.message : String(e)}`);
  }
}
