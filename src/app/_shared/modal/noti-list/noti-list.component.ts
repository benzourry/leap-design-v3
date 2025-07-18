import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, input } from '@angular/core';
// import { RunService } from '../../../service/run.service';
import { SafePipe } from '../../pipe/safe.pipe';
import { FormsModule } from '@angular/forms';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { DatePipe, NgStyle } from '@angular/common';
import { RunService } from '../../../run/_service/run.service';

@Component({
    selector: 'app-noti-list',
    imports: [SafePipe, FormsModule, NgbPagination, DatePipe, NgStyle],
    templateUrl: './noti-list.component.html',
    styleUrl: './noti-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotiListComponent implements OnInit  {

  // @Input("appId")
  appId = input<number>();

  // @Input("tplId")
  tplId = input<number>();

  listSearchText:string="";
  list:any[]=[];
  listTotal: number = 0;
  listPageSize: number = 25;
  listPageNumber: number = 1;

  isReadMore:any = {}

  cdr = inject(ChangeDetectorRef);
  private runService = inject(RunService)

  constructor() { }

  ngOnInit() {
    this.loadNotiList(1)
  }

  loadNotiList(pageNumber:number){
    let param:any = {
      searchText: this.listSearchText,
      page: pageNumber-1,
      size: this.listPageSize,
      sort: ['timestamp,desc']
    }
    if (this.tplId()){
      param.tplId = this.tplId();
    }
    this.runService.getNotificationByParams(this.appId(), param)
    .subscribe(res=>{
      this.list = res.content;
      this.listTotal = res.page?.totalElements;
      this.cdr.detectChanges();
    })
  }



}
