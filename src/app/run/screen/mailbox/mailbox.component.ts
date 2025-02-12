import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { GroupByPipe } from '../../../_shared/pipe/group-by.pipe';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { ToastService } from '../../../_shared/service/toast-service';
import { cleanText } from '../../../_shared/utils';
import { RunService } from '../../_service/run.service';
// import { RunService } from '../../../service/run.service';

@Component({
    selector: 'app-mailbox',
    imports: [SafePipe, FormsModule, NgbPagination, DatePipe, FontAwesomeModule, GroupByPipe],
    templateUrl: './mailbox.component.html',
    styleUrl: './mailbox.component.scss'
})
export class MailboxComponent {

  // @Input("appId")
  appId = input<number>();

  // @Input("tplId")
  email = input<string>();
  screen = input<any>();

  listSearchText:string="";
  list:any[]=[];
  listTotal: number = 0;
  listPageSize: number = 25;
  listPageNumber: number = 1;

  user = input<any>();

  isReadMore:any = {}

  constructor(private runService: RunService, private toastService: ToastService) { }

  ngOnInit() {
    this.loadNotiList(1)
  }

  pageNumber:number=0;

  hideMailOn:any={}

  loadNotiList(pageNumber:number){
    this.pageNumber = pageNumber;
    let param:any = {
      searchText: this.listSearchText,
      page: pageNumber-1,
      email: this.email(),
      size: this.listPageSize,
      sort: ['timestamp,desc']
    }
    // if (this.tplId()){
    //   param.tplId = this.tplId();
    // }
    this.runService.getNotificationByParams(this.appId(), param)
    .subscribe(res=>{
      this.list = res.content;
      let dp = new DatePipe('en-US');
      this.list.map(n=>{
        n.dateFmt = dp.transform(n.timestamp, 'E, dd-MM-yyyy');
      })
      this.listTotal = res.page?.totalElements;
    })
  }

  notif: any;
  openNotif(tpl, data) {
    this.notif = data;
    // history.pushState(null, null, window.location.href);
    // this.modalService.open(tpl, { backdrop: 'static' })
    //   .result.then(res => {
        this.runService.markNotification(data.id, this.user()?.email)
          .subscribe({
            next: (res2) => {
              this.loadNotiList(this.pageNumber-1);
            },
            error: (err) => {
              this.toastService.show(err.error.message, { classname: 'bg-danger text-light' });
            }
          });
      // }, res => { });
  }

  cleanText = cleanText;


}
