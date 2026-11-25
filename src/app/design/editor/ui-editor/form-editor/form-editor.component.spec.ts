import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { Clipboard } from '@angular/cdk/clipboard';
import { By } from '@angular/platform-browser';

import { FormEditorComponent } from './form-editor.component';
import { EditorIdChipComponent } from '../editor-id-chip.component';
import { ToastService } from '../../../../_shared/service/toast-service';
import { SharedModule } from '../../../../_shared/shared.module';

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
    container.innerHTML = '<div class="form-editor-tabs"><div class="nav-wrap"></div></div><div data-form-group="123"></div>';
    const toolbar = container.querySelector<HTMLElement>('.nav-wrap')!;
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
    const toolbar = host.querySelector<HTMLElement>('.form-editor-tabs > .nav-wrap')!;
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
    expect(toolbar.querySelector('.nav-tabs')!.getBoundingClientRect().width).toBe(780);
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

  it('coalesces tier-line redraws into one animation frame', () => {
    const component = Object.create(FormEditorComponent.prototype) as FormEditorComponent;
    Object.defineProperty(component, 'tierLinesFrame', { value: null, writable: true });

    let scheduledCallback: FrameRequestCallback | undefined;
    const requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
      scheduledCallback = callback;
      return 1;
    });
    const drawTierLinesSpy = spyOn(component, 'drawTierLines');

    component.scheduleTierLineRedraw();
    component.scheduleTierLineRedraw();

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    scheduledCallback?.(0);
    expect(drawTierLinesSpy).toHaveBeenCalledTimes(1);

    component.scheduleTierLineRedraw();
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
  });
});
