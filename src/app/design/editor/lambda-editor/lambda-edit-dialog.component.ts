import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, InjectionToken, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { UniqueAppPathDirective } from '../../../_shared/app-path-validator';
import { base } from '../../../_shared/constant.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { toHyphen } from '../../../_shared/utils';
import { LookupService } from '../../../run/_service/lookup.service';
import { DashboardService } from '../../../service/dashboard.service';
import { DatasetService } from '../../../service/dataset.service';
import { LambdaService } from '../../../service/lambda.service';
import { SignaService } from '../../../service/signa.service';

export interface LambdaEditData {
  id?: number;
  name?: string;
  description?: string;
  content?: string;
  code?: string;
  lang?: string;
  email?: string;
  binds?: unknown[];
  data?: { digisign?: boolean };
  publicAccess?: boolean;
  signa?: { id: number; name: string };
  scheduled?: boolean;
  freq?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  clock?: string;
}

interface Binding {
  name: string;
  type: string;
  srcId?: number;
}

export interface LambdaDialogData {
  appId: number;
  data: LambdaEditData;
  initialCode: string;
}

export const LAMBDA_DIALOG_DATA = new InjectionToken<LambdaDialogData>('LAMBDA_DIALOG_DATA');

@Component({
  selector: 'app-lambda-edit-dialog',
  templateUrl: './lambda-edit-dialog.component.html',
  styles: ':host { display: block; }',
  imports: [FormsModule, FaIconComponent, NgSelectModule, UniqueAppPathDirective],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LambdaEditDialogComponent implements OnInit {
  private readonly dialogData = inject(LAMBDA_DIALOG_DATA);
  readonly appId = signal(this.dialogData.appId).asReadonly();
  readonly editLambdaData = signal(this.dialogData.data).asReadonly();
  readonly initialCode = signal(this.dialogData.initialCode).asReadonly();
  readonly activeModal = inject(NgbActiveModal);
  readonly base = base;
  readonly toHyphen = toHyphen;
  readonly isCodeTaken = (code: string) => this.lambdaService.isCodeTaken(code);
  bindingSrcs: Binding[] = [
    { name: '⚙ Mailer', type: '_mail' }, { name: '⚙ Entry', type: '_entry' },
    { name: '⚙ Lookup', type: '_lookup' }, { name: '⚙ Cogna', type: '_cogna' },
    { name: '⚙ Endpoint', type: '_endpoint' }, { name: '⚙ Secret', type: '_secret' },
    { name: '⚙ User', type: '_user' }, { name: '⚙ Mapper', type: '_mapper' },
    { name: '⚙ Jsoup', type: '_jsoup' }, { name: '⚙ Krypta', type: '_krypta' },
    { name: '⚙ Live', type: '_live' }, { name: '⚙ Log', type: '_log' },
    { name: '⚙ Token', type: '_token' }, { name: '⚙ SQL', type: '_sql' },
    { name: '⚙ IO/File', type: '_io' }, { name: '⚙ Utility', type: '_util' },
    { name: '⚙ HTTP', type: '_http' }, { name: '⚙ PDF', type: '_pdf' }
  ];
  signaList: { id: number; name: string }[] = [];
  readonly dayOfWeekList = [
    { name: 'Sunday', value: 1 }, { name: 'Monday', value: 2 }, { name: 'Tuesday', value: 3 },
    { name: 'Wednesday', value: 4 }, { name: 'Thursday', value: 5 }, { name: 'Friday', value: 6 },
    { name: 'Saturday', value: 7 }
  ];
  readonly monthOfYearList = [
    { name: 'January', value: 0 }, { name: 'February', value: 1 }, { name: 'March', value: 2 },
    { name: 'April', value: 3 }, { name: 'May', value: 4 }, { name: 'June', value: 5 },
    { name: 'July', value: 6 }, { name: 'August', value: 7 }, { name: 'September', value: 8 },
    { name: 'October', value: 9 }, { name: 'November', value: 10 }, { name: 'Disember', value: 11 }
  ];
  readonly dayOfMonthList = Array.from({ length: 30 }, (_, index) => index + 1);

  private readonly datasetService = inject(DatasetService);
  private readonly dashboardService = inject(DashboardService);
  private readonly lookupService = inject(LookupService);
  private readonly lambdaService = inject(LambdaService);
  private readonly signaService = inject(SignaService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    const appId = this.appId();
    this.datasetService.getDatasetList(appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items: { id: number; title: string }[]) => this.addBindings(items.map(item => ({ name: item.title, type: 'dataset', srcId: item.id }))),
      error: () => this.loadError('datasets')
    });
    this.dashboardService.getDashboardList(appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items: { id: number; title: string }[]) => this.addBindings(items.map(item => ({ name: item.title, type: 'dashboard', srcId: item.id }))),
      error: () => this.loadError('dashboards')
    });
    this.lookupService.getLookupList({ appId, size: 999 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.addBindings(response.content.map((item: { id: number; name: string }) => ({ name: item.name, type: 'lookup', srcId: item.id }))),
      error: () => this.loadError('lookups')
    });
    this.signaService.getSignaList({ appId, size: 9999 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => { this.signaList = response.content; this.cdr.markForCheck(); },
      error: () => this.loadError('signatures')
    });
  }

  private addBindings(items: Binding[]) {
    this.bindingSrcs = [...this.bindingSrcs, ...items];
    this.cdr.markForCheck();
  }

  private loadError(label: string) {
    this.toastService.show(`Unable to load ${label}`, { classname: 'bg-danger text-light' });
  }

  compareByIdFn(a: { id: number } | null, b: { id: number } | null): boolean {
    return (a && a.id) === (b && b.id);
  }

  keepMinute00(data: LambdaEditData) {
    if (data.clock?.length >= 4) data.clock = data.clock.slice(0, -1) + '0';
  }
}
