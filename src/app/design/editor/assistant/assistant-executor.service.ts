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
  AddDatasetItemAction,
  AddNaviItemAction,
  AddScreenActionAction,
  UpdateSectionAction,
  UpdateDatasetItemAction,
  UpdateNaviItemAction,
  UpdateNaviGroupAction,
  UpdateTabAction,
  UpdateTierAction,
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
  CreateTierAction,
  CreateNaviGroupAction,
  UpdateFormAction,
  AssignSectionToTabAction,
  EntityRef,
  RemoveDatasetItemAction,
  RemoveNaviGroupAction,
  RemoveNaviItemAction,
  RemoveItemAction,
  RemoveScreenAction,
  RemoveSectionAction,
  RemoveTabAction,
  RemoveTierAction,
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
    const changed: AssistantChanged = { forms: 0, datasets: 0, dashboards: 0, screens: 0, navigation: 0 };
    const refs = new Map<string, ResolvedRef>();

    const runnable = actions.filter((action) => this.isRunnable(action, options));
    for (const action of actions) {
      if (!runnable.includes(action)) {
        results.push({ actionId: action.id, kind: action.kind, status: 'skipped' });
      }
    }
    if (!runnable.length) return { results, failed: 0 };

    const forms = new Map<number, any>();
    const itemLists = new Map<number, any[]>();

    for (const action of runnable) {
      const base = { actionId: action.id, kind: action.kind };
      try {
        const entityId = await this.runAction(appId, action, refs, forms, itemLists, changed, options);
        results.push({ ...base, status: 'done', entityId });
      } catch (e) {
        results.push({ ...base, status: 'failed', error: e instanceof Error ? e.message : String(e) });
      }
    }

    results.sort((a, b) => actions.findIndex((x) => x.id === a.actionId) - actions.findIndex((x) => x.id === b.actionId));
    return { results, failed: results.filter((r) => r.status === 'failed').length };
  }

  // ==========================
  // Per-action execution
  // ==========================

  private async runAction(
    appId: number,
    action: AssistantAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    itemLists: Map<number, any[]>,
    changed: AssistantChanged,
    options: AssistantApplyOptions
  ): Promise<number | undefined> {
    switch (action.kind) {
      case 'create_form':
        return this.createForm(appId, action, refs, changed);
      case 'create_tab':
        return this.createTab(action, refs, forms);
      case 'update_tab':
        return this.updateTab(action, refs, forms);
      case 'remove_tab':
        return this.removeTab(action, refs, forms);
      case 'assign_section_to_tab':
        return this.assignSectionToTab(action, refs, forms);
      case 'update_form':
        return this.updateForm(appId, action, refs, changed);
      case 'add_section':
        return this.addSection(action, refs, forms);
      case 'update_section':
        return this.updateSection(action, refs, forms);
      case 'add_section_item':
        return this.addSectionItem(action, refs, forms, itemLists);
      case 'update_item':
        return this.updateItem(action, refs, itemLists, forms);
      case 'remove_item':
        return this.removeItem(action, refs, itemLists);
      case 'remove_section':
        return this.removeSection(action, refs, itemLists);
      case 'create_tier':
        return this.createTier(action, refs, forms, changed);
      case 'update_tier':
        return this.updateTier(action, refs, forms, changed);
      case 'remove_tier':
        return this.removeTier(action, refs, forms, changed);
      case 'create_dataset':
        return this.createDataset(appId, action, refs, forms, changed);
      case 'add_dataset_item':
        return this.addDatasetItem(action, refs, changed);
      case 'update_dataset_item':
        return this.updateDatasetItem(action, refs, changed);
      case 'remove_dataset_item':
        return this.removeDatasetItem(action, refs, changed);
      case 'create_dashboard':
        return this.createDashboard(appId, action, refs, changed);
      case 'add_chart':
        return this.addChart(action, refs, forms, changed);
      case 'create_screen':
        return this.createScreen(appId, action, refs, changed, options);
      case 'add_screen_action':
        return this.addScreenAction(appId, action, refs, changed);
      case 'update_screen':
        return this.updateScreen(appId, action, refs, changed);
      case 'remove_screen':
        return this.removeScreen(action, refs, changed);
      case 'create_navi_group':
        return this.createNaviGroup(appId, action, refs, changed);
      case 'update_navi_group':
        return this.updateNaviGroup(appId, action, refs, changed);
      case 'remove_navi_group':
        return this.removeNaviGroup(appId, action, refs, changed);
      case 'add_navi_item':
        return this.addNaviItem(appId, action, refs, changed);
      case 'update_navi_item':
        return this.updateNaviItem(appId, action, refs, changed);
      case 'remove_navi_item':
        return this.removeNaviItem(appId, action, refs, changed);
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

  private async updateTab(action: UpdateTabAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tabId = this.resolveId(action.payload.tabRef, refs);
    const form = await this.snapshot(formId, forms);
    const existing = (form?.tabs ?? []).find((tab: any) => Number(tab.id) === tabId);
    if (!existing) throw new Error(`Tab ${tabId} was not found in form ${formId}. Refresh the form and try again.`);

    const patch = action.payload.patch;
    const tab = { ...existing, ...patch, x: { ...(existing.x ?? {}), ...(patch.x ?? {}) } };
    await firstValueFrom(this.formService.saveTab(formId, tab));
    forms.delete(formId);
    return tabId;
  }

  private async removeTab(action: RemoveTabAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tabId = this.resolveId(action.payload.tabRef, refs);
    const form = await this.snapshot(formId, forms);
    if (!(form?.tabs ?? []).some((tab: any) => Number(tab.id) === tabId)) {
      throw new Error(`Tab ${tabId} was not found in form ${formId}. Refresh the form and try again.`);
    }
    await firstValueFrom(this.formService.removeTab(tabId));
    forms.delete(formId);
    return tabId;
  }

  private async assignSectionToTab(
    action: AssignSectionToTabAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const sectionId = this.resolveId(action.payload.sectionRef, refs);
    const tabId = this.resolveId(action.payload.tabRef, refs);
    const form = await this.snapshot(formId, forms);
    const section = (form?.sections ?? []).find((entry: any) => Number(entry.id) === sectionId);
    if (!section) throw new Error(`Section ${sectionId} was not found in form ${formId}. Refresh the form and try again.`);
    if (!(form?.tabs ?? []).some((tab: any) => Number(tab.id) === tabId)) {
      throw new Error(`Tab ${tabId} was not found in form ${formId}. Refresh the form and try again.`);
    }

    await firstValueFrom(this.formService.saveSection(formId, { ...section, parent: String(tabId) }));
    forms.delete(formId);
    return sectionId;
  }

  private async updateForm(
    appId: number,
    action: UpdateFormAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const existing: any = await firstValueFrom(this.formService.getForm(formId));
    if (!existing) throw new Error(`Form ${formId} was not found. Refresh the form and try again.`);

    const { onInit, ...patch } = action.payload.patch;
    const form = {
      ...existing,
      ...patch,
      ...(onInit !== undefined ? { f: onInit } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
    };
    await firstValueFrom(this.formService.saveForm(appId, form));
    changed.forms++;
    return formId;
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

  private async updateSection(action: UpdateSectionAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const sectionId = this.resolveId(action.payload.sectionRef, refs);
    const form = await this.snapshot(formId, forms);
    const existing = (form?.sections ?? []).find((section: any) => Number(section.id) === sectionId);
    if (!existing) throw new Error(`Section ${sectionId} was not found in form ${formId}. Refresh the form and try again.`);

    const patch = action.payload.patch ?? {};
    const resolvedPatch = 'parent' in patch
      ? { ...patch, parent: this.resolveId(patch.parent, refs) }
      : patch;
    const section = {
      ...existing,
      ...resolvedPatch,
      x: { ...(existing.x ?? {}), ...(resolvedPatch.x ?? {}) },
    };
    await firstValueFrom(this.formService.saveSection(formId, section));
    forms.delete(formId);
    return sectionId;
  }

  private async addSectionItem(
    action: AddSectionItemAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    itemLists: Map<number, any[]>
  ) {
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
    itemLists.delete(formId);
    const id = requireId(item, 'field');
    refs.set(action.id, { id, formId, sectionId });
    forms.delete(formId);
    return id;
  }

  private async updateItem(
    action: UpdateItemAction,
    refs: Map<string, ResolvedRef>,
    itemLists: Map<number, any[]>,
    forms: Map<number, any>
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const itemId = this.resolveId(action.payload.itemRef, refs);
    const cachedItems = itemLists.get(formId);
    let items: any[];
    if (cachedItems !== undefined) {
      items = cachedItems;
    } else {
      const response: any = await firstValueFrom(this.formService.getItemList(formId, { size: 9999, page: 0 }));
      items = Array.isArray(response) ? response : (response?.content ?? []);
      itemLists.set(formId, items);
    }
    const existing = items.find((item) => Number(item?.id) === itemId);
    if (!existing) throw new Error(`Field ${itemId} was not found in form ${formId}. Refresh the form and try again.`);

    const patch = action.payload.patch ?? {};
    const item = {
      ...existing,
      ...('label' in patch ? { label: patch.label } : {}),
      ...('size' in patch ? { size: patch.size } : {}),
      ...('readOnly' in patch ? { readOnly: patch.readOnly } : {}),
      ...('hideLabel' in patch ? { hideLabel: patch.hideLabel } : {}),
      ...('hidden' in patch ? { hidden: patch.hidden } : {}),
      ...('placeholder' in patch ? { placeholder: patch.placeholder } : {}),
      ...('options' in patch ? { options: patch.options } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
      v: { ...(existing.v ?? {}), ...(patch.required !== undefined ? { required: patch.required } : {}), ...(patch.v ?? {}) },
    };
    await firstValueFrom(this.formService.saveItemOnly(formId, item));
    itemLists.set(formId, items.map((entry) => Number(entry?.id) === itemId ? item : entry));
    forms.delete(formId);
    return itemId;
  }

  private async removeItem(
    action: RemoveItemAction,
    refs: Map<string, ResolvedRef>,
    itemLists: Map<number, any[]>
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const itemId = this.resolveId(action.payload.itemRef, refs);
    await firstValueFrom(this.formService.removeItem(formId, itemId));
    itemLists.delete(formId);
    return itemId;
  }

  private async removeSection(
    action: RemoveSectionAction,
    refs: Map<string, ResolvedRef>,
    itemLists: Map<number, any[]>
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const sectionId = this.resolveId(action.payload.sectionRef, refs);
    await firstValueFrom(this.formService.removeSection(sectionId));
    itemLists.delete(formId);
    return sectionId;
  }

  private async createTier(
    action: CreateTierAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const { formRef, sectionRef, approverGroupRef, ...payload } = action.payload;
    const formId = this.resolveId(formRef, refs);
    const form = await this.snapshot(formId, forms);
    const tier = {
      ...payload,
      sortOrder: form?.tiers?.length ?? 0,
      ...(sectionRef ? { section: { id: this.resolveId(sectionRef, refs) } } : {}),
      ...(approverGroupRef ? { approverGroup: this.resolveId(approverGroupRef, refs) } : {}),
      x: { ...(payload.x ?? {}) },
    };
    const saved = await firstValueFrom(this.formService.saveTier(formId, tier));
    const tierId = requireId(saved, 'process tier');
    refs.set(action.id, { id: tierId, formId });
    forms.delete(formId);
    changed.forms++;
    return tierId;
  }

  private async updateTier(
    action: UpdateTierAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tierId = this.resolveId(action.payload.tierRef, refs);
    const form = await this.snapshot(formId, forms);
    const existing = (form?.tiers ?? []).find((tier: any) => Number(tier.id) === tierId);
    if (!existing) throw new Error(`Process tier ${tierId} was not found in form ${formId}. Refresh the form and try again.`);

    const { sectionRef, approverGroupRef, ...patch } = action.payload.patch;
    const tier = {
      ...existing,
      ...patch,
      ...(sectionRef !== undefined ? { section: { id: this.resolveId(sectionRef, refs) } } : {}),
      ...(approverGroupRef !== undefined ? { approverGroup: this.resolveId(approverGroupRef, refs) } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
    };
    await firstValueFrom(this.formService.saveTier(formId, tier));
    forms.delete(formId);
    changed.forms++;
    return tierId;
  }

  private async removeTier(
    action: RemoveTierAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tierId = this.resolveId(action.payload.tierRef, refs);
    const form = await this.snapshot(formId, forms);
    if (!(form?.tiers ?? []).some((tier: any) => Number(tier.id) === tierId)) {
      throw new Error(`Process tier ${tierId} was not found in form ${formId}. Refresh the form and try again.`);
    }
    await firstValueFrom(this.formService.removeTier(tierId));
    forms.delete(formId);
    changed.forms++;
    return tierId;
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

  private async addDatasetItem(
    action: AddDatasetItemAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const { datasetRef, ...payload } = action.payload;
    const datasetId = this.resolveId(datasetRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    if (!dataset) throw new Error(`Dataset ${datasetId} was not found. Refresh the dataset and try again.`);

    const items = Array.isArray(dataset.items) ? dataset.items : [];
    const code = this.uniqueDatasetItemCode(
      payload.code ?? suggestCode(payload.label, 'column'),
      items
    );
    const item = {
      ...payload,
      code,
      sortOrder: payload.sortOrder ?? items.length,
      x: { ...(payload.x ?? {}) },
    };
    const saved = await firstValueFrom(this.datasetService.updateDatasetItem(datasetId, item));
    const itemId = requireId(saved, 'dataset item');
    refs.set(action.id, { id: itemId });
    changed.datasets++;
    return itemId;
  }

  private async updateDatasetItem(
    action: UpdateDatasetItemAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const itemId = this.resolveId(action.payload.itemRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    const existing = (dataset?.items ?? []).find((item: any) => Number(item.id) === itemId);
    if (!existing) throw new Error(`Dataset item ${itemId} was not found in dataset ${datasetId}. Refresh the dataset and try again.`);

    const patch = action.payload.patch;
    const item = { ...existing, ...patch, x: { ...(existing.x ?? {}), ...(patch.x ?? {}) } };
    await firstValueFrom(this.datasetService.updateDatasetItem(datasetId, item));
    changed.datasets++;
    return itemId;
  }

  private async removeDatasetItem(
    action: RemoveDatasetItemAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const itemId = this.resolveId(action.payload.itemRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    if (!(dataset?.items ?? []).some((item: any) => Number(item.id) === itemId)) {
      throw new Error(`Dataset item ${itemId} was not found in dataset ${datasetId}. Refresh the dataset and try again.`);
    }
    await firstValueFrom(this.datasetService.removeDatasetItem(itemId, ''));
    changed.datasets++;
    return itemId;
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
    if (action.payload.type === 'combine') {
      if (!action.payload.comps?.length) {
        throw new Error('A combined screen needs at least one component.');
      }
    } else {
      assertValidTemplate(action.payload.content ?? '');
    }
    const comps = action.payload.comps?.map(({ targetRef, ...component }) => ({
      ...component,
      appId,
      ...(targetRef !== undefined ? { screenId: this.resolveId(targetRef, refs) } : {}),
    }));
    const res = await firstValueFrom(
      this.screenService.saveScreen(
        appId,
        buildScreenPayload({
          title: action.payload.title,
          description: action.payload.description,
          type: action.payload.type,
          content: action.payload.content,
          f: action.payload.f,
          wide: action.payload.wide,
          formId: action.payload.formRef ? this.resolveId(action.payload.formRef, refs) : undefined,
          datasetId: action.payload.datasetRef ? this.resolveId(action.payload.datasetRef, refs) : undefined,
          email: options.email,
          data: comps === undefined ? undefined : { comps },
        })
      )
    );
    const id = requireId(res, 'screen');
    refs.set(action.id, { id });
    changed.screens++;
    return id;
  }

  private async addScreenAction(
    appId: number,
    action: AddScreenActionAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const { screenRef, targetRef, ...payload } = action.payload;
    const screenId = this.resolveId(screenRef, refs);
    const screen: any = await firstValueFrom(this.screenService.getScreen(screenId));
    if (!screen) throw new Error(`Screen ${screenId} was not found. Refresh the screen list and try again.`);
    const screenAppId = screen.appId ?? screen.app?.id;
    if (screenAppId !== undefined && Number(screenAppId) !== appId) {
      throw new Error(`Screen ${screenId} does not belong to this app.`);
    }
    const screenAction = {
      ...payload,
      appId: payload.nextType === 'function' ? payload.appId : (payload.appId ?? appId),
      ...(targetRef !== undefined ? { next: this.resolveId(targetRef, refs) } : {}),
      x: { ...(payload.x ?? {}) },
    };
    const saved = await firstValueFrom(this.screenService.saveAction(screenId, screenAction));
    const id = requireId(saved, 'screen action');
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
        ...(action.payload.f !== undefined ? { f: action.payload.f } : {}),
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

  private async createNaviGroup(
    appId: number,
    action: CreateNaviGroupAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const groups = await this.getNavigation(appId);
    const saved = await firstValueFrom(this.appService.addNaviGroup(appId, {
      ...action.payload,
      sortOrder: action.payload.sortOrder ?? groups.length,
      x: { type: 'menu', ...(action.payload.x ?? {}) },
    }));
    const id = requireId(saved, 'navigation group');
    refs.set(action.id, { id });
    changed.navigation++;
    return id;
  }

  private async updateNaviGroup(
    appId: number,
    action: UpdateNaviGroupAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const groupId = this.resolveId(action.payload.groupRef, refs);
    const groups = await this.getNavigation(appId);
    const existing = groups.find((group: any) => Number(group.id) === groupId);
    if (!existing) throw new Error(`Navigation group ${groupId} was not found. Refresh navigation and try again.`);
    const patch = action.payload.patch;
    const group = { ...existing, ...patch, x: { ...(existing.x ?? {}), ...(patch.x ?? {}) } };
    await firstValueFrom(this.appService.addNaviGroup(appId, group));
    changed.navigation++;
    return groupId;
  }

  private async removeNaviGroup(
    appId: number,
    action: RemoveNaviGroupAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const groupId = this.resolveId(action.payload.groupRef, refs);
    if (!(await this.getNavigation(appId)).some((group: any) => Number(group.id) === groupId)) {
      throw new Error(`Navigation group ${groupId} was not found. Refresh navigation and try again.`);
    }
    await firstValueFrom(this.appService.removeNaviGroup(groupId));
    changed.navigation++;
    return groupId;
  }

  private async addNaviItem(
    appId: number,
    action: AddNaviItemAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const { groupRef, targetRef, ...payload } = action.payload;
    const groupId = this.resolveId(groupRef, refs);
    const groups = await this.getNavigation(appId);
    const group = groups.find((entry: any) => Number(entry.id) === groupId);
    if (!group) throw new Error(`Navigation group ${groupId} was not found. Refresh navigation and try again.`);
    const item = {
      ...payload,
      appId: payload.appId ?? appId,
      sortOrder: group.items?.length ?? 0,
      ...(targetRef !== undefined ? { screenId: this.resolveId(targetRef, refs) } : {}),
      x: { ...(payload.x ?? {}) },
    };
    const saved = await firstValueFrom(this.appService.addNaviItem(groupId, item));
    const id = requireId(saved, 'navigation item');
    refs.set(action.id, { id });
    changed.navigation++;
    return id;
  }

  private async updateNaviItem(
    appId: number,
    action: UpdateNaviItemAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const itemId = this.resolveId(action.payload.itemRef, refs);
    const groups = await this.getNavigation(appId);
    const existingGroup = groups.find((group: any) =>
      (group.items ?? []).some((item: any) => Number(item.id) === itemId)
    );
    const existing = existingGroup?.items?.find((item: any) => Number(item.id) === itemId);
    if (!existing || !existingGroup) {
      throw new Error(`Navigation item ${itemId} was not found. Refresh navigation and try again.`);
    }

    const groupId = action.payload.groupRef
      ? this.resolveId(action.payload.groupRef, refs)
      : Number(existingGroup.id);
    if (!groups.some((group: any) => Number(group.id) === groupId)) {
      throw new Error(`Navigation group ${groupId} was not found. Refresh navigation and try again.`);
    }

    const { targetRef, ...patch } = action.payload.patch;
    const item = {
      ...existing,
      ...patch,
      ...(targetRef !== undefined ? { screenId: this.resolveId(targetRef, refs) } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
    };
    await firstValueFrom(this.appService.addNaviItem(groupId, item));
    changed.navigation++;
    return itemId;
  }

  private async removeNaviItem(
    appId: number,
    action: RemoveNaviItemAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const itemId = this.resolveId(action.payload.itemRef, refs);
    const groups = await this.getNavigation(appId);
    if (!groups.some((group: any) => (group.items ?? []).some((item: any) => Number(item.id) === itemId))) {
      throw new Error(`Navigation item ${itemId} was not found. Refresh navigation and try again.`);
    }
    await firstValueFrom(this.appService.removeNaviItem(itemId));
    changed.navigation++;
    return itemId;
  }

  private async getNavigation(appId: number): Promise<any[]> {
    const response = await firstValueFrom(this.appService.getNavisAll(appId));
    return Array.isArray(response) ? response : (response?.content ?? []);
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

  private uniqueDatasetItemCode(code: string, items: any[]): string {
    const taken = new Set(items.map((item) => String(item.code)));
    if (!taken.has(code)) return code;
    let n = 2;
    while (taken.has(`${code}_${n}`)) n++;
    return `${code}_${n}`;
  }

}

function requireId(res: any, label: string): number {
  const id = res?.id ?? res?.data?.id;
  if (!Number.isFinite(Number(id))) throw new Error(`The ${label} was saved but the server did not return its id.`);
  return Number(id);
}

/** Compile screens before saving, without rendering or executing template code. */
function assertValidTemplate(content: string) {
  if (!content || !content.trim()) throw new Error('The generated screen template is empty.');
  try {
    compileTpl(content, null, 'assistant_validate');
  } catch (e) {
    throw new Error(`The generated screen template is not valid: ${e instanceof Error ? e.message : String(e)}`);
  }
}
