import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ASSISTANT_API } from './assistant-api.contract';
import { AssistantProfile, AssistantSettingsService } from './assistant-settings.service';

describe('AssistantSettingsService', () => {
  let service: AssistantSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssistantSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads profiles without returning their API keys', () => {
    const profiles: AssistantProfile[] = [{
      id: 8,
      name: 'OpenAI',
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      additionalInstructions: '',
      maxActions: 20,
      selected: true,
      apiKeyConfigured: true,
    }];

    let response: AssistantProfile[] | undefined;
    service.list('creator@example.com').subscribe((value) => response = value);
    const request = http.expectOne(ASSISTANT_API.profiles());
    expect(request.request.method).toBe('GET');
    request.flush(profiles);

    expect(response).toEqual(profiles);
    expect(JSON.stringify(response)).not.toContain('"apiKey":');
  });

  it('moves a legacy browser setting to the database once a profile is requested', () => {
    localStorage.setItem('leap-assistant-settings:creator@example.com', JSON.stringify({
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      apiKey: 'legacy-key',
    }));

    service.list('creator@example.com').subscribe();
    const listRequest = http.expectOne(ASSISTANT_API.profiles());
    listRequest.flush([]);
    const createRequest = http.expectOne(ASSISTANT_API.profiles());
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body.apiKey).toBe('legacy-key');
    createRequest.flush({
      id: 3,
      name: 'Migrated assistant',
      apiBaseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      additionalInstructions: '',
      maxActions: 60,
      selected: true,
      apiKeyConfigured: true,
    });
    const refreshRequest = http.expectOne(ASSISTANT_API.profiles());
    refreshRequest.flush([]);

    expect(localStorage.getItem('leap-assistant-settings:creator@example.com')).toBeNull();
  });

  it('requests models for the specified provider without requiring a saved profile', () => {
    let models: string[] | undefined;
    service.models('https://api.openai.com/v1', 'key', null).subscribe((value) => models = value);
    const request = http.expectOne(ASSISTANT_API.models());
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      apiBaseUrl: 'https://api.openai.com/v1', apiKey: 'key', assistantId: null,
    });
    request.flush(['gpt-4o']);
    expect(models).toEqual(['gpt-4o']);
  });
});
