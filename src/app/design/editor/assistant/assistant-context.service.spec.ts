import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { ScreenService } from '../../../service/screen.service';
import { AppService } from '../../../service/app.service';
import { GroupService } from '../../../service/group.service';
import { LookupService } from '../../../run/_service/lookup.service';
import { AssistantContextService } from './assistant-context.service';
import { LambdaService } from '../../../service/lambda.service';
import { MailerService } from '../../../service/mailer.service';

describe('AssistantContextService', () => {
  let forms: jasmine.SpyObj<FormService>;
  let datasets: jasmine.SpyObj<DatasetService>;
  let screens: jasmine.SpyObj<ScreenService>;
  let dashboards: jasmine.SpyObj<DashboardService>;
  let app: jasmine.SpyObj<AppService>;
  let lambdas: jasmine.SpyObj<LambdaService>;
  let mailers: jasmine.SpyObj<MailerService>;

  beforeEach(() => {
    forms = jasmine.createSpyObj<FormService>('FormService', [
      'getListBasic',
      'getSectionList',
      'getItemList',
      'getTabList',
      'getForm',
    ]);
    forms.getListBasic.and.returnValue(of({ content: [{ id: 7, title: 'Leave request', code: 'leave' }] }));
    forms.getSectionList.and.returnValue(of([{
      id: 12,
      title: 'Details',
      type: 'section',
      size: 'col-sm-12',
      hideHeader: true,
      parent: { id: 3 },
      items: [{ id: 31, code: 'reason' }],
    }]));
    forms.getItemList.and.returnValue(of([{
      id: 21,
      label: 'Reason',
      code: 'reason',
      type: 'text',
      v: { required: true },
    }]));
    forms.getTabList.and.returnValue(of([{ id: 3, title: 'Request', code: 'request' }]));
    forms.getForm.and.returnValue(of({
      f: 'initialize form',
      onSave: 'save form',
      tiers: [{ id: 40, name: 'Manager approval', type: 'PERSON', section: { id: 12 }, sortOrder: 0 }],
    }));

    datasets = jasmine.createSpyObj<DatasetService>('DatasetService', ['getDatasetList', 'getDataset']);
    datasets.getDatasetList.and.returnValue(of([{ id: 8, title: 'Requests', code: 'requests', type: 'all' }]));
    datasets.getDataset.and.returnValue(of({
      id: 8,
      title: 'Requests',
      code: 'requests',
      type: 'all',
      items: [{ id: 81, code: 'request_code', label: 'Request code', type: 'text', sortOrder: 0 }],
    }));
    dashboards = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'getDashboardList',
      'getDashboard',
    ]);
    dashboards.getDashboardList.and.returnValue(of([{ id: 9, title: 'Overview' }]));
    dashboards.getDashboard.and.returnValue(of({ id: 9, title: 'Overview', charts: [{ id: 91 }] }));
    screens = jasmine.createSpyObj<ScreenService>('ScreenService', ['getScreenList', 'getScreen']);
    screens.getScreenList.and.returnValue(of([{ id: 88, title: 'Review', type: 'static' }]));
    screens.getScreen.and.callFake((id: number) => of({
      id,
      title: 'Review',
      type: 'static',
      data: { content: '<h1>Review request</h1>', f: '$this$.initialized = true;' },
    }));
    app = jasmine.createSpyObj<AppService>('AppService', ['getNavisAll']);
    app.getNavisAll.and.returnValue(of([{
      id: 91,
      title: 'Main',
      items: [{ id: 92, title: 'Requests', type: 'dataset', screenId: 8 }],
    }]));
    const groups = jasmine.createSpyObj<GroupService>('GroupService', ['getGroupList']);
    groups.getGroupList.and.returnValue(of({ content: [{ id: 70, name: 'Approvers' }] }));
    lambdas = jasmine.createSpyObj<LambdaService>('LambdaService', ['getLambdaList', 'getLambda']);
    lambdas.getLambdaList.and.returnValue(of({ content: [{ id: 71, name: 'Notify', code: 'notify', lang: 'js' }] }));
    lambdas.getLambda.and.returnValue(of({
      id: 71, name: 'Notify', code: 'notify', lang: 'js', data: { f: 'print("hello")' },
      binds: [{ id: 710, name: 'Mailer', type: '_mail' }],
    }));
    mailers = jasmine.createSpyObj<MailerService>('MailerService', ['getMailerList', 'getMailer']);
    mailers.getMailerList.and.returnValue(of({ content: [{ id: 80, name: 'Approved', subject: 'Approved' }] }));
    mailers.getMailer.and.returnValue(of({
      id: 80, name: 'Approved', subject: 'Approved', content: '<p>Approved</p>', enabled: 1,
    }));

    TestBed.configureTestingModule({
      providers: [
        AssistantContextService,
        { provide: FormService, useValue: forms },
        { provide: DatasetService, useValue: datasets },
        { provide: DashboardService, useValue: dashboards },
        { provide: ScreenService, useValue: screens },
        { provide: LookupService, useValue: { getFullLookupList: () => of({ content: [{ id: 11, name: 'Countries' }] }) } },
        { provide: AppService, useValue: app },
        { provide: GroupService, useValue: groups },
        { provide: LambdaService, useValue: lambdas },
        { provide: MailerService, useValue: mailers },
      ],
    });
  });

  it('includes existing section, field, and tab ids for the selected form', async () => {
    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build({ id: 1 }, { formId: 7 })
    );
    const form = context.entities.forms[0];

    expect(context.selectedFormId).toBe(7);
    expect(form.title).toBe('Leave request');
    expect(form.tabs?.[0].id).toBe(3);
    expect(form.onInit).toBe('initialize form');
    expect(form.onSave).toBe('save form');
    expect(form.tiers?.[0]).toEqual(jasmine.objectContaining({ id: 40, name: 'Manager approval', sectionRef: '12' }));
    expect(form.sections?.[0].id).toBe(12);
    expect(form.sections?.[0].parentRef).toBe('3');
    expect(form.sections?.[0].size).toBe('col-sm-12');
    expect(form.sections?.[0].hideHeader).toBe(true);
    expect(form.sections?.[0].items?.[0]).toEqual(jasmine.objectContaining({
      id: 21,
      label: 'Reason',
      code: 'reason',
      required: true,
    }));
    expect(context.entities.datasets[0].items?.[0]).toEqual(jasmine.objectContaining({
      id: 81,
      code: 'request_code',
      label: 'Request code',
    }));
    expect(context.entities.navigation[0].items[0]).toEqual(jasmine.objectContaining({
      id: 92,
      title: 'Requests',
      type: 'dataset',
      targetId: 8,
    }));
    expect(context.entities.groups[0]).toEqual(jasmine.objectContaining({ id: 70, name: 'Approvers' }));
    expect(context.entities.lookups[0]).toEqual(jasmine.objectContaining({ id: 11, name: 'Countries' }));
  });

  it('includes fields for a form explicitly referenced by ID in the request', async () => {
    forms.getListBasic.and.returnValue(of({ content: [
      { id: 7, title: 'Leave request', code: 'leave' },
      { id: 6698, title: 'Equipment request', code: 'equipment' },
    ] }));
    forms.getSectionList.and.callFake((formId: number) => of([{
      id: formId + 1,
      title: 'Details',
      items: [{ code: 'asset' }],
    }]));
    forms.getItemList.and.callFake((formId: number) => of([{
      id: formId + 2,
      label: 'Asset',
      code: 'asset',
      type: 'text',
    }]));

    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build(
        { id: 1 },
        {},
        'Create a dataset from form 6698 and include all items'
      )
    );

    expect(forms.getItemList).toHaveBeenCalledWith(6698, { size: 9999, page: 0 });
    expect(context.entities.forms.find((form) => form.id === 6698)?.sections?.[0].items?.[0]).toEqual(
      jasmine.objectContaining({ id: 6700, label: 'Asset', code: 'asset' })
    );
  });

  it('places included full entities in their regular context collections', async () => {
    const fullForm = { id: 7, title: 'Leave request', code: 'leave', metadata: { source: 'editor' } };
    const fullDataset = {
      id: 8,
      title: 'Requests',
      code: 'requests',
      items: [{ id: 81, code: 'request_code', label: 'Request code' }],
    };

    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build(
        { id: 1 },
        { includedFormIds: [7] },
        '',
        [
          { type: 'form', id: 7, label: 'Leave request', data: fullForm },
          { type: 'dataset', id: 8, label: 'Requests', data: fullDataset },
        ]
      )
    );

    const form = context.entities.forms.find((entity) => entity.id === 7);
    expect(form?.sections?.[0].items?.[0].code).toBe('reason');
    expect(form?.fullData).toEqual(fullForm);
    expect(context.entities.datasets[0].fullData).toEqual(fullDataset);
  });

  it('lists component options and loads full selected entity data', async () => {
    forms.getItemList.and.returnValue(of([
      { id: 21, code: 'reason', label: 'Reason' },
      { id: 22, code: 'amount', label: 'Amount' },
    ]));
    const contextService = TestBed.inject(AssistantContextService);

    const [formOptions, datasetOptions, dashboardOptions, screenOptions, navigationOptions] = await Promise.all([
      firstValueFrom(contextService.listPromptEntityOptions(1, 'form')),
      firstValueFrom(contextService.listPromptEntityOptions(1, 'dataset')),
      firstValueFrom(contextService.listPromptEntityOptions(1, 'dashboard')),
      firstValueFrom(contextService.listPromptEntityOptions(1, 'screen')),
      firstValueFrom(contextService.listPromptEntityOptions(1, 'navigation')),
    ]);
    const form = await firstValueFrom(contextService.getPromptEntity(1, 'form', 7));
    const dashboard = await firstValueFrom(contextService.getPromptEntity(1, 'dashboard', 9));

    expect(formOptions).toEqual([{ id: 7, label: 'Leave request' }]);
    expect(datasetOptions).toEqual([{ id: 8, label: 'Requests' }]);
    expect(dashboardOptions).toEqual([{ id: 9, label: 'Overview' }]);
    expect(screenOptions).toEqual([{ id: 88, label: 'Review' }]);
    expect(navigationOptions).toEqual([{ id: 91, label: 'Main' }]);
    expect(form).toEqual(jasmine.objectContaining({
      items: [
        { id: 21, code: 'reason', label: 'Reason' },
        { id: 22, code: 'amount', label: 'Amount' },
      ],
      sections: jasmine.any(Array),
      tabs: jasmine.any(Array),
    }));
    expect(dashboard).toEqual({ id: 9, title: 'Overview', charts: [{ id: 91 }] });
  });

  it('prioritizes the open dataset when limiting detail requests', async () => {
    const datasetList = Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      title: `Dataset ${index + 1}`,
    }));
    datasets.getDatasetList.and.returnValue(of(datasetList));
    datasets.getDataset.and.callFake((id: number) => of({
      id,
      title: `Dataset ${id}`,
      items: Array.from({ length: 101 }, (_, index) => ({
        id: index + 1,
        label: 'L'.repeat(450),
        code: `field_${index + 1}`,
      })),
    }));

    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build({ id: 1 }, { datasetId: 11 })
    );

    expect(datasets.getDataset).toHaveBeenCalledTimes(10);
    expect(datasets.getDataset).toHaveBeenCalledWith(11);
    expect(context.selectedDatasetId).toBe(11);
    expect(context.entities.datasets.length).toBe(11);
    expect(context.entities.datasets[0].id).toBe(11);
    expect(context.entities.datasets[0].items?.length).toBe(100);
    expect(context.entities.datasets[0].itemsTruncated).toBe(1);
    expect(context.entities.datasets[0].itemsMayBeIncomplete).toBeTrue();
    expect(context.entities.datasets[0].items?.[0].label?.length).toBe(403);
    expect(context.entities.datasets[10].itemsMayBeIncomplete).toBeTrue();
  });

  it('clips long form text while preserving field order within each section', async () => {
    forms.getSectionList.and.returnValue(of([{
      id: 12,
      title: 'Details',
      description: 'D'.repeat(450),
      items: [{ code: 'first' }, { code: 'second' }],
    }]));
    forms.getItemList.and.returnValue(of([
      { id: 22, label: 'Second', code: 'second' },
      { id: 21, label: 'First', code: 'first' },
    ]));

    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build({ id: 1 }, { formId: 7 })
    );

    expect(context.entities.forms[0].sections?.[0].description?.length).toBe(403);
    expect(context.entities.forms[0].sections?.[0].items?.map((item) => item.id)).toEqual([22, 21]);
  });

  it('includes the open screen template in the assistant context', async () => {
    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build({ id: 1 }, { screenId: 88 })
    );

    expect(context.selectedScreenId).toBe(88);
    expect(screens.getScreen).toHaveBeenCalledWith(88);
    expect(context.entities.screens[0]).toEqual(jasmine.objectContaining({
      id: 88,
      data: { content: '<h1>Review request</h1>', f: '$this$.initialized = true;' },
    }));
  });

  it('includes selected lambda source, bindings, and email template content', async () => {
    const context = await firstValueFrom(
      TestBed.inject(AssistantContextService).build(
        { id: 1 },
        { lambdaId: 71, emailTemplateId: 80 }
      )
    );

    expect(context.selectedLambdaId).toBe(71);
    expect(context.entities.lambdas[0]).toEqual(jasmine.objectContaining({
      id: 71,
      data: { f: 'print("hello")' },
      binds: [jasmine.objectContaining({ id: 710, type: '_mail' })],
    }));
    expect(context.entities.emailTemplates[0]).toEqual(jasmine.objectContaining({
      id: 80,
      content: '<p>Approved</p>',
    }));
    expect(context.knowledge['lambdaScriptingReference']).toEqual(jasmine.arrayContaining([
      jasmine.objectContaining({ symbol: '_entry.dataset', binding: '_entry' }),
      jasmine.objectContaining({ symbol: '_mail.sendWithTemplate', binding: '_mail' }),
      jasmine.objectContaining({ symbol: 'dataset_<datasetId>', binding: 'dataset' }),
    ]));
  });
});
