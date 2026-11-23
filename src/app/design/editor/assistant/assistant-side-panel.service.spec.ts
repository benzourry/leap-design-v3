import { TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ViewportService } from '../../../_shared/service/viewport.service';
import { AssistantSidePanelService } from './assistant-side-panel.service';

describe('AssistantSidePanelService', () => {
  const mobile = signal(false);

  beforeEach(() => {
    mobile.set(false);
    TestBed.configureTestingModule({
      providers: [
        AssistantSidePanelService,
        { provide: ViewportService, useValue: { isMobile: mobile } },
      ],
    });
  });

  it('opens a newly registered palette by default', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    const owner = {};

    service.registerPalette(owner, {} as TemplateRef<unknown>);

    expect(service.expanded()).toBeTrue();
    expect(service.activeTab()).toBe('palette');
    expect(service.palette()).not.toBeNull();
  });

  it('keeps a newly registered palette hidden by default on mobile', () => {
    mobile.set(true);
    const service = TestBed.inject(AssistantSidePanelService);

    service.registerPalette({}, {} as TemplateRef<unknown>);

    expect(service.expanded()).toBeFalse();
    expect(service.activeTab()).toBe('palette');
  });

  it('falls back to the assistant without accepting stale cleanup', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    const activeOwner = {};

    service.registerPalette(activeOwner, {} as TemplateRef<unknown>);
    service.unregisterPalette({});

    expect(service.palette()).not.toBeNull();
    expect(service.activeTab()).toBe('palette');

    service.unregisterPalette(activeOwner);

    expect(service.palette()).toBeNull();
    expect(service.activeTab()).toBe('assistant');
  });

  it('closes after removing the palette when the assistant is not configured', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    const owner = {};

    service.registerPalette(owner, {} as TemplateRef<unknown>);
    service.setAssistantConfigured(false);
    service.unregisterPalette(owner);

    expect(service.expanded()).toBeFalse();
    expect(service.palette()).toBeNull();
  });

  it('closes once an unconfigured assistant is resolved after removing the palette', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    const owner = {};

    service.registerPalette(owner, {} as TemplateRef<unknown>);
    service.unregisterPalette(owner);
    service.setAssistantConfigured(false);

    expect(service.expanded()).toBeFalse();
  });

  it('keeps an explicitly opened unconfigured assistant expanded', () => {
    const service = TestBed.inject(AssistantSidePanelService);

    service.open('assistant');
    service.setAssistantConfigured(false);

    expect(service.expanded()).toBeTrue();
  });

  it('keeps the assistant open after removing the palette when configured', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    const owner = {};

    service.registerPalette(owner, {} as TemplateRef<unknown>);
    service.setAssistantConfigured(true);
    service.unregisterPalette(owner);

    expect(service.expanded()).toBeTrue();
  });

  it('opens the requested tab while preserving a collapsed palette registration', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    service.registerPalette({}, {} as TemplateRef<unknown>);
    service.close();

    service.open('assistant');

    expect(service.expanded()).toBeTrue();
    expect(service.activeTab()).toBe('assistant');
    expect(service.palette()).not.toBeNull();
  });

  it('collapses the palette on mobile when a drag starts', () => {
    mobile.set(true);
    const service = TestBed.inject(AssistantSidePanelService);
    service.expanded.set(true);

    service.collapseForPaletteDrag();

    expect(service.expanded()).toBeFalse();
  });

  it('adds a history entry when opened on mobile and closes it on Back', () => {
    mobile.set(true);
    const pushState = spyOn(window.history, 'pushState');
    const service = TestBed.inject(AssistantSidePanelService);

    service.open('assistant');

    expect(service.expanded()).toBeTrue();
    expect(pushState).toHaveBeenCalled();

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(service.expanded()).toBeFalse();
  });

  it('uses Back to remove the mobile panel history entry when closed', () => {
    mobile.set(true);
    const pushState = spyOn(window.history, 'pushState');
    spyOnProperty(window.history, 'state', 'get').and.returnValue({ assistantSidePanel: true });
    const back = spyOn(window.history, 'back');
    const service = TestBed.inject(AssistantSidePanelService);

    service.open('assistant');
    service.close();

    expect(pushState).toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
    expect(service.expanded()).toBeFalse();
  });

  it('keeps the desktop palette open when a drag starts', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    service.expanded.set(true);

    service.collapseForPaletteDrag();

    expect(service.expanded()).toBeTrue();
  });

  it('toggles an active tab closed and opens it again', () => {
    const service = TestBed.inject(AssistantSidePanelService);

    service.toggle('assistant');
    expect(service.expanded()).toBeTrue();

    service.toggle('assistant');
    expect(service.expanded()).toBeFalse();

    service.toggle('assistant');
    expect(service.expanded()).toBeTrue();
  });

  it('hides the right panel when switching to a mobile viewport', () => {
    const service = TestBed.inject(AssistantSidePanelService);
    service.open('assistant');
    TestBed.tick();

    mobile.set(true);
    TestBed.tick();

    expect(service.expanded()).toBeFalse();
  });
});
