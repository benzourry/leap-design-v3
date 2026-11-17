import { AssistantSettingsService } from './assistant-settings.service';

describe('AssistantSettingsService', () => {
  let service: AssistantSettingsService;

  beforeEach(() => {
    localStorage.clear();
    service = new AssistantSettingsService();
  });

  afterEach(() => localStorage.clear());

  it('keeps assistant settings separate for each creator', () => {
    service.save('creator@example.com', {
      apiBaseUrl: 'https://one.example/v1',
      model: 'model-one',
      apiKey: 'key-one',
    });
    service.save('other@example.com', {
      apiBaseUrl: 'https://two.example/v1',
      model: 'model-two',
      apiKey: 'key-two',
    });

    expect(service.load('creator@example.com')?.model).toBe('model-one');
    expect(service.load('other@example.com')?.model).toBe('model-two');
  });

  it('retains the saved API key when the creator updates other settings', () => {
    service.save('creator@example.com', {
      apiBaseUrl: 'https://provider.example/v1',
      model: 'old-model',
      apiKey: 'saved-key',
    });

    service.save('creator@example.com', {
      apiBaseUrl: 'https://provider.example/v1',
      model: 'new-model',
      apiKey: '',
    });

    expect(service.load('creator@example.com')).toEqual({
      apiBaseUrl: 'https://provider.example/v1',
      model: 'new-model',
      apiKey: 'saved-key',
    });
  });
});
