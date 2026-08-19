import { NgClass, PlatformLocation } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
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
  styleUrl: './admin-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminConfigComponent implements OnInit {

  baseApi: string = baseApi;  
  base: string = base;
  domainBase: string = domainBase;

  bgClassName: string = domainBase.replace(/\./g, '-');
  
  // Converted state variables to Signals
  appProps = signal<any[]>([]);
  platformProps = signal<any[]>([]);
  appGroups = signal<any[]>([]);

  searchText = signal<string>("");
  appPropsFilter = signal<string>("");
  playtformPropsFilter = signal<string>("");
  appGroupsFilter = signal<string>("");
  
  user = signal<any>(null);

  splitAsList = splitAsList;

  editPropsData: any = {};
  editAppGroupData: any = {};

  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private platformService = inject(PlatformService);

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
  }

  ngOnInit(): void {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user.set(user);

        this.loadPlatformProps();
        this.loadAppProps();
        this.loadAppGroups();
      });
  }

  loadPlatformProps(){
    this.platformService.valueByGroup('platform')
      .subscribe((res) => {
        this.platformProps.set(res);
      });
  }

  loadAppProps() {  
    this.platformService.valueByGroup('app.prop')
      .subscribe((res) => {
        this.appProps.set(res);
      });
  }

  loadAppGroups() {  
    this.platformService.listAppGroup({size:9999})
      .subscribe((res) => {
        this.appGroups.set(res.content);
      });
  }

  editProps(content: any, item: any) {
    this.editPropsData = item;
    history.pushState(null, '', window.location.href);
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

  removeProps(id: any){
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

  editAppGroup(content: any, item: any) {
    this.editAppGroupData = item;
    history.pushState(null, '', window.location.href);
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

  removeAppGroup(id: any){
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