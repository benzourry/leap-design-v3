import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardService } from '../../../service/dashboard.service';
import { DatasetService } from '../../../service/dataset.service';
import { FormService } from '../../../service/form.service';
import { ScreenService } from '../../../service/screen.service';
import { AppService } from '../../../service/app.service';
import { LambdaService } from '../../../service/lambda.service';
import { MailerService } from '../../../service/mailer.service';
import { AssistantExecutorService } from './assistant-executor.service';

describe('AssistantExecutorService', () => {
  let formService: jasmine.SpyObj<FormService>;
  let datasetService: jasmine.SpyObj<DatasetService>;
  let appService: jasmine.SpyObj<AppService>;
  let screenService: jasmine.SpyObj<ScreenService>;
  let lambdaService: jasmine.SpyObj<LambdaService>;
  let mailerService: jasmine.SpyObj<MailerService>;

  beforeEach(() => {
    formService = jasmine.createSpyObj<FormService>('FormService', [
      'getItemList', 'saveItemOnly', 'getForm', 'saveSection', 'saveForm', 'saveTab', 'removeTab',
      'saveTier', 'removeTier', 'saveItem', 'removeItem', 'removeSection',
      'saveTierAction', 'removeTierAction',
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
    datasetService = jasmine.createSpyObj<DatasetService>('DatasetService', [
      'getDataset', 'updateDatasetItem', 'removeDatasetItem', 'saveAction', 'removeAction', 'saveDataset',
    ]);
    datasetService.getDataset.and.returnValue(of({ id: 50, items: [{ id: 51, code: 'request', label: 'Request' }] }));
    datasetService.updateDatasetItem.and.returnValue(of({ id: 52 }));
    datasetService.removeDatasetItem.and.returnValue(of({}));
    datasetService.saveAction.and.returnValue(of({ id: 53 }));
    datasetService.removeAction.and.returnValue(of({}));
    datasetService.saveDataset.and.callFake((_appId, dataset) => of({
      ...dataset,
      filters: (dataset.filters ?? []).map((filter, index) => ({ id: filter.id ?? 520 + index, ...filter })),
    }));
    appService = jasmine.createSpyObj<AppService>('AppService', [
      'getNavisAll', 'addNaviGroup', 'removeNaviGroup', 'addNaviItem', 'removeNaviItem',
    ]);
    appService.getNavisAll.and.returnValue(of([{ id: 60, title: 'Main', items: [{ id: 61, title: 'Old', type: 'screen' }] }]));
    appService.addNaviGroup.and.returnValue(of({ id: 62 }));
    appService.addNaviItem.and.returnValue(of({ id: 63 }));
    appService.removeNaviGroup.and.returnValue(of({}));
    appService.removeNaviItem.and.returnValue(of({}));
    screenService = jasmine.createSpyObj<ScreenService>('ScreenService', [
      'saveScreen', 'getScreen', 'saveAction', 'removeAction',
    ]);
    screenService.saveScreen.and.returnValue(of({ id: 90 }));
    screenService.getScreen.and.returnValue(of({
      id: 90,
      title: 'Review',
      data: { content: '<p>Old</p>', comps: [{ type: 'dataset', screenId: 50 }] },
      actions: [{ id: 91, label: 'Open', nextType: 'form', next: 7, x: {} }],
    }));
    screenService.saveAction.and.returnValue(of({ id: 92 }));
    screenService.removeAction.and.returnValue(of({}));
    formService.saveTierAction.and.returnValue(of({ id: 42 }));
    formService.removeTierAction.and.returnValue(of({}));
    lambdaService = jasmine.createSpyObj<LambdaService>('LambdaService', [
      'save', 'getLambda', 'deleteLambda', 'isCodeTaken',
    ]);
    lambdaService.isCodeTaken.and.returnValue(of(false));
    lambdaService.getLambda.and.returnValue(of({
      id: 70, appId: 2, name: 'Notify', email: 'creator@example.com',
      data: { f: 'print("old")' }, binds: [{ id: 701, name: 'Mailer', type: '_mail' }],
    }));
    lambdaService.save.and.callFake((_email, _appId, lambda) => of({
      ...lambda,
      id: lambda.id ?? 70,
      binds: lambda.binds?.map((binding, index) => ({ id: binding.id ?? 702 + index, ...binding })),
    }));
    lambdaService.deleteLambda.and.returnValue(of({}));
    mailerService = jasmine.createSpyObj<MailerService>('MailerService', ['save', 'getMailer', 'deleteMailer']);
    mailerService.getMailer.and.returnValue(of({
      id: 80, appId: 2, name: 'Approved', subject: 'Old', content: '<p>Old</p>', enabled: 1,
    }));
    mailerService.save.and.callFake((_email, _appId, template) => of({ ...template, id: template.id ?? 80 }));
    mailerService.deleteMailer.and.returnValue(of({}));

    TestBed.configureTestingModule({
      providers: [
        AssistantExecutorService,
        { provide: FormService, useValue: formService },
        { provide: DatasetService, useValue: datasetService },
        { provide: DashboardService, useValue: {} },
        { provide: ScreenService, useValue: screenService },
        { provide: AppService, useValue: appService },
        { provide: LambdaService, useValue: lambdaService },
        { provide: MailerService, useValue: mailerService },
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

  it('adds and updates child actions without replacing their parents', async () => {
    formService.getForm.and.returnValue(of({
      id: 7,
      appId: 2,
      tiers: [{ id: 40, name: 'Manager', actions: {} }],
    }));
    datasetService.getDataset.and.returnValue(of({
      id: 50, appId: 2, items: [], actions: [{ id: 51, label: 'Old', action: 'view', x: {} }],
    }));

    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'tier_action',
        kind: 'add_tier_action',
        payload: { formRef: '7', tierRef: '40', label: 'Approve', code: 'approve', action: 'nextTier' },
      },
      {
        id: 'dataset_action',
        kind: 'update_dataset_action',
        payload: { datasetRef: '50', actionRef: '51', patch: { label: 'Open', x: { confirm: true } } },
      },
      {
        id: 'screen_action',
        kind: 'update_screen_action',
        payload: { screenRef: '90', actionRef: '91', patch: { label: 'Review' } },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(formService.saveTierAction).toHaveBeenCalledWith(7, 40, jasmine.objectContaining({
      code: 'approve', label: 'Approve', action: 'nextTier',
    }));
    expect(datasetService.saveAction).toHaveBeenCalledWith(50, jasmine.objectContaining({
      id: 51, label: 'Open', x: { confirm: true },
    }));
    expect(screenService.saveAction).toHaveBeenCalledWith(90, jasmine.objectContaining({
      id: 91, label: 'Review',
    }));
  });

  it('persists dataset filters and resolves their form reference', async () => {
    datasetService.getDataset.and.returnValue(of({
      id: 50, appId: 2, items: [], actions: [], filters: [],
    }));

    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'amount_filter',
      kind: 'add_dataset_filter',
      payload: {
        datasetRef: '50', label: 'Amount', code: 'amount', formIdRef: '7',
        root: 'data', prefix: '$', type: 'number',
      },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(datasetService.saveDataset).toHaveBeenCalledWith(2, jasmine.objectContaining({
      id: 50,
      filters: [jasmine.objectContaining({
        code: 'amount', formId: 7, root: 'data', prefix: '$',
      })],
    }));
  });

  it('authors lambda code in data.f and mutates bindings through a full save', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'author_lambda',
        kind: 'update_lambda',
        payload: { lambdaRef: '70', patch: { source: 'print("new");', publicAccess: true } },
      },
      {
        id: 'bind_dataset',
        kind: 'add_lambda_binding',
        payload: {
          lambdaRef: '70',
          binding: { name: 'Requests', type: 'dataset', sourceRef: '50' },
        },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(lambdaService.save.calls.argsFor(0)[2]).toEqual(jasmine.objectContaining({
      publicAccess: true,
      data: { f: 'print("new");' },
    }));
    expect(lambdaService.save.calls.argsFor(1)[2]).toEqual(jasmine.objectContaining({
      binds: jasmine.arrayContaining([
        jasmine.objectContaining({ name: 'Requests', type: 'dataset', srcId: 50 }),
      ]),
    }));
  });

  it('checks generated lambda code and adds every missing required binding', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [{
      id: 'send_and_query',
      kind: 'update_lambda',
      payload: {
        lambdaRef: '70',
        patch: {
          source: `
const rows = dataset_50.forEach(e => print(e.getId()));
_mail.sendWithTemplate(80, rows, _this);
const result = _entry.dataset(50, {}, _user.email, _this);
`,
        },
      },
    }], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    const saved = lambdaService.save.calls.mostRecent().args[2];
    expect(saved.binds).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ type: 'dataset', srcId: 50 }),
      jasmine.objectContaining({ type: '_mail' }),
      jasmine.objectContaining({ type: '_entry' }),
      jasmine.objectContaining({ type: '_user' }),
    ]));
  });

  it('updates email templates and resolves mailer assignments on forms', async () => {
    const result = await TestBed.inject(AssistantExecutorService).apply(2, [
      {
        id: 'mailer',
        kind: 'update_email_template',
        payload: { emailTemplateRef: '80', patch: { subject: 'Request approved', content: '<p>Approved</p>' } },
      },
      {
        id: 'assign_mailer',
        kind: 'update_form',
        payload: { formRef: '7', patch: { addMailerRefs: ['80'] } },
      },
    ], { email: 'creator@example.com' });

    expect(result.failed).toBe(0);
    expect(mailerService.save).toHaveBeenCalledWith('creator@example.com', 2, jasmine.objectContaining({
      id: 80, subject: 'Request approved',
    }));
    expect(formService.saveForm).toHaveBeenCalledWith(2, jasmine.objectContaining({
      addMailer: [80],
    }));
  });
});
