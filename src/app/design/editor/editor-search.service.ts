import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, map } from 'rxjs';
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

interface SearchSourceItem {
  id: number;
  title?: string;
  name?: string;
}

interface SearchPage {
  content: SearchSourceItem[];
}

export interface EditorSearchItem {
  icon: [string, string];
  name: string;
  route: string[];
  opt: { queryParams: Record<string, number> };
}

type SearchCategory = 'form' | 'dataset' | 'dashboard' | 'screen' | 'access' | 'mailer'
  | 'lookup' | 'bucket' | 'lambda' | 'cogna' | 'kryptaWallet' | 'kryptaContract';

interface SearchSource {
  key: SearchCategory;
  label: string;
  icon: [string, string];
  route: string[];
  queryParam?: string;
  title?: boolean;
  load: (appId: number) => Observable<SearchSourceItem[]>;
}

@Injectable()
export class EditorSearchService {
  private readonly formService = inject(FormService);
  private readonly datasetService = inject(DatasetService);
  private readonly dashboardService = inject(DashboardService);
  private readonly screenService = inject(ScreenService);
  private readonly groupService = inject(GroupService);
  private readonly mailerService = inject(MailerService);
  private readonly lookupService = inject(LookupService);
  private readonly bucketService = inject(BucketService);
  private readonly lambdaService = inject(LambdaService);
  private readonly cognaService = inject(CognaService);
  private readonly kryptaService = inject(KryptaService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Map<SearchCategory, Subscription>();
  private readonly groups = new Map<SearchCategory, EditorSearchItem[]>();
  private appId: number | null = null;
  readonly items = signal<EditorSearchItem[]>([]);

  private readonly sources: SearchSource[] = [
    { key: 'form', label: 'Form', icon: ['far', 'plus-square'], route: ['ui', 'form'], title: true,
      load: id => this.page(this.formService.getListBasic({ appId: id, size: 9999, page: 0, searchText: '', sort: ['sortOrder,asc', 'id,asc'] })) },
    { key: 'dataset', label: 'Dataset', icon: ['fas', 'list'], route: ['ui', 'dataset'], title: true,
      load: id => this.datasetService.getDatasetList(id) },
    { key: 'dashboard', label: 'Dashboard', icon: ['fas', 'tachometer-alt'], route: ['ui', 'dashboard'], title: true,
      load: id => this.dashboardService.getDashboardList(id) },
    { key: 'screen', label: 'Screen', icon: ['fas', 'file'], route: ['ui', 'screen'], title: true,
      load: id => this.screenService.getScreenList(id) },
    { key: 'access', label: 'Access Group', icon: ['fas', 'users-cog'], route: ['user'],
      load: id => this.page(this.groupService.getGroupList({ appId: id, size: 9999 })) },
    { key: 'mailer', label: 'Mailer', icon: ['fas', 'mail-bulk'], route: ['mailer'],
      load: id => this.page(this.mailerService.getMailerList({ appId: id, size: 9999 })) },
    { key: 'lookup', label: 'Lookup', icon: ['far', 'caret-square-down'], route: ['lookup'],
      load: id => this.page(this.lookupService.getLookupList({ appId: id, size: 9999 })) },
    { key: 'bucket', label: 'Bucket', icon: ['fas', 'box'], route: ['bucket'],
      load: id => this.page(this.bucketService.getBucketList({ appId: id, size: 9999 })) },
    { key: 'lambda', label: 'Lambda', icon: ['fas', 'rocket'], route: ['lambda'],
      load: id => this.page(this.lambdaService.getLambdaList({ appId: id, size: 9999 })) },
    { key: 'cogna', label: 'Cogna', icon: ['fas', 'robot'], route: ['cogna'],
      load: id => this.page(this.cognaService.getCognaList({ appId: id, size: 9999 })) },
    { key: 'kryptaWallet', label: 'Wallet', icon: ['fas', 'hashtag'], route: ['krypta'],
      load: id => this.page(this.kryptaService.getWalletList({ appId: id, size: 9999 })) },
    { key: 'kryptaContract', label: 'Contract', icon: ['fas', 'hashtag'], route: ['krypta'], queryParam: 'contractId',
      load: id => this.page(this.kryptaService.getContractList({ appId: id, size: 9999 })) }
  ];

  constructor() {
    inject(CommService).changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      const categories: Record<string, SearchCategory> = {
        form: 'form', dataset: 'dataset', dashboard: 'dashboard', screen: 'screen',
        'assistant-lambda': 'lambda', 'lambda-list-changed': 'lambda',
        'assistant-lookup': 'lookup', 'lookup-list-changed': 'lookup',
        'assistant-mailer': 'mailer'
      };
      if (change?.key === 'editor-search-refresh') {
        if (change.category) this.refresh(change.category);
        else this.refreshAll();
      } else if (categories[change?.key]) {
        this.refresh(categories[change.key]);
      }
    });
    this.destroyRef.onDestroy(() => this.cancelRequests());
  }

  load(appId: number) {
    this.cancelRequests();
    this.groups.clear();
    this.items.set([]);
    this.appId = appId;
    this.refreshAll();
  }

  private page(source: Observable<SearchPage>): Observable<SearchSourceItem[]> {
    return source.pipe(map(response => response.content));
  }

  private refreshAll() {
    for (const source of this.sources) this.refresh(source.key);
  }

  private refresh(key: SearchCategory) {
    const source = this.sources.find(item => item.key === key);
    if (!source || this.appId === null) return;
    this.requests.get(key)?.unsubscribe();
    const request = source.load(this.appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => {
        this.groups.set(key, items.map(item => ({
          icon: source.icon,
          name: `${source.label}: ${source.title ? item.title : item.name}`,
          route: source.route,
          opt: { queryParams: { [source.queryParam ?? 'id']: item.id } }
        })));
        this.items.set(this.sources.flatMap(item => this.groups.get(item.key) ?? []));
      },
      error: () => this.toastService.show(`Unable to load ${source.label} search results`, { classname: 'bg-danger text-light' })
    });
    this.requests.set(key, request);
  }

  private cancelRequests() {
    for (const request of this.requests.values()) request.unsubscribe();
    this.requests.clear();
  }
}
