import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardService } from '../../../service/dashboard.service';
import { DatasetService } from '../../../service/dataset.service';
import { FormService } from '../../../service/form.service';
import { ScreenService } from '../../../service/screen.service';
import { AppService } from '../../../service/app.service';
import { AssistantExecutorService } from './assistant-executor.service';

describe('AssistantExecutorService', () => {
  let formService: jasmine.SpyObj<FormService>;
  let datasetService: jasmine.SpyObj<DatasetService>;
  let appService: jasmine.SpyObj<AppService>;
  let screenService: jasmine.SpyObj<ScreenService>;

  beforeEach(() => {
    formService = jasmine.createSpyObj<FormService>('FormService', [
      'getItemList', 'saveItemOnly', 'getForm', 'saveSection', 'saveForm', 'saveTab', 'removeTab',
      'saveTier', 'removeTier', 'saveItem', 'removeItem', 'removeSection',
    ]);
    formService.getItemList.and.returnValue(of({ content: [
      { id: 19, code: 'reason', label: 'Old label', x: {}, v: {} },
    ] }));
    formService.saveItemOnly.and.returnValue(of({}));
    formService.saveSection.and.returnValue(of({}));
    formService.saveItem.and.returnValue(of({ id: 20 }));
    formService.removeItem.and.returnValue(of({}));
    formService.removeSection.and.returnValue(of({}));
    formService.saveForm.and.returnValue(of({ id: 7 }));
    formService.saveTab.and.returnValue(of({ id: 15 }));
    formService.removeTab.and.returnValue(of({}));
    formService.saveTier.and.returnValue(of({ id: 41 }));
    formService.removeTier.and.returnValue(of({}));
    formService.getForm.and.returnValue(of({
      id: 7,
      title: 'Existing form',
      sections: [{
        id: 12,
        title: 'Old title',
        size: 'col-sm-12',
        x: { facet: { add: true }, sticky: false },
      }],
    }));
    datasetService = jasmine.createSpyObj<DatasetService>('DatasetService', ['getDataset', 'updateDatasetItem', 'removeDatasetItem']);
    datasetService.getDataset.and.returnValue(of({ id: 50, items: [{ id: 51, code: 'request', label: 'Request' }] }));
    datasetService.updateDatasetItem.and.returnValue(of({ id: 52 }));
    datasetService.removeDatasetItem.and.returnValue(of({}));
    appService = jasmine.createSpyObj<AppService>('AppService', [
      'getNavisAll', 'addNaviGroup', 'removeNaviGroup', 'addNaviItem', 'removeNaviItem',
    ]);
    appService.getNavisAll.and.returnValue(of([{ id: 60, title: 'Main', items: [{ id: 61, title: 'Old', type: 'screen' }] }]));
    appService.addNaviGroup.and.returnValue(of({ id: 62 }));
    appService.addNaviItem.and.returnValue(of({ id: 63 }));
    appService.removeNaviGroup.and.returnValue(of({}));
    appService.removeNaviItem.and.returnValue(of({}));
    screenService = jasmine.createSpyObj<ScreenService>('ScreenService', ['saveScreen', 'getScreen']);
    screenService.saveScreen.and.returnValue(of({ id: 90 }));
    screenService.getScreen.and.returnValue(of({
      id: 90,
      title: 'Review',
      data: { content: '<p>Old</p>', comps: [{ type: 'dataset', screenId: 50 }] },
    }));

    TestBed.configureTestingModule({
      providers: [
        AssistantExecutorService,
        { provide: FormService, useValue: formService },
        { provide: DatasetService, useValue: datasetService },
        { provide: DashboardService, useValue: {} },
        { provide: ScreenService, useValue: screenService },
        { provide: AppService, useValue: appService },
      ],
    });
  });

  it('resolves and updates an item from the form item endpoint', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'rename_reason',
      kind: 'update_item',
      payload: { formRef: '7', itemRef: '19', patch: { label: 'New label' } },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(Object.keys(result)).not.toContain('restorePointId');
    expect(formService.getItemList).toHaveBeenCalledWith(7, { size: 9999, page: 0 });
    expect(formService.saveItemOnly).toHaveBeenCalledWith(7, jasmine.objectContaining({
      id: 19,
      label: 'New label',
    }));
  });

  it('refuses selected steps with missing prerequisites before making changes', async () => {
    let error = '';
    try {
      await TestBed.inject(AssistantExecutorService).apply(2, [{
        id: 'add_details',
        kind: 'add_section',
        payload: { formRef: '$create_form', title: 'Details' },
      }], { includeIds: ['add_details'], email: 'creator@example.com' });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    expect(error).toContain('Some selected steps are waiting for required steps.');
    expect(formService.saveSection).not.toHaveBeenCalled();
  });

  it('pauses execution while clarification is required', async () => {
    let error = '';
    try {
      await TestBed.inject(AssistantExecutorService).apply(2, [{
        id: 'create_form',
        kind: 'create_form',
        payload: { title: 'Stock form' },
      }], { includeIds: ['create_form'], requiresResponse: true, email: 'creator@example.com' });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    expect(error).toContain('The assistant is waiting for your reply.');
    expect(formService.saveForm).not.toHaveBeenCalled();
  });

  it('reuses and updates a form item snapshot across update actions', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'rename_reason',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '19', patch: { label: 'New label' } },
      },
      {
        id: 'hide_reason',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '19', patch: { hidden: true } },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.getItemList).toHaveBeenCalledOnceWith(7, { size: 9999, page: 0 });
    expect(formService.saveItemOnly.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({
      id: 19,
      label: 'New label',
      hidden: true,
    }));
  });

  it('updates screen template content inside data while preserving other screen data', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'update_review',
      kind: 'update_screen',
      payload: { screenRef: '90', content: '<p>Updated</p>', f: '$this$.initialized = true;' },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(screenService.saveScreen).toHaveBeenCalledWith(2, jasmine.objectContaining({
      id: 90,
      data: {
        content: '<p>Updated</p>',
        f: '$this$.initialized = true;',
        comps: [{ type: 'dataset', screenId: 50 }],
      },
    }));
  });

  it('validates templates with scoped expressions without executing them', async () => {
    const content = `<x-foreach $="mail of $this$.mailList">
  {{mail.subject}}
  <button onclick="$this$.refresh()">refresh</button>
</x-foreach>
<x-markdown>
~~~mermaid
graph TD
  A --> B
~~~
</x-markdown>`;

    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'update_review',
      kind: 'update_screen',
      payload: { screenRef: '90', content },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(screenService.saveScreen).toHaveBeenCalledWith(2, jasmine.objectContaining({
      data: jasmine.objectContaining({ content }),
    }));
  });

  it('creates a screen with its init JavaScript stored in data.f', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'create_home',
      kind: 'create_screen',
      payload: {
        title: 'Home',
        type: 'static',
        content: '<h1>Home</h1>',
        f: '$this$.initialized = true;',
      },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(screenService.saveScreen).toHaveBeenCalledWith(2, jasmine.objectContaining({
      data: {
        content: '<h1>Home</h1>',
        f: '$this$.initialized = true;',
      },
    }));
  });

  it('refreshes the item snapshot after adding an item', async () => {
    formService.getItemList.and.returnValues(
      of([{ id: 19, code: 'reason', label: 'Reason', x: {}, v: {} }]),
      of([
        { id: 19, code: 'reason', label: 'Reason', x: {}, v: {} },
        { id: 20, code: 'new_field', label: 'New field', x: {}, v: {} },
      ])
    );

    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'rename_reason',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '19', patch: { label: 'Updated reason' } },
      },
      {
        id: 'add_field',
        kind: 'add_section_item',
        payload: { formRef: '7', sectionRef: '12', label: 'New field', code: 'new_field', type: 'text' },
      },
      {
        id: 'rename_new_field',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '$add_field', patch: { label: 'Renamed field' } },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.getItemList).toHaveBeenCalledTimes(2);
    expect(formService.saveItemOnly.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({
      id: 20,
      label: 'Renamed field',
    }));
  });

  it('refreshes the item snapshot after removing an item', async () => {
    formService.getItemList.and.returnValues(
      of([
        { id: 19, code: 'reason', label: 'Reason', x: {}, v: {} },
        { id: 20, code: 'status', label: 'Status', x: {}, v: {} },
      ]),
      of([{ id: 20, code: 'status', label: 'Status', x: {}, v: {} }])
    );

    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'update_status',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '20', patch: { label: 'Updated status' } },
      },
      {
        id: 'remove_reason',
        kind: 'remove_item',
        payload: { formRef: '7', itemRef: '19' },
      },
      {
        id: 'update_status_again',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '20', patch: { hidden: true } },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.removeItem).toHaveBeenCalledOnceWith(7, 19);
    expect(formService.getItemList).toHaveBeenCalledTimes(2);
  });

  it('refreshes the item snapshot after removing a section', async () => {
    formService.getItemList.and.returnValues(
      of([
        { id: 19, code: 'reason', label: 'Reason', x: {}, v: {} },
        { id: 20, code: 'status', label: 'Status', x: {}, v: {} },
      ]),
      of([{ id: 20, code: 'status', label: 'Status', x: {}, v: {} }])
    );

    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'update_status_before_remove',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '20', patch: { label: 'Updated status' } },
      },
      {
        id: 'remove_details',
        kind: 'remove_section',
        payload: { formRef: '7', sectionRef: '12' },
      },
      {
        id: 'update_status',
        kind: 'update_item',
        payload: { formRef: '7', itemRef: '20', patch: { hidden: true } },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.removeSection).toHaveBeenCalledOnceWith(12);
    expect(formService.getItemList).toHaveBeenCalledTimes(2);
  });

  it('updates section properties while preserving existing fields and merging x settings', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'rename_details',
      kind: 'update_section',
      payload: { formRef: '7', sectionRef: '12', patch: { title: 'Request details', x: { sticky: true } } },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.saveSection).toHaveBeenCalledWith(7, jasmine.objectContaining({
      id: 12,
      title: 'Request details',
      size: 'col-sm-12',
      x: { facet: { add: true }, sticky: true },
    }));
  });

  it('updates a form lifecycle hook without replacing its other properties', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'update_lifecycle',
      kind: 'update_form',
      payload: { formRef: '7', patch: { onInit: 'initialize()', onView: 'refreshView()' } },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.saveForm).toHaveBeenCalledWith(2, jasmine.objectContaining({
      id: 7,
      f: 'initialize()',
      onView: 'refreshView()',
      title: 'Existing form',
    }));
  });

  it('adds a dataset item through the dataset item API and avoids duplicate codes', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'add_column',
      kind: 'add_dataset_item',
      payload: { datasetRef: '50', label: 'Request', code: 'request' },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(datasetService.updateDatasetItem).toHaveBeenCalledWith(50, jasmine.objectContaining({
      label: 'Request',
      code: 'request_2',
      sortOrder: 1,
    }));
  });

  it('creates navigation groups and refreshes navigation through the normal app API', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'main_nav',
      kind: 'create_navi_group',
      payload: { title: 'Main' },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(appService.addNaviGroup).toHaveBeenCalledWith(2, jasmine.objectContaining({
      title: 'Main',
      sortOrder: 1,
      x: { type: 'menu' },
    }));
  });

  it('creates a combined screen with resolved components in data.comps and no template', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'combined_home',
      kind: 'create_screen',
      payload: {
        title: 'Home',
        type: 'combine',
        comps: [{ type: 'dataset', targetRef: '50', title: 'Requests' }],
      },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(screenService.saveScreen).toHaveBeenCalledWith(2, jasmine.objectContaining({
      type: 'combine',
      data: {
        comps: [{ type: 'dataset', title: 'Requests', appId: 2, screenId: 50 }],
      },
    }));
  });
});
