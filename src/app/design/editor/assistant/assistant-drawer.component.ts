import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { finalize } from 'rxjs';
import { AppService } from '../../../service/app.service';
import { CommService } from '../../../_shared/service/comm.service';
import { AssistantService } from './assistant.service';
import { AssistantContextService } from './assistant-context.service';
import { AssistantExecutorService } from './assistant-executor.service';
import { AssistantPlanCardComponent } from './assistant-plan-card.component';
import {
  AssistantActionResult,
  AssistantApplyResult,
  AssistantChanged,
  AssistantChatMessage,
  AssistantPlanResponse,
} from './assistant.types';

/**
 * Right-side drawer where a creator describes what they want and reviews the proposed plan.
 * Nothing is written until the creator presses Apply; Apply always starts with a restore point.
 */
@Component({
  selector: 'app-assistant-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assistant-drawer.component.html',
  styleUrl: './assistant-drawer.component.scss',
  imports: [FaIconComponent, AssistantPlanCardComponent],
})
export class AssistantDrawerComponent {
  private assistant = inject(AssistantService);
  private contextService = inject(AssistantContextService);
  private executor = inject(AssistantExecutorService);
  private appService = inject(AppService);
  private commService = inject(CommService);
  private destroyRef = inject(DestroyRef);

  appId = input.required<number>();
  app = input<{ id: number; title?: string; description?: string } | null>(null);
  email = input.required<string>();

  open = model(false);
  changed = output<AssistantChanged>();

  readonly prompt = signal('');
  readonly history = signal<AssistantChatMessage[]>([]);
  readonly loading = signal(false);
  readonly prose = signal('');
  readonly error = signal('');

  readonly plan = signal<AssistantPlanResponse | null>(null);
  readonly included = signal<string[]>([]);
  readonly applying = signal(false);
  readonly result = signal<AssistantApplyResult | null>(null);
  readonly restorePointId = signal<number | null>(null);
  readonly undone = signal(false);
  private appliedSummary = signal<AssistantChanged | null>(null);

  readonly actions = computed(() => this.plan()?.actions ?? []);
  readonly warnings = computed(() => this.plan()?.warnings ?? []);
  readonly results = computed<AssistantActionResult[]>(() => this.result()?.results ?? []);
  readonly canSend = computed(() => this.prompt().trim().length > 2 && !this.loading() && !this.applying());
  readonly canApply = computed(() => this.included().length > 0 && !this.applying() && !this.result());

  readonly failedCount = computed(() => this.result()?.failed ?? 0);
  readonly doneCount = computed(() => this.results().filter((r) => r.status === 'done').length);

  onInput(event: Event) {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && this.canSend()) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    if (!this.canSend()) return;
    const question = this.prompt().trim();
    const app = this.app() ?? { id: this.appId() };

    this.prompt.set('');
    this.error.set('');
    this.prose.set('');
    this.plan.set(null);
    this.result.set(null);
    this.restorePointId.set(null);
    this.undone.set(false);
    this.loading.set(true);

    const previous = this.history();
    this.history.set([...previous, { role: 'user', content: question }]);

    this.contextService
      .build({ id: app.id, title: app.title, description: app.description })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (context) => {
          this.assistant
            .planStream(this.appId(), { prompt: question, email: this.email(), history: previous, context })
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              finalize(() => this.loading.set(false))
            )
            .subscribe((event) => {
              if (event.type === 'delta') {
                this.prose.set(event.text);
                return;
              }
              if (event.type === 'error') {
                this.error.set(event.message);
                return;
              }
              this.acceptPlan(event.plan);
            });
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not read the app structure. Try again.');
        },
      });
  }

  private acceptPlan(plan: AssistantPlanResponse) {
    this.prose.set(plan.message || this.prose());
    this.plan.set(plan);
    this.included.set(plan.actions.filter((a) => !a.destructive && !a.kind.startsWith('remove_')).map((a) => a.id));
    this.history.set([
      ...this.history(),
      { role: 'assistant', content: plan.message || `${plan.actions.length} step(s) proposed.` },
    ]);
    if (!plan.actions.length) {
      this.error.set('The assistant did not propose any change it can apply. Try describing the screen or form in more detail.');
    }
  }

  toggle(id: string) {
    this.included.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async apply() {
    const plan = this.plan();
    if (!plan || !this.canApply()) return;

    this.applying.set(true);
    this.error.set('');
    try {
      const selected = this.included();
      const outcome = await this.executor.apply(this.appId(), plan.actions, {
        includeIds: selected,
        // Ticking a destructive step IS the confirmation.
        confirmedIds: selected,
        email: this.email(),
      });
      this.result.set(outcome);
      this.restorePointId.set(outcome.restorePointId ?? null);
      if (outcome.failed) {
        this.error.set(`${outcome.failed} step(s) failed. The rest were applied; you can undo everything below.`);
      }
      if (outcome.results.some((r) => r.status === 'done')) {
        const summary = summarize(outcome);
        this.appliedSummary.set(summary);
        this.refreshEditors(summary);
        this.changed.emit(summary);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Applying the plan failed.');
    } finally {
      this.applying.set(false);
    }
  }

  undo() {
    const id = this.restorePointId();
    if (!id || this.undone()) return;
    this.applying.set(true);
    this.appService
      .goRestorePoint(id, false)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applying.set(false))
      )
      .subscribe({
        next: () => {
          this.undone.set(true);
          const summary = this.appliedSummary() ?? { forms: 1, datasets: 1, dashboards: 1, screens: 1 };
          this.refreshEditors(summary);
          this.changed.emit(summary);
        },
        error: () => this.error.set('Undo failed. Restore the point manually from Restore Manager.'),
      });
  }

  reset() {
    this.history.set([]);
    this.plan.set(null);
    this.result.set(null);
    this.prose.set('');
    this.error.set('');
    this.restorePointId.set(null);
    this.undone.set(false);
    this.appliedSummary.set(null);
  }

  /** Drops the proposal but keeps the conversation, so the creator can rephrase. */
  discard() {
    this.plan.set(null);
    this.result.set(null);
    this.error.set('');
  }

  close() {
    this.open.set(false);
  }

  /** Ask the design editors to refetch the lists the assistant touched. */
  private refreshEditors(summary: AssistantChanged) {
    if (summary.forms) this.commService.emitChange({ key: 'form', value: summary.forms });
    if (summary.datasets) this.commService.emitChange({ key: 'dataset', value: summary.datasets });
    if (summary.dashboards) this.commService.emitChange({ key: 'dashboard', value: summary.dashboards });
    if (summary.screens) this.commService.emitChange({ key: 'screen', value: summary.screens });
  }
}

function summarize(outcome: AssistantApplyResult): AssistantChanged {
  const changed: AssistantChanged = { forms: 0, datasets: 0, dashboards: 0, screens: 0 };
  for (const result of outcome.results) {
    if (result.status !== 'done') continue;
    switch (result.kind) {
      case 'create_form':
      case 'create_tab':
      case 'add_section':
      case 'add_section_item':
      case 'update_item':
      case 'remove_item':
      case 'remove_section':
        changed.forms++;
        break;
      case 'create_dataset':
        changed.datasets++;
        break;
      case 'create_dashboard':
      case 'add_chart':
        changed.dashboards++;
        break;
      case 'create_screen':
      case 'update_screen':
      case 'remove_screen':
        changed.screens++;
        break;
    }
  }
  return changed;
}
