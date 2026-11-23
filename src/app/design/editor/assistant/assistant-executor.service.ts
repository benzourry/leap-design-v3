import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { AppService } from '../../../service/app.service';
import { LambdaService } from '../../../service/lambda.service';
import { MailerService } from '../../../service/mailer.service';
import { LookupService } from '../../../run/_service/lookup.service';
import { compileTpl } from '../../../_shared/utils';
import { getAssistantActionBlockReason } from './assistant-dependencies';
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
  AddTierActionAction,
  UpdateTierActionAction,
  RemoveTierActionAction,
  AddDatasetActionAction,
  UpdateDatasetActionAction,
  RemoveDatasetActionAction,
  AddDatasetFilterAction,
  UpdateDatasetFilterAction,
  RemoveDatasetFilterAction,
  UpdateScreenActionAction,
  RemoveScreenActionAction,
  CreateLambdaAction,
  UpdateLambdaAction,
  RemoveLambdaAction,
  AddLambdaBindingAction,
  RemoveLambdaBindingAction,
  CreateEmailTemplateAction,
  UpdateEmailTemplateAction,
  RemoveEmailTemplateAction,
  CreateLookupAction,
  UpdateLookupAction,
  AddLookupEntryAction,
  UpdateLookupEntryAction,
  DeleteLookupEntryAction,
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
  private lambdaService = inject(LambdaService);
  private mailerService = inject(MailerService);
  private lookupService = inject(LookupService);

  async apply(appId: number, actions: AssistantAction[], options: AssistantApplyOptions): Promise<AssistantApplyResult> {
    if (options.requiresResponse) {
      throw new Error('The assistant is waiting for your reply. Respond before applying this plan.');
    }

    const results: AssistantActionResult[] = [];
    const changed: AssistantChanged = {
      forms: 0, datasets: 0, dashboards: 0, screens: 0, navigation: 0, lambdas: 0,
      emailTemplates: 0, lookups: 0,
    };
    const refs = new Map<string, ResolvedRef>();

    const runnable = actions.filter((action) => this.isRunnable(action, options));
    const runnableIds = runnable.map((action) => action.id);
    const blocked = runnable.find((action) =>
      getAssistantActionBlockReason(action.id, actions, runnableIds) !== undefined
    );
    if (blocked) {
      throw new Error('Some selected steps are waiting for required steps. Update the plan before applying.');
    }

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
        return this.createTab(appId, action, refs, forms, changed);
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
      case 'add_tier_action':
        return this.addTierAction(appId, action, refs, forms, changed);
      case 'update_tier_action':
        return this.updateTierAction(appId, action, refs, forms, changed);
      case 'remove_tier_action':
        return this.removeTierAction(action, refs, forms, changed);
      case 'create_dataset':
        return this.createDataset(appId, action, refs, forms, changed);
      case 'add_dataset_item':
        return this.addDatasetItem(action, refs, changed);
      case 'update_dataset_item':
        return this.updateDatasetItem(action, refs, changed);
      case 'remove_dataset_item':
        return this.removeDatasetItem(action, refs, changed);
      case 'add_dataset_action':
        return this.addDatasetAction(appId, action, refs, changed);
      case 'update_dataset_action':
        return this.updateDatasetAction(appId, action, refs, changed);
      case 'remove_dataset_action':
        return this.removeDatasetAction(appId, action, refs, changed);
      case 'add_dataset_filter':
        return this.addDatasetFilter(appId, action, refs, changed);
      case 'update_dataset_filter':
        return this.updateDatasetFilter(appId, action, refs, changed);
      case 'remove_dataset_filter':
        return this.removeDatasetFilter(appId, action, refs, changed);
      case 'create_lookup':
        return this.createLookup(appId, action, refs, changed, options.email);
      case 'update_lookup':
        return this.updateLookup(appId, action, refs, changed, options.email);
      case 'add_lookup_entry':
        return this.addLookupEntry(action, refs, changed);
      case 'update_lookup_entry':
        return this.updateLookupEntry(action, refs, changed);
      case 'delete_lookup_entry':
        return this.deleteLookupEntry(action, refs, changed);
      case 'create_dashboard':
        return this.createDashboard(appId, action, refs, changed);
      case 'add_chart':
        return this.addChart(action, refs, forms, changed);
      case 'create_screen':
        return this.createScreen(appId, action, refs, changed, options);
      case 'add_screen_action':
        return this.addScreenAction(appId, action, refs, changed);
      case 'update_screen_action':
        return this.updateScreenAction(appId, action, refs, changed);
      case 'remove_screen_action':
        return this.removeScreenAction(appId, action, refs, changed);
      case 'update_screen':
        return this.updateScreen(appId, action, refs, changed);
      case 'remove_screen':
        return this.removeScreen(action, refs, changed);
      case 'create_lambda':
        return this.createLambda(appId, action, refs, changed, options.email);
      case 'update_lambda':
        return this.updateLambda(appId, action, refs, changed, options.email);
      case 'remove_lambda':
        return this.removeLambda(appId, action, refs, changed);
      case 'add_lambda_binding':
        return this.addLambdaBinding(appId, action, refs, changed, options.email);
      case 'remove_lambda_binding':
        return this.removeLambdaBinding(appId, action, refs, changed, options.email);
      case 'create_email_template':
        return this.createEmailTemplate(appId, action, refs, changed, options.email);
      case 'update_email_template':
        return this.updateEmailTemplate(appId, action, refs, changed, options.email);
      case 'remove_email_template':
        return this.removeEmailTemplate(appId, action, refs, changed);
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

  private async createTab(appId: number,action: CreateTabAction, refs: Map<string, ResolvedRef>, forms: Map<number, any>, changed: AssistantChanged) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const form = await this.snapshot(formId, forms);

    // 1. Update the form FIRST so we don't overwrite the new tab with stale data
    if (form.nav === undefined || form.nav === 'simple') {
      const updatedForm = { ...form, nav: 'pills' };
      await firstValueFrom(this.formService.saveForm(appId, updatedForm));
      changed.forms++;
    }

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

    const {
      onInit,
      addMailerRefs,
      updateMailerRefs,
      retractMailerRefs,
      deleteMailerRefs,
      updateApprovalMailerRef,
      ...patch
    } = action.payload.patch;
    const form = {
      ...existing,
      ...patch,
      ...(onInit !== undefined ? { f: onInit } : {}),
      ...(addMailerRefs !== undefined
        ? { addMailer: addMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(updateMailerRefs !== undefined
        ? { updateMailer: updateMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(retractMailerRefs !== undefined
        ? { retractMailer: retractMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(deleteMailerRefs !== undefined
        ? { deleteMailer: deleteMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(updateApprovalMailerRef !== undefined
        ? { updateApprovalMailer: updateApprovalMailerRef === null
            ? null
            : this.resolveId(updateApprovalMailerRef, refs) }
        : {}),
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
    const {
      formRef, sectionRef, approverGroupRef,
      submitMailerRefs, assignMailerRefs, resubmitMailerRefs,
      ...payload
    } = action.payload;
    const formId = this.resolveId(formRef, refs);
    const form = await this.snapshot(formId, forms);
    if (form?.x?.extended) {
      throw new Error(`Process tiers are inherited by extended form ${formId} and cannot be created on it. Edit the original form instead.`);
    }
    const tier = {
      ...payload,
      sortOrder: form?.tiers?.length ?? 0,
      ...(sectionRef ? { section: { id: this.resolveId(sectionRef, refs) } } : {}),
      ...(approverGroupRef ? { approverGroup: this.resolveId(approverGroupRef, refs) } : {}),
      ...(submitMailerRefs !== undefined
        ? { submitMailer: submitMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(assignMailerRefs !== undefined
        ? { assignMailer: assignMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(resubmitMailerRefs !== undefined
        ? { resubmitMailer: resubmitMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      x: { ...(payload.x ?? {}) },
      actions:{
          approved: {
              action: 'nextTier',
              label: 'Approved',
              code: 'approved',
              color: '#28a745',
              icon: 'check',
              userEdit: false,
              sortOrder: 0
          },
          rejected: {
              action: 'curTier',
              label: 'Rejected',
              code: 'rejected',
              color: '#dc3545',
              icon: 'times',
              userEdit: false,
              sortOrder: 1
          },
          returned: {
              action: 'curTier',
              label: 'Returned',
              code: 'returned',
              color: '#007bff',
              icon: 'reply',
              userEdit: true,
              sortOrder: 2
          }
      }
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
    if (form?.x?.extended) {
      throw new Error(`Process tiers are inherited by extended form ${formId} and cannot be updated on it. Edit the original form instead.`);
    }
    const existing = (form?.tiers ?? []).find((tier: any) => Number(tier.id) === tierId);
    if (!existing) throw new Error(`Process tier ${tierId} was not found in form ${formId}. Refresh the form and try again.`);

    const {
      sectionRef, approverGroupRef,
      submitMailerRefs, assignMailerRefs, resubmitMailerRefs,
      ...patch
    } = action.payload.patch;
    const tier = {
      ...existing,
      ...patch,
      ...(sectionRef !== undefined ? { section: { id: this.resolveId(sectionRef, refs) } } : {}),
      ...(approverGroupRef !== undefined ? { approverGroup: this.resolveId(approverGroupRef, refs) } : {}),
      ...(submitMailerRefs !== undefined
        ? { submitMailer: submitMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(assignMailerRefs !== undefined
        ? { assignMailer: assignMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
      ...(resubmitMailerRefs !== undefined
        ? { resubmitMailer: resubmitMailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
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
    if (form?.x?.extended) {
      throw new Error(`Process tiers are inherited by extended form ${formId} and cannot be removed from it. Edit the original form instead.`);
    }
    if (!(form?.tiers ?? []).some((tier: any) => Number(tier.id) === tierId)) {
      throw new Error(`Process tier ${tierId} was not found in form ${formId}. Refresh the form and try again.`);
    }
    await firstValueFrom(this.formService.removeTier(formId, tierId));
    forms.delete(formId);
    changed.forms++;
    return tierId;
  }

  private async addTierAction(
    appId: number,
    action: AddTierActionAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tierId = this.resolveId(action.payload.tierRef, refs);
    const form = await this.snapshot(formId, forms);
    assertAppOwner(form, appId, 'form');
    if (form?.x?.extended) {
      throw new Error(`Process tiers are inherited by extended form ${formId} and cannot be modified on it.`);
    }
    const tier = this.requireTier(form, formId, tierId);
    const actions = Object.values(tier.actions ?? {}) as any[];
    const code = uniqueCode(action.payload.code ?? suggestCode(action.payload.label, 'action'), actions);
    const { formRef: _formRef, tierRef: _tierRef, nextTierRef, mailerRefs, ...payload } = action.payload;
    const saved = await firstValueFrom(this.formService.saveTierAction(formId, tierId, {
      ...payload,
      code,
      sortOrder: payload.sortOrder ?? actions.length,
      ...(nextTierRef !== undefined ? { nextTier: this.resolveId(nextTierRef, refs) } : {}),
      ...(mailerRefs !== undefined
        ? { mailer: mailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
    }));
    const id = requireId(saved, 'tier action');
    refs.set(action.id, { id, formId });
    forms.delete(formId);
    changed.forms++;
    return id;
  }

  private async updateTierAction(
    appId: number,
    action: UpdateTierActionAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tierId = this.resolveId(action.payload.tierRef, refs);
    const actionId = this.resolveId(action.payload.actionRef, refs);
    const form = await this.snapshot(formId, forms);
    assertAppOwner(form, appId, 'form');
    const tier = this.requireTier(form, formId, tierId);
    const existing = (Object.values(tier.actions ?? {}) as any[])
      .find((entry) => Number(entry.id) === actionId);
    if (!existing) throw new Error(`Tier action ${actionId} was not found in process tier ${tierId}.`);

    const { nextTierRef, mailerRefs, ...patch } = action.payload.patch;
    const tierAction = {
      ...existing,
      ...patch,
      ...(nextTierRef !== undefined ? { nextTier: this.resolveId(nextTierRef, refs) } : {}),
      ...(mailerRefs !== undefined
        ? { mailer: mailerRefs.map((mailerRef) => this.resolveId(mailerRef, refs)) }
        : {}),
    };
    await firstValueFrom(this.formService.saveTierAction(formId, tierId, tierAction));
    forms.delete(formId);
    changed.forms++;
    return actionId;
  }

  private async removeTierAction(
    action: RemoveTierActionAction,
    refs: Map<string, ResolvedRef>,
    forms: Map<number, any>,
    changed: AssistantChanged
  ) {
    const formId = this.resolveId(action.payload.formRef, refs);
    const tierId = this.resolveId(action.payload.tierRef, refs);
    const actionId = this.resolveId(action.payload.actionRef, refs);
    const form = await this.snapshot(formId, forms);
    const tier = this.requireTier(form, formId, tierId);
    if (!(Object.values(tier.actions ?? {}) as any[]).some((entry) => Number(entry.id) === actionId)) {
      throw new Error(`Tier action ${actionId} was not found in process tier ${tierId}.`);
    }
    await firstValueFrom(this.formService.removeTierAction(formId, actionId));
    forms.delete(formId);
    changed.forms++;
    return actionId;
  }

  defaultDataset = { items: [], filters: [], next: {}, screen: {}, presetFilters: {}, showAction: true, actions:[{label:'View', action:'view',type:'dropdown',inpop:true,icon:'fas:file',style:'btn-secondary'},{label:'Edit', action:'edit',type:'dropdown',inpop:true,icon:'fas:pencil-alt',style:'btn-secondary'},{label:'Delete', action:'delete',type:'dropdown',inpop:true,icon:'fas:trash',style:'btn-secondary'}], x: {tblcard:true, showSummary: true}, wide: true };

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
      this.datasetService.saveDataset(appId, {...this.defaultDataset, ...buildDatasetPayload({ ...action.payload, form: form?.data ?? form, formId })})
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

  private async addDatasetAction(
    appId: number,
    action: AddDatasetActionAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    if (!dataset) throw new Error(`Dataset ${datasetId} was not found.`);
    assertAppOwner(dataset, appId, 'dataset');
    const { datasetRef: _datasetRef, targetRef, ...payload } = action.payload;
    const saved = await firstValueFrom(this.datasetService.saveAction(datasetId, {
      ...payload,
      sortOrder: payload.sortOrder ?? (dataset.actions?.length ?? 0),
      ...(targetRef !== undefined ? { next: String(this.resolveId(targetRef, refs)) } : {}),
      x: { ...(payload.x ?? {}) },
    }));
    const id = requireId(saved, 'dataset action');
    refs.set(action.id, { id });
    changed.datasets++;
    return id;
  }

  private async updateDatasetAction(
    appId: number,
    action: UpdateDatasetActionAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const actionId = this.resolveId(action.payload.actionRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    assertAppOwner(dataset, appId, 'dataset');
    const existing = (dataset?.actions ?? []).find((entry: any) => Number(entry.id) === actionId);
    if (!existing) throw new Error(`Dataset action ${actionId} was not found in dataset ${datasetId}.`);
    const { targetRef, ...patch } = action.payload.patch;
    await firstValueFrom(this.datasetService.saveAction(datasetId, {
      ...existing,
      ...patch,
      ...(targetRef !== undefined ? { next: String(this.resolveId(targetRef, refs)) } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
    }));
    changed.datasets++;
    return actionId;
  }

  private async removeDatasetAction(
    appId: number,
    action: RemoveDatasetActionAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const actionId = this.resolveId(action.payload.actionRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    assertAppOwner(dataset, appId, 'dataset');
    if (!(dataset?.actions ?? []).some((entry: any) => Number(entry.id) === actionId)) {
      throw new Error(`Dataset action ${actionId} was not found in dataset ${datasetId}.`);
    }
    await firstValueFrom(this.datasetService.removeAction(actionId));
    changed.datasets++;
    return actionId;
  }

  private async addDatasetFilter(
    appId: number,
    action: AddDatasetFilterAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    assertAppOwner(dataset, appId, 'dataset');
    const filters = Array.isArray(dataset.filters) ? dataset.filters : [];
    const code = this.uniqueFilterCode(action.payload.code, action.payload.root, filters);
    const { datasetRef: _datasetRef, formIdRef, ...payload } = action.payload;
    const filter = {
      ...payload,
      code,
      formId: this.resolveId(formIdRef, refs),
      sortOrder: payload.sortOrder ?? filters.length,
    };
    const saved: any = await firstValueFrom(this.datasetService.saveDataset(appId, {
      ...dataset,
      filters: [...filters, filter],
    }));
    const savedFilter = asArray(saved?.filters).find(
      (entry) => String(entry.code) === code && String(entry.root) === String(filter.root)
    );
    const id = requireId(savedFilter, 'dataset filter');
    refs.set(action.id, { id });
    changed.datasets++;
    return id;
  }

  private async updateDatasetFilter(
    appId: number,
    action: UpdateDatasetFilterAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const filterId = this.resolveId(action.payload.filterRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    assertAppOwner(dataset, appId, 'dataset');
    const filters = asArray(dataset.filters);
    const existing = filters.find((entry) => Number(entry.id) === filterId);
    if (!existing) throw new Error(`Dataset filter ${filterId} was not found in dataset ${datasetId}.`);
    const { formIdRef, ...patch } = action.payload.patch;
    await firstValueFrom(this.datasetService.saveDataset(appId, {
      ...dataset,
      filters: filters.map((entry) => Number(entry.id) === filterId
        ? {
            ...existing,
            ...patch,
            ...(formIdRef !== undefined ? { formId: this.resolveId(formIdRef, refs) } : {}),
          }
        : entry),
    }));
    changed.datasets++;
    return filterId;
  }

  private async removeDatasetFilter(
    appId: number,
    action: RemoveDatasetFilterAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const datasetId = this.resolveId(action.payload.datasetRef, refs);
    const filterId = this.resolveId(action.payload.filterRef, refs);
    const dataset: any = await firstValueFrom(this.datasetService.getDataset(datasetId));
    assertAppOwner(dataset, appId, 'dataset');
    const filters = asArray(dataset.filters);
    if (!filters.some((entry) => Number(entry.id) === filterId)) {
      throw new Error(`Dataset filter ${filterId} was not found in dataset ${datasetId}.`);
    }
    await firstValueFrom(this.datasetService.saveDataset(appId, {
      ...dataset,
      filters: filters.filter((entry) => Number(entry.id) !== filterId),
    }));
    changed.datasets++;
    return filterId;
  }

  private async createLookup(
    appId: number,
    action: CreateLookupAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const { x, ...payload } = action.payload;
    const lookup = await firstValueFrom(this.lookupService.save(email, appId, {
      sourceType: 'db',
      dataEnabled: false,
      shared: false,
      ...payload,
      x: { ...(x ?? {}) },
    }));
    const id = requireId(lookup, 'lookup');
    refs.set(action.id, { id });
    changed.lookups++;
    return id;
  }

  private async updateLookup(
    appId: number,
    action: UpdateLookupAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const lookupId = this.resolveId(action.payload.lookupRef, refs);
    const existing: any = await firstValueFrom(this.lookupService.getLookup(lookupId));
    if (!existing) throw new Error(`Lookup ${lookupId} was not found. Refresh the lookup list and try again.`);
    assertAppOwner(existing, appId, 'lookup');
    const patch = action.payload.patch ?? {};
    await firstValueFrom(this.lookupService.save(email, appId, {
      ...existing,
      ...patch,
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
    }));
    refs.set(action.id, { id: lookupId });
    changed.lookups++;
    return lookupId;
  }

  private async addLookupEntry(
    action: AddLookupEntryAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const lookupId = this.resolveId(action.payload.lookupRef, refs);
    const { lookupRef: _lookupRef, ...entry } = action.payload;
    const saved = await firstValueFrom(this.lookupService.saveEntry(lookupId, {
      ...entry,
      enabled: entry.enabled ?? 1,
    }));
    const id = requireId(saved, 'lookup entry');
    refs.set(action.id, { id });
    changed.lookups++;
    return id;
  }

  private async updateLookupEntry(
    action: UpdateLookupEntryAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const lookupId = this.resolveId(action.payload.lookupRef, refs);
    const entryId = this.resolveId(action.payload.entryRef, refs);
    const entries = await this.lookupEntries(lookupId);
    const existing = entries.find((entry) => Number(entry?.id) === entryId);
    if (!existing) {
      throw new Error(`Lookup entry ${entryId} was not found in lookup ${lookupId}. Refresh the lookup and try again.`);
    }
    const patch = action.payload.patch ?? {};
    await firstValueFrom(this.lookupService.saveEntry(lookupId, {
      ...existing,
      ...patch,
      data: { ...(existing.data ?? {}), ...(patch.data ?? {}) },
    }));
    changed.lookups++;
    return entryId;
  }

  private async deleteLookupEntry(
    action: DeleteLookupEntryAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const lookupId = this.resolveId(action.payload.lookupRef, refs);
    const entryId = this.resolveId(action.payload.entryRef, refs);
    const entries = await this.lookupEntries(lookupId);
    if (!entries.some((entry) => Number(entry?.id) === entryId)) {
      throw new Error(`Lookup entry ${entryId} was not found in lookup ${lookupId}. Refresh the lookup and try again.`);
    }
    await firstValueFrom(this.lookupService.removeEntry(entryId, {}));
    changed.lookups++;
    return entryId;
  }

  private async lookupEntries(lookupId: number): Promise<any[]> {
    const response: any = await firstValueFrom(
      this.lookupService.getEntryListFull(lookupId, { size: 9999, page: 0, sort: 'ordering,asc' })
    );
    return Array.isArray(response) ? response : (response?.content ?? []);
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

  private async updateScreenAction(
    appId: number,
    action: UpdateScreenActionAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const screenId = this.resolveId(action.payload.screenRef, refs);
    const actionId = this.resolveId(action.payload.actionRef, refs);
    const screen: any = await firstValueFrom(this.screenService.getScreen(screenId));
    assertAppOwner(screen, appId, 'screen');
    const existing = (Array.from(screen?.actions ?? []) as any[])
      .find((entry) => Number(entry.id) === actionId);
    if (!existing) throw new Error(`Screen action ${actionId} was not found in screen ${screenId}.`);
    const { targetRef, ...patch } = action.payload.patch;
    await firstValueFrom(this.screenService.saveAction(screenId, {
      ...existing,
      ...patch,
      ...(targetRef !== undefined ? { next: this.resolveId(targetRef, refs) } : {}),
      x: { ...(existing.x ?? {}), ...(patch.x ?? {}) },
    }));
    changed.screens++;
    return actionId;
  }

  private async removeScreenAction(
    appId: number,
    action: RemoveScreenActionAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const screenId = this.resolveId(action.payload.screenRef, refs);
    const actionId = this.resolveId(action.payload.actionRef, refs);
    const screen: any = await firstValueFrom(this.screenService.getScreen(screenId));
    assertAppOwner(screen, appId, 'screen');
    if (!(Array.from(screen?.actions ?? []) as any[]).some((entry) => Number(entry.id) === actionId)) {
      throw new Error(`Screen action ${actionId} was not found in screen ${screenId}.`);
    }
    await firstValueFrom(this.screenService.removeAction(actionId));
    changed.screens++;
    return actionId;
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

  private async createLambda(
    appId: number,
    action: CreateLambdaAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const { source, binds, ...payload } = action.payload;
    const code = payload.code ?? suggestCode(payload.name, 'lambda').replace(/_/g, '-');
    if (await firstValueFrom(this.lambdaService.isCodeTaken(code))) {
      throw new Error(`Lambda code "${code}" is already in use.`);
    }
    const providedBindings = (binds ?? []).map((binding) => resolveBinding(binding, refs));
    const lambda = {
      ...payload,
      email,
      lang: payload.lang ?? 'js',
      code,
      data: { f: source },
      binds: ensureRequiredLambdaBindings(source, providedBindings),
    };
    const saved = await firstValueFrom(this.lambdaService.save(email, appId, lambda));
    const id = requireId(saved, 'lambda');
    refs.set(action.id, { id });
    changed.lambdas++;
    return id;
  }

  private async updateLambda(
    appId: number,
    action: UpdateLambdaAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const lambdaId = this.resolveId(action.payload.lambdaRef, refs);
    const existing: any = await firstValueFrom(this.lambdaService.getLambda(lambdaId));
    assertAppOwner(existing, appId, 'lambda');
    const { source, accessGroupRef, signaRef, data, ...patch } = action.payload.patch;
    if (patch.code !== undefined
        && patch.code !== existing.code
        && await firstValueFrom(this.lambdaService.isCodeTaken(patch.code))) {
      throw new Error(`Lambda code "${patch.code}" is already in use.`);
    }
    const updatedSource = String(source ?? data?.f ?? existing?.data?.f ?? '');
    const lambda = {
      ...existing,
      ...patch,
      ...(source !== undefined ? { data: { ...(existing.data ?? {}), ...(data ?? {}), f: source } }
        : data !== undefined ? { data: { ...(existing.data ?? {}), ...data } } : {}),
      ...(accessGroupRef !== undefined ? { access: { id: this.resolveId(accessGroupRef, refs) } } : {}),
      ...(signaRef !== undefined ? { signa: { id: this.resolveId(signaRef, refs) } } : {}),
      binds: ensureRequiredLambdaBindings(updatedSource, asArray(existing.binds)),
    };
    await firstValueFrom(this.lambdaService.save(email, appId, lambda));
    changed.lambdas++;
    return lambdaId;
  }

  private async removeLambda(
    appId: number,
    action: RemoveLambdaAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const lambdaId = this.resolveId(action.payload.lambdaRef, refs);
    const existing: any = await firstValueFrom(this.lambdaService.getLambda(lambdaId));
    assertAppOwner(existing, appId, 'lambda');
    await firstValueFrom(this.lambdaService.deleteLambda(lambdaId, existing));
    changed.lambdas++;
    return lambdaId;
  }

  private async addLambdaBinding(
    appId: number,
    action: AddLambdaBindingAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const lambdaId = this.resolveId(action.payload.lambdaRef, refs);
    const lambda: any = await firstValueFrom(this.lambdaService.getLambda(lambdaId));
    assertAppOwner(lambda, appId, 'lambda');
    const binds = asArray(lambda.binds);
    const binding = resolveBinding(action.payload.binding, refs);
    const existingBinding = binds.find((entry) => sameBinding(entry, binding));
    if (existingBinding) {
      refs.set(action.id, { id: Number(existingBinding.id) });
      changed.lambdas++;
      return Number(existingBinding.id);
    }
    const saved: any = await firstValueFrom(this.lambdaService.save(email, appId, {
      ...lambda,
      binds: [...binds, binding],
    }));
    const savedBinding = asArray(saved?.binds).find((entry) =>
      entry.type === binding.type
      && entry.srcId === binding.srcId
      && entry.name === binding.name
      && !binds.some((old) => Number(old.id) === Number(entry.id))
    );
    const id = requireId(savedBinding, 'lambda binding');
    refs.set(action.id, { id });
    changed.lambdas++;
    return id;
  }

  private async removeLambdaBinding(
    appId: number,
    action: RemoveLambdaBindingAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const lambdaId = this.resolveId(action.payload.lambdaRef, refs);
    const bindingId = this.resolveId(action.payload.bindingRef, refs);
    const lambda: any = await firstValueFrom(this.lambdaService.getLambda(lambdaId));
    assertAppOwner(lambda, appId, 'lambda');
    const binds = asArray(lambda.binds);
    if (!binds.some((binding) => Number(binding.id) === bindingId)) {
      throw new Error(`Lambda binding ${bindingId} was not found in lambda ${lambdaId}.`);
    }
    await firstValueFrom(this.lambdaService.save(email, appId, {
      ...lambda,
      binds: binds.filter((binding) => Number(binding.id) !== bindingId),
    }));
    changed.lambdas++;
    return bindingId;
  }

  private async createEmailTemplate(
    appId: number,
    action: CreateEmailTemplateAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const template = { ...action.payload, enabled: action.payload.enabled ?? 1 };
    const saved = await firstValueFrom(this.mailerService.save(email, appId, template));
    const id = requireId(saved, 'email template');
    refs.set(action.id, { id });
    changed.emailTemplates++;
    return id;
  }

  private async updateEmailTemplate(
    appId: number,
    action: UpdateEmailTemplateAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged,
    email: string
  ) {
    const templateId = this.resolveId(action.payload.emailTemplateRef, refs);
    const existing: any = await firstValueFrom(this.mailerService.getMailer(templateId));
    assertAppOwner(existing, appId, 'email template');
    await firstValueFrom(this.mailerService.save(email, appId, { ...existing, ...action.payload.patch }));
    changed.emailTemplates++;
    return templateId;
  }

  private async removeEmailTemplate(
    appId: number,
    action: RemoveEmailTemplateAction,
    refs: Map<string, ResolvedRef>,
    changed: AssistantChanged
  ) {
    const templateId = this.resolveId(action.payload.emailTemplateRef, refs);
    const existing: any = await firstValueFrom(this.mailerService.getMailer(templateId));
    assertAppOwner(existing, appId, 'email template');
    await firstValueFrom(this.mailerService.deleteMailer(templateId, existing));
    changed.emailTemplates++;
    return templateId;
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

  private requireTier(form: any, formId: number, tierId: number): any {
    const tier = (form?.tiers ?? []).find((entry: any) => Number(entry.id) === tierId);
    if (!tier) throw new Error(`Process tier ${tierId} was not found in form ${formId}. Refresh the form and try again.`);
    return tier;
  }

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

  private uniqueFilterCode(code: string, root: string, filters: any[]): string {
    const taken = new Set(filters
      .filter((filter) => String(filter.root) === String(root))
      .map((filter) => String(filter.code)));
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

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function uniqueCode(code: string, entries: any[]): string {
  const taken = new Set(entries.map((entry) => String(entry.code)));
  if (!taken.has(code)) return code;
  let n = 2;
  while (taken.has(`${code}_${n}`)) n++;
  return `${code}_${n}`;
}

function resolveBinding(binding: import('./assistant.types').LambdaBindingPayload, refs: Map<string, ResolvedRef>) {
  const { sourceRef, ...payload } = binding;
  let srcId: number | undefined;
  if (sourceRef !== undefined) {
    if (String(sourceRef).startsWith('$')) {
      const resolved = refs.get(String(sourceRef).slice(1));
      if (!resolved) throw new Error(`Step ${sourceRef} was not applied, so this binding cannot be created.`);
      srcId = resolved.id;
    } else {
      srcId = Number(sourceRef);
      if (!Number.isFinite(srcId)) throw new Error(`Unknown binding source "${sourceRef}".`);
    }
  }
  return {
    ...payload,
    ...(srcId !== undefined ? { srcId } : {}),
  };
}

function assertAppOwner(entity: any, appId: number, label: string) {
  if (!entity) throw new Error(`The ${label} to change no longer exists.`);
  const ownerId = entity.appId ?? entity.app?.id;
  if (ownerId !== undefined && Number(ownerId) !== appId) {
    throw new Error(`The ${label} does not belong to this app.`);
  }
}

function ensureRequiredLambdaBindings(source: string, existingBindings: any[]): any[] {
  const binds = [...existingBindings];
  const add = (binding: { name: string; type: string; srcId?: number }) => {
    if (!binds.some((entry) => sameBinding(entry, binding))) binds.push(binding);
  };

  for (const match of source.matchAll(/\blookup_(\d+)\b/g)) {
    const srcId = Number(match[1]);
    add({ name: `Lookup ${srcId}`, type: 'lookup', srcId });
  }
  for (const match of source.matchAll(/\bdataset_(\d+)\b/g)) {
    const srcId = Number(match[1]);
    add({ name: `Dataset ${srcId}`, type: 'dataset', srcId });
  }
  for (const match of source.matchAll(/\bdashboard_(\d+)\b/g)) {
    const srcId = Number(match[1]);
    add({ name: `Dashboard ${srcId}`, type: 'dashboard', srcId });
  }

  const prefixes: Record<string, string> = {
    _mail: 'Mailer',
    _endpoint: 'Endpoint',
    _entry: 'Entry',
    _lookup: 'Lookup service',
    _cogna: 'Cogna',
    _secret: 'Secret',
    _user: 'User',
    _mapper: 'Mapper',
    _toMap: 'Mapper',
    _toEntry: 'Mapper',
    _jsoup: 'Jsoup',
    _krypta: 'Krypta',
    _live: 'Live',
    _log: 'Log',
    _token: 'Token',
    _sql: 'SQL',
    _io: 'IO/File',
    _util: 'Utility',
    _http: 'HTTP',
    _pdf: 'PDF',
  };
  for (const [symbol, name] of Object.entries(prefixes)) {
    if (!new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(source)) continue;
    const type = symbol === '_toMap' || symbol === '_toEntry' ? '_mapper' : symbol;
    add({ name, type });
  }
  return binds;
}

function sameBinding(left: any, right: any): boolean {
  return left?.type === right?.type
    && (left?.srcId === undefined || left?.srcId === null || Number(left.srcId) === Number(right.srcId));
}
