import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, TemplateRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationNext, NgbPaginationPrevious } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { EditDatasetComponent } from '../../../_shared/modal/edit-dataset/edit-dataset.component';
import { NotiListComponent } from '../../../_shared/modal/noti-list/noti-list.component';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { AppService } from '../../../service/app.service';
import { DatasetService } from '../../../service/dataset.service';
import { FormService } from '../../../service/form.service';
import { LambdaService } from '../../../service/lambda.service';
import { MailerService } from '../../../service/mailer.service';
import { SchedService } from '../../../service/sched.service';
import { MailerEditData, MailerEditDialogService } from './mailer-edit-dialog.service';

interface MailerListItem {
  id: number;
  name: string;
  description?: string;
  enabled?: number;
}

interface Schedule {
  id?: number;
  name?: string;
  description?: string;
  enabled?: number;
  freq?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  monthOfYear?: number;
  clock?: string;
  datasetId?: number;
  mailerId?: number;
}

interface SmtpConfig {
  id?: number;
  appId?: number;
  enabled?: boolean;
  host?: string;
  port?: number;
  senderEmail?: string;
  username?: string;
  password?: string;
  auth?: boolean;
  startTls?: boolean;
}

@Component({
  selector: 'app-mailer-sidebar',
  templateUrl: './mailer-sidebar.component.html',
  styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css'],
  imports: [FormsModule, RouterLink, RouterLinkActive, FaIconComponent, FilterPipe, NgbPagination,
    NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast,
    NotiListComponent, EditDatasetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MailerSidebarComponent {
  readonly appId = input<number | string | null>(null);
  readonly app = input<{ id: number } | null>(null);
  readonly user = input<{ email: string } | null>(null);
  readonly offline = input(false);
  readonly mailerList = signal<MailerListItem[]>([]);
  readonly mailerTotal = signal(0);
  readonly itemLoading = signal(false);
  readonly schedLoading = signal(false);
  readonly schedList = signal<Schedule[]>([]);
  readonly pageNumber = signal(1);
  readonly searchText = signal('');
  readonly allMailerList = signal<MailerListItem[]>([]);
  readonly formList = signal<unknown[]>([]);
  readonly datasetList = signal<{ id: number; title: string }[]>([]);
  readonly secretList = signal<{ key: string }[]>([]);
  readonly itemsPerPage = 15;
  readonly itemMatchOptions: IsActiveMatchOptions = {
    paths: 'exact', queryParams: 'exact', matrixParams: 'ignored', fragment: 'ignored'
  };
  readonly otherAppList: unknown[] = [];
  readonly accessList: unknown[] = [];
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
  editSchedData: Schedule = {};
  removeSchedData: Schedule = {};
  smtpConfigData: SmtpConfig = {};
  editDatasetData: unknown;
  tplId: number | null = null;

  private readonly mailerService = inject(MailerService);
  private readonly schedService = inject(SchedService);
  private readonly datasetService = inject(DatasetService);
  private readonly formService = inject(FormService);
  private readonly lambdaService = inject(LambdaService);
  private readonly appService = inject(AppService);
  private readonly editDialog = inject(MailerEditDialogService);
  private readonly modalService = inject(NgbModal);
  private readonly toastService = inject(ToastService);
  private readonly commService = inject(CommService);
  private readonly router = inject(Router);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);
  private listRequest?: Subscription;
  private dependencies = new Subscription();

  constructor() {
    effect(onCleanup => {
      const appId = this.appId();
      if (!appId) return;
      this.searchText.set('');
      this.dependencies = new Subscription();
      untracked(() => {
        this.loadMailerList(1);
        this.loadSchedList();
        this.loadAllMailerList();
        this.loadFormList();
        this.loadDatasetList();
        this.dependencies.add(this.lambdaService.getSecretList(Number(appId)).subscribe({
          next: (secrets: { key: string }[]) => this.secretList.set(secrets),
          error: () => this.showError('Unable to load secrets')
        }));
      });
      onCleanup(() => {
        this.listRequest?.unsubscribe();
        this.dependencies.unsubscribe();
      });
    });
    this.commService.changeEmitted$.pipe(takeUntilDestroyed()).subscribe(change => {
      if ((change?.key === 'mailer-list-changed' && String(change.appId) === String(this.appId()))
          || change?.key === 'assistant-mailer') {
        this.loadMailerList(change.page ?? this.pageNumber());
        this.loadAllMailerList();
      }
      if (change?.key === 'form') this.loadFormList();
      if (change?.key === 'dataset') this.loadDatasetList();
    });
  }

  loadMailerList(page: number) {
    const appId = this.appId();
    if (!appId) return;
    this.listRequest?.unsubscribe();
    this.pageNumber.set(page);
    this.itemLoading.set(true);
    this.listRequest = this.mailerService.getMailerList({
      searchText: this.searchText(), appId, page: page - 1, size: this.itemsPerPage
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: { content: MailerListItem[]; page?: { totalElements: number } }) => {
        this.mailerList.set(response.content);
        this.mailerTotal.set(response.page?.totalElements ?? 0);
        this.itemLoading.set(false);
      },
      error: () => { this.itemLoading.set(false); this.showError('Unable to load mailers'); }
    });
  }

  private loadAllMailerList() {
    const appId = this.appId();
    if (!appId) return;
    this.dependencies.add(this.mailerService.getMailerList({ appId, page: 0, size: 9999 })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response: { content: MailerListItem[] }) => this.allMailerList.set(response.content),
        error: () => this.showError('Unable to load mailer choices')
      }));
  }

  private loadFormList() {
    const appId = this.appId();
    if (!appId) return;
    this.dependencies.add(this.formService.getListBasic({ appId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.formList.set(response.content),
      error: () => this.showError('Unable to load forms')
    }));
  }

  private loadDatasetList() {
    const appId = this.appId();
    if (!appId) return;
    this.dependencies.add(this.datasetService.getDatasetList(Number(appId)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => this.datasetList.set(response),
      error: () => this.showError('Unable to load datasets')
    }));
  }

  loadSchedList() {
    const appId = this.appId();
    if (!appId) return;
    this.schedLoading.set(true);
    this.dependencies.add(this.schedService.getSchedList({ searchText: this.searchText(), appId })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response: Schedule[]) => { this.schedList.set(response); this.schedLoading.set(false); },
        error: () => { this.schedLoading.set(false); this.showError('Unable to load schedules'); }
      }));
  }

  editMailer(mailer: MailerEditData) {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline()) return;
    this.editDialog.open(mailer, this.formList()).then(data => {
      this.mailerService.save(user.email, Number(appId), data).subscribe({
        next: (result: { id: number }) => {
          this.commService.emitChange({ key: 'mailer-list-changed', appId });
          this.commService.emitChange({ key: 'editor-search-refresh', category: 'mailer' });
          this.commService.emitChange({ key: 'mailer-saved', appId, id: result.id });
          this.router.navigate(['/design', appId, 'mailer'], { queryParams: { id: result.id } });
          this.toastService.show('Template successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.showError('Template saving failed')
      });
    }, () => {});
  }

  editMailerById(id: number) {
    this.mailerService.getMailer(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (mailer: MailerEditData) => this.editMailer(mailer),
      error: () => this.showError('Unable to load mailer')
    });
  }

  editSched(content: TemplateRef<unknown>, schedule: Schedule) {
    const appId = this.appId();
    const user = this.user();
    if (!appId || !user || this.offline()) return;
    this.editSchedData = schedule;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' }).result.then(data => {
      this.schedService.save(user.email, Number(appId), data).subscribe({
        next: () => {
          if (!this.destroyRef.destroyed && String(this.appId()) === String(appId)) this.loadSchedList();
          this.toastService.show('Schedule successfully saved', { classname: 'bg-success text-light' });
        },
        error: () => this.showError('Schedule saving failed')
      });
    }, () => {});
  }

  removeSched(content: TemplateRef<unknown>, schedule: Schedule) {
    const appId = this.appId();
    if (!appId) return;
    this.removeSchedData = schedule;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' }).result.then(data => {
      this.schedService.deleteSched(schedule.id, data).subscribe({
        next: () => {
          if (!this.destroyRef.destroyed && String(this.appId()) === String(appId)) this.loadSchedList();
          this.toastService.show('Schedule successfully removed', { classname: 'bg-success text-light' });
        },
        error: () => this.showError('Schedule removal failed')
      });
    }, () => {});
  }

  keepMinute00(schedule: Schedule) {
    if (schedule.clock && schedule.clock.length >= 4) schedule.clock = schedule.clock.slice(0, -1) + '0';
  }

  openHistory(content: TemplateRef<unknown>, mailId: number | null) {
    this.tplId = mailId;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' }).result.then(() => {}, () => {});
  }

  openSmtpConfig(content: TemplateRef<unknown>) {
    const appId = this.appId();
    if (!appId) return;
    this.appService.getSmtpConfig(Number(appId)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (config: SmtpConfig | null) => {
        this.smtpConfigData = config || { appId: Number(appId), auth: true, startTls: true, port: 587, enabled: true };
        history.pushState(null, '', window.location.href);
        this.modalService.open(content, { backdrop: 'static' }).result.then(data => {
          this.appService.saveSmtpConfig(Number(appId), data).subscribe({
            next: () => this.toastService.show('App SMTP configuration successfully saved', { classname: 'bg-success text-light' }),
            error: () => this.showError('Failed to save App SMTP configuration')
          });
        }, () => {});
      },
      error: () => this.showError('Failed to load SMTP config')
    });
  }

  deleteSmtpConfig(configId: number, dismiss: () => void) {
    if (!confirm('Are you sure you want to permanently delete this SMTP configuration and revert to the system default?')) return;
    this.appService.removeSmtpConfig(configId).subscribe({
      next: () => { this.toastService.show('App SMTP configuration removed', { classname: 'bg-success text-light' }); dismiss(); },
      error: () => this.showError('Failed to delete App SMTP configuration')
    });
  }

  editDataset(content: TemplateRef<unknown>, datasetId: number) {
    const appId = this.appId();
    if (!appId) return;
    this.datasetService.getDataset(datasetId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: dataset => {
        this.editDatasetData = dataset;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' }).result.then(data => {
          this.datasetService.saveDataset(Number(appId), data).subscribe({
            next: () => {
              this.commService.emitChange({ key: 'dataset', value: 0 });
              this.toastService.show('Dataset successfully saved');
            },
            error: () => this.showError('Dataset saving failed')
          });
        }, () => {});
      },
      error: () => this.showError('Unable to load dataset')
    });
  }

  copyId(event: MouseEvent, id: number) {
    event.preventDefault();
    event.stopPropagation();
    if (this.clipboard.copy(String(id))) {
      this.toastService.show(`Copied ID #${id} to clipboard`, { classname: 'bg-dark text-light', delay: 2000 });
    } else {
      this.showError('Unable to copy ID');
    }
  }

  private showError(message: string) {
    this.toastService.show(message, { classname: 'bg-danger text-light' });
  }
}
