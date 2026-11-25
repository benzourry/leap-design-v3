import { Clipboard } from '@angular/cdk/clipboard';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { SharedModule } from '../../../../_shared/shared.module';
import { ToastService } from '../../../../_shared/service/toast-service';
import { DatasetEditorComponent } from './dataset-editor.component';

describe('Dataset editor workspace', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetEditorComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(DatasetEditorComponent.prototype, 'ngOnInit');
  });

  it('keeps column, filter, action and card preview interactions available', async () => {
    const fixture = TestBed.createComponent(DatasetEditorComponent);
    const component = fixture.componentInstance;
    const column = { id: 1, root: 'data', code: 'list', label: 'Column', type: 'list', subs: [{ code: 'sub', label: 'Sub-column' }] };
    const action = { id: 3, label: 'View', type: 'bulk' };
    component.curDataset = {
      id: 12, title: 'Dataset', type: 'all', items: [column, { id: 5, root: 'data', code: 'other', label: 'Other' }], actions: [action],
      filters: [{ id: 2, root: 'data', label: 'Filter' }], presetFilters: { '@cond': 'AND' },
      x: { tblcard: true }, showStatus: true, statusFilter: { '-1': ['submitted'], 4: ['approve'] }
    };
    component.form = {
      data: { id: 2, appId: 1, title: 'Source', items: { list: { type: 'list' } },
        tiers: [{ id: 4, name: 'Review', actions: { approve: { label: 'Approved' } }, alwaysApprove: true }] }
    };
    component.app = { id: 1 };
    component.qFilter = [{ '$.first': 1 }, { '$or': [{ '$.second': 2 }, { '$.third': 3 }] }];
    const edit = spyOn(component, 'editColumnText');
    const newAction = spyOn(component, 'editAction');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '320px';
    const rail = host.querySelector<HTMLElement>('.column-list')!;
    const cards = rail.querySelectorAll<HTMLElement>('.column-box');
    expect(cards[1].getBoundingClientRect().left).toBeGreaterThan(cards[0].getBoundingClientRect().right);
    expect(rail.scrollWidth).toBeGreaterThan(rail.clientWidth);
    const main = host.querySelector<HTMLElement>('.column-main')!;
    const sub = host.querySelector<HTMLElement>('.f-subs-item')!;
    const filter = host.querySelector<HTMLElement>('.ds-filter')!;
    for (const item of [main, sub, filter]) {
      const handle = item.querySelector<HTMLElement>('.workspace-drag-handle')!;
      const label = item.querySelector<HTMLElement>('.element-item')!;
      expect(getComputedStyle(handle).display).not.toBe('none');
      expect(Number(getComputedStyle(handle).opacity)).toBeGreaterThan(0);
      expect(handle.getBoundingClientRect().right).toBeLessThanOrEqual(label.getBoundingClientRect().left);
    }
    sub.focus();
    const subBar = sub.querySelector<HTMLElement>('.workspace-action-bar')!;
    expect(getComputedStyle(subBar).display).toBe('block');
    expect(subBar.getBoundingClientRect().top).toBeLessThan(sub.getBoundingClientRect().top);
    expect(getComputedStyle(sub.parentElement!).overflowY).toBe('visible');
    expect(getComputedStyle(main.querySelector<HTMLElement>('.workspace-action-bar')!).display).toBe('none');
    sub.querySelector<HTMLButtonElement>('[title="Edit sub-column"]')!.click();
    expect(edit).toHaveBeenCalledWith(column.subs[0], column);
    main.focus();
    const mainBar = main.querySelector<HTMLElement>('.workspace-action-bar')!;
    expect(mainBar.getBoundingClientRect().top).toBeLessThan(main.getBoundingClientRect().top);
    expect(mainBar.getBoundingClientRect().top).toBeGreaterThanOrEqual(rail.getBoundingClientRect().top);
    filter.focus();
    const filterBar = filter.querySelector<HTMLElement>('.workspace-action-bar')!;
    expect(getComputedStyle(filterBar).display).toBe('block');
    expect(filterBar.getBoundingClientRect().top).toBeLessThan(filter.getBoundingClientRect().top);
    expect(host.querySelectorAll('.cond-leaf').length).toBe(3);
    expect(host.querySelector('.cond-tree > .cond-badge')!.textContent!.trim()).toBe('AND');
    expect(host.querySelector('.tree-wrapper > .cond-badge')!.textContent!.trim()).toBe('OR');
    expect(host.querySelector('.tree-wrapper > .cond-badge')!.classList).toContain('bg-warning-subtle');
    expect(Math.abs(host.querySelector<HTMLElement>('.cond-tree > .cond-badge')!.getBoundingClientRect().top -
      host.querySelector<HTMLElement>('.cond-leaf')!.getBoundingClientRect().top)).toBeLessThan(1);
    const root = document.documentElement;
    const theme = root.getAttribute('data-bs-theme');
    const lightBackground = getComputedStyle(cards[0]).backgroundColor;
    try {
      root.setAttribute('data-bs-theme', 'dark');
      expect(getComputedStyle(cards[0]).backgroundColor).not.toBe(lightBackground);
    } finally {
      if (theme === null) root.removeAttribute('data-bs-theme');
      else root.setAttribute('data-bs-theme', theme);
    }
    expect(host.querySelector('.ds-action-chip .ds-tag')!.textContent).toContain('BULK');
    host.querySelector<HTMLButtonElement>('.ds-panel-header button')!.click();
    expect(newAction).toHaveBeenCalled();
    host.querySelector<HTMLButtonElement>('.ds-panel-body .border-top button[aria-expanded]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.tblcard')).not.toBeNull();
    try {
      root.setAttribute('data-bs-theme', 'dark');
      const row = host.querySelector<HTMLElement>('.card-preview-surface .ds-row')!;
      const panel = row.closest<HTMLElement>('.ds-panel')!;
      expect(getComputedStyle(row).backgroundColor).not.toBe(getComputedStyle(panel).backgroundColor);
      expect(getComputedStyle(row.querySelector<HTMLElement>('.ds-status')!).backgroundColor).not.toBe(getComputedStyle(row).backgroundColor);
      expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    } finally {
      if (theme === null) root.removeAttribute('data-bs-theme');
      else root.setAttribute('data-bs-theme', theme);
    }
    host.querySelector<HTMLInputElement>('#enableCardEdit')!.click();
    fixture.detectChanges();
    expect(component.enableCardPreviewEdit).toBeTrue();
    expect(host.querySelectorAll('.border-start fa-icon.text-primary').length).toBe(1);
    expect(fixture.debugElement.queryAll(By.directive(CdkDropList)).length).toBeGreaterThanOrEqual(5);

    const timeWarp = TestBed.createComponent(DatasetEditorComponent);
    timeWarp.componentInstance.curDataset = component.curDataset;
    timeWarp.componentInstance.form = component.form;
    timeWarp.componentInstance.app = component.app;
    timeWarp.componentInstance.showCardPreview = true;
    timeWarp.componentInstance.isTimeWarpingDataset = true;
    timeWarp.detectChanges();
    await timeWarp.whenStable();
    const timeWarpHost = timeWarp.nativeElement as HTMLElement;
    expect(timeWarpHost.querySelector<HTMLInputElement>('#enableCardEdit')!.disabled).toBeTrue();
    expect(timeWarpHost.querySelector<HTMLButtonElement>('[title="Edit sub-column"]')!.disabled).toBeTrue();
    expect(timeWarp.debugElement.queryAll(By.directive(CdkDrag)).every(el => el.injector.get(CdkDrag).disabled)).toBeTrue();
  });

  it('renders OR roots and nested AND conditions', () => {
    const fixture = TestBed.createComponent(DatasetEditorComponent);
    fixture.componentInstance.curDataset = {
      id: 12, title: 'Dataset', items: [], actions: [], filters: [], presetFilters: { '@cond': 'OR' }
    };
    fixture.componentInstance.form = { data: { id: 2, appId: 1, title: 'Source' } };
    fixture.componentInstance.qFilter = [{ '$and': [{ '$.first': 1 }] }];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const root = host.querySelector<HTMLElement>('.cond-tree > .cond-badge')!;
    const nested = host.querySelector<HTMLElement>('.tree-wrapper > .cond-badge')!;
    expect(root.textContent!.trim()).toBe('OR');
    expect(root.classList).toContain('bg-warning-subtle');
    expect(nested.textContent!.trim()).toBe('AND');
    expect(nested.classList).toContain('bg-primary-subtle');
  });

  it('copies each endpoint and reports clipboard success or failure', () => {
    const fixture = TestBed.createComponent(DatasetEditorComponent);
    const component = fixture.componentInstance;
    component.curDataset = { id: 12, title: 'Dataset', items: [], actions: [], filters: [], presetFilters: {}, publicEp: true };
    component.form = { data: { id: 2, appId: 1, title: 'Source' } };
    component.app = { id: 1 };
    const clipboard = spyOn(fixture.debugElement.injector.get(Clipboard), 'copy').and.returnValue(true);
    const toast = spyOn(TestBed.inject(ToastService), 'show');
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.ds-endpoint button');
    const paths = ['/entry/list', '/entry/count', '/entry/resync', '/public/entry/list'];
    buttons.forEach((button, index) => {
      button.click();
      const url = `${component.baseApi}${paths[index]}?datasetId=12`;
      expect(button.parentElement!.querySelector('code')!.textContent).toBe(url);
      expect(clipboard).toHaveBeenCalledWith(url);
    });
    expect(toast).toHaveBeenCalledWith('Endpoint copied to clipboard', jasmine.anything());
    clipboard.and.returnValue(false);
    buttons[0].click();
    expect(toast).toHaveBeenCalledWith('Failed to copy endpoint', jasmine.anything());
  });
});
