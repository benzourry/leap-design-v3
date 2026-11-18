import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AssistantAction, AssistantActionResult } from './assistant.types';

interface ActionView {
  id: string;
  kind: string;
  icon: string;
  title: string;
  detail: string;
  destructive: boolean;
  status?: string;
  error?: string;
  blockedReason?: string;
}

/**
 * Review list for a proposed plan. Purely presentational: the drawer owns the selection and the
 * apply call, this component only renders and reports clicks.
 */
@Component({
  selector: 'app-assistant-plan-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  styles: [`
    :host { display: block; }
    .step { display: flex; gap: .6rem; padding: .5rem .6rem; border: 1px solid var(--bs-border-color); border-radius: .5rem; margin-bottom: .4rem; align-items: flex-start; }
    .step.is-skipped { opacity: .55; }
    .step.is-destructive { border-color: var(--bs-danger-border-subtle); background: var(--bs-danger-bg-subtle); }
    .step.is-blocked { border-color: var(--bs-warning-border-subtle); background: var(--bs-warning-bg-subtle); }
    .step-icon { width: 1.2rem; display: flex; justify-content: center; padding-top: .15rem; }
    .step-body { flex: 1 1 auto; min-width: 0; }
    .step-title { font-weight: 600; font-size: .875rem; overflow-wrap: anywhere; }
    .step-detail { font-size: .78rem; color: var(--bs-secondary-color); overflow-wrap: anywhere; }
    .step-note { font-size: .78rem; font-style: italic; color: var(--bs-secondary-color); }
  `],
  template: `
    @for (step of views(); track step.id) {
      <label class="step" [class.is-skipped]="!isIncluded(step.id)" [class.is-destructive]="step.destructive"
        [class.is-blocked]="!!step.blockedReason">
        <input type="checkbox" class="form-check-input mt-1" [checked]="isIncluded(step.id)"
          [disabled]="busy() || waitingForResponse() || !!step.blockedReason" (change)="toggle.emit(step.id)">
        <span class="step-icon">
          <fa-icon [icon]="['fas', step.icon]" [fixedWidth]="true"></fa-icon>
        </span>
        <span class="step-body">
          <span class="step-title d-block">{{ step.title }}</span>
          @if (step.detail) {
            <span class="step-detail d-block">{{ step.detail }}</span>
          }
          @if (step.destructive) {
            <span class="step-detail d-block text-danger">Needs your confirmation: existing content is removed.</span>
          }
          @if (step.blockedReason) {
            <span class="step-detail d-block text-warning-emphasis">{{ step.blockedReason }}</span>
          }
          @if (step.error) {
            <span class="step-detail d-block text-danger">{{ step.error }}</span>
          }
        </span>
      </label>
    }
  `,
})
export class AssistantPlanCardComponent {
  actions = input.required<AssistantAction[]>();
  included = input<string[]>([]);
  results = input<AssistantActionResult[]>([]);
  busy = input<boolean>(false);
  blockedReasons = input<Record<string, string>>({});
  waitingForResponse = input<boolean>(false);

  toggle = output<string>();

  views = computed<ActionView[]>(() =>
    this.actions().map((action) => {
      const result = this.results().find((r) => r.actionId === action.id);
      const view = describe(action);
      return {
        id: action.id,
        ...view,
        status: result?.status,
        error: result?.error,
        blockedReason: this.blockedReasons()[action.id],
      };
    })
  );

  isIncluded(id: string) {
    return this.included().includes(id);
  }
}

const TITLES: Record<string, { icon: string; verb: string }> = {
  create_form: { icon: 'plus-square', verb: 'Create form' },
  create_tab: { icon: 'folder-plus', verb: 'Create tab' },
  update_tab: { icon: 'pen', verb: 'Change tab' },
  remove_tab: { icon: 'trash', verb: 'Remove tab' },
  assign_section_to_tab: { icon: 'folder-open', verb: 'Move section to tab' },
  update_form: { icon: 'pen', verb: 'Change form' },
  add_section: { icon: 'layer-group', verb: 'Add section' },
  update_section: { icon: 'pen', verb: 'Change section' },
  add_section_item: { icon: 'plus', verb: 'Add field' },
  update_item: { icon: 'pen', verb: 'Change field' },
  remove_item: { icon: 'trash', verb: 'Delete field' },
  remove_section: { icon: 'trash', verb: 'Delete section' },
  create_tier: { icon: 'layer-group', verb: 'Add process tier' },
  update_tier: { icon: 'pen', verb: 'Change process tier' },
  remove_tier: { icon: 'trash', verb: 'Remove process tier' },
  create_dataset: { icon: 'list', verb: 'Create dataset' },
  add_dataset_item: { icon: 'plus', verb: 'Add dataset item' },
  update_dataset_item: { icon: 'pen', verb: 'Change dataset item' },
  remove_dataset_item: { icon: 'trash', verb: 'Remove dataset item' },
  create_dashboard: { icon: 'tachometer-alt', verb: 'Create dashboard' },
  add_chart: { icon: 'chart-bar', verb: 'Add chart' },
  create_screen: { icon: 'file', verb: 'Create screen' },
  add_screen_action: { icon: 'bolt', verb: 'Add screen action' },
  update_screen: { icon: 'pen', verb: 'Change screen' },
  remove_screen: { icon: 'trash', verb: 'Delete screen' },
  create_navi_group: { icon: 'folder-plus', verb: 'Add navigation group' },
  update_navi_group: { icon: 'pen', verb: 'Change navigation group' },
  remove_navi_group: { icon: 'trash', verb: 'Remove navigation group' },
  add_navi_item: { icon: 'plus', verb: 'Add navigation item' },
  update_navi_item: { icon: 'pen', verb: 'Change navigation item' },
  remove_navi_item: { icon: 'trash', verb: 'Remove navigation item' },
};

function describe(action: AssistantAction): Omit<ActionView, 'id' | 'status' | 'error'> {
  const meta = TITLES[action.kind] ?? { icon: 'circle', verb: action.kind };
  const payload: any = (action as any).payload ?? {};
  const subject: string = action.title ?? payload.title ?? payload.label ?? payload.name ?? payload.patch?.title ?? payload.patch?.name ?? '';
  const title = subject ? `${meta.verb}: ${subject}` : meta.verb;

  const details: string[] = [];
  if (payload.type) details.push(payload.subType ? `${payload.type} / ${payload.subType}` : String(payload.type));
  if (payload.size) details.push(String(payload.size));
  if (payload.formRef) details.push(`form ${payload.formRef}`);
  if (payload.sectionRef) details.push(`section ${payload.sectionRef}`);
  if (payload.dashboardRef) details.push(`dashboard ${payload.dashboardRef}`);
  if (payload.screenRef) details.push(`screen ${payload.screenRef}`);
  if (action.note) details.push(action.note);

  return {
    kind: action.kind,
    icon: meta.icon,
    title,
    detail: details.join(' · '),
    destructive: action.destructive === true || action.kind.startsWith('remove_'),
  };
}
