import { TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
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
import { AssistantLocalContext } from './assistant-local-context.service';
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
  localContext = input<AssistantLocalContext>({ type: 'app' });

  changed = output<AssistantChanged>();
  configured = output<boolean>();

  readonly prompt = signal('');
  readonly attachments = signal<File[]>([]);
  readonly draggingFiles = signal(false);
  readonly entityTypes: { type: AssistantPromptEntityType; label: string }[] = [
    { type: 'form', label: 'Form' },
    { type: 'dataset', label: 'Dataset' },
    { type: 'dashboard', label: 'Dashboard' },
    { type: 'screen', label: 'Screen' },
    { type: 'lookup', label: 'Lookup' },
    { type: 'navigation', label: 'Navigation' },
    { type: 'lambda', label: 'Lambda' },
    { type: 'email-template', label: 'Email template' },
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

  readonly currentFormId = computed(() => {
    const context = this.localContext();
    return context.type === 'form' ? context.id : null;
  });
  readonly contextDescription = computed(() => {
    const context = this.localContext();
    switch (context.type) {
      case 'form':
        return `Using the open form${context.label ? ` "${context.label}"` : ''}.`;
      case 'dataset':
        return `Using the open dataset${context.label ? ` "${context.label}"` : ''}.`;
      case 'dashboard':
        return `Using the open dashboard${context.label ? ` "${context.label}"` : ''}.`;
      case 'screen':
        return `Using the open screen${context.label ? ` "${context.label}"` : ''}.`;
      case 'lookup':
        return `Using the open lookup${context.label ? ` "${context.label}"` : ''}, including its entries.`;
      case 'navigation':
        return 'Using the navigation currently open in the editor.';
      case 'lambda':
        return `Using the open Lambda${context.label ? ` "${context.label}"` : ''}, including its source and bindings.`;
      case 'email-template':
        return `Using the open email template${context.label ? ` "${context.label}"` : ''}.`;
      default:
        return 'Using the current app context.';
    }
  });

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

  readonly doneCount = computed(() => this.results().filter((r) => r.status === 'done').length);
  private lastAppId: number | null = null;

  constructor() {
    effect(() => {
      const appId = this.appId();
      if (this.lastAppId !== null && this.lastAppId !== appId) {
        this.reset();
        this.loading.set(false);
        this.applying.set(false);
      }
      this.lastAppId = appId;
    });
  }

  ngOnInit() {
    this.settingsService.list(this.email())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profiles) => {
          this.settings.set(profiles.find((profile) => profile.selected) ?? null);
          this.configured.emit(this.settings() !== null);
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
    this.addAttachments(selected);
  }

  onDragOver(event: DragEvent) {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = this.loading() || this.applying() ? 'none' : 'copy';
    this.draggingFiles.set(!this.loading() && !this.applying());
  }

  onDragLeave(event: DragEvent) {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
    this.draggingFiles.set(false);
  }

  onDrop(event: DragEvent) {
    this.draggingFiles.set(false);
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    if (this.loading() || this.applying()) {
      this.error.set('Wait until the assistant finishes before adding attachments.');
      return;
    }
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) {
      this.error.set('No files could be read from the drop. Attach files rather than folders.');
      return;
    }
    this.addAttachments(files);
  }

  onPaste(event: ClipboardEvent) {
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const files = Array.from(clipboard.files);
    if (!files.length) {
      for (const item of Array.from(clipboard.items)) {
        if (item.kind !== 'file') continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (!files.length) return;
    if (!clipboard.types.includes('text/plain')) event.preventDefault();
    if (this.loading() || this.applying()) {
      this.error.set('Wait until the assistant finishes before adding attachments.');
      return;
    }
    this.addAttachments(files);
  }

  private addAttachments(selected: File[]) {
    if (!selected.length) return;
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
    const requestAppId = this.appId();
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
      if (this.appId() !== requestAppId) return;
      this.loading.set(false);
      this.error.set(e instanceof Error ? e.message : 'Could not read the selected attachment.');
      return;
    }
    if (this.appId() !== requestAppId) return;

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
        formId: localId(this.localContext(), 'form'),
        datasetId: localId(this.localContext(), 'dataset'),
        dashboardId: localId(this.localContext(), 'dashboard'),
        screenId: localId(this.localContext(), 'screen'),
        lookupId: localId(this.localContext(), 'lookup'),
        lambdaId: localId(this.localContext(), 'lambda'),
        emailTemplateId: localId(this.localContext(), 'email-template'),
        includedFormIds: includedEntities
          .filter((entity) => entity.type === 'form')
          .map((entity) => entity.id),
      }, question, includedEntities)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (context) => {
          if (this.appId() !== requestAppId) return;
          this.assistant
            .planStream(requestAppId, {
              prompt: question,
              assistantId: settings.id,
              history: historyWindow.messages,
              context,
              attachments,
            })
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              finalize(() => {
                if (this.appId() === requestAppId) this.loading.set(false);
              })
            )
            .subscribe((event) => {
              if (this.appId() !== requestAppId) return;
              if (event.type === 'delta') {
                this.prose.set(compileTpl('<x-markdown>' + event.text.trim() + '</x-markdown>', {}, 'ai-assistant'));
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
          if (this.appId() !== requestAppId) return;
          this.loading.set(false);
          this.error.set(e instanceof Error ? e.message : 'Could not read the app structure. Try again.');
        },
      });
  }

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
    const requestAppId = this.appId();

    this.applying.set(true);
    this.error.set('');
    try {
      const selected = this.included();
      const outcome = await this.executor.apply(requestAppId, plan.actions, {
        includeIds: selected,
        // Ticking a destructive step IS the confirmation.
        confirmedIds: selected,
        requiresResponse: this.needsUserInput(),
        email: this.email(),
      });
      if (this.appId() !== requestAppId) return;
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
      if (this.appId() === requestAppId) {
        this.error.set(e instanceof Error ? e.message : 'Applying the plan failed.');
      }
    } finally {
      if (this.appId() === requestAppId) this.applying.set(false);
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
    if (summary.lambdas) this.commService.emitChange({ key: 'assistant-lambda', value: true });
    if (summary.emailTemplates) this.commService.emitChange({ key: 'assistant-mailer', value: true });
    if (summary.lookups) this.commService.emitChange({ key: 'assistant-lookup', value: true });
  }
}

