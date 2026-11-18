import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { RouterLink } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { CommService } from '../../../_shared/service/comm.service';
import { AssistantService } from './assistant.service';
import { AssistantContextService } from './assistant-context.service';
import {
  ASSISTANT_MAX_ATTACHMENT_BYTES,
  ASSISTANT_MAX_ATTACHMENT_TOTAL_BYTES,
  ASSISTANT_MAX_ATTACHMENTS,
  ASSISTANT_MAX_PROMPT_CHARS,
} from './assistant-api.contract';
import { AssistantProfile, AssistantSettingsService } from './assistant-settings.service';
import { AssistantExecutorService } from './assistant-executor.service';
import { AssistantPlanCardComponent } from './assistant-plan-card.component';
import {
  getAssistantActionBlockReason,
  getAssistantActionDescendants,
  getDefaultAssistantActionSelection,
} from './assistant-dependencies';
import { buildAssistantHistoryWindow } from './assistant-history';
import {
  AssistantActionResult,
  AssistantApplyResult,
  AssistantAttachment,
  AssistantChanged,
  AssistantChatMessage,
  AssistantPromptEntity,
  AssistantPromptEntityOption,
  AssistantPromptEntityType,
  AssistantPlanResponse,
} from './assistant.types';
import { compileTpl } from '../../../_shared/utils';

/**
 * Right-side drawer where a creator describes what they want and reviews the proposed plan.
 * Nothing is written until the creator presses Apply.
 */
