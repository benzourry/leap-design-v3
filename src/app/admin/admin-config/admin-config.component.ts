import { NgClass, PlatformLocation } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { base, baseApi, domainBase } from '../../_shared/constant.service';
import { PlatformService } from '../../service/platform.service';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbNavItem, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FilterPipe } from '../../_shared/pipe/filter.pipe';
import { ToastService } from '../../_shared/service/toast-service';
import { UserService } from '../../_shared/service/user.service';
import { splitAsList } from '../../_shared/utils';

@Component({
  selector: 'app-admin-config',
  imports: [RouterLink, RouterLinkActive, NgClass, FaIconComponent, FormsModule, NgbNavModule, FilterPipe],
  templateUrl: './admin-config.component.html',
  styleUrl: './admin-config.component.scss'
})
export class AdminConfigComponent implements OnInit {

  baseApi: string = baseApi;  
  base: string = base;
  domainBase: string = domainBase;

  bgClassName: string = domainBase.replace(/\./g, '-');
  appProps: any[] = [];
  platformProps: any[] = [];

  searchText: string = "";
  appPropsFilter: string = "";
  playtformPropsFilter: string = "";
  user: any;
  splitAsList = splitAsList;

  appGroups: any[] = [];
  appGroupsFilter: string = "";

  constructor(
    private modalService: NgbModal,
    private location: PlatformLocation,
    private toastService: ToastService,
    private userService: UserService,
    private platformService: PlatformService) {

    location.onPopState(() => this.modalService.dismissAll(''));
  }

  ngOnInit(): void {
    // throw new Error('Method not implemented.');
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;

        this.loadPlatformProps();
        this.loadAppProps();
        this.loadAppGroups();

        // this.loadPlatformStat();
      });
    
  }


  editPropsData: any = {}

  // platformStat:any = {};

  // loadPlatformStat(){
  //   this.platformService.stat()
  //     .subscribe((res) => {
  //       this.platformStat = res;
  //     });
  // }

  loadPlatformProps(){
    this.platformService.valueByGroup('platform')
      .subscribe((res) => {
        this.platformProps = res;
      });
  }

  loadAppProps() {  
    this.platformService.valueByGroup('app.prop')
      .subscribe((res) => {
        this.appProps = res;
      });
  }

  loadAppGroups() {  
    this.platformService.listAppGroup({size:9999})
      .subscribe((res) => {
        this.appGroups = res.content;
      });
  }

  editProps(content, item: any) {
    this.editPropsData = item;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {

        this.platformService.saveValue(data)
        .subscribe({
          next: (res) => {
            Object.assign(item, res);
            this.modalService.dismissAll();
            this.toastService.show("Property successfully saved", { classname: 'bg-success text-light' });
            this.loadAppProps();
            this.loadPlatformProps();
          }, error: (err) => {
            this.modalService.dismissAll();
            this.toastService.show("Property saving failed", { classname: 'bg-danger text-light' });
          }
        })
      }, res => { })
  }

  removeProps(id){
    if (confirm("Are you sure to delete this property?")) {
      this.platformService.removeValue(id)
      .subscribe({
        next: (res) => {
          this.toastService.show("Property successfully deleted", { classname: 'bg-success text-light' });
          this.loadAppProps();
          this.loadPlatformProps();
        }, error: (err) => {
          this.toastService.show("Property deleting failed", { classname: 'bg-danger text-light' });
        }
      })
    }
  }

  editAppGroupData: any = {}
  editAppGroup(content, item: any) {
    this.editAppGroupData = item;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {

        this.platformService.saveAppGroup(data)
        .subscribe({
          next: (res) => {
            Object.assign(item, res);
            this.modalService.dismissAll();
            this.toastService.show("App Group successfully saved", { classname: 'bg-success text-light' });
            this.loadAppGroups();
          }, error: (err) => {
            this.modalService.dismissAll();
            this.toastService.show("App Group saving failed", { classname: 'bg-danger text-light' });
          }
        })
      }, res => { })
  }

  removeAppGroup(id){
    if (confirm("Are you sure to delete this app group?")) {
      this.platformService.removeAppGroup(id)
      .subscribe({
        next: (res) => {
          this.toastService.show("App Group successfully deleted", { classname: 'bg-success text-light' });
          this.loadAppGroups();
        }, error: (err) => {
          this.toastService.show("App Group deleting failed", { classname: 'bg-danger text-light' });
        }
      })
    }
  }



}