function supportedAttachmentType(file: File): boolean {
  const type = file.type.toLowerCase();
  if (['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(type)) return true;
  if (type) return false;
  return /\.(pdf|png|jpe?g|gif|webp)$/i.test(file.name);
}

function localId(
  context: AssistantLocalContext,
  type: Exclude<AssistantLocalContext['type'], 'app' | 'navigation'>
): number | undefined {
  return context.type === type && 'id' in context ? context.id : undefined;
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
  const changed: AssistantChanged = {
    forms: 0, datasets: 0, dashboards: 0, screens: 0, navigation: 0, lambdas: 0,
    emailTemplates: 0, lookups: 0,
  };
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
      case 'add_tier_action':
      case 'update_tier_action':
      case 'remove_tier_action':
        changed.forms++;
        break;
      case 'create_dataset':
      case 'add_dataset_item':
      case 'update_dataset_item':
      case 'remove_dataset_item':
      case 'add_dataset_action':
      case 'update_dataset_action':
      case 'remove_dataset_action':
      case 'add_dataset_filter':
      case 'update_dataset_filter':
      case 'remove_dataset_filter':
        changed.datasets++;
        break;
      case 'create_lookup':
      case 'update_lookup':
      case 'add_lookup_entry':
      case 'update_lookup_entry':
      case 'delete_lookup_entry':
        changed.lookups++;
        break;
      case 'create_dashboard':
      case 'add_chart':
        changed.dashboards++;
        break;
      case 'create_screen':
      case 'add_screen_action':
      case 'update_screen_action':
      case 'remove_screen_action':
      case 'update_screen':
      case 'remove_screen':
        changed.screens++;
        break;
      case 'create_lambda':
      case 'update_lambda':
      case 'remove_lambda':
      case 'add_lambda_binding':
      case 'remove_lambda_binding':
        changed.lambdas++;
        break;
      case 'create_email_template':
      case 'update_email_template':
      case 'remove_email_template':
        changed.emailTemplates++;
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
