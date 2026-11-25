import { provideHttpClient } from '@angular/common/http';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { TemplateRef, ViewContainerRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbNavConfig } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';
import { SharedModule } from '../../../_shared/shared.module';
import { ScreenService } from '../../../service/screen.service';
import { AssistantPaletteDirective } from '../assistant/assistant-palette.directive';
import { DashboardEditorComponent } from './dashboard-editor/dashboard-editor.component';
import { DatasetEditorComponent } from './dataset-editor/dataset-editor.component';
import { NaviComponent } from './navi/navi.component';
import { ScreenEditorComponent } from './screen-editor/screen-editor.component';

describe('Editor workspace toolbars', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEditorComponent, DatasetEditorComponent, NaviComponent, ScreenEditorComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
  });

  it('keeps dataset actions and Meta Trails available in TimeWarp', async () => {
    spyOn(DatasetEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(DatasetEditorComponent);
    const component = fixture.componentInstance;
    component.curDataset = { id: 12, title: 'Dataset', type: 'all' };
    component.app = { id: 1 };
    component.datasetLoading = true;
    component.isTimeWarpingDataset = true;
    const trails = spyOn(component, 'viewMetaTrails');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';
    host.style.width = '320px';
    const toolbar = host.querySelector<HTMLElement>('.workspace-toolbar')!;
    expect(getComputedStyle(toolbar).position).toBe('sticky');
    expect(toolbar.querySelector('a[title="Run dataset"]')!.getBoundingClientRect().right)
      .toBeLessThanOrEqual(host.getBoundingClientRect().right);
    const root = document.documentElement;
    const theme = root.getAttribute('data-bs-theme');
    const lightBackground = getComputedStyle(toolbar).backgroundColor;
    try {
      root.setAttribute('data-bs-theme', 'dark');
      expect(getComputedStyle(toolbar).backgroundColor).not.toBe(lightBackground);
    } finally {
      if (theme === null) root.removeAttribute('data-bs-theme');
      else root.setAttribute('data-bs-theme', theme);
    }
    expect(host.querySelector<HTMLButtonElement>('[title="Edit dataset"]')!.disabled).toBeTrue();
    expect(host.querySelector<HTMLAnchorElement>('[title="Run dataset"]')!.getAttribute('href')).toBe('/run/1/dataset/12');
    host.querySelector<HTMLButtonElement>('[aria-label="More actions"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const menu = host.querySelector<HTMLElement>('.workspace-toolbar .dropdown-menu')!;
    const gap = menu.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom;
    expect(gap).toBeGreaterThanOrEqual(1);
    expect(gap).toBeLessThanOrEqual(3);
    expect(host.querySelector<HTMLElement>('.workspace-toolbar .dropdown > .dropdown-toggle.border-0')!.getBoundingClientRect().height)
      .toBe(toolbar.getBoundingClientRect().height);
    expect(menu.querySelector('[title="Resync Dataset"]')!.classList.contains('disabled')).toBeTrue();
    expect(menu.querySelector<HTMLButtonElement>('[title="Remove dataset"]')!.disabled).toBeTrue();
    expect(menu.querySelector('[title="Download Entry JSON"]')!.classList.contains('disabled')).toBeFalse();
    menu.querySelector<HTMLButtonElement>('button')!.click();
    expect(trails).toHaveBeenCalledWith(jasmine.anything(), 'dataset_12', component.curDataset);
  });

  it('keeps dataset menu actions connected and respects offline availability', () => {
    spyOn(DatasetEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(DatasetEditorComponent);
    const component = fixture.componentInstance;
    component.curDataset = { id: 12, title: 'Dataset', type: 'all' };
    component.app = { id: 1 };
    component.datasetLoading = true;
    component.offline = false;
    const resync = spyOn(component, 'resyncDataset');
    const remove = spyOn(component, 'removeDataset');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const menu = host.querySelector<HTMLElement>('.workspace-toolbar .dropdown-menu')!;
    const download = menu.querySelector<HTMLAnchorElement>('[title="Download Entry JSON"]')!;
    expect(download.getAttribute('href')).toBe(`${component.base}/report/export-data/12/json`);
    expect(download.target).toBe('_blank');
    expect(download.classList.contains('disabled')).toBeFalse();
    const toggle = host.querySelector<HTMLButtonElement>('[aria-label="More actions"]')!;
    toggle.click();
    fixture.detectChanges();
    menu.querySelector<HTMLButtonElement>('[title="Resync Dataset"]')!.click();
    expect(resync).toHaveBeenCalledWith(12);
    toggle.click();
    fixture.detectChanges();
    menu.querySelector<HTMLButtonElement>('[title="Remove dataset"]')!.click();
    expect(remove).toHaveBeenCalledWith(jasmine.anything(), component.curDataset);

    const offline = TestBed.createComponent(DatasetEditorComponent);
    offline.componentInstance.curDataset = { id: 12, title: 'Dataset', type: 'all' };
    offline.componentInstance.app = { id: 1 };
    offline.componentInstance.datasetLoading = true;
    offline.componentInstance.offline = true;
    offline.detectChanges();
    const offlineMenu = (offline.nativeElement as HTMLElement).querySelector<HTMLElement>('.workspace-toolbar .dropdown-menu')!;
    expect(offlineMenu.querySelector('[title="Download Entry JSON"]')!.classList.contains('disabled')).toBeTrue();
    expect(offlineMenu.querySelector('[title="Resync Dataset"]')!.classList.contains('disabled')).toBeTrue();
    expect(offlineMenu.querySelector<HTMLButtonElement>('[title="Remove dataset"]')!.disabled).toBeFalse();
  });

  it('keeps screen Meta Trails and preview connected to the selected screen', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    const component = fixture.componentInstance;
    component.curScreen = { id: 34, title: 'Screen', type: 'other', actions: [] };
    component.app = { id: 1 };
    const trails = spyOn(component, 'viewMetaTrails');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(getComputedStyle(host.querySelector<HTMLElement>('.workspace-toolbar')!).position).toBe('sticky');
    expect(host.querySelector<HTMLAnchorElement>('[title="Preview screen"]')!.getAttribute('href')).toBe('/run/1/screen/34');
    host.querySelector<HTMLButtonElement>('[aria-label="More actions"]')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.workspace-toolbar .dropdown-menu button')!.click();
    expect(trails).toHaveBeenCalledWith(jasmine.anything(), 'screen_34', component.curScreen);
  });

  it('keeps the screen and code toolbars stacked over flush content while scrolling', async () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    const component = fixture.componentInstance;
    component.curScreen = {
      id: 34, title: 'Screen', type: 'static', actions: [],
      data: { content: '<div>Content</div>\n'.repeat(120), pretext: '', posttext: '', f: '' }
    };
    component.app = { id: 1 };
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const scroll = host.firstElementChild!.firstElementChild as HTMLElement;
    scroll.style.height = '300px';
    scroll.style.width = '700px';
    const toolbar = host.querySelector<HTMLElement>('.workspace-toolbar')!;
    const status = host.querySelector<HTMLElement>('.screen-status')!;
    const card = host.querySelector<HTMLElement>('form[name="contentForm"] .card')!;
    const codeToolbar = host.querySelector<HTMLElement>('#codeeditor .ng-cm-toolbar')!;
    const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await frame();
    await frame();

    expect(status.getBoundingClientRect().height).toBe(0);
    expect(Math.abs(card.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom)).toBeLessThan(1);
    expect(Math.abs(codeToolbar.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom)).toBeLessThan(1);
    expect(Math.abs(card.getBoundingClientRect().left - scroll.getBoundingClientRect().left)).toBeLessThan(1);
    expect(Math.abs(card.getBoundingClientRect().right - scroll.getBoundingClientRect().left - scroll.clientWidth)).toBeLessThan(1);
    const alert = status.querySelector<HTMLElement>('.alert')!;
    alert.classList.add('d-block');
    expect(getComputedStyle(status).paddingTop).not.toBe('0px');
    alert.classList.remove('d-block');

    scroll.scrollTop = 250;
    await frame();
    expect(Math.abs(codeToolbar.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom)).toBeLessThan(1);

    toolbar.style.minHeight = '72px';
    await frame();
    await frame();
    expect(Math.abs(codeToolbar.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom)).toBeLessThan(1);

    host.querySelector<HTMLButtonElement>('[aria-label="More actions"]')!.click();
    fixture.detectChanges();
    await frame();
    const menu = host.querySelector<HTMLElement>('.workspace-toolbar .dropdown-menu')!;
    const menuRect = menu.getBoundingClientRect();
    const codeRect = codeToolbar.getBoundingClientRect();
    const x = menuRect.left + menuRect.width / 2;
    const y = Math.max(menuRect.top, codeRect.top) + 5;
    expect(y).toBeLessThan(Math.min(menuRect.bottom, codeRect.bottom));
    expect(menu.contains(document.elementFromPoint(x, y))).toBeTrue();

    scroll.scrollTop = scroll.scrollHeight;
    await frame();
    expect(Math.abs(toolbar.getBoundingClientRect().top - scroll.getBoundingClientRect().top)).toBeLessThan(1);

    host.style.display = 'block';
    host.style.width = '320px';
    scroll.style.width = '320px';
    await frame();
    const tabs = host.querySelector<HTMLElement>('.ws-tabs')!;
    const preview = host.querySelector<HTMLElement>('[title="Preview screen"]')!;
    expect(tabs.scrollWidth).toBeGreaterThan(tabs.clientWidth);
    expect(preview.getBoundingClientRect().right).toBeLessThanOrEqual(scroll.getBoundingClientRect().left + scroll.clientWidth);
    tabs.scrollLeft = tabs.scrollWidth;
    expect(tabs.scrollLeft).toBeGreaterThan(0);

    const codeEditor = fixture.debugElement.query(By.directive(NgCmComponent)).componentInstance as NgCmComponent;
    codeEditor.isFullscreen.set(true);
    fixture.detectChanges();
    expect(getComputedStyle(codeToolbar).top).toBe('0px');
    const fullscreenRect = codeToolbar.getBoundingClientRect();
    expect(codeToolbar.contains(document.elementFromPoint(
      fullscreenRect.left + fullscreenRect.width / 2,
      fullscreenRect.top + fullscreenRect.height / 2
    ))).toBeTrue();
  });

  it('shows linked component details only in the Content tab with a flush header', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    TestBed.inject(NgbNavConfig).animation = false;
    const cases = [
      { type: 'list', label: 'Dataset', path: '/ui/dataset', id: 12 },
      { type: 'calendar', label: 'Dataset', path: '/ui/dataset', id: 12 },
      { type: 'map', label: 'Dataset', path: '/ui/dataset', id: 12 },
      { type: 'bucket', label: 'Bucket', path: '/bucket', id: 23 },
      { type: 'page', label: 'Form', path: '/ui/form', id: 34 }
    ];

    for (const testCase of cases) {
      const fixture = TestBed.createComponent(ScreenEditorComponent);
      const component = fixture.componentInstance;
      component.dataset = { id: 12, appId: 1, title: 'Linked dataset', description: 'Dataset description' };
      component.bucket = { id: 23, appId: 1, name: 'Linked bucket', description: 'Bucket description' };
      component.form = { id: 34, appId: 1, title: 'Linked form', description: 'Form description', sections: [] };
      component.curScreen = {
        id: 1, title: 'Screen', type: testCase.type, actions: [], data: {},
        dataset: { id: 12, form: { id: 34, items: {} } },
        bucket: { id: 23 }, form: { id: 34, items: {} }
      };
      component.app = { id: 1 };
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const header = host.querySelector<HTMLElement>('form[name="contentForm"] .workspace-toolbar')!;
      const activeTab = header.querySelector<HTMLElement>('.nav-link.active')!;
      expect(activeTab.textContent?.trim()).toBe('Content');
      expect(getComputedStyle(activeTab).borderBottomWidth).toBe('2px');
      expect(getComputedStyle(activeTab).borderTopWidth).toBe('0px');
      expect(header.querySelector('[aria-label="More actions"]')).not.toBeNull();
      const link = Array.from(host.querySelectorAll<HTMLAnchorElement>('.tab-pane.active a'))
        .find(item => item.textContent?.trim() === `View ${testCase.label}`)!;
      expect(link).withContext(testCase.type).toBeDefined();
      expect(link.getAttribute('href')).toContain(`${testCase.path}?id=${testCase.id}`);
      expect(link.closest('.tab-pane')!.textContent).toContain(`${testCase.label} description`);
      expect(host.querySelector('.screen-status a')).toBeNull();
      expect(host.querySelectorAll(`.tab-pane.active a[href$="${testCase.path}?id=${testCase.id}"]`).length).toBe(1);

      const preTab = Array.from(header.querySelectorAll<HTMLAnchorElement>('a'))
        .find(item => item.textContent?.trim() === 'Pre')!;
      preTab.click();
      fixture.detectChanges();
      expect(getComputedStyle(link.closest<HTMLElement>('.tab-pane')!).display).toBe('none');
      fixture.destroy();
    }
  });

  it('keeps content and pre-text controls registered with the screen form', async () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    TestBed.inject(NgbNavConfig).animation = false;
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    fixture.componentInstance.curScreen = {
      id: 1, title: 'Screen', type: 'static', actions: [],
      data: { content: '<p>Content</p>', pretext: 'Before', posttext: '', f: '' }
    };
    fixture.componentInstance.app = { id: 1 };
    fixture.detectChanges();
    await fixture.whenStable();
    const form = fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm);
    expect(form.controls['content']).toBeDefined();
    const editor = fixture.debugElement.query(By.css('#codeeditor')).componentInstance as NgCmComponent;
    editor.editor.dispatch({ changes: { from: 0, insert: '<p>New</p>' } });
    await fixture.whenStable();
    fixture.detectChanges();
    const save = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.includes('Save Content'))!;
    expect(parseFloat(getComputedStyle(save).marginLeft)).toBeGreaterThan(0);
    expect(form.dirty).toBeTrue();
    expect(save.disabled).toBeFalse();
    const saveScreen = spyOn(fixture.componentInstance, 'saveScreen');
    save.click();
    expect(saveScreen).toHaveBeenCalledWith(fixture.componentInstance.curScreen, form);
    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.ws-tabs a');
    Array.from(tabs).find(tab => tab.textContent?.trim() === 'Pre')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(form.controls['content']).toBeDefined();
    expect(form.controls['pretext']).toBeDefined();
  });

  it('only offers the visual editor for supported HTML tabs', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    TestBed.inject(NgbNavConfig).animation = false;
    const cases = [
      { type: 'static', content: true, pre: true, post: true },
      { type: 'list', content: true, pre: true, post: true },
      { type: 'page', content: true, pre: true, post: true },
      { type: 'calendar', content: false, pre: true, post: true },
      { type: 'bucket', content: false, pre: true, post: true },
      { type: 'map', content: false, pre: false, post: false },
      { type: 'chatbot', content: false, pre: false, post: false },
      { type: 'combine', content: false, pre: false, post: false },
      { type: 'mailbox', content: false, pre: false, post: false },
      { type: 'qr', content: false, pre: false, post: false }
    ];

    for (const testCase of cases) {
      const fixture = TestBed.createComponent(ScreenEditorComponent);
      fixture.componentInstance.curScreen = {
        id: 1, title: 'Screen', type: testCase.type, actions: [],
        data: { content: '', pretext: '', posttext: '', f: '', comps: [] },
        dataset: { id: 12, form: { id: 34, items: {} } }, form: { id: 34, items: {} }, bucket: { id: 23 }
      };
      fixture.componentInstance.form = { sections: [] };
      fixture.componentInstance.app = { id: 1 };
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const tabs = Array.from(host.querySelectorAll<HTMLAnchorElement>('.ws-tabs a'));
      for (const tab of [
        { label: 'Content', visible: testCase.content },
        { label: 'Pre', visible: testCase.pre },
        { label: 'Post', visible: testCase.post },
        { label: 'Init', visible: false }
      ]) {
        const link = tabs.find(item => item.textContent?.trim().startsWith(tab.label));
        if (!link || link.classList.contains('disabled')) continue;
        link.click();
        fixture.detectChanges();
        expect(!!host.querySelector('#showWysiwyg')).withContext(`${testCase.type} ${tab.label}`).toBe(tab.visible);
      }
      fixture.destroy();
    }
  });

  it('keeps action creation, editing and removal available with TimeWarp restrictions', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    const component = fixture.componentInstance;
    const action = { id: 7, label: 'Open orders', nextType: 'dataset', next: 12 };
    component.curScreen = { id: 1, title: 'Screen', type: 'other', actions: [action] };
    component.actionComps = { datasets: { 12: { title: 'Orders' } } };
    component.app = { id: 1 };
    const edit = spyOn(component, 'editAction');
    const remove = spyOn(component, 'removeAction');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const section = host.querySelector<HTMLElement>('[aria-labelledby="screen-actions-title"]')!;
    expect(section.textContent).toContain('Open orders');
    expect(section.textContent).toContain('Orders');
    section.querySelector<HTMLButtonElement>('button')!.click();
    expect(edit).toHaveBeenCalledWith(jasmine.anything(), {});
    section.querySelector<HTMLButtonElement>('[title="Edit action"]')!.click();
    expect(edit).toHaveBeenCalledWith(jasmine.anything(), action);
    section.querySelector<HTMLButtonElement>('[title="Remove action"]')!.click();
    expect(remove).toHaveBeenCalledWith(jasmine.anything(), action);

    const locked = TestBed.createComponent(ScreenEditorComponent);
    locked.componentInstance.curScreen = { id: 2, title: 'Screen', type: 'other', actions: [action] };
    locked.componentInstance.app = { id: 1 };
    locked.componentInstance.isTimeWarping = true;
    locked.detectChanges();
    const lockedSection = (locked.nativeElement as HTMLElement).querySelector<HTMLElement>('[aria-labelledby="screen-actions-title"]')!;
    expect(Array.from(lockedSection.querySelectorAll<HTMLButtonElement>('button')).every(button => button.disabled)).toBeTrue();

    const empty = TestBed.createComponent(ScreenEditorComponent);
    empty.componentInstance.curScreen = { id: 3, title: 'Screen', type: 'other', actions: [] };
    empty.componentInstance.app = { id: 1 };
    empty.detectChanges();
    const emptySection = (empty.nativeElement as HTMLElement).querySelector<HTMLElement>('[aria-labelledby="screen-actions-title"]')!;
    expect(emptySection.textContent).toContain('No actions specified');
    expect(emptySection.querySelector('table')).toBeNull();
    expect(emptySection.querySelector<HTMLButtonElement>('button')!.disabled).toBeFalse();
  });

  it('inserts calendar snippets into the code editor even when visual mode was selected', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    const component = fixture.componentInstance;
    component.curScreen = {
      id: 1, title: 'Calendar', type: 'calendar',
      actions: [{ id: 'open', label: 'Open' }],
      dataset: { id: 12, form: { items: {} } },
      data: { titleTpl: '', pretext: '', posttext: '', f: '' }
    };
    component.form = { sections: [] };
    component.app = { id: 1 };
    component.showWysiwyg = true;
    const insertVisual = spyOn(component, 'insertText');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('#showWysiwyg')).toBeNull();
    const editorElement = fixture.debugElement.query(By.css('app-cm[name="codeeditorcalendartitle"]'));
    const editor = editorElement.componentInstance as NgCmComponent;
    host.querySelector<HTMLButtonElement>('.tab-pane.active .var-ph-picker button')!.click();
    expect(editor.editor.state.doc.toString()).toContain("{{$go['open']}}");
    expect(insertVisual).not.toHaveBeenCalled();
    component.insertTextAtCursor('Visual snippet', undefined);
    expect(insertVisual).toHaveBeenCalledWith('Visual snippet');
  });

  it('loads the linked dataset for calendar screens', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    const component = fixture.componentInstance;
    const screen = { id: 1, title: 'Calendar', type: 'calendar', dataset: { id: 12 }, data: {}, actions: [] };
    const getScreen = spyOn(TestBed.inject(ScreenService), 'getScreen').and.returnValue(of(screen));
    spyOn(component, 'getActionComponents');
    const loadDataset = spyOn(component, 'loadDataset');
    component.form = { sections: [] };
    fixture.detectChanges();

    component.getScreenData(1);
    expect(loadDataset).toHaveBeenCalledWith(12, component.dataset);

    component.dataset = { id: 12, appId: 1, title: 'Previous dataset' };
    getScreen.and.returnValue(of({ ...screen, dataset: undefined }));
    component.getScreenData(2);
    expect(loadDataset).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('.screen-status .alert.d-block')?.textContent)
      .toContain('No dataset found');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Previous dataset');
  });

  it('preserves the dashboard wide layout setting', () => {
    spyOn(DashboardEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(DashboardEditorComponent);
    const component = fixture.componentInstance;
    component.curDashboard = { id: 56, title: 'Dashboard', wide: true, charts: [] };
    component.app = { id: 1 };
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).querySelector('.grid-animate')!.parentElement!;
    expect(content.classList.contains('limit-width')).toBeFalse();
    const narrow = TestBed.createComponent(DashboardEditorComponent);
    narrow.componentInstance.curDashboard = { id: 56, title: 'Dashboard', wide: false, charts: [] };
    narrow.componentInstance.app = { id: 1 };
    narrow.detectChanges();
    expect((narrow.nativeElement as HTMLElement).querySelector('.grid-animate')!.parentElement!.classList.contains('limit-width')).toBeTrue();
  });

  it('reveals navigation actions on focus without moving the group', () => {
    spyOn(NaviComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(NaviComponent);
    const component = fixture.componentInstance;
    const group = { title: 'Group', pre: 'true', items: [] };
    component.navis = [group];
    const edit = spyOn(component, 'editGroup');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const heading = host.querySelector<HTMLElement>('.group-header')!;
    const actions = heading.querySelector<HTMLElement>('.workspace-action-bar')!;
    const width = heading.getBoundingClientRect().width;
    heading.focus();
    expect(getComputedStyle(actions).display).toBe('block');
    expect(getComputedStyle(actions).position).toBe('absolute');
    expect(heading.getBoundingClientRect().width).toBe(width);
    actions.querySelector<HTMLButtonElement>('button')!.click();
    expect(edit).toHaveBeenCalledWith(jasmine.anything(), group, false);
  });

  it('keeps filtered navigation palette tiles aligned with drag data', () => {
    spyOn(NaviComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(NaviComponent);
    const component = fixture.componentInstance;
    const form = { title: 'Form', type: 'form', icon: 'fas:plus' };
    const dashboard = { title: 'Dashboard', type: 'dashboard', icon: 'fas:table' };
    component.palettes = [form, dashboard];
    component.otherAppList = [];
    fixture.detectChanges();

    const palette = fixture.debugElement.queryAllNodes(By.directive(AssistantPaletteDirective))[0];
    palette.injector.get(ViewContainerRef).createEmbeddedView(palette.injector.get(TemplateRef));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Filter palette components"]') as HTMLInputElement;
    input.value = 'dashboard';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const dropList = fixture.debugElement.query(By.css('#palette-pane')).injector.get(CdkDropList);
    expect(dropList.data).toEqual([dashboard]);
    expect(fixture.nativeElement.querySelectorAll('.palette-tile').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.palette-tile').textContent).toContain('Dashboard');
  });

  it('keeps the combined-screen palette filtered and disabled during TimeWarp', () => {
    spyOn(ScreenEditorComponent.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(ScreenEditorComponent);
    const component = fixture.componentInstance;
    const screen = { title: 'Screen', type: 'screen', icon: 'fas:table' };
    const form = { title: 'Form', type: 'add', icon: 'fas:plus' };
    component.curScreen = { id: 1, title: 'Combined', type: 'combine', data: { comps: [] }, actions: [] };
    component.app = { id: 1 };
    component.palettes = [screen, form];
    component.otherAppList = [];
    component.isTimeWarping = true;
    fixture.detectChanges();

    const palette = fixture.debugElement.queryAllNodes(By.directive(AssistantPaletteDirective))[0];
    palette.injector.get(ViewContainerRef).createEmbeddedView(palette.injector.get(TemplateRef));
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Filter palette components"]') as HTMLInputElement;
    input.value = 'form';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const dropList = fixture.debugElement.query(By.css('#palette-pane')).injector.get(CdkDropList);
    expect(dropList.data).toEqual([form]);
    expect(dropList.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.palette-tile').length).toBe(1);
  });
});
