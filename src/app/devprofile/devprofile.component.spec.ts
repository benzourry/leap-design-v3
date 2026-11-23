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

  beforeEach(() => {
    jasmine.clock().install();
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
        { provide: NgbModal, useValue: { open: () => ({ result: new Promise(() => {}) }) } },
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
});
