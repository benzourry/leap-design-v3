import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, catchError, filter, map, of, throwError } from 'rxjs';
import { ASSISTANT_API, ASSISTANT_MAX_ACTIONS } from './assistant-api.contract';
import {
  AssistantHealth,
  AssistantPlanRequest,
  AssistantPlanResponse,
  AssistantActionKind,
  AssistantAction,
} from './assistant.types';

/** Marks where the prose ends and the JSON plan starts inside a streamed response. */
const PLAN_MARKER = '<!--PLAN-->';

export type AssistantStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'plan'; plan: AssistantPlanResponse }
  | { type: 'error'; message: string };

const KNOWN_KINDS: AssistantActionKind[] = [
  'create_form',
  'create_tab',
  'update_tab',
  'remove_tab',
  'assign_section_to_tab',
  'update_form',
  'add_section',
  'update_section',
  'add_section_item',
  'update_item',
  'remove_item',
  'remove_section',
  'create_tier',
  'update_tier',
  'remove_tier',
  'create_dataset',
  'add_dataset_item',
  'update_dataset_item',
  'remove_dataset_item',
  'create_dashboard',
  'add_chart',
  'create_screen',
  'add_screen_action',
  'update_screen',
  'remove_screen',
  'create_navi_group',
  'update_navi_group',
  'remove_navi_group',
  'add_navi_item',
  'update_navi_item',
  'remove_navi_item',
];

/**
 * Talks to the /assistant/* endpoints. No app data is mutated here - see AssistantExecutorService.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  /** Probe used to hide the assistant entirely when the deployment has no backend support. */
  health(): Observable<AssistantHealth> {
    return this.http.get<AssistantHealth>(ASSISTANT_API.health()).pipe(
      map((h) => ({ ...h, enabled: h?.enabled !== false })),
      catchError(() => of({ enabled: false }))
    );
  }

  plan(appId: number, request: AssistantPlanRequest): Observable<AssistantPlanResponse> {
    return this.http.post<AssistantPlanResponse>(ASSISTANT_API.plan(appId), request).pipe(
      map((res) => sanitizePlan(res)),
      catchError((err) => throwError(() => new Error(describeError(err))))
    );
  }

  /**
   * Streams the answer. Emits the prose so far on every chunk and the parsed plan once, at the end.
   * Backend contract: `<prose>` optionally followed by `<!--PLAN-->` and the JSON plan.
   */
  planStream(appId: number, request: AssistantPlanRequest): Observable<AssistantStreamEvent> {
    const req = new HttpRequest('POST', ASSISTANT_API.planStream(appId), request, {
      responseType: 'text',
      reportProgress: true,
    });

    return this.http.request<string>(req).pipe(
      filter((event: HttpEvent<string>) => event.type !== HttpEventType.Sent),
      map((event): AssistantStreamEvent | null => {
        if (event.type === HttpEventType.DownloadProgress || event.type === HttpEventType.UploadProgress) {
          const raw = (event as { partialText?: string }).partialText ?? '';
          return raw ? { type: 'delta', text: proseOf(raw) } : null;
        }
        if (event.type === HttpEventType.Response) {
          const raw = typeof event.body === 'string' ? event.body : '';
          const json = raw.includes(PLAN_MARKER) ? raw.slice(raw.indexOf(PLAN_MARKER) + PLAN_MARKER.length) : raw;
          return { type: 'plan', plan: sanitizePlan(parsePlan(json), proseOf(raw)) };
        }
        return null;
      }),
      filter((e): e is AssistantStreamEvent => e !== null),
      catchError((err) => of<AssistantStreamEvent>({ type: 'error', message: describeError(err) }))
    );
  }
}

function proseOf(raw: string): string {
  const idx = raw.indexOf(PLAN_MARKER);
  return idx < 0 ? raw : raw.slice(0, idx);
}

function parsePlan(raw: string): AssistantPlanResponse {
  const text = (raw ?? '').trim();
  if (!text) return { message: '', actions: [] };
  // Models sometimes wrap JSON in a fenced block.
  const json = text.startsWith('```') ? text.replace(/^```[a-z]*\s*/i, '').replace(/```$/, '') : text;
  try {
    return JSON.parse(json) as AssistantPlanResponse;
  } catch {
    return { message: text, actions: [], warnings: ['The assistant returned data that could not be read.'] };
  }
}

/**
 * Drops actions this build cannot execute and caps the plan size. Keeping the filter here means the
 * executor never has to defend against unknown kinds.
 */
function sanitizePlan(plan: AssistantPlanResponse | null | undefined, prose = ''): AssistantPlanResponse {
  const actions = Array.isArray(plan?.actions) ? plan.actions : [];
  const seen = new Set<string>();
  const valid = actions
    .filter((a) => a && typeof a.id === 'string' && KNOWN_KINDS.includes(a.kind) && a.payload && typeof a.payload === 'object')
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .slice(0, ASSISTANT_MAX_ACTIONS) as AssistantAction[];

  const warnings = [...(plan?.warnings ?? [])];
  if (valid.length < actions.length) {
    warnings.push(`${actions.length - valid.length} proposed step(s) were ignored because this version cannot apply them.`);
  }
  return { planId: plan?.planId, message: plan?.message || prose || '', actions: valid, warnings };
}

function describeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the assistant service. Check your connection and try again.';
    if (err.status === 401 || err.status === 403) return 'You are not allowed to use the assistant on this app.';
    if (err.status === 404) return 'The assistant service is not deployed for this environment.';
    const detail = typeof err.error === 'string' ? err.error : err.error?.message;
    return detail || `The assistant service returned an error (${err.status}).`;
  }
  return err instanceof Error ? err.message : 'The assistant request failed.';
}
