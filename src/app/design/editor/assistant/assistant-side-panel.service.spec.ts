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