@Component({
  selector: 'app-assistant-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './assistant-drawer.component.html', 
  styleUrl: './assistant-drawer.component.scss',
  imports: [FaIconComponent, AssistantPlanCardComponent, RouterLink, TitleCasePipe],
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
  readonly attachments = signal<File[]>([]);
  readonly entityTypes: { type: AssistantPromptEntityType; label: string }[] = [
    { type: 'form', label: 'Form' },
    { type: 'dataset', label: 'Dataset' },
    { type: 'dashboard', label: 'Dashboard' },
    { type: 'screen', label: 'Screen' },
    { type: 'navigation', label: 'Navigation' },
  ];
  readonly entityPickerOpen = signal(false);
  readonly entityPickerType = signal<AssistantPromptEntityType | null>(null);
  readonly entityPickerOptions = signal<AssistantPromptEntityOption[]>([]);
  readonly entityPickerLoading = signal(false);
  readonly entityPickerError = signal('');
  readonly includedEntities = signal<AssistantPromptEntity[]>([]);
  readonly maxAttachments = ASSISTANT_MAX_ATTACHMENTS;
  readonly settings = signal<AssistantProfile | null>(null);
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
  readonly warnings = computed(() => (this.plan()?.warnings ?? []).map(friendlyAssistantWarning));
  readonly results = computed<AssistantActionResult[]>(() => this.result()?.results ?? []);
  readonly needsUserInput = computed(() => {
    const plan = this.plan();
    return plan?.needsUserInput === true || !!plan?.clarificationQuestion?.trim();
  });
  readonly clarificationQuestion = computed(() => this.plan()?.clarificationQuestion?.trim() ?? '');
  readonly actionBlockReasons = computed<Record<string, string>>(() => {
    const reasons: Record<string, string> = {};
    const actions = this.actions();
    const included = this.included();
    for (const action of actions) {
      const reason = getAssistantActionBlockReason(action.id, actions, included);
      if (reason) reasons[action.id] = reason;
    }
    return reasons;
  });
  readonly blockedActionCount = computed(() => Object.keys(this.actionBlockReasons()).length);
  readonly canSend = computed(() => {
    const length = this.prompt().trim().length;
    return length > 2
      && length <= ASSISTANT_MAX_PROMPT_CHARS
      && this.settings() !== null
      && !this.loading()
      && !this.entityPickerLoading()
      && !this.applying();
  });
  readonly canApply = computed(() => {
    const included = this.included();
    const blocked = this.actionBlockReasons();
    return this.plan() !== null
      && included.length > 0
      && !this.needsUserInput()
      && included.every((id) => !blocked[id])
      && !this.applying()
      && !this.result();
  });

  readonly failedCount = computed(() => this.result()?.failed ?? 0);
  readonly doneCount = computed(() => this.results().filter((r) => r.status === 'done').length);

  ngOnInit() {
    this.settingsService.list(this.email())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profiles) => {
          this.settings.set(profiles.find((profile) => profile.selected) ?? null);
          if (!this.settings()) this.error.set('Add and select an assistant in your developer profile first.');
        },
        error: (e) => this.error.set(e instanceof Error
          ? e.message
          : 'Assistant profiles could not be loaded. Try again later.'),
      });
  }

  onInput(event: Event) {
    this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  openFilePicker(input: HTMLInputElement) {
    input.click();
  }

  toggleEntityPicker() {
    this.entityPickerOpen.update((open) => !open);
    this.entityPickerType.set(null);
    this.entityPickerOptions.set([]);
    this.entityPickerError.set('');
  }

  selectEntityType(type: AssistantPromptEntityType) {
    this.entityPickerType.set(type);
    this.entityPickerOptions.set([]);
    this.entityPickerError.set('');
    this.entityPickerLoading.set(true);
    this.contextService.listPromptEntityOptions(this.appId(), type)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.entityPickerLoading.set(false))
      )
      .subscribe({
        next: (options) => this.entityPickerOptions.set(options),
        error: (e) => this.entityPickerError.set(
          e instanceof Error ? e.message : `Could not load ${type} components.`
        ),
      });
  }

  async includeEntity(option: AssistantPromptEntityOption) {
    const type = this.entityPickerType();
    if (!type || this.entityPickerLoading()) return;
    this.entityPickerLoading.set(true);
    this.entityPickerError.set('');
    try {
      const data = await firstValueFrom(this.contextService.getPromptEntity(this.appId(), type, option.id));
      const entity: AssistantPromptEntity = { type, id: option.id, label: option.label, data };
      if (!this.includedEntities().some((included) => included.type === type && included.id === option.id)) {
        this.includedEntities.update((included) => [...included, entity]);
      }
      this.entityPickerOpen.set(false);
      this.entityPickerType.set(null);
      this.entityPickerOptions.set([]);
    } catch (e) {
      this.entityPickerError.set(e instanceof Error ? e.message : `Could not load ${option.label}.`);
    } finally {
      this.entityPickerLoading.set(false);
    }
  }

  removeIncludedEntity(type: AssistantPromptEntityType, id: number) {
    this.includedEntities.update((entities) =>
      entities.filter((entity) => entity.type !== type || entity.id !== id)
    );
  }

  isEntityIncluded(type: AssistantPromptEntityType, id: number): boolean {
    return this.includedEntities().some((entity) => entity.type === type && entity.id === id);
  }

  backToEntityTypes() {
    if (this.entityPickerLoading()) return;
    this.entityPickerType.set(null);
    this.entityPickerOptions.set([]);
    this.entityPickerError.set('');
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    this.error.set('');

    const attachments = [...this.attachments()];
    let totalBytes = attachments.reduce((total, file) => total + file.size, 0);
    for (const file of selected) {
      if (!supportedAttachmentType(file)) {
        this.error.set(`${file.name} is not supported. Attach a PDF or PNG, JPEG, GIF, or WebP image.`);
        continue;
      }
      if (file.size > ASSISTANT_MAX_ATTACHMENT_BYTES) {
        this.error.set(`${file.name} exceeds the 4 MB per-file limit.`);
        continue;
      }
      if (attachments.length >= ASSISTANT_MAX_ATTACHMENTS) {
        this.error.set(`Attach no more than ${ASSISTANT_MAX_ATTACHMENTS} files.`);
        break;
      }
      if (totalBytes + file.size > ASSISTANT_MAX_ATTACHMENT_TOTAL_BYTES) {
        this.error.set('Attachments cannot exceed 8 MB total.');
        continue;
      }
      attachments.push(file);
      totalBytes += file.size;
    }
    this.attachments.set(attachments);
  }

  removeAttachment(index: number) {
    this.attachments.update((files) => files.filter((_, fileIndex) => fileIndex !== index));
  }

  onKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && this.canSend()) {
      event.preventDefault();
      this.send();
    }
  }

  async send() {
    if (!this.canSend()) return;
    const question = this.prompt().trim();
    const app = this.app() ?? { id: this.appId() };
    const settings = this.settings();
    if (!settings) {
      this.error.set('Add and select an assistant in your developer profile before sending a request.');
      return;
    }

    this.error.set('');
    this.prose.set('');
    this.plan.set(null);
    this.result.set(null);
    this.loading.set(true);

    let attachments: AssistantAttachment[];
    try {
      attachments = await Promise.all(this.attachments().map(readAttachment));
    } catch (e) {
      this.loading.set(false);
      this.error.set(e instanceof Error ? e.message : 'Could not read the selected attachment.');
      return;
    }

    this.prompt.set('');
    const attachedFiles = this.attachments();
    const includedEntities = this.includedEntities();
    this.attachments.set([]);
    this.includedEntities.set([]);
    this.entityPickerOpen.set(false);
    this.entityPickerType.set(null);
    const previous = this.history();
    const historyWindow = buildAssistantHistoryWindow(previous);
    this.omittedHistoryMessages.set(historyWindow.omittedMessages);
    this.truncatedHistoryMessages.set(historyWindow.truncatedMessages);
    this.history.set([
      ...previous,
      {
        role: 'user',
        content: [
          question,
          includedEntities.length
            ? `Included components: ${includedEntities.map((entity) => `${entity.type} "${entity.label}" (ID ${entity.id})`).join(', ')}`
            : '',
          attachedFiles.length ? `Attachments: ${attachedFiles.map((file) => file.name).join(', ')}` : '',
        ].filter(Boolean).join('\n\n'),
      },
    ]);

    this.contextService
      .build({ id: app.id, title: app.title, description: app.description }, {
        formId: this.currentFormId() ?? undefined,
        datasetId: this.currentDatasetId() ?? undefined,
        screenId: this.currentScreenId() ?? undefined,
        includedFormIds: includedEntities
          .filter((entity) => entity.type === 'form')
          .map((entity) => entity.id),
      }, question, includedEntities)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (context) => {
          this.assistant
            .planStream(this.appId(), {
              prompt: question,
              assistantId: settings.id,
              history: historyWindow.messages,
              context,
              attachments,
            })
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              finalize(() => this.loading.set(false))
            )
            .subscribe((event) => {
              if (event.type === 'delta') {
                this.prose.set(compileTpl('<x-markdown>' + event.text.trim() + '</x-markdown>', {}, 'ai-assistant'));
                // this.prose.set(event.text.trim());
                return;
              }
              if (event.type === 'error') {
                this.error.set(event.message.trim());
                return;
              }
              this.acceptPlan(event.plan);
            });
        },
        error: (e) => {
          this.loading.set(false);
          this.error.set(e instanceof Error ? e.message : 'Could not read the app structure. Try again.');
        },
      });
  }

  // private acceptPlan(plan: AssistantPlanResponse) {
  //   this.prose.set(plan.message || this.prose());
  //   this.plan.set(plan);
  //   this.included.set(plan.actions.filter((a) => !a.destructive && !a.kind.startsWith('remove_')).map((a) => a.id));
    
  //   this.history.set([
  //     ...this.history(),
  //     { role: 'assistant', content: compileTpl('<x-markdown>' + plan.message.trim() + '</x-markdown>', {}, 'ai-assistant') || `${plan.actions.length} step(s) proposed.` },
  //   ]);
  //   if (!plan.actions.length) {
  //     const warnings = plan.warnings ?? [];
  //     this.error.set(warnings.length
  //       ? `The assistant proposed no executable steps. ${warnings.join(' ')}`
  //       : 'The assistant did not propose any change it can apply. Try describing the screen or form in more detail.');
  //   }
  // }

  private acceptPlan(plan: AssistantPlanResponse) {
    this.prose.set(plan.message || this.prose());
    this.plan.set(plan);
    this.included.set(getDefaultAssistantActionSelection(plan.actions));

    const assistantMessage = this.needsUserInput()
      ? this.clarificationQuestion() || this.prose().trim() || 'The assistant needs one more detail before it can finish this plan.'
      : compileTpl('<x-markdown>' + plan.message.trim() + '</x-markdown>', {}, 'ai-assistant')
        || (plan.actions.length ? `${plan.actions.length} step(s) proposed.` : 'Analysis complete.');

    this.history.set([
      ...this.history(),
      { role: 'assistant', content: assistantMessage },
    ]);

    // Only show an error if there are actual warnings from the backend, 
    // rather than defaulting to an error just because actions are empty.
    // if (!plan.actions.length && plan.warnings?.length) {
    //   this.error.set(plan.warnings.join(' '));
    // }
  }

  toggle(id: string) {
    const actions = this.actions();
    const selected = this.included();
    if (selected.includes(id)) {
      const descendants = getAssistantActionDescendants(id, actions);
      this.included.set(selected.filter((actionId) => !descendants.has(actionId)));
      return;
    }
    if (this.needsUserInput() || getAssistantActionBlockReason(id, actions, selected)) return;
    this.included.set([...selected, id]);
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
        requiresResponse: this.needsUserInput(),
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

  compileTpl = compileTpl;

  reset() {
    this.history.set([]);
    this.attachments.set([]);
    this.includedEntities.set([]);
    this.entityPickerOpen.set(false);
    this.entityPickerType.set(null);
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

function supportedAttachmentType(file: File): boolean {
  const type = file.type.toLowerCase();
  if (['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(type)) return true;
  if (type) return false;
  return /\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name);
}

function readAttachment(file: File): Promise<AssistantAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const separator = dataUrl.indexOf(',');
      if (separator < 0) {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      resolve({
        name: file.name,
        mimeType: normalizedAttachmentType(file),
        dataBase64: dataUrl.slice(separator + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}

function normalizedAttachmentType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return '';
  }
}

function friendlyAssistantWarning(warning: string): string {
  if (warning.includes('These steps point at something that is not in the plan:')) {
    return 'Some steps need another step first, but it is missing or out of order. Ask the assistant to update the plan before applying.';
  }
  if (/proposed step\(s\) were dropped/i.test(warning)) {
    return 'The assistant could not prepare some steps. Ask it to revise the plan before applying.';
  }
  return warning;
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
