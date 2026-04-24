import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { GroupByPipe } from '../../../_shared/pipe/group-by.pipe';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { ToastService } from '../../../_shared/service/toast-service';
import { cleanText } from '../../../_shared/utils';
import { RunService } from '../../_service/run.service';

@Component({
    selector: 'app-mailbox',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [DatePipe], // <-- Required to inject DatePipe properly
    imports: [SafePipe, FormsModule, NgbPagination, DatePipe, FontAwesomeModule, GroupByPipe],
    templateUrl: './mailbox.component.html',
    styleUrl: './mailbox.component.scss'
})
export class MailboxComponent implements OnInit {

  appId = computed<number | null>(() => this.runService.$app()?.id || null);
  lang = input<string>('en');
  user = computed<any>(() => this.runService.$user());
  email = computed<string>(() => this.user()?.email || '');

  listSearchText: string = "";
  list = signal<any[]>([]);
  listTotal = signal<number>(0);
  listPageSize: number = 25;
  pageNumber = signal<number>(1);

  // Converted to signals for perfect OnPush UI rendering
  isReadMore = signal<Record<string, boolean>>({});
  hideMailOn = signal<Record<string, boolean>>({});
  notif = signal<any>(null);

  private runService = inject(RunService);
  private toastService = inject(ToastService);
  private datePipe = inject(DatePipe);
  private destroyRef = inject(DestroyRef); // For memory leak prevention

  constructor() { }

  ngOnInit() {
    this.loadNotiList(1);
  }

  loadNotiList(pageNumber: number) {
    this.pageNumber.set(pageNumber);
    let param: any = {
      searchText: this.listSearchText,
      page: pageNumber - 1,
      email: this.email(),
      size: this.listPageSize,
      sort: ['timestamp,desc']
    };

    this.runService.getNotificationByParams(this.appId()!, param)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        let mappedList = res.content.map((n: any) => ({
            ...n,
            dateFmt: this.datePipe.transform(n.timestamp, 'E, dd-MM-yyyy')
        }));
        
        this.list.set(mappedList);
        this.listTotal.set(res.page?.totalElements || 0);
      });
  }

  openNotif(tpl: any, data: any) {
    this.notif.set(data);
    
    this.runService.markNotification(data.id, this.user()?.email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res2) => {
          // Fixed pagination bug: reload current page, not previous page
          this.loadNotiList(this.pageNumber());
        },
        error: (err) => {
          this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
        }
      });
  }

  // Helper methods to update Record signals cleanly from HTML
  toggleReadMore(id: string) {
    this.isReadMore.update(prev => ({ ...prev, [id]: !prev[id] }));
  }

  toggleHideMail(id: string) {
    this.hideMailOn.update(prev => ({ ...prev, [id]: !prev[id] }));
  }

  cleanText = cleanText;

}