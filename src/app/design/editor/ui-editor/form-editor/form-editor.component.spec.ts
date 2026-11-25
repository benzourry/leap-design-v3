import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { Clipboard } from '@angular/cdk/clipboard';
import { By } from '@angular/platform-browser';
import { NgbModal, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { FormEditorComponent } from './form-editor.component';
import { ProcessEditorComponent } from './process-editor/process-editor.component';
import { EditorIdChipComponent } from '../editor-id-chip.component';
import { ToastService } from '../../../../_shared/service/toast-service';
import { SharedModule } from '../../../../_shared/shared.module';
import { FormService } from '../../../../service/form.service';

describe('FormEditorComponent', () => {
  let component: FormEditorComponent;
  let fixture: ComponentFixture<FormEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormEditorComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('keeps filtered palette drop data in the same order as the visible items', () => {
    component = TestBed.createComponent(FormEditorComponent).componentInstance;
    component.buildPalettes();
    const allItems = component.paletteItems();

    component.paletteSearch.set('date');
    const visibleItems = component.paletteGroups().flatMap(group => group.items);
    expect(visibleItems.length).toBeGreaterThan(1);
    expect(component.paletteItems()).toEqual(visibleItems);
    expect(visibleItems.every(item => item.label.toLowerCase().includes('date'))).toBeTrue();

    component.paletteSearch.set('no matching field type');
    expect(component.paletteItems()).toEqual([]);
    component.paletteSearch.set('');
    expect(component.paletteItems()).toEqual(allItems);
  });

  it('scrolls a tab to its section below the toolbar and reports missing sections', () => {
    component = TestBed.createComponent(FormEditorComponent).componentInstance;
    const toast = spyOn(TestBed.inject(ToastService), 'show');
    const container = document.createElement('div');
    container.innerHTML = '<div class="form-editor-tabs"><div class="ws-tabs-bar"></div></div><div data-form-group="123"></div>';
    const toolbar = container.querySelector<HTMLElement>('.ws-tabs-bar')!;
    const heading = container.querySelector<HTMLElement>('[data-form-group]')!;
    Object.defineProperty(toolbar, 'offsetHeight', { value: 48 });
    spyOn(container, 'getBoundingClientRect').and.returnValue({ top: 100 } as DOMRect);
    spyOn(heading, 'getBoundingClientRect').and.returnValue({ top: 300 } as DOMRect);
    const scroll = spyOn(container, 'scrollTo');
    Object.defineProperty(container, 'scrollTop', { value: 25 });

    component.scrollToFormTab(container, 123);
    expect(scroll.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ top: 177, behavior: 'smooth' }));
    expect(component.activeFormTab()).toBe('123');

    component.scrollToFormTab(container, 999);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(component.activeFormTab()).toBe('123');
    expect(toast).toHaveBeenCalledWith('This tab has no sections to scroll to.', jasmine.anything());
  });

  it('shows the previous form details, hidden-data notice and link when applicable', () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 1, title: 'Form', nav: 'tabs', tabs: [], sections: [], tiers: [], items: {},
      prev: { id: 123, title: 'Previous', description: 'Earlier form' }, x: { hidePrev: true }
    };
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const notice = host.querySelector<HTMLElement>('.previous-form-notice')!;
    expect(notice.textContent).toContain('Previous');
    expect(notice.textContent).toContain('Earlier form');
    expect(notice.textContent).toContain('Previous data is hidden in this form');
    expect(notice.querySelector('a')!.getAttribute('href')).toContain('id=123');
  });

  it('floats only the tapped tab actions without changing the layout on touch', () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 1, title: 'Form', nav: 'tabs',
      tabs: [{ id: 7, title: 'Application Details' }, { id: 8, title: 'Documents and Attachments' }],
      sections: [], tiers: [], items: {}, x: {}
    };
    fixture.detectChanges();

    const touchRules = Array.from(document.querySelectorAll('style'))
      .flatMap(style => Array.from(style.sheet?.cssRules ?? []))
      .find((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule
        && rule.conditionText.includes('hover: none') && rule.cssText.includes('form-tab.is-action-selected'));
    expect(touchRules).toBeDefined();
    const touchStyles = document.createElement('style');
    touchStyles.textContent = Array.from(touchRules!.cssRules).map(rule => rule.cssText).join('\n');
    document.head.appendChild(touchStyles);

    try {
      const host = fixture.nativeElement as HTMLElement;
      const list = host.querySelector<HTMLElement>('.form-tabs-list')!;
      list.style.width = '180px';
      const tabs = list.querySelectorAll<HTMLElement>('.form-tab');
      const firstActions = tabs[0].querySelector<HTMLElement>('.element-edit')!;
      const secondActions = tabs[1].querySelector<HTMLElement>('.element-edit')!;
      const listHeight = list.getBoundingClientRect().height;
      const secondTop = tabs[1].getBoundingClientRect().top;
      expect(getComputedStyle(firstActions).display).toBe('none');
      expect(getComputedStyle(secondActions).display).toBe('none');

      tabs[0].querySelector<HTMLButtonElement>('.form-tab-link')!.click();
      fixture.detectChanges();
      expect(getComputedStyle(firstActions).display).toBe('block');
      expect(getComputedStyle(firstActions).position).toBe('absolute');
      expect(getComputedStyle(secondActions).display).toBe('none');
      expect(list.getBoundingClientRect().height).toBe(listHeight);
      expect(tabs[1].getBoundingClientRect().top).toBe(secondTop);
      const edit = spyOn(component, 'editTab');
      firstActions.querySelector<HTMLButtonElement>('[aria-label="Edit tab"]')!.click();
      expect(edit).toHaveBeenCalled();

      tabs[1].querySelector<HTMLButtonElement>('.form-tab-link')!.click();
      fixture.detectChanges();
      expect(getComputedStyle(firstActions).display).toBe('none');
      expect(getComputedStyle(secondActions).display).toBe('block');
      expect(list.getBoundingClientRect().height).toBe(listHeight);
    } finally {
      touchStyles.remove();
    }
  });

  it('keeps tab navigation separate from edit actions', async () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 1, title: 'Form', nav: 'tabs', tabs: [{ id: 7, title: 'Details' }],
      sections: [
        { id: 1, parent: 7, type: 'section', title: 'Section', items: [] },
        { id: 2, parent: -999, type: 'section', title: 'Bottom section', items: [] }
      ],
      tiers: [], items: {}, x: { skipValidate: true }
    };
    component.facetList = ['edit', 'a longer facet name'];
    fixture.detectChanges();

    const scroll = spyOn(component, 'scrollToFormTab');
    const edit = spyOn(component, 'editTab');
    const host = fixture.nativeElement as HTMLElement;
    const tab = host.querySelector<HTMLButtonElement>('.form-tab-link')!;
    const toolbar = host.querySelector<HTMLElement>('.form-editor-tabs > .ws-tabs-bar')!;
    const heading = host.querySelector<HTMLElement>('.section-group-heading')!;
    const actions = host.querySelector<HTMLElement>('.form-tab > .element-edit')!;
    const workspace = host.querySelector<HTMLElement>('.form-editor-scroll')!;
    const idChip = host.querySelector<HTMLButtonElement>('[aria-label="Copy form ID"]')!;
    const toast = spyOn(TestBed.inject(ToastService), 'show');
    const copy = spyOn(fixture.debugElement.query(By.directive(EditorIdChipComponent)).injector.get(Clipboard), 'copy').and.returnValue(true);
    idChip.click();
    expect(copy).toHaveBeenCalledWith('1');
    expect(toast).toHaveBeenCalledWith('Form ID copied to clipboard', jasmine.anything());
    copy.and.returnValue(false);
    idChip.click();
    expect(toast).toHaveBeenCalledWith('Failed to copy form ID', jasmine.anything());
    const titlebar = idChip.closest<HTMLElement>('.bg-body')!;
    const originalFlex = workspace.style.flex;
    workspace.style.flex = '0 0 1000px';
    expect(titlebar.getBoundingClientRect().width).toBe(workspace.clientWidth);
    expect(toolbar.getBoundingClientRect().width).toBe(workspace.clientWidth);
    // The tab strip and the action cluster share one row capped at the workspace limit width.
    const toolbarRow = host.querySelector<HTMLElement>('.form-editor-tabs > .ws-tabs-bar > .limit-width')!;
    expect(toolbarRow.getBoundingClientRect().width).toBe(780);
    // Toolbar dropdowns stay outside the horizontally scrollable tab list, otherwise that
    // scroll container clips the opened menu instead of letting it render below the bar.
    expect(toolbarRow.querySelector('.nav-tabs .dropdown')).toBeNull();
    expect(toolbarRow.querySelector('.dropdown')).not.toBeNull();
    expect(host.querySelector('.form-editor-tabs > .tab-content')!.getBoundingClientRect().width).toBe(780);
    workspace.style.flex = '0 0 320px';
    const filter = host.querySelector<HTMLElement>('.filter-control')!;
    const facet = host.querySelector<HTMLElement>('.facet-control')!;
    expect(filter.getBoundingClientRect().top).toBe(facet.getBoundingClientRect().top);
    expect(facet.getBoundingClientRect().right).toBeLessThanOrEqual(workspace.getBoundingClientRect().right);
    expect(host.querySelector('#previewfacet')!.getAttribute('aria-label')).toBe('Facet');
    workspace.style.flex = originalFlex;
    expect(host.querySelector('[data-form-group="-999"] h5')!.textContent!.trim()).toBe('Bottom');
    expect(getComputedStyle(toolbar).position).toBe('sticky');
    const lightBackground = getComputedStyle(heading).backgroundColor;
    expect(lightBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(parseFloat(getComputedStyle(heading).top)).toBe(toolbar.offsetHeight);
    const root = document.documentElement;
    const theme = root.getAttribute('data-bs-theme');
    try {
      root.setAttribute('data-bs-theme', 'dark');
      expect(getComputedStyle(heading).backgroundColor).not.toBe(lightBackground);
      expect(getComputedStyle(toolbar).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    } finally {
      if (theme === null) root.removeAttribute('data-bs-theme');
      else root.setAttribute('data-bs-theme', theme);
    }
    const tabWidth = tab.parentElement!.getBoundingClientRect().width;
    tab.focus();
    expect(getComputedStyle(actions).display).toBe('block');
    expect(getComputedStyle(actions).position).toBe('absolute');
    expect(tab.parentElement!.getBoundingClientRect().width).toBe(tabWidth);
    tab.click();
    expect(scroll).toHaveBeenCalledWith(host.querySelector('.form-editor-scroll')!, 7);
    host.querySelector<HTMLButtonElement>('[aria-label="Edit tab"]')!.click();
    expect(edit).toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledTimes(1);

    host.querySelector<HTMLButtonElement>('#dropdownFormEditor')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const menu = host.querySelector<HTMLElement>('[aria-labelledby="dropdownFormEditor"]')!;
    const gap = menu.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom;
    expect(gap).toBeGreaterThanOrEqual(1);
    expect(gap).toBeLessThanOrEqual(3);
    expect(parseFloat(getComputedStyle(menu).borderTopLeftRadius)).toBeGreaterThan(0);
  });

  it('coalesces tier-line redraws into one timer', () => {
    const component = Object.create(ProcessEditorComponent.prototype) as ProcessEditorComponent;
    Object.defineProperty(component, 'tierLinesTimer', { value: null, writable: true });

    let scheduledCallback: (() => void) | undefined;
    const setTimeoutSpy = spyOn(window, 'setTimeout').and.callFake((callback: any) => {
      scheduledCallback = callback;
      return 1;
    });
    const drawTierLinesSpy = spyOn(component, 'drawTierLines');

    component.scheduleTierLineRedraw();
    component.scheduleTierLineRedraw();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    scheduledCallback?.();
    expect(drawTierLinesSpy).toHaveBeenCalledTimes(1);

    component.scheduleTierLineRedraw();
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('only outlines the selected source tier, not every tier when Submission is selected', () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    const processFixture = TestBed.createComponent(ProcessEditorComponent);
    processFixture.componentRef.setInput('form', {
      tiers: [
        { id: 11, name: 'First', sortOrder: 0, type: 'ALL',
          actions: { next: { id: 21, action: 'nextTier', label: 'Next', sortOrder: 0, color: 'rgb(255, 0, 0)' } } },
        { id: 12, name: 'Second', sortOrder: 1, type: 'ALL', actions: {} }
      ]
    });
    processFixture.detectChanges();

    const host = processFixture.nativeElement as HTMLElement;
    const cards = host.querySelectorAll<HTMLElement>('.tier-card');
    host.querySelector<HTMLButtonElement>('.proc-terminal-pill')!.click();
    processFixture.detectChanges();
    expect(getComputedStyle(cards[0]).outlineStyle).toBe('none');
    expect(getComputedStyle(cards[1]).outlineStyle).toBe('none');
    expect(host.querySelector('#t_11')!.classList.contains('selected-line-tier')).toBeTrue();

    host.querySelector<HTMLButtonElement>('.btn-tier-action')!.click();
    processFixture.detectChanges();
    expect(getComputedStyle(cards[0]).outlineStyle).toBe('solid');
    expect(getComputedStyle(cards[0]).outlineColor).toBe('rgb(255, 0, 0)');
    expect(getComputedStyle(cards[1]).outlineStyle).toBe('none');
    processFixture.destroy();
  });

  it('floats selected tier action controls without changing card height on touch', () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    const processFixture = TestBed.createComponent(ProcessEditorComponent);
    processFixture.componentRef.setInput('form', {
      tiers: [{
        id: 11, name: 'First', sortOrder: 0, type: 'ALL', actions: {
          first: { id: 21, action: 'curTier', label: 'First action', sortOrder: 0, color: 'rgb(255, 0, 0)', icon: 'check' },
          second: { id: 22, action: 'curTier', label: 'Second action', sortOrder: 1, color: 'rgb(0, 0, 255)', icon: 'check' }
        }
      }]
    });
    processFixture.detectChanges();

    const touchRules = Array.from(document.querySelectorAll('style'))
      .flatMap(style => Array.from(style.sheet?.cssRules ?? []))
      .find((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule
        && rule.conditionText.includes('hover: none') && rule.cssText.includes('tier-action-wrap.selected-action'));
    expect(touchRules).toBeDefined();
    const touchStyles = document.createElement('style');
    touchStyles.textContent = Array.from(touchRules!.cssRules).map(rule => rule.cssText).join('\n');
    document.head.appendChild(touchStyles);

    try {
      const host = processFixture.nativeElement as HTMLElement;
      const card = host.querySelector<HTMLElement>('.tier-card')!;
      const actions = host.querySelectorAll<HTMLElement>('.tier-action-wrap');
      const height = card.getBoundingClientRect().height;
      actions[0].querySelector<HTMLButtonElement>('.btn-tier-action')!.click();
      processFixture.detectChanges();

      const firstBar = actions[0].querySelector<HTMLElement>('.tier-action-actions')!;
      const secondBar = actions[1].querySelector<HTMLElement>('.tier-action-actions')!;
      expect(card.getBoundingClientRect().height).toBe(height);
      expect(getComputedStyle(firstBar).position).toBe('absolute');
      expect(getComputedStyle(firstBar).display).not.toBe('none');
      expect(getComputedStyle(secondBar).display).toBe('none');

      const edit = spyOn(processFixture.componentInstance, 'editTierAction');
      firstBar.querySelector<HTMLButtonElement>('[aria-label="Edit action"]')!.click();
      expect(edit).toHaveBeenCalled();
    } finally {
      touchStyles.remove();
      processFixture.destroy();
    }
  });

  it('redraws tier connectors when the Process tab is shown and when tiers are simplified', async () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 3, title: 'Process Form', nav: 'tabs', tabs: [], sections: [], items: {}, x: { skipValidate: true },
      tiers: [
        {
          id: 11, name: 'HOD Review', sortOrder: 0, type: 'ALL',
          actions: { approved: { id: 21, action: 'nextTier', label: 'Recommended', sortOrder: 0, icon: 'check' } }
        },
        { id: 12, name: 'CDO Review', sortOrder: 1, type: 'ALL', actions: {} }
      ]
    };
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const processTab = Array.from(host.querySelectorAll<HTMLAnchorElement>('.form-editor-tabs .nav-tabs a'))
      .find(a => a.textContent?.trim() === 'Process')!;
    processTab.click();
    fixture.detectChanges();
    const process = fixture.debugElement.query(By.directive(ProcessEditorComponent)).componentInstance as ProcessEditorComponent;
    const draw = spyOn(process, 'drawTierLines');
    await new Promise<void>(resolve => setTimeout(resolve));
    expect(draw).toHaveBeenCalled();

    draw.calls.reset();
    host.querySelector<HTMLInputElement>('#simplifiedProcessView')!.click();
    fixture.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve));
    expect(draw).toHaveBeenCalled();
  });

  it('measures the Submission and action connectors once the Process tab content is rendered', async () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 3, title: 'Process Form', nav: 'tabs', tabs: [], sections: [], items: {}, x: { skipValidate: true },
      tiers: [
        {
          id: 5097, name: 'HOD Review', sortOrder: 0, type: 'ALL',
          actions: { approved: { id: 21, action: 'nextTier', label: 'Recommended', sortOrder: 0, icon: 'check' } }
        },
        {
          id: 5098, name: 'CDO Review', sortOrder: 1, type: 'ALL',
          actions: { approved: { id: 22, action: 'nextTier', label: 'Approved', sortOrder: 0, icon: 'check' } }
        }
      ]
    };
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const processTab = Array.from(host.querySelectorAll<HTMLAnchorElement>('.form-editor-tabs .nav-tabs a'))
      .find(a => a.textContent?.trim() === 'Process')!;
    processTab.click();
    fixture.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 400));

    const submitLine = host.querySelector<HTMLElement>('#line_-1')!;
    const firstActionLine = host.querySelector<HTMLElement>('#line_21')!;
    const rail = host.querySelector<HTMLElement>('#t_-1_line')!;
    const firstTierAnchor = host.querySelector<HTMLElement>('#t_5097')!;
    const source = host.querySelector<HTMLElement>('#ta_21')!;
    const nextTierAnchor = host.querySelector<HTMLElement>('#t_5098')!;

    expect(parseFloat(submitLine.style.height))
      .toBeCloseTo(firstTierAnchor.getBoundingClientRect().top - rail.getBoundingClientRect().top + 8, 0);
    expect(parseFloat(firstActionLine.style.height))
      .toBeCloseTo(nextTierAnchor.getBoundingClientRect().top - source.getBoundingClientRect().top + 8, 0);
  });

  it('redraws tier connectors once the nav reports the Process pane as shown', async () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 3, title: 'Process Form', nav: 'tabs', tabs: [], sections: [], items: {}, x: { skipValidate: true },
      tiers: [{ id: 11, name: 'HOD Review', sortOrder: 0, type: 'ALL', actions: {} }]
    };
    fixture.detectChanges();

    const nav = fixture.debugElement.query(By.directive(NgbNav)).injector.get(NgbNav);
    const processTab = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.form-editor-tabs .nav-tabs a'))
      .find(a => a.textContent?.trim() === 'Process')!;
    processTab.click();
    fixture.detectChanges();
    await new Promise<void>(resolve => setTimeout(resolve, 400));
    const process = fixture.debugElement.query(By.directive(ProcessEditorComponent)).componentInstance as ProcessEditorComponent;
    const draw = spyOn(process, 'drawTierLines');
    nav.shown.emit('process');
    await new Promise<void>(resolve => setTimeout(resolve));

    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('leaves tier connector geometry alone until the Process pane is displayed', () => {
    const processFixture = TestBed.createComponent(ProcessEditorComponent);
    const component = processFixture.componentInstance;
    const target = component as any;
    target.cdr = { detectChanges: () => { } };
    processFixture.componentRef.setInput('form', { tiers: [{ id: 5097, sortOrder: 0, actions: {} }] });
    const existingLine = document.createElement('div');
    component.lines = [existingLine];

    component.drawTierLines();

    expect(component.lines).toEqual([existingLine]);
  });

  it('orders tier action connectors by sort order, matching the rendered buttons', () => {
    const processFixture = TestBed.createComponent(ProcessEditorComponent);
    const component = processFixture.componentInstance;
    const target = component as any;
    target.cdr = { detectChanges: () => { } };
    processFixture.componentRef.setInput('form', {
      tiers: [
        {
          id: 5097, sortOrder: 0, actions: {
            second: { id: 22, action: 'nextTier', sortOrder: 1 },
            first: { id: 21, action: 'nextTier', sortOrder: 0 }
          }
        },
        { id: 5098, sortOrder: 1, actions: {} }
      ]
    });

    const box = (top: number) => {
      const el = document.createElement('div');
      el.getBoundingClientRect = () => ({ top, height: 0, width: 10 } as DOMRect);
      return el;
    };
    const lineEl = (id: string) => {
      const el = document.createElement('div');
      el.id = id;
      return el;
    };
    const dom: Record<string, HTMLElement> = {
      't_-1_line': box(200),
      'line_-1': lineEl('line_-1'),
      't_5097': box(280),
      'ta_21': box(400), 'line_21': lineEl('line_21'),
      'ta_22': box(410), 'line_22': lineEl('line_22'),
      't_5098': box(480)
    };
    spyOn(document, 'getElementById').and.callFake((id: string) => dom[id] ?? null);

    component.drawTierLines();

    expect(component.lines.map((line: HTMLElement) => line.id)).toEqual(['line_21', 'line_22']);
    expect(dom['line_21'].style.width).toBe('6px');
    expect(dom['line_22'].style.width).toBe('9px');
  });

  it('updates the parent form after saving a tier and retains process state across tabs', async () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    const form = {
      id: 3, title: 'Form', nav: 'tabs', tabs: [], sections: [], items: {}, x: { skipValidate: true },
      tiers: [{ id: 11, name: 'Original', sortOrder: 0, type: 'ALL', actions: {} }]
    };
    const savedForm = { ...form, tiers: [{ ...form.tiers[0], name: 'Saved' }] };
    component.curForm = form;
    fixture.detectChanges();

    const tabs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.form-editor-tabs .nav-tabs a'));
    tabs.find(tab => tab.textContent?.trim() === 'Process')!.click();
    fixture.detectChanges();
    const process = fixture.debugElement.query(By.directive(ProcessEditorComponent)).componentInstance as ProcessEditorComponent;
    process.simplifiedProcessView = true;
    tabs.find(tab => tab.textContent?.trim() === 'Forms')!.click();
    fixture.detectChanges();
    tabs.find(tab => tab.textContent?.trim() === 'Process')!.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ProcessEditorComponent)).componentInstance).toBe(process);
    expect(process.simplifiedProcessView).toBeTrue();

    const service = TestBed.inject(FormService);
    spyOn(TestBed.inject(NgbModal), 'open').and.returnValue({ result: Promise.resolve(form.tiers[0]) } as any);
    spyOn(service, 'saveTier').and.returnValue(of({} as any));
    spyOn(service, 'getForm').and.returnValue(of(savedForm as any));
    const saveOrder = spyOn(service, 'saveTierOrder').and.returnValue(of({} as any));
    process.editTier({} as any, form.tiers[0]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.curForm).toBe(savedForm);
    expect(saveOrder).toHaveBeenCalledWith(3, [{ id: 11, sortOrder: 0 }]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Saved');
  });

  it('updates the process view when TimeWarp mutates the shared form in place', () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    const form = {
      id: 3, title: 'Form', nav: 'tabs', tabs: [], sections: [], items: {}, x: { skipValidate: true },
      tiers: [{ id: 11, name: 'Current tier', sortOrder: 0, type: 'ALL', actions: {} }]
    };
    component.curForm = form;
    fixture.detectChanges();
    const processTab = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.form-editor-tabs .nav-tabs a'))
      .find(tab => tab.textContent?.trim() === 'Process')!;
    processTab.click();
    fixture.detectChanges();

    component.liveFormSnapshot = form;
    component.isTimeWarpingForm = true;
    component.timeWarpFormTrails = [{
      module: 'form',
      data: { ...form, tiers: [{ ...form.tiers[0], name: 'Historical tier' }] }
    }];
    component.applyTimeWarpForm(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Historical tier');
  });

  it('uses the parent mailer and group editors from the tier modal', async () => {
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(FormEditorComponent.prototype, 'ngOnInit');
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    component.curForm = {
      id: 3, title: 'Form', nav: 'tabs', tabs: [], sections: [], items: {}, x: { skipValidate: true },
      tiers: [{ id: 11, name: 'Review', sortOrder: 0, type: 'ALL', actions: {} }]
    };
    const mailer = spyOn(component, 'editMailer');
    const group = spyOn(component, 'editGroup');
    const modalService = TestBed.inject(NgbModal);
    const open = spyOn(modalService, 'open').and.callThrough();
    fixture.detectChanges();
    const processTab = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.form-editor-tabs .nav-tabs a'))
      .find(tab => tab.textContent?.trim() === 'Process')!;
    processTab.click();
    fixture.detectChanges();
    const addTier = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Add New'))!;
    addTier.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const modal = document.querySelector<HTMLElement>('.modal')!;
    Array.from(modal.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Mailer'))!.click();
    expect(mailer).toHaveBeenCalledWith(jasmine.anything(), { enabled: 1 }, jasmine.anything(), 'submitMailer');

    modal.querySelector<HTMLInputElement>('#type-GROUP')!.click();
    fixture.detectChanges();
    Array.from(modal.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('New Group'))!.click();
    expect(group).toHaveBeenCalledWith(jasmine.anything(), { x: {} }, jasmine.anything(), 'approverGroup', false);
    const hidden = new Promise<void>(resolve => open.calls.mostRecent().returnValue.hidden.subscribe(() => resolve()));
    modalService.dismissAll();
    await hidden;
  });
});
