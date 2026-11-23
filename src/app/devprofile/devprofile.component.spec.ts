import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NEVER, Subject } from 'rxjs';

import { PushService } from '../_shared/service/push.service';
import { ToastService } from '../_shared/service/toast-service';
import { UserService } from '../_shared/service/user.service';
import { AssistantProfile, AssistantSettingsService } from '../design/editor/assistant/assistant-settings.service';
import { RunService } from '../run/_service/run.service';
import { DevProfileComponent } from './devprofile.component';

describe('DevProfileComponent model lookup', () => {
  let component: DevProfileComponent;
  let fixture: ComponentFixture<DevProfileComponent>;
  let settings: jasmine.SpyObj<AssistantSettingsService>;
  let openModal: jasmine.Spy;
  let dismissAll: jasmine.Spy;

  beforeEach(() => {
    jasmine.clock().install();
    spyOn(window.history, 'pushState');
    openModal = jasmine.createSpy('open').and.returnValue({
      result: new Promise(() => {}),
    });
    dismissAll = jasmine.createSpy('dismissAll');
    settings = jasmine.createSpyObj<AssistantSettingsService>('AssistantSettingsService', ['models']);
    TestBed.configureTestingModule({
      imports: [DevProfileComponent],
      providers: [
        { provide: UserService, useValue: { getCreator: () => NEVER } },
        { provide: RunService, useValue: { $app: signal(null) } },
        { provide: SwPush, useValue: { subscription: NEVER } },
        { provide: PushService, useValue: {} },
        { provide: ToastService, useValue: {} },
        { provide: ActivatedRoute, useValue: {} },
        { provide: AssistantSettingsService, useValue: settings },
        { provide: NgbModal, useValue: { open: openModal, dismissAll } },
      ],
    });
    TestBed.overrideComponent(DevProfileComponent, { set: { template: '' } });
    fixture = TestBed.createComponent(DevProfileComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => jasmine.clock().uninstall());

  it('clears and cancels previous suggestions when the provider changes', () => {
    const first = new Subject<string[]>();
    const second = new Subject<string[]>();
    settings.models.and.returnValues(first, second);
    component.assistantDraft.apiBaseUrl = 'https://api.openai.com/v1';
    component.assistantDraft.apiKey = 'key';
    component.assistantKeyChanged();
    jasmine.clock().tick(600);

    component.assistantDraft.apiBaseUrl = 'https://other.example/v1';
    component.assistantUrlChanged();
    expect(component.assistantModels()).toEqual([]);
    first.next(['old-model']);
    expect(component.assistantModels()).toEqual([]);
    component.assistantUrlConfirmed();
    expect(settings.models.calls.count()).toBe(1);
    component.loadAssistantModels();
    jasmine.clock().tick(600);
    second.next(['other-model']);
    expect(component.assistantModels()).toEqual(['other-model']);
    expect(settings.models.calls.mostRecent().args[0]).toBe('https://other.example/v1');
  });

  it('does not use a saved key for a changed provider URL', () => {
    settings.models.and.returnValue(new Subject<string[]>());
    const assistant: AssistantProfile = {
      id: 5, name: 'Test', apiBaseUrl: 'https://api.openai.com/v1', model: 'gpt',
      additionalInstructions: '', maxActions: 10, selected: true, apiKeyConfigured: true,
    };
    component.editAssistant(null, assistant);
    jasmine.clock().tick(600);
    expect(settings.models).toHaveBeenCalledWith('https://api.openai.com/v1', '', 5);

    component.assistantDraft.apiBaseUrl = 'https://other.example/v1';
    component.assistantUrlChanged();
    component.assistantUrlConfirmed();
    jasmine.clock().tick(600);
    expect(settings.models.calls.count()).toBe(1);
    expect(component.modelsMessage()).toContain('Enter an API key');
  });

  it('selects a built-in provider and clears stale model suggestions', () => {
    component.assistantModels.set(['old-model']);
    component.assistantProvider = 'https://api.openai.com/v1';
    component.assistantProviderChanged();

    expect(component.assistantDraft.apiBaseUrl).toBe('https://api.openai.com/v1');
    expect(component.assistantModels()).toEqual([]);
    component.assistantProvider = 'custom';
    component.assistantProviderChanged();
    expect(component.assistantDraft.apiBaseUrl).toBe('');
  });

  it('preserves custom URLs and recognizes normalized built-in URLs when editing', () => {
    const assistant: AssistantProfile = {
      id: 5, name: 'Test', apiBaseUrl: 'https://other.example/v1', model: 'model',
      additionalInstructions: '', maxActions: 10, selected: true, apiKeyConfigured: true,
    };
    settings.models.and.returnValue(NEVER);
    component.editAssistant(null, assistant);
    expect(component.assistantProvider).toBe('custom');
    expect(component.assistantDraft.apiBaseUrl).toBe(assistant.apiBaseUrl);

    assistant.apiBaseUrl = 'https://api.openai.com/v1/';
    component.editAssistant(null, assistant);
    expect(component.assistantProvider).toBe('https://api.openai.com/v1');
    expect(component.assistantDraft.apiBaseUrl).toBe(assistant.apiBaseUrl);
  });

  for (const mode of ['add', 'edit'] as const) {
    it(`dismisses the ${mode} assistant form on browser back without saving`, async () => {
      let rejectModal: (reason?: unknown) => void = () => {};
      const result = new Promise((_, reject) => { rejectModal = reject; });
      dismissAll.and.callFake(() => rejectModal());
      openModal.and.returnValue({ result });
      const save = spyOn(component, 'saveAssistant');
      settings.models.and.returnValue(NEVER);

      if (mode === 'add') {
        component.addAssistant(null);
      } else {
        component.editAssistant(null, {
          id: 5, name: 'Test', apiBaseUrl: 'https://api.openai.com/v1', model: 'gpt',
          additionalInstructions: '', maxActions: 10, selected: true, apiKeyConfigured: true,
        });
      }

      expect(window.history.pushState).toHaveBeenCalledWith(null, null, window.location.href);
      window.dispatchEvent(new PopStateEvent('popstate'));
      await result.catch(() => {});
      expect(dismissAll).toHaveBeenCalledTimes(1);
      expect(save).not.toHaveBeenCalled();
      expect(component.modelsLoading()).toBeFalse();
    });
  }
});
