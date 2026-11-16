import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { assistantKnowledge } from './assistant-knowledge';
import {
  AssistantContext,
  AssistantEntitySummary,
  AssistantFormSummary,
  AssistantContextEntities,
} from './assistant.types';

/** Forms that get their sections and fields described. Bounds the prompt size on large apps. */
const DETAILED_FORM_LIMIT = 40;

/** Fields the assistant may change are trimmed away - only what it needs to reason about is sent. */
const MAX_ITEM_DESCRIPTION = 400;

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

  build(app: { id: number; title?: string; description?: string }): Observable<AssistantContext> {
    const appId = app.id;

    return forkJoin({
      forms: this.formService.getListBasic({ appId, size: 9999, page: 0, sort: ['sortOrder,asc', 'id,asc'] })
        .pipe(catchError(() => of({ content: [] }))),
      datasets: this.datasetService.getDatasetList(appId).pipe(catchError(() => of([]))),
      dashboards: this.dashboardService.getDashboardList(appId).pipe(catchError(() => of([]))),
      screens: this.screenService.getScreenList(appId).pipe(catchError(() => of([]))),
    }).pipe(
      map(({ forms, datasets, dashboards, screens }) => {
        const listed: any = forms;
        const formList: any[] = listed?.content ?? listed ?? [];
        const entities: AssistantContextEntities = {
          forms: formList.slice(0, DETAILED_FORM_LIMIT).map(summarizeForm),
          datasets: toSummaries(datasets),
          dashboards: toSummaries(dashboards),
          screens: toSummaries(screens),
        };
        return {
          app: { id: appId, title: app.title, description: app.description },
          entities,
          knowledge: assistantKnowledge(),
        };
      })
    );
  }

  /** Sections and fields of one form, used when the creator targets a specific form. */
  describeForm(formId: number): Observable<AssistantFormSummary> {
    return forkJoin({
      sections: this.formService.getSectionList(formId, 0).pipe(catchError(() => of([]))),
      items: this.formService.getItemList(formId, { size: 9999, page: 0 }).pipe(catchError(() => of([]))),
    }).pipe(map(({ sections, items }) => summarizeFormDetail(formId, sections, items)));
  }
}

function toSummaries(list: any): AssistantEntitySummary[] {
  const arr: any[] = Array.isArray(list) ? list : (list?.content ?? []);
  return arr
    .filter((e) => e?.id)
    .map((e) => ({ id: e.id, title: e.title, code: e.code, type: e.type }));
}

function summarizeForm(form: any): AssistantFormSummary {
  return { id: form.id, title: form.title, code: form.code };
}

function summarizeFormDetail(formId: number, sections: any, items: any): AssistantFormSummary {
  const sectionList: any[] = Array.isArray(sections) ? sections : (sections?.content ?? []);
  const itemList: any[] = Array.isArray(items) ? items : (items?.content ?? []);

  return {
    id: formId,
    title: '',
    sections: sectionList.map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      items: itemList
        .filter((i) => (i.section?.id ?? i.sectionId) === s.id)
        .map((i) => ({ id: i.id, code: i.code, type: i.x?.extended ? `${i.type}.${i.subType}` : i.type })),
    })),
  };
}

/** Trims free text so one huge field cannot blow up the prompt. */
export function clampText(text: string, max = MAX_ITEM_DESCRIPTION): string {
  const value = text ?? '';
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}
