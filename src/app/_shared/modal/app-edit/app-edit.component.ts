import { Component, OnInit, input, model } from '@angular/core';
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

@Component({
    selector: 'app-app-edit',
    templateUrl: './app-edit.component.html',
    styleUrls: ['./app-edit.component.scss'],
    imports: [FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgStyle, FaIconComponent, UniqueAppPathDirective, NgCmComponent, NgbNavOutlet]
})
export class AppEditComponent implements OnInit {

  constructor(private appService: AppService,private screenService: ScreenService) { }

  // @Input() data: any;
  data = model<any>();
  // @Input() offline:boolean=false;
  offline = input<boolean>(false);
  initialAppPath: string="";
  // @Input() user: any;
  user = input<any>();
  baseApi: string = baseApi;

  
  // @Input()
  close = input<any>();

  // @Input()
  dismiss= input<any>();

  otherAppList: any[] = [];

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

  file:any;

  isPathTaken = (path)=> ['io','create','design','core'].indexOf(path)>-1?of(true):this.appService.isPathTaken(path);
  
  ngOnInit() {
    // console.log("onInit")
    this.initialAppPath = this.data().appPath;
    this.loadPages();
    this.loadScreen();
    if (!this.data().x){
      this.data.update(a=>{
        a.x = {};
        return a;
      })
    }
    this.appService.getAppMyList({
      email: this.user().email,
      size: 999,
      sort: 'id,desc'
    }).subscribe(res => {
        this.otherAppList = res.content;
    })
  }


  pages:any = [];
  loadPages(){
    if (!this.data().id) return;
    this.appService.getPages(this.data().id)
    .subscribe(res=>{
      this.pages = res;
    });
  }
  screens:any = [];
  loadScreen(){
    if (!this.data().id) return;
    this.screenService.getScreenList(this.data().id)
    .subscribe(res=>{
      this.screens = res;
    });
  }

  uploadLogo($event){
    if ($event.target.files && $event.target.files.length) {
      this.appService.uploadLogo($event.target.files[0],this.data().id)
        .subscribe(res => {
          this.data.update(app=>{
            app.logo = res.fileUrl;
            return app;
          })
          // this.data['logo'] = res.fileUrl;
        })

    }
  }

  toHyphen = toHyphen; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '-').toLowerCase() : '';
  toSpaceCase = toSpaceCase; // (string)=> string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();
  getHost = () => window.location.host;

  domainBase = domainBase;

}
