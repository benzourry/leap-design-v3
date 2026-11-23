// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// 
// LEAP is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// LEAP is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LEAP.  If not, see <http://www.gnu.org/licenses/>.

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { UserService } from '../_shared/service/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../_shared/service/toast-service';
// import { RunService } from '../service/run.service';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
// import { domainRegex } from '../_shared/constant.service';
import { SwPush } from '@angular/service-worker';
import { PushService } from '../_shared/service/push.service';
import { take, withLatestFrom } from 'rxjs/operators';
import { Subscription, switchMap, timer } from 'rxjs';
import { DatePipe, NgClass, PlatformLocation } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { PageTitleComponent } from '../_shared/component/page-title.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageTitleComponent } from '../run/_component/page-title.component';
import { RunService } from '../run/_service/run.service';
import { domainBase } from '../_shared/constant.service';
import { ThemeToggleComponent } from '../run/_component/theme-toggle.component';
import { AssistantProfile, AssistantProfileDraft, AssistantSettingsService } from '../design/editor/assistant/assistant-settings.service';

@Component({
    selector: 'app-devprofile',
    templateUrl: './devprofile.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./devprofile.component.css'],
    imports: [RouterLink, RouterLinkActive, FaIconComponent, NgClass, PageTitleComponent, FormsModule, DatePipe, ThemeToggleComponent]
})
export class DevProfileComponent implements OnInit {

  bgClassName: string = domainBase.replace(/\./g,'-');
  user: any;
  provider: any = {
    unimas: ['fas', 'university'],
    unimasid: ['fas', 'university'],
    icatsid: ['fas', 'university'],
    ssone: ['fas', 'university'],
    google: ['fab', 'google'],
    facebook: ['fab', 'facebook-f'],
    azuread: ['fab', 'microsoft'],
    twitter: ['fab', 'twitter'],
    github: ['fab', 'github'],
    linkedin: ['fab', 'linkedin'],
    local: ['far', 'envelope']
  }

