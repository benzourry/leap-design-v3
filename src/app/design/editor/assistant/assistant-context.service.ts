import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, catchError, switchMap } from 'rxjs';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { AppService } from '../../../service/app.service';
import { GroupService } from '../../../service/group.service';
import { LookupService } from '../../../run/_service/lookup.service';
import { assistantKnowledge } from './assistant-knowledge';
import {
  AssistantContext,
  AssistantEntitySummary,
  AssistantFormSummary,
  AssistantScreenSummary,
  AssistantContextEntities,
} from './assistant.types';

/** Forms that get their sections and fields described. Bounds the prompt size on large apps. */
const DETAILED_FORM_LIMIT = 40;

/** Free-text fields are clipped so one script or description cannot dominate the request. */
const MAX_CONTEXT_TEXT_CHARS = 400;
const DETAILED_DATASET_LIMIT = 10;
const MAX_DATASET_ITEMS = 100;

/**
 * Builds the snapshot handed to the backend with every prompt: what the app already contains plus
 * the vocabulary this build accepts. Fetched fresh so the assistant never works from a stale view
 * after a previous apply.
 */
@Injectable({ providedIn: 'root' })
export class AssistantContextService {
  private formService = inject(FormService);
  private datasetService = inject(DatasetService);
  private dashboardService = inject(DashboardService);
  private screenService = inject(ScreenService);
  private appService = inject(AppService);
  private groupService = inject(GroupService);
  private lookupService = inject(LookupService);

  listForms(appId: number): Observable<AssistantFormSummary[]> {
    return this.formService
      .getListBasic({ appId, size: 9999, page: 0, sort: ['sortOrder,asc', 'id,asc'] })
      .pipe(map((response: any) => asList(response).map(summarizeForm)));
  }

  build(
    app: { id: number; title?: string; description?: string },
    selection: { formId?: number; datasetId?: number; screenId?: number } = {}
  ): Observable<AssistantContext> {
    const appId = app.id;

    return forkJoin({
      forms: this.listForms(appId),
      datasets: this.datasetService.getDatasetList(appId).pipe(catchError(() => of([]))),
      dashboards: this.dashboardService.getDashboardList(appId).pipe(catchError(() => of([]))),
      screens: this.screenService.getScreenList(appId).pipe(catchError(() => of([]))),
      lookups: this.lookupService.getFullLookupList({ appId }).pipe(catchError(() => of([]))),
      navigation: this.appService.getNavisAll(appId),
      groups: this.groupService.getGroupList({ appId, size: 999 }),
    }).pipe(
      switchMap(({ forms, datasets, dashboards, screens, lookups, navigation, groups }) => {
        const selectedForm = selection.formId === undefined
          ? undefined
          : forms.find((form) => form.id === selection.formId);
        if (selection.formId !== undefined && !selectedForm) {
          throw new Error('The selected form is no longer available. Choose it again and retry.');
        }

        const screenList = asList(screens);
        const selectedScreen = selection.screenId === undefined
          ? undefined
          : screenList.find((screen) => Number(screen?.id) === selection.screenId);
        if (selection.screenId !== undefined && !selectedScreen) {
          throw new Error('The selected screen is no longer available. Choose it again and retry.');
        }

        const formList$ = selectedForm
          ? this.describeForm(selectedForm.id, selectedForm.title).pipe(
              map((detail) => {
                const summaries = forms.slice(0, DETAILED_FORM_LIMIT);
                const index = summaries.findIndex((form) => form.id === detail.id);
                if (index >= 0) summaries[index] = detail;
                else summaries.push(detail);
                return summaries;
              })
            )
          : of(forms.slice(0, DETAILED_FORM_LIMIT));

        const datasetList = asList(datasets);
        const selectedDataset = selection.datasetId === undefined
          ? undefined
          : datasetList.find((dataset) => Number(dataset?.id) === selection.datasetId);
        if (selection.datasetId !== undefined && !selectedDataset) {
          throw new Error('The selected dataset is no longer available. Choose it again and retry.');
        }

        const datasetDetails = datasetList.slice(0, DETAILED_DATASET_LIMIT);
        if (selectedDataset && !datasetDetails.includes(selectedDataset)) {
          datasetDetails[datasetDetails.length - 1] = selectedDataset;
        }
        const detailedDatasetRequests = datasetDetails
          .map((dataset) => this.datasetService.getDataset(Number(dataset.id)));
        const datasetList$ = detailedDatasetRequests.length
          ? forkJoin(detailedDatasetRequests).pipe(
              map((details) => {
                const detailsById = new Map<number, any>();
                datasetDetails.forEach((dataset, index) => {
                  detailsById.set(Number(dataset.id), details[index]);
                });
                return datasetList.map((dataset) => {
                  const id = Number(dataset?.id);
                  const hasDetail = detailsById.has(id);
                  return summarizeDataset(detailsById.get(id), dataset, hasDetail);
                });
              })
            )
          : of(datasetList.map((dataset) => summarizeDataset(dataset, dataset, false)));

        const selectedScreen$ = selectedScreen
          ? this.screenService.getScreen(Number(selectedScreen.id))
          : of(undefined);

        return forkJoin({ formList: formList$, datasetList: datasetList$, selectedScreen: selectedScreen$ })
          .pipe(map(({ formList, datasetList, selectedScreen: screenDetail }) => {
            if (selection.screenId !== undefined && !isScreenDetail(screenDetail, selection.screenId)) {
              throw new Error('The selected screen could not be loaded. Choose it again and retry.');
            }
            const orderedDatasets = selection.datasetId === undefined
              ? datasetList
              : [
                  ...datasetList.filter((dataset) => dataset.id === selection.datasetId),
                  ...datasetList.filter((dataset) => dataset.id !== selection.datasetId),
                ];
            const entities: AssistantContextEntities = {
              forms: formList,
              datasets: orderedDatasets,
              dashboards: toSummaries(dashboards),
              screens: toScreenSummaries(screenList, selection.screenId, screenDetail),
              lookups: toSummaries(lookups),
              groups: toSummaries(groups),
              navigation: summarizeNavigation(navigation),
            };
            return {
              app: { id: appId, title: clampText(app.title), description: clampText(app.description) },
              entities,
              knowledge: assistantKnowledge(),
              selectedFormId: selection.formId,
              selectedDatasetId: selection.datasetId,
              selectedScreenId: selection.screenId,
            };
          }));
      })
    );
  }

