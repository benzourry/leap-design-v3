import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { CommService } from '../../_shared/service/comm.service';
import { ToastService } from '../../_shared/service/toast-service';
import { LookupService } from '../../run/_service/lookup.service';
import { BucketService } from '../../service/bucket.service';
import { CognaService } from '../../service/cogna.service';
import { DashboardService } from '../../service/dashboard.service';
import { DatasetService } from '../../service/dataset.service';
import { FormService } from '../../service/form.service';
import { GroupService } from '../../service/group.service';
import { KryptaService } from '../../service/krypta.service';
import { LambdaService } from '../../service/lambda.service';
import { MailerService } from '../../service/mailer.service';
import { ScreenService } from '../../service/screen.service';
import { EditorSearchService } from './editor-search.service';

describe('EditorSearchService', () => {
  const emptyPage = () => of({ content: [] });
  let lookup: jasmine.Spy;
  let forms: jasmine.Spy;

  beforeEach(() => {
    lookup = jasmine.createSpy().and.returnValue(of({ content: [{ id: 8, name: 'Old' }] }));
    forms = jasmine.createSpy().and.returnValue(of({ content: [{ id: 3, title: 'Form' }] }));
    TestBed.configureTestingModule({
      providers: [
        EditorSearchService,
        { provide: FormService, useValue: { getListBasic: forms } },
        { provide: DatasetService, useValue: { getDatasetList: () => of([{ id: 4, title: 'Dataset' }]) } },
        { provide: DashboardService, useValue: { getDashboardList: () => of([]) } },
        { provide: ScreenService, useValue: { getScreenList: () => of([]) } },
        { provide: GroupService, useValue: { getGroupList: emptyPage } },
        { provide: MailerService, useValue: { getMailerList: emptyPage } },
        { provide: LookupService, useValue: { getLookupList: lookup } },
        { provide: BucketService, useValue: { getBucketList: emptyPage } },
        { provide: LambdaService, useValue: { getLambdaList: emptyPage } },
        { provide: CognaService, useValue: { getCognaList: emptyPage } },
        { provide: KryptaService, useValue: { getWalletList: emptyPage, getContractList: () => of({ content: [{ id: 9, name: 'Contract' }] }) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    });
  });

  it('loads search destinations without a UI sidebar and replaces changed results', () => {
    const search = TestBed.inject(EditorSearchService);
    search.load(1);
    expect(search.items()).toEqual(jasmine.arrayContaining([
      { icon: ['far', 'plus-square'], name: 'Form: Form', route: ['ui', 'form'], opt: { queryParams: { id: 3 } } },
      { icon: ['fas', 'list'], name: 'Dataset: Dataset', route: ['ui', 'dataset'], opt: { queryParams: { id: 4 } } },
      { icon: ['fas', 'hashtag'], name: 'Contract: Contract', route: ['krypta'], opt: { queryParams: { contractId: 9 } } }
    ]));
    lookup.and.returnValue(of({ content: [{ id: 10, name: 'New' }] }));
    TestBed.inject(CommService).emitChange({ key: 'assistant-lookup' });
    expect(search.items().map(item => item.name)).toContain('Lookup: New');
    expect(search.items().map(item => item.name)).not.toContain('Lookup: Old');
  });

  it('discards outstanding results when the app changes', () => {
    const previous = new Subject<{ content: { id: number; title: string }[] }>();
    forms.and.returnValues(previous, of({ content: [{ id: 2, title: 'Current' }] }));
    const search = TestBed.inject(EditorSearchService);
    search.load(1);
    search.load(2);
    previous.next({ content: [{ id: 1, title: 'Previous' }] });
    expect(search.items().map(item => item.name)).toContain('Form: Current');
    expect(search.items().map(item => item.name)).not.toContain('Form: Previous');
  });
});
