import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { finalize } from 'rxjs';
import { CommService } from '../../../_shared/service/comm.service';
import { AssistantService } from './assistant.service';
import { AssistantContextService } from './assistant-context.service';
import { ASSISTANT_MAX_PROMPT_CHARS } from './assistant-api.contract';
import { AssistantSettings, AssistantSettingsService } from './assistant-settings.service';
import { AssistantExecutorService } from './assistant-executor.service';
import { AssistantPlanCardComponent } from './assistant-plan-card.component';
import { buildAssistantHistoryWindow } from './assistant-history';
import {
  AssistantActionResult,
  AssistantApplyResult,
  AssistantChanged,
  AssistantChatMessage,
  AssistantPlanResponse,
} from './assistant.types';

/**
 * Right-side drawer where a creator describes what they want and reviews the proposed plan.
 * Nothing is written until the creator presses Apply.
 */
@Component({
  selector: 'app-assistant-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assistant-drawer.component.html',
  styleUrl: './assistant-drawer.component.scss',
  imports: [FaIconComponent, AssistantPlanCardComponent],
})
export class AssistantDrawerComponent implements OnInit {
  private assistant = inject(AssistantService);
  private settingsService = inject(AssistantSettingsService);
  private contextService = inject(AssistantContextService);
  private executor = inject(AssistantExecutorService);
  private commService = inject(CommService);
  private destroyRef = inject(DestroyRef);

  appId = input.required<number>();
  app = input<{ id: number; title?: string; description?: string } | null>(null);
  email = input.required<string>();
  currentFormId = input<number | null>(null);
  currentDatasetId = input<number | null>(null);
  currentScreenId = input<number | null>(null);

  open = model(false);
  changed = output<AssistantChanged>();

  readonly prompt = signal('');
  readonly settings = signal<AssistantSettings | null>(null);
  readonly settingsDraft = signal<AssistantSettings>({ apiBaseUrl: '', model: '', apiKey: '' });
  readonly settingsOpen = signal(false);
  readonly maxPromptChars = ASSISTANT_MAX_PROMPT_CHARS;
  readonly history = signal<AssistantChatMessage[]>([]);
  readonly omittedHistoryMessages = signal(0);
  readonly truncatedHistoryMessages = signal(0);
  readonly loading = signal(false);
  readonly prose = signal('');
  readonly error = signal('');

  readonly plan = signal<AssistantPlanResponse | null>(null);
  readonly included = signal<string[]>([]);
  readonly applying = signal(false);
  readonly result = signal<AssistantApplyResult | null>(null);

  readonly actions = computed(() => this.plan()?.actions ?? []);
  readonly warnings = computed(() => this.plan()?.warnings ?? []);
  readonly results = computed<AssistantActionResult[]>(() => this.result()?.results ?? []);
  readonly canSend = computed(() => {
    const length = this.prompt().trim().length;
    return length > 2
      && length <= ASSISTANT_MAX_PROMPT_CHARS
      && this.settings() !== null
      && !this.loading()
      && !this.applying();
  });
  readonly canApply = computed(() => this.included().length > 0 && !this.applying() && !this.result());

  readonly failedCount = computed(() => this.result()?.failed ?? 0);
  readonly doneCount = computed(() => this.results().filter((r) => r.status === 'done').length);

  ngOnInit() {
    try {
      const saved = this.settingsService.load(this.email());
      this.settings.set(saved);
      this.settingsDraft.set(saved
        ? { ...saved, apiKey: '' }
        : { apiBaseUrl: '', model: '', apiKey: '' });
      this.settingsOpen.set(!saved);
    } catch (e) {
      this.settingsOpen.set(true);
      this.error.set(e instanceof Error ? e.message : 'Saved assistant settings could not be loaded.');
    }
  }

  onSettingsInput(field: keyof AssistantSettings, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.settingsDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  saveSettings() {
    try {
      this.settingsService.save(this.email(), this.settingsDraft());
      const saved = this.settingsService.load(this.email());
      if (!saved) throw new Error('Assistant settings were not saved.');
      this.settings.set(saved);
      this.settingsDraft.set({ ...saved, apiKey: '' });
      this.settingsOpen.set(false);
      this.error.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Assistant settings could not be saved.');
    }
  }

  toggleSettings() {
    this.error.set('');
    this.settingsOpen.update((open) => !open);
  }

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
    const settings = this.settings();
    if (!settings) {
      this.settingsOpen.set(true);
      this.error.set('Configure the assistant API before sending a request.');
      return;
    }

    this.prompt.set('');
    this.error.set('');
    this.prose.set('');
    this.plan.set(null);
    this.result.set(null);
    this.loading.set(true);

    const previous = this.history();
    const historyWindow = buildAssistantHistoryWindow(previous);
    this.omittedHistoryMessages.set(historyWindow.omittedMessages);
    this.truncatedHistoryMessages.set(historyWindow.truncatedMessages);
    this.history.set([...previous, { role: 'user', content: question }]);

    this.contextService
      .build({ id: app.id, title: app.title, description: app.description }, {
        formId: this.currentFormId() ?? undefined,
        datasetId: this.currentDatasetId() ?? undefined,
        screenId: this.currentScreenId() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (context) => {
          this.assistant
            .planStream(this.appId(), { prompt: question, settings, history: historyWindow.messages, context })
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
      const warnings = plan.warnings ?? [];
      this.error.set(warnings.length
        ? `The assistant proposed no executable steps. ${warnings.join(' ')}`
        : 'The assistant did not propose any change it can apply. Try describing the screen or form in more detail.');
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
      if (outcome.failed) {
        this.error.set(`${outcome.failed} step(s) failed. The rest were applied; you can undo everything below.`);
      }
      if (outcome.results.some((r) => r.status === 'done')) {
        const summary = summarize(outcome);
        this.refreshEditors(summary, this.currentFormId());
        this.changed.emit(summary);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Applying the plan failed.');
    } finally {
      this.applying.set(false);
    }
  }

  reset() {
    this.history.set([]);
    this.omittedHistoryMessages.set(0);
    this.truncatedHistoryMessages.set(0);
    this.plan.set(null);
    this.result.set(null);
    this.prose.set('');
    this.error.set('');
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
  private refreshEditors(summary: AssistantChanged, formId: number | null) {
    if (summary.forms) this.commService.emitChange({ key: 'form', value: summary.forms });
    if (summary.forms && formId !== null) this.commService.emitChange({ key: 'form-detail', value: formId });
    if (summary.datasets) {
      this.commService.emitChange({ key: 'dataset', value: summary.datasets });
      this.commService.emitChange({ key: 'assistant-dataset', value: true });
    }
    if (summary.dashboards) this.commService.emitChange({ key: 'dashboard', value: summary.dashboards });
    if (summary.screens) {
      this.commService.emitChange({ key: 'screen', value: summary.screens });
      this.commService.emitChange({ key: 'assistant-screen', value: true });
    }
    if (summary.navigation) this.commService.emitChange({ key: 'assistant-navi', value: true });
  }
}

function summarize(outcome: AssistantApplyResult): AssistantChanged {
  const changed: AssistantChanged = { forms: 0, datasets: 0, dashboards: 0, screens: 0, navigation: 0 };
  for (const result of outcome.results) {
    if (result.status !== 'done') continue;
    switch (result.kind) {
      case 'create_form':
      case 'create_tab':
      case 'update_tab':
      case 'remove_tab':
      case 'assign_section_to_tab':
      case 'update_form':
      case 'add_section':
      case 'update_section':
      case 'add_section_item':
      case 'update_item':
      case 'remove_item':
      case 'remove_section':
      case 'create_tier':
      case 'update_tier':
      case 'remove_tier':
        changed.forms++;
        break;
      case 'create_dataset':
      case 'add_dataset_item':
      case 'update_dataset_item':
      case 'remove_dataset_item':
        changed.datasets++;
        break;
      case 'create_dashboard':
      case 'add_chart':
        changed.dashboards++;
        break;
      case 'create_screen':
      case 'add_screen_action':
      case 'update_screen':
      case 'remove_screen':
        changed.screens++;
        break;
      case 'create_navi_group':
      case 'update_navi_group':
      case 'remove_navi_group':
      case 'add_navi_item':
      case 'update_navi_item':
      case 'remove_navi_item':
        changed.navigation++;
        break;
    }
  }
  return changed;
}
