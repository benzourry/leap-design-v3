import { Component, OnInit, input, model, ChangeDetectorRef, inject, signal } from '@angular/core';
import { AppService } from '../../../service/app.service';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { baseApi, domainBase, OAUTH } from '../../constant.service';
import { ScreenService } from '../../../service/screen.service';
import { of } from 'rxjs';
import { toHyphen, toSpaceCase } from '../../utils';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { UniqueAppPathDirective } from '../../app-path-validator';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../../service/platform.service';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-app-edit',
  templateUrl: './app-edit.component.html',
  styleUrls: ['./app-edit.component.scss'],
  imports: [FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgStyle, FaIconComponent, UniqueAppPathDirective, NgCmComponent, NgbNavOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppEditComponent implements OnInit {

  // Remove constructor entirely
  private appService = inject(AppService);
  private screenService = inject(ScreenService);
  private platformService = inject(PlatformService);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  data = model<any>();
  _data:any = {};
  offline = input<boolean>(false);
  initialAppPath: string = "";
  user = input<any>();
  baseApi: string = baseApi;
  close = input<any>();
  dismiss = input<any>();
  otherAppList = signal<any[]>([]);
  checkLogin = (login) => OAUTH.SIGNIN_OPT.includes(login);

  themes: any[] = [
    { name: "BarBlue", color: "#0747a6" },
    { name: "Dark", color: "#212529" },
    { name: "Blue", color: "#0069d9" },
    { name: "Blue", color: "#2196F3" },
    { name: "Teal", color: "#009688" },
    { name: "Purple", color: "#673AB7" },
    { name: "Orange", color: "#F44336" },
    { name: "LightOrange", color: "#FF5722" },
    { name: "Indigo", color: "#3F51B5" },
    { name: "Green", color: "#4CAF50" },
    { name: "Brown", color: "#795548" },
    { name: "BlueGrey", color: "#37474F" },
    { name: "Cyan", color: "#00838F" },
    { name: "Pink", color: "#D81B60" },
    { name: "Lime", color: "#827717" },
    { name: "900Red", color: "#B71C1C" },
    { name: "900Green", color: "#1B5E20" },
    { name: "900Pink", color: "#880E4F" },
    { name: "900Cyan", color: "#006064" }
  ]

  file: any;

  isPathTaken = (path) => ['io', 'create', 'design', 'core'].indexOf(path) > -1 ? of(true) : this.appService.isPathTaken(path);

  appGroups = signal<any[]>([]);

  ngOnInit() {
    this._data = {...this.data()};
    this.initialAppPath = this._data.appPath;
    this.loadPages();
    this.loadScreen();
    if (!this._data.x) {
      this._data.x = {};
    }
    this.appService.getAppMyList({
      email: this.user().email,
      size: 999,
      sort: 'id,desc'
    }).subscribe(res => {
      this.otherAppList.set(res.content);
    })

    this.platformService.listAppGroup({ size: 9999, email: this.user().email })
      .subscribe(res => {
        this.appGroups.set(res.content);
      })
  }


  pages = signal<any[]>([]);
  loadPages() {
    if (!this._data.id) return;
    this.appService.getPages(this._data.id)
      .subscribe(res => {
        this.pages.set(res);
      });
  }
  screens = signal<any>([]);
  loadScreen() {
    if (!this._data.id) return;
    this.screenService.getScreenList(this._data.id)
      .subscribe(res => {
        this.screens.set(res);
      });
  }

  uploadLogo($event) {
    if ($event.target.files && $event.target.files.length) {
      this.appService.uploadLogo($event.target.files[0], this._data.id)
        .subscribe(res => {
          this._data.logo = res.fileUrl;
          this.cdr.detectChanges();
        })

    }
  }

  clearLogo() {
    if (confirm("Are you sure you want to clear the app logo?")) {
      this.appService.clearLogo(this._data.id)
        .subscribe(res => {
          this._data.logo = null;
          this.cdr.detectChanges();
        })
    }
  }

  done(data) {
    this.data.set(data);
    this.close()?.(data);
  }

  toHyphen = toHyphen; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '-').toLowerCase() : '';
  toSpaceCase = toSpaceCase; // (string)=> string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();
  getHost = () => window.location.host;

  domainBase = domainBase;

  compareByIdFn = (a, b): boolean => (a && a.id) === (b && b.id);

}
