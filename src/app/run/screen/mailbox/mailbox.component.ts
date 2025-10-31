import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
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
    imports: [SafePipe, FormsModule, NgbPagination, DatePipe, FontAwesomeModule, GroupByPipe],
    templateUrl: './mailbox.component.html',
    styleUrl: './mailbox.component.scss'
})
export class MailboxComponent {

  appId = computed<number>(()=>this.runService.$app()?.id || null);
  lang = input<string>('en');
  user = computed<any>(()=>this.runService.$user());
  email = computed(()=>this.user()?.email || '');

  listSearchText:string="";
  list = signal<any[]>([]);
  listTotal = signal<number>(0);
  listPageSize: number = 25;
  pageNumber = signal<number>(0);

  isReadMore:any = {}

  private runService = inject(RunService);
  private toastService = inject(ToastService);

  constructor() { }

  ngOnInit() {
    this.loadNotiList(1)
  }


  hideMailOn:any={}

  loadNotiList(pageNumber:number){
    this.pageNumber.set(pageNumber);
    let param:any = {
      searchText: this.listSearchText,
      page: pageNumber-1,
      email: this.email(),
      size: this.listPageSize,
      sort: ['timestamp,desc']
    }
    this.runService.getNotificationByParams(this.appId(), param)
    .subscribe(res=>{
      let list = res.content;
      let dp = new DatePipe('en-US');
      list.map(n=>{
        n.dateFmt = dp.transform(n.timestamp, 'E, dd-MM-yyyy');
      })
      this.list.set(list);
      this.listTotal.set(res.page?.totalElements);
    })
  }

  notif: any;
  openNotif(tpl, data) {
    this.notif = data;this.runService.markNotification(data.id, this.user()?.email)
      .subscribe({
        next: (res2) => {
          this.loadNotiList(this.pageNumber()-1);
        },
        error: (err) => {
          this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
        }
      });
  }

  cleanText = cleanText;


}