  /** Sections, fields, and tabs of the form selected for incremental edits. */
  describeForm(formId: number, title: string): Observable<AssistantFormSummary> {
    return forkJoin({
      sections: this.formService.getSectionList(formId, 0),
      items: this.formService.getItemList(formId, { size: 9999, page: 0 }),
      tabs: this.formService.getTabList(formId, 0),
      form: this.formService.getForm(formId),
    }).pipe(map(({ sections, items, tabs, form }) => summarizeFormDetail(formId, title, sections, items, tabs, form)));
  }
}

function asList(response: any): any[] {
  return Array.isArray(response) ? response : (response?.content ?? []);
}

function isScreenDetail(screen: unknown, id: number): boolean {
  return typeof screen === 'object'
    && screen !== null
    && 'id' in screen
    && Number(screen.id) === id;
}

function toSummaries(list: any): AssistantEntitySummary[] {
  return asList(list)
    .filter((e) => e?.id)
    .map((e) => ({
      id: e.id,
      title: clampText(e.title),
      name: clampText(e.name),
      code: e.code,
      type: e.type,
    }));
}

function toScreenSummaries(
  list: any[],
  selectedScreenId: number | undefined,
  selectedScreen: any
): AssistantScreenSummary[] {
  const summaries = list
    .filter((screen) => screen?.id)
    .map((screen): AssistantScreenSummary => ({
      id: Number(screen.id),
      title: clampText(screen.title),
      name: clampText(screen.name),
      code: screen.code,
      type: screen.type,
      ...(Number(screen.id) === selectedScreenId
        ? { data: { content: selectedScreen?.data?.content, f: selectedScreen?.data?.f } }
        : {}),
    }));

  if (selectedScreenId === undefined) return summaries;
  return [
    ...summaries.filter((screen) => screen.id === selectedScreenId),
    ...summaries.filter((screen) => screen.id !== selectedScreenId),
  ];
}

function summarizeDataset(dataset: any, fallback: any, hasDetail: boolean): AssistantEntitySummary {
  const source = dataset ?? fallback;
  const sourceItems = asList(source.items);
  return {
    id: Number(source.id),
    title: clampText(source.title),
    code: source.code,
    type: source.type,
    items: sourceItems.slice(0, MAX_DATASET_ITEMS).map((item) => ({
      id: Number(item.id),
      label: clampText(item.label),
      code: item.code,
      type: item.type,
      sortOrder: item.sortOrder,
    })),
    ...(sourceItems.length > MAX_DATASET_ITEMS
      ? { itemsTruncated: sourceItems.length - MAX_DATASET_ITEMS }
      : {}),
    ...(
      !hasDetail || !Array.isArray(source.items) || sourceItems.length > MAX_DATASET_ITEMS
        ? { itemsMayBeIncomplete: true }
        : {}
    ),
  };
}

function summarizeNavigation(navigation: any): AssistantContextEntities['navigation'] {
  return asList(navigation)
    .filter((group) => group?.id)
    .map((group) => ({
      id: Number(group.id),
      title: clampText(group.title),
      items: asList(group.items).map((item) => ({
        id: Number(item.id),
        title: clampText(item.title),
        type: item.type,
        targetId: item.screenId,
        appId: item.appId,
        url: clampText(item.url),
      })),
    }));
}

function summarizeForm(form: any): AssistantFormSummary {
  return { id: Number(form.id), title: clampText(form.title) ?? '', code: form.code };
}

function summarizeFormDetail(formId: number, title: string, sections: any, items: any, tabs: any, form: any): AssistantFormSummary {
  const sectionList = asList(sections);
  const itemList = asList(items);
  const sectionsByItemCode = new Map<string, number[]>();
  const sectionItems = sectionList.map(() => [] as any[]);

  sectionList.forEach((section, sectionIndex) => {
    const codes = new Set<string>((section.items ?? []).map((sectionItem: any) => String(sectionItem.code)));
    codes.forEach((code) => {
      const sectionIndexes = sectionsByItemCode.get(code) ?? [];
      sectionIndexes.push(sectionIndex);
      sectionsByItemCode.set(code, sectionIndexes);
    });
  });
  itemList.forEach((item) => {
    for (const sectionIndex of sectionsByItemCode.get(String(item.code)) ?? []) {
      sectionItems[sectionIndex].push(item);
    }
  });

  return {
    id: formId,
    title: clampText(title) ?? '',
    onInit: clampText(form?.f),
    onSave: clampText(form?.onSave),
    onSubmit: clampText(form?.onSubmit),
    onView: clampText(form?.onView),
    tabs: asList(tabs).map((tab) => ({
      id: tab.id,
      title: clampText(tab.title),
      code: tab.code,
      pre: clampText(tab.pre),
      x: tab.x,
    })),
    tiers: asList(form?.tiers).map((tier) => ({
      id: Number(tier.id),
      name: clampText(tier.name),
      type: tier.type,
      sectionRef: tier.section?.id === undefined ? undefined : String(tier.section.id),
      approverGroupRef: tier.approverGroup === undefined ? undefined : String(tier.approverGroup),
      sortOrder: tier.sortOrder,
    })),
    sections: sectionList.map((s, sectionIndex) => {
      return {
        id: s.id,
        title: clampText(s.title),
        type: s.type,
        code: s.code,
        description: clampText(s.description),
        size: s.size,
        align: s.align,
        inline: s.inline,
        maxChild: s.maxChild,
        addLabel: clampText(s.addLabel),
        orderable: s.orderable,
        confirmable: s.confirmable,
        hideHeader: s.hideHeader,
        hidden: s.hidden,
        pre: clampText(s.pre),
        enabledFor: clampText(s.enabledFor),
        icon: clampText(s.icon),
        style: clampText(s.style),
        altClass: clampText(s.altClass),
        x: s.x,
        parentRef: String(s.parent?.id ?? s.parent ?? '-1'),
        items: sectionItems[sectionIndex].map((i) => ({
          id: i.id,
          label: clampText(i.label),
          code: i.code,
          type: i.type,
          subType: i.subType,
          required: i.v?.required,
          options: clampText(i.options),
        })),
      };
    }),
  };
}

/** Trims free text so one huge field cannot blow up the prompt. */
export function clampText(
  text: string | null | undefined,
  max = MAX_CONTEXT_TEXT_CHARS
): string | undefined {
  if (text === null || text === undefined) return undefined;
  const value = text;
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}
