import { AssistantLocalContextService } from './assistant-local-context.service';

describe('AssistantLocalContextService', () => {
  it('publishes the active editor entity and clears it on route destruction', () => {
    const service = new AssistantLocalContextService();
    const registration = service.createRegistration();

    registration.set({ type: 'form', id: 7, label: 'Leave request' });

    expect(service.context()).toEqual({
      type: 'form',
      id: 7,
      label: 'Leave request',
    });

    registration.clear();

    expect(service.context()).toEqual({ type: 'app' });
  });

  it('does not let an old editor registration clear a newer route context', () => {
    const service = new AssistantLocalContextService();
    const oldRegistration = service.createRegistration();
    const newRegistration = service.createRegistration();

    oldRegistration.set({ type: 'form', id: 7 });
    newRegistration.set({ type: 'screen', id: 8 });
    oldRegistration.clear();

    expect(service.context()).toEqual({ type: 'screen', id: 8 });
  });
});