  private userService = inject(UserService);
    private runService = inject(RunService);
    private swPush = inject(SwPush);
    private pushService = inject(PushService);
    private modalService = inject(NgbModal);
    private toastService = inject(ToastService);
    private assistantSettingsService = inject(AssistantSettingsService);
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);
    private destroyRef = inject(DestroyRef);
    private location = inject(PlatformLocation);

  constructor() { 
    this.destroyRef.onDestroy(() => this.modelLookup?.unsubscribe());
    this.destroyRef.onDestroy(this.location.onPopState(() => this.modalService.dismissAll('')));
    effect(()=>{
      this.app = this.runService.$app();
    })
  }

  appId: number;
  app: any;
  actualSub: any;
  ngOnInit() {
    this.userService.getCreator()
      .subscribe(user => {
        this.user = user;
        this.cdr.detectChanges();
        this.loadAssistants();

        this.route.url.pipe(
          withLatestFrom(this.route.parent.params, this.route.params)
        ).subscribe(([url, p, c]) => {
          var appId = p.appId || c.appId;
          // this.app = this.runService.app;
          this.appId = appId;
          if (appId) {
            this.loadNotif(appId, this.user.email);
          }
          this.cdr.detectChanges();
        });
        this.loadSubscription();
      });

    this.swPush.subscription
      .pipe(take(1))
      .subscribe(sub => {
        this.actualSub = sub;
        this.cdr.detectChanges();
      })
  }

  notif: any;
  openNotif(tpl, data) {
    this.notif = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' })
      .result.then(res => {
        this.runService.markNotification(res.id, this.user.email)
          .subscribe({
            next: (res2) => {
              this.loadNotif(this.appId, this.user.email);
              this.cdr.detectChanges();
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
              this.cdr.detectChanges();
            }
          });
      }, res => { });
  }

  notifList: any = [];
  loadNotif(appId, email) {
    this.runService.getNotification(appId, email)
      .subscribe(res => {
        this.notifList = res.content;
        this.cdr.detectChanges();
      })
  }

  hasProp = (obj) => Object.keys(obj).length > 0;

  revokeTerm() {
    this.runService.onceDone(this.appId, this.user.email, false)
      .subscribe(user => {
        this.user = user;
        this.userService.setUser(user);
        this.cdr.detectChanges();
        this.logout();
      })
  }

  removeAcc() {
    this.runService.removeAcc(-1, this.user.email)
      .subscribe(user => {
        this.toastService.show("Your account has been successfully removed", { classname: 'bg-success text-light' });
        this.cdr.detectChanges();
        this.logout();
      })
  }

  pushSubs: any = [];
  loadSubscription() {
    this.pushService.getSubscription(this.user.id)
      .subscribe(subs => {
        this.pushSubs = subs;
        this.cdr.detectChanges();
      })
  }

  unsubscribeToNotifications(endpoint) {

    this.pushService.unsubscribePush(endpoint)
      .subscribe(res => {
        this.loadSubscription();
        this.cdr.detectChanges();

        this.swPush.subscription
          .pipe(take(1))
          .subscribe(pushSubscription => {

            if (pushSubscription.endpoint == endpoint) {
              pushSubscription.unsubscribe()
                .then(sub => { })
                .catch(err => console.error("Could not unsubscribe to notifications", err));
            }
          });

      });


  }

  changePwdData: any = {};
  changePwd(content) {
    this.changePwdData = { email: this.user.email, appId: this.appId || -1 };

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(res => {
        this.userService.changePwd(res)
          .subscribe({
            next: (res) => {
              this.toastService.show(res.message, { classname: 'bg-success text-light' });
              this.cdr.detectChanges();
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
              this.cdr.detectChanges();
            }
          })
      }, res => { });
  }

  logout() {
    var provider = this.user.provider;
    this.userService.logout();
    if (provider == 'unimas') {
      location.href="https://identity.unimas.my/logout?redirect_uri="+location.href;
    }

  }

  cleanText = (str) => str.replace(/<\/?[^>]+(>|$)/g, " ");

  assistants: AssistantProfile[] = [];
  editingAssistantId: number | null = null;
  assistantDraft: AssistantProfileDraft = this.emptyAssistantDraft();
  assistantProvider = '';
  readonly assistantModels = signal<string[]>([]);
  readonly modelsLoading = signal(false);
  readonly modelsMessage = signal('');
  private modelLookup?: Subscription;
  private savedAssistantUrl = '';
  readonly assistantBaseUrlSuggestions = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1' },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
    { name: 'Requesty', url: 'https://router.requesty.ai/v1' },
    { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
    { name: 'Groq', url: 'https://api.groq.com/openai/v1' },
    { name: 'Together AI', url: 'https://api.together.xyz/v1' },
    { name: 'Mistral', url: 'https://api.mistral.ai/v1' },
    { name: 'Google Gemini (OpenAI-compatible)', url: 'https://generativelanguage.googleapis.com/v1beta/openai/' },
  ];

  private emptyAssistantDraft(): AssistantProfileDraft {
    return {
      name: '',
      apiBaseUrl: '',
      model: '',
      apiKey: '',
      additionalInstructions: '',
      maxActions: 60,
    };
  }

  loadAssistants() {
    this.assistantSettingsService.list(this.user.email).subscribe({
      next: (assistants) => {
        this.assistants = assistants;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show(this.assistantError(err, 'Assistant profiles could not be loaded.'), {
          classname: 'bg-danger text-light',
        });
        this.cdr.detectChanges();
      },
    });
  }

  addAssistant(tpl: any) {
    this.clearModelLookup();
    this.editingAssistantId = null;
    this.savedAssistantUrl = '';
    this.assistantDraft = this.emptyAssistantDraft();
    this.assistantProvider = '';
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' }).result.then(
      (draft) => { this.clearModelLookup(); this.saveAssistant(draft); },
      () => this.clearModelLookup()
    );
  }

  editAssistant(tpl: any, assistant: AssistantProfile) {
    this.clearModelLookup();
    this.editingAssistantId = assistant.id;
    this.savedAssistantUrl = this.normalizeAssistantUrl(assistant.apiBaseUrl);
    this.assistantDraft = {
      name: assistant.name,
      apiBaseUrl: assistant.apiBaseUrl,
      model: assistant.model,
      apiKey: '',
      additionalInstructions: assistant.additionalInstructions,
      maxActions: assistant.maxActions,
    };
    this.assistantProvider = this.assistantBaseUrlSuggestions.find(
      provider => this.normalizeAssistantUrl(provider.url) === this.savedAssistantUrl
    )?.url ?? 'custom';
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' }).result.then(
      (draft) => { this.clearModelLookup(); this.saveAssistant(draft); },
      () => this.clearModelLookup()
    );
    this.loadAssistantModels();
  }

  assistantProviderChanged() {
    this.assistantDraft.apiBaseUrl = this.assistantProvider === 'custom' ? '' : this.assistantProvider;
    this.assistantUrlChanged();
    if (this.assistantProvider !== 'custom') {
      this.assistantUrlConfirmed();
    }
  }

  assistantUrlChanged() {
    this.clearModelLookup();
  }

  assistantUrlConfirmed() {
    if (!this.assistantDraft.apiKey.trim()) {
      if (this.canLoadAssistantModels()) {
        this.loadAssistantModels();
      } else if (this.editingAssistantId !== null) {
        this.modelsMessage.set('Enter an API key for this URL to load models.');
      }
    } else {
      this.modelsMessage.set('Confirm the API key belongs to this provider, then select Load models.');
    }
  }

  assistantKeyChanged() {
    this.clearModelLookup();
    this.loadAssistantModels();
  }

  canLoadAssistantModels(): boolean {
    try {
      const url = new URL(this.assistantDraft.apiBaseUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        return false;
      }
      return !!this.assistantDraft.apiKey.trim()
        || (this.editingAssistantId !== null
          && this.normalizeAssistantUrl(this.assistantDraft.apiBaseUrl) === this.savedAssistantUrl);
    } catch {
      return false;
    }
  }

  loadAssistantModels() {
    this.clearModelLookup();
    if (!this.canLoadAssistantModels()) return;

    const { apiBaseUrl, apiKey } = this.assistantDraft;
    const assistantId = this.editingAssistantId;
    this.modelsLoading.set(true);
    this.modelLookup = timer(600).pipe(
      switchMap(() => this.assistantSettingsService.models(apiBaseUrl, apiKey, assistantId))
    ).subscribe({
      next: (models) => {
        this.assistantModels.set(models);
        this.modelsLoading.set(false);
        if (!models.length) this.modelsMessage.set('No models were returned. You can enter a model manually.');
      },
      error: () => {
        this.modelsLoading.set(false);
        this.modelsMessage.set('Could not load models for this provider. Check the URL and API key, or enter a model manually.');
      },
    });
  }

  private clearModelLookup() {
    this.modelLookup?.unsubscribe();
    this.assistantModels.set([]);
    this.modelsLoading.set(false);
    this.modelsMessage.set('');
  }

  private normalizeAssistantUrl(url: string): string {
    return url.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  }

  saveAssistant(draft: AssistantProfileDraft) {
    const request = this.editingAssistantId === null
      ? this.assistantSettingsService.create(draft)
      : this.assistantSettingsService.update(this.editingAssistantId, draft);
    request.subscribe({
      next: () => {
        this.loadAssistants();
        this.toastService.show('Assistant saved.', { classname: 'bg-success text-light' });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show(this.assistantError(err, 'Assistant could not be saved.'), {
          classname: 'bg-danger text-light',
        });
        this.cdr.detectChanges();
      },
    });
  }

  selectAssistant(assistant: AssistantProfile) {
    this.assistantSettingsService.select(assistant.id).subscribe({
      next: () => this.loadAssistants(),
      error: (err) => {
        this.toastService.show(this.assistantError(err, 'Assistant selection could not be saved.'), {
          classname: 'bg-danger text-light',
        });
        this.cdr.detectChanges();
      },
    });
  }

  deleteAssistant(assistant: AssistantProfile) {
    if (!confirm(`Delete the assistant "${assistant.name}"?`)) return;
    this.assistantSettingsService.delete(assistant.id).subscribe({
      next: () => {
        this.loadAssistants();
        this.toastService.show('Assistant deleted.', { classname: 'bg-success text-light' });
      },
      error: (err) => {
        this.toastService.show(this.assistantError(err, 'Assistant could not be deleted.'), {
          classname: 'bg-danger text-light',
        });
        this.cdr.detectChanges();
      },
    });
  }

  private assistantError(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message;
    if (typeof err !== 'object' || err === null || !('error' in err)) return fallback;
    const detail = err.error;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail !== null && 'message' in detail
      && typeof detail.message === 'string') return detail.message;
    return fallback;
  }

}