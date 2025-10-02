import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { NgbModal, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../../../_shared/service/toast-service';
// import { UtilityService } from '../../../../_shared/service/utility.service';
import { AppService } from '../../../../service/app.service';
import { UserService } from '../../../../_shared/service/user.service';
import { ScreenService } from '../../../../service/screen.service';
import { FormService } from '../../../../service/form.service';
import { NgForm, FormsModule } from '@angular/forms';
// import { EntryService } from '../../../../service/entry.service';
import { DatasetService } from '../../../../service/dataset.service';
// import * as CodeMirror from 'codemirror';
import { cleanText, compileTpl, splitAsList } from '../../../../_shared/utils';
import { GroupService } from '../../../../service/group.service';
import { CommService } from '../../../../_shared/service/comm.service';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { DashboardService } from '../../../../service/dashboard.service';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { base, baseApi } from '../../../../_shared/constant.service';
import { EditScreenComponent } from '../../../../_shared/modal/edit-screen/edit-screen.component';
import { FullCalendarModule } from '@fullcalendar/angular';
import { KeyValuePipe } from '@angular/common';
import { NgCmComponent } from '../../../../_shared/component/ng-cm/ng-cm.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { CognaService } from '../../../../service/cogna.service';
import { IconPickerComponent } from '../../../../_shared/component/icon-picker/icon-picker.component';
// import { LookupService } from '../../../../service/lookup.service';
import { BucketService } from '../../../../service/bucket.service';
import { EntryService } from '../../../../run/_service/entry.service';
import { LookupService } from '../../../../run/_service/lookup.service';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { RunService } from '../../../../run/_service/run.service';
import { IconSplitPipe } from '../../../../_shared/pipe/icon-split.pipe';
// import { NgLeafletComponent } from '../../../../_shared/component/ng-leaflet/ng-leaflet.component';
// import { combineLatest } from 'rxjs';

@Component({
    selector: 'app-screen-editor',
    templateUrl: './screen-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./screen-editor.component.scss', '../../../../../assets/css/tile.css',
        '../../../../../assets/css/element-action.css'],
    imports: [FaIconComponent, RouterLink, FormsModule, NgbNav, NgbNavItem, IconPickerComponent, NgbNavItemRole,
        NgbNavLink, NgbNavLinkBase, NgbNavContent, AngularEditorModule, NgCmComponent, FullCalendarModule,
        CdkDropList, CdkDrag, CdkDragHandle, IconSplitPipe,
        NgbNavOutlet, EditScreenComponent, KeyValuePipe]
})
export class ScreenEditorComponent implements OnInit {

  private screenService = inject(ScreenService);
  private groupService = inject(GroupService);
  private entryService = inject(EntryService);
  private modalService = inject(NgbModal);
  private userService = inject(UserService);
  private formService = inject(FormService);
  private datasetService = inject(DatasetService);
  private dashboardService = inject(DashboardService);
  private cognaService = inject(CognaService);
  private bucketService = inject(BucketService);
  private lookupService = inject(LookupService);
  private route = inject(ActivatedRoute);
  private appService = inject(AppService);
  // private runService = inject(RunService);
  // private utilityService = inject(UtilityService); // Uncomment if needed
  private commService = inject(CommService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  // @ViewChild('codeeditor') codeeditor;
  // codeeditor = viewChild('codeeditor')
  // // @ViewChild('codeeditorpre') codeeditorpre;
  // codeeditorpre = viewChild('codeeditorpre');
  // // @ViewChild('codeeditorpost') codeeditorpost;
  // codeeditorpost = viewChild('codeeditorpost');

  readonly curScreenForm = viewChild<NgForm>('contentForm');

  curScreen: any;

  screenLoading: boolean;

  screenList: any[];
  datasetList: any[];
  dashboardList: any[];
  cognaList: any[];
  bucketList: any[];
  app: any;
  user: any;

  $this$:any = {};
  base: string = base;
  baseApi: string = baseApi;
  baseUrl: string = '';
  $param$:any = {};



  label: string;
  next: number;
  nextType: string;
  offline: boolean;

  formList: any[];
  // datasetList: any[];
  builtInVar: any[] = [{ var: 'imgPath', label: 'Image Path' }];
  calendarPlugins = [dayGridPlugin, timeGridPlugin];

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: 'auto',
    minHeight: '0',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'yes',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter text here...',
    defaultParagraphSeparator: '',
    defaultFontName: '',
    defaultFontSize: '',
    fonts: [
      { class: 'arial', name: 'Arial' },
      { class: 'times-new-roman', name: 'Times New Roman' },
      { class: 'calibri', name: 'Calibri' },
      { class: 'comic-sans-ms', name: 'Comic Sans MS' }
    ],
    customClasses: [
      {
        name: 'quote',
        class: 'quote',
      },
      {
        name: 'redText',
        class: 'redText'
      },
      {
        name: 'titleText',
        class: 'titleText',
        tag: 'h1',
      }, {
        name: 'buttonLink',
        class: 'btn btn-round btn-sm btn-secondary',
        tag: 'a',
      }, {
        name: 'limitWidth',
        class: 'limit-width',
        tag: 'div',
      }, {
        name: 'card',
        class: '<!--',
        tag: 'div class="card card-clean"><div class="card-header">Title</div><div class="card-body">Content</div></div> <!-- '
      }, {
        name: 'table',
        class: '<!--',
        tag: 'table class="table table-bordered"><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></table> <!-- '
      }
    ],
    uploadUrl: 'v1/image',
    //upload: (file: File) => {  }
    uploadWithCredentials: false,
    sanitize: false,
    toolbarPosition: 'top',
    toolbarHiddenButtons: [
      // ['bold', 'italic'],
      // ['fontSize']
    ]
  };
  otherAppList:any[]=[];



  ngOnInit() {

    this.userService.getCreator().subscribe((user) => {

      this.user = user;

      // combineLatest([this.route.parent.parent.parent.params, this.route.queryParams])
      //   .subscribe(([params, queryParams]) => {
      //     // this.extraAutoCompleteHtml = [];
      //     // this.extraAutoCompleteJs = [];
      //   })

      this.route.parent.parent.parent.params.subscribe(params => {
        const appId = params['appId'];
        if (appId) {
          let appParams = new HttpParams()
            .set("email", user.email);

          this.appService.getApp(appId, appParams)
            .subscribe(res => { 
              this.app = res;
              this.getScreenList(appId);
              this.getFormList(appId);
              this.getCognaList(appId);
              this.getDatasetList(appId);
              this.getDashboardList(appId);
              this.getBucketList(appId);
              this.getLookupList(appId);
              this.getAccessList();
              this.cdr.detectChanges(); // <--- Add here
            });
        }
      })

      this.route.queryParams.subscribe(queryParams => {
        const id = queryParams['id'];
        if (id) {
          this.getScreenData(id);
        }
      })

      this.appService.getAppMyList({
        email: this.user.email,
        size: 999,
        sort: 'id,desc'
      }).subscribe(res => {
        this.otherAppList = res.content;
      })
    });
  }

  defaultBucketParam:string = `{
    searchText: '', 
    email: $user$.email, 
    fileType: 'image/jpeg', 
    itemId: 1, 
    entryId: 1
}`  
defaultMapStyle:string = `height: 600px;`

  codeeditor = viewChild<any>('codeeditor')
  codeeditorpopupcontent = viewChild<any>('codeeditorpopupcontent')
  codeeditorpre = viewChild<any>('codeeditorpre')
  codeeditorpost = viewChild<any>('codeeditorpost')
  
  insertTextAtCursor(text, cm) {
    if (this.showWysiwyg) {
      this.insertText(text);
    } else {
      // console.log(cm);
      cm.insertText(text);
    }
  }

  getItemText(pre,item){
    var type = item.type;
    var bindLabel = item.bindLabel;
    var pipe = ''
    if (type == 'date') {
      pipe = '|date';
    } else if (['select', 'radio'].indexOf(type) > -1) {
      pipe = '.name';
    } else if (['modelPicker'].indexOf(type) > -1) {
      pipe = '.'+bindLabel;
    } else if (type == 'qr') {
      pipe = '|qr';
    } else if (type == 'file') {
      pipe = '|src';
    }
    return '{{' + pre +'.'+ item.code + pipe + '}}';
  }

  showWysiwyg: boolean;
  insertText(text) {
    var sel, range;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      }
    } else if ((document as any).selection && (document as any).selection.createRange) {
      (document as any).selection.createRange().text = text;
    }
  }

  getItems(section) {
    return section.items
      .filter(i => this.form.items[i.code].type != 'static')
      .map(i => {
        var type = this.form.items[i.code].type;
        var bindLabel = this.form.items[i.code].bindLabel;
        var pipe = ''
        if (type == 'date') {
          pipe = '|date';
        } else if (['select', 'radio'].indexOf(type) > -1) {
          pipe = '.name';
        } else if (['modelPicker'].indexOf(type) > -1) {
          pipe = '.'+bindLabel;
        } else if (type == 'qr') {
          pipe = '|qr';
        } else if (type == 'file') {
          pipe = '|src';
        }
        return '\t{{i.' + i.code + pipe + '}}';
      })
      .join("<br/>\n");
  }
  getItemsJs(section) {
    return section.items
      .filter(i => this.form.items[i.code].type != 'static')
      .map(i => {
        var type = this.form.items[i.code].type;
        var bindLabel = this.form.items[i.code].bindLabel;
        var pipe = '';
        // if (type == 'date') {
        //   pipe = '|date';
        // } else 
        if (['select', 'radio'].indexOf(type) > -1) {
          pipe = '.name';
        } else if (['modelPicker'].indexOf(type) > -1) {
          pipe = '.'+bindLabel;
        } 
        // else if (type == 'qr') {
        //   pipe = '|qr';
        // } else if (type == 'file') {
        //   pipe = '|src';
        // }
        return '\ti.' + i.code + pipe + ';';
      })
      .join("\n");
  }

  // getComponent = (id, list) => list && list.filter(l => l.id == id)[0];

  actionComps:any={}
  getActionComponents(id){
    this.screenService.getScreenActionComps(id)
    .subscribe(res=>{
      this.actionComps = res;
    })    
  }

  editScreenData: any;
  editScreen(content, data, isNew) {
    this.editScreenData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(screen => {
        this.screenService.saveScreen(this.app.id, screen)
          .subscribe(res => {
            this.getScreenList(this.app.id);
            this.getScreenData(res.id);
            this.getActionComponents(res.id);
            this.toastService.show("Screen saved successfully", { classname: 'bg-success text-light' });
            this.cdr.detectChanges(); // <--- Add here if needed
          });
      }, res => { });
  }

  getLoopCode = (section) => "<x-foreach $=\"i of $." + section.code + "\">\n" + this.getItems(section) + "\n\t${<!--More codes-->}\n<\/x-foreach>"
  getLoopCodeJs = (section) => "$." + section.code + ".forEach(i=>{\n" + this.getItemsJs(section) + "\n\t${//More codes}\n})";

  removeScreenData: any;
  removeScreen(content, data) {
    this.removeScreenData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then((data) => {
        this.screenService.removeScreen(data.id)
          .subscribe(res => {
            this.getScreenList(this.app.id);
            delete this.curScreen;
            this.cdr.detectChanges(); // <--- Add here if needed

          }, (res) => {
          });
      }, res => { });
  }

  accessList: any[] = [];
  getAccessList() {
    this.groupService.getGroupList({ appId: this.app.id, size: 999 })
      .subscribe(res => {
        this.accessList = res.content;
        this.cdr.detectChanges(); // <--- Add here if needed

      });
  }

  lookupList: any[] = [];
  getLookupList(appId) {
    let params = { appId: appId }
    this.lookupService.getFullLookupList(params)
        .subscribe(res => {
            this.lookupList = res.content;
            this.cdr.detectChanges(); // <--- Add here if needed
        })

}

  loadOtherAppList(type,appId) {
    this.getScreenList(appId);
    this.getFormList(appId);
    this.getCognaList(appId);
    this.getDatasetList(appId);
    this.getDashboardList(appId);
    this.getBucketList(appId);
    this.cdr.detectChanges(); // <--- Add here if needed
  }



  getFormList(appId) {
    // this.formPageNo = pageNumber;
    // this.formLoading = true;

    let params = new HttpParams()
      .set("appId", appId)

    this.formService.getListBasic(params)
      .subscribe(res => {
        this.formList = res.content;
        this.cdr.detectChanges(); // <--- Add here if needed

      });
  }

  getBucketList(appId) {
    // this.formPageNo = pageNumber;
    // this.formLoading = true;

    // let params = new HttpParams()
    //   .set("appId", appId)

    this.bucketService.getBucketList({appId})
      .subscribe(res => {
        this.bucketList = res.content;
        this.cdr.detectChanges(); // <--- Add here if needed
      });
  }


  getCognaList(appId) {
    // this.formPageNo = pageNumber;
    // this.formLoading = true;

    // let params = new HttpParams()
    //   .set("appId", appId)

    this.cognaService.getCognaList({appId})
      .subscribe(res => {
        this.cognaList = res.content;
        this.cdr.detectChanges(); // <--- Add here if needed

      });
  }


  // curFormId: number;
  // curForm: any;
  form: any = {};
  editScreenForm: any = {}
  // sectionItems:any[] = [];
  // prevForm: any
  loadForm(id, holder) {
    // alert(id);
    this.formService.getForm(id)
      .subscribe(res => {
        // this.sectionItems = this.getSectionItems(res,['list']);
        Object.assign(holder, res);
        this.populateAutoComplete();
        this.cdr.detectChanges(); // <--- Add here if needed
      });
  }

  bucket: any = {};
  // editScreenBucket: any = {}
  // sectionItems:any[] = [];
  // prevForm: any
  loadBucket(id, holder) {
    // alert(id);
    this.bucketService.getBucket(id)
      .subscribe(res => {
        // this.sectionItems = this.getSectionItems(res,['list']);
        Object.assign(holder, res);
        this.populateAutoComplete();
        this.cdr.detectChanges(); // <--- Add here if needed
      });
  }


  // curDataset: any;
  dataset: any = {};
  editScreenDataset: any = {}
  loadDataset(datasetId, holder) {
    this.datasetService.getDataset(datasetId)
      .subscribe(res => {
        this.loadForm(res.form.id, this.form);
        Object.assign(holder, res);
        this.cdr.detectChanges(); // <--- Add here if needed
      })
  }

  getDatasetList(appId) {
    this.datasetService.getDatasetList(appId)
      .subscribe(res => {
        this.datasetList = res;
        this.cdr.detectChanges(); // <--- Add here if needed

      })
  }

  getDashboardList(appId) {
    this.dashboardService.getDashboardList(appId)
      .subscribe(res => {
        this.dashboardList = res;
        this.dashboardList.forEach(i => {
          this.extraAutoCompleteJs.push({ label: `(dashboardId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
          this.extraAutoCompleteHtml.push({ label: `(dashboardId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
        })
        this.cdr.detectChanges(); // <--- Add here if needed

      })
  }

  moreAutocomplete() {
    this.formService.moreAutocompleteJs()
      .subscribe(res => {
        if (res?.list){
          this.extraAutoCompleteJs.push(...res.list);
          this.cdr.detectChanges(); // <--- Add here if needed
        }
      })
    this.formService.moreAutocompleteHtml()
      .subscribe(res => {
        if (res?.list){
          this.extraAutoCompleteHtml.push(...res.list);
          this.cdr.detectChanges(); // <--- Add here if needed
        }
      })
  }


  extraAutoCompleteHtml: any[] = [];
  extraAutoCompleteJs: any[] = [];
  
  populateAutoComplete() {

    this.extraAutoCompleteHtml = [];
    this.extraAutoCompleteJs = [];

    this.extraAutoCompleteJs.push({c: 2, label: "$reload$()", type: "text", apply: "$reload$()", detail: "Reload current screen"});

    this.curScreen.actions?.forEach(a => {
      this.extraAutoCompleteHtml.push({ label: `{{$go['${a.id}']}}`, type: "text", apply: `{{$go['${a.id}']}}`, detail: a.label })
      this.extraAutoCompleteHtml.push({ label: `$popup['${a.id}']()`, type: "text", apply: `$popup['${a.id}']()`, detail: a.label })
      this.extraAutoCompleteJs.push({ label: `$popup['${a.id}']()`, type: "text", apply: `$popup['${a.id}']()`, detail: a.label })
    })
    if (['list', 'page', 'static','map'].indexOf(this.curScreen.type) > -1) {
      if (this.form?.items) {
        Object.keys(this.form?.items).forEach(key => {
          var value = this.form?.items[key];
          if (this.form?.items[key].type != 'static') {
            if (['select', 'radio'].indexOf(value?.type) > -1) {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}.name}}`, type: "text", apply: `{{$.${key}.name}}`, label: value.label })
              this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}.name`, type: "text", apply: `$.${key}.name`, label: value.label })
            } else if (['date'].indexOf(value?.type) > -1) {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}|date:'DD-MM-YYYY'}}`, label: value.label })
              this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `$.${key}`, label: value.label })
            } else if (['file'].indexOf(value?.type) > -1) {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}|file}}`, label: value.label })
              this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `"${baseApi}/entry/file/" + $.${key}`, label: value.label })
            } else {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}}}`, label: value.label })
              this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `$.${key}`, label: value.label })
            }
          }
        });
      }
      if (this.form?.prev) {
        Object.keys(this.form?.prev?.items).forEach(key => {
          var value = this.form?.prev?.items[key];
          if (this.form?.prev?.items[key].type != 'static') {
            this.extraAutoCompleteHtml.push({ label: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, type: "text", apply: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, detail: value.label })
            this.extraAutoCompleteJs.push({ label: `$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, type: "text", apply: `$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, detail: value.label })
          }
        });
      }
      if (this.form) {
        this.form?.sections?.forEach(section => {
          // console.log(section)
          if (section.type == 'list') {
            this.extraAutoCompleteHtml.push({ label: '(child) $.' + section.code, type: "text", apply: this.getLoopCode(section), detail: '' + section.title })
            this.extraAutoCompleteJs.push({ label: '(child) $.' + section.code, type: "text", apply: this.getLoopCodeJs(section), detail: '' + section.title })
          }
        })
        // console.log("extraAutoComplete",this.extraAutoComplete)        
      }

      this.screenList?.forEach(i => {
        this.extraAutoCompleteJs.push({ label: `(screenId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
        this.extraAutoCompleteHtml.push({ label: `(screenId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
      })

      this.datasetList?.forEach(i => {
        this.extraAutoCompleteJs.push({ type: 'text', label: `(datasetId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
        this.extraAutoCompleteJs.push({ type: 'function', label: `(http-dataset:${i.id}) ${i.title}`, apply: `$http$(\"${baseApi}/entry/list?datasetId=${i.id}&email=\"+$user$.email, res=>{\n\t$this$.dataset_${i.id} = res.content;\n\t$this$.dataset_${i.id}_total = res.page?.totalElements;\n\t#{//more codes}\n})`, detail: i.title });
        this.extraAutoCompleteHtml.push({ type: 'text', label: `(datasetId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
      })

      this.formList?.forEach(i => {
        this.extraAutoCompleteJs.push({ type: 'text', label: `(formId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
        this.extraAutoCompleteJs.push({ type: 'function', label: `(http-form:${i.id}) ${i.title}`, apply: `$http$(\"${baseApi}/entry/by-params?formId=${i.id}&key=\"+value, res=>{\n\t$this$.entry_${i.id} = res;\n\t#{//more codes}\n})`, detail: i.title + " by param" });
        this.extraAutoCompleteHtml.push({ type: 'text', label: `(formId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
      })

      this.accessList?.forEach(i => {
        this.extraAutoCompleteJs.push({ label: `(groupId:${i.id}) ${i.name}`, apply: i.id + "", detail: i.name });
        this.extraAutoCompleteHtml.push({ label: `(groupId:${i.id}) ${i.name}`, apply: i.id + "", detail: i.name });
      })

      this.moreAutocomplete();
      this.cdr.detectChanges(); // <--- Add here if needed

    }

    this.cdr.detectChanges();

  }

  getScreenData(id) {
    // this.extraAutoCompleteHtml = [];
    // this.extraAutoCompleteJs = [];
    this.getActionComponents(id);
    this.screenService.getScreen(id)
      .subscribe(res => {
        this.curScreen = res;
        this.cdr.detectChanges(); // <--- Add here if needed
        
        if (!res.data) {
          res.data = {};
        }
        if (!res.data.content) {
          res.data.content = "";
        }
        if (['list','map'].indexOf(res.type)>-1) {
          this.loadDataset(res.dataset.id, this.dataset);
        } else if (res.type == 'bucket') {
          this.loadBucket(res.bucket.id, this.bucket);
        } else if (res.type == 'page') {
          this.loadForm(res.form.id, this.form);
        } else if (['static','combine'].indexOf(res.type)>-1) {
          this.form = {};
          this.dataset = {};
          this.populateAutoComplete(); // since not call loadForm, has to be called manually
        }
      })
  }

  getScreenList(appId) {
    this.screenLoading = true;
    this.screenService.getScreenList(appId)
      .subscribe(res => {
        this.screenList = res;
        this.screenLoading = false;
        this.commService.emitChange({ key: 'screen', value: res.length });
        this.cdr.detectChanges(); // <--- Add here if needed
      })
  }

  saveScreen(screen, form: NgForm) {
    this.screenService.saveScreen(this.app.id, screen)
      .subscribe(res => {
        this.getScreenData(screen.id);
        form.form.markAsPristine();
        this.toastService.show("Screen content saved successfully", { classname: 'bg-success text-light' });
      });
  }

  editActionData: any;
  editAction(content, data) {
    if (!data.x) {
      data['x'] = {};
    }
    this.editActionData = data;
    // console.log("appId",this.editActionData.appId)
    if (!this.editActionData.appId){      
      this.editActionData.appId = this.app.id;
    }
    this.loadOtherAppList(this.editActionData.type,this.editActionData.appId);   
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then((data) => {
        this.screenService.saveAction(this.curScreen.id, data)
          .subscribe(res => {
            this.getScreenData(this.curScreen.id);
            this.toastService.show("Screen action saved successfully", { classname: 'bg-success text-light' });
          }, dismiss => { });
      })
  }

  removeActionData: any;
  removeAction(content, data) {
    this.removeActionData = data;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then((data) => {
        this.screenService.removeAction(data.id)
          .subscribe({
            next: (res) => {
              this.getScreenData(this.curScreen.id);
              this.toastService.show("Screen action removed successfully", { classname: 'bg-success text-light' });
            },
            error: (err) => { }
          })
      }, res => { });
  }

  addScreenAction(list, action) {
    if (list['actions'] == null) {
      list['actions'] = [];
    }
    // console.log(action);
    list['actions'].push(action);
    // action = {};
  }

  curPreviewPage: any = {};
  curPreviewList: any[] = [];
  runPreview(type, id) {
    if (type == 'page') {
      this.entryService.getEntry(id, this.curScreen.form.id)
        .subscribe(res => {
          this.curPreviewPage = res.data;
          this.curPreviewPage.$id = res.id;
          this.curPreviewPage.$prev = res.prev;
          // console.log(this.curPreviewPage);
        })
    } else if (type == 'list') {
      this.entryService.getListByDatasetData(this.curScreen.dataset.id, { email: this.user.email })
        .subscribe(res => {
          this.curPreviewList = res;
        })
    } else if (type == 'calendar') {
      this.loadDatasetEvent(this.curScreen.dataset.id);
    }

    // var template = 
    // 'My skills:' + 
    // '<%if(this.showSkills) {%>' +
    //     '<%for(var index in this.skills) {%>' + 
    //     '<a href="#"><%this.skills[index]%></a>' +
    //     '<%}%>' +
    // '<%} else {%>' +
    //     '<p>none</p>' +
    // '<%}%>';
    // console.log(runTpl(template, {
    //     skills: ["js", "html", "css"],
    //     showSkills: true
    // }));
  }

  // buildGo(entryId) {
  //   var obj: any = {}
  //   // this.screen.actions.forEach(ac => {
  //   //   if (ac.nextType == 'form') {
  //   //     obj[ac.id] = `#${this.preurl}/form/${ac.next}/add`
  //   //   }
  //   //   if (ac.nextType == 'view') {
  //   //     obj[ac.id] = `#${this.preurl}/form/${ac.next}/view?entryId=${entryId}`
  //   //   }
  //   //   if (ac.nextType == 'edit') {
  //   //     obj[ac.id] = `#${this.preurl}/form/${ac.next}/edit?entryId=${entryId}`
  //   //   }
  //   //   if (ac.nextType == 'prev') {
  //   //     obj[ac.id] = `#${this.preurl}/form/${ac.next}/prev?entryId=${entryId}`
  //   //   }
  //   //   if (ac.nextType == 'screen') {
  //   //     obj[ac.id] = `#${this.preurl}/screen/${ac.next}?entryId=${entryId}`
  //   //   }
  //   //   if (ac.nextType == 'static') {
  //   //     obj[ac.id] = `#${this.preurl}/screen/${ac.next}`
  //   //   }
  //   // })
  //   return obj;
  //   // var basic = {
  //   //   view: `#${this.preurl}/form/${this.screen.dataset.form.id}/view/${entryId}`,
  //   //   edit: `#${this.preurl}/form/${this.screen.dataset.form.id}/edit/${entryId}`,
  //   //   screen: function(screenId){return `#${this.preurl}/screen/${screenId}?entryId=${entryId}`},
  //   // }
  //   // return basic;
  // }

  entryEvent: any[] = [];
  loadDatasetEvent(dsId) {
    this.entryEvent = [];
    this.datasetService.getDataset(dsId)
      .subscribe(ds => {
        this.entryService.getListByDatasetData(dsId, { email: this.user.email })
          .subscribe(list => {
            list.forEach(e => {
              this.entryEvent.push({
                title: e[this.curScreen.data.title],
                start: e[this.curScreen.data.start],
                end: e[this.curScreen.data.end],
                color: this.randomHsl()
              });
            })
          })
      })
  }

  randomHsl = () => `hsla(${Math.random() * 360}, 60%, 40%, 1)`;

  compileTpl = compileTpl;

  cleanText = cleanText;

  // runTpl = runTpl;


  onKeyDown($event): void {
    // Detect platform
    if (navigator.platform.match('Mac')) {
      this.handleMacKeyEvents($event);
    }
    else {
      this.handleWindowsKeyEvents($event);
    }
  }

  handleMacKeyEvents($event) {
    // MetaKey documentation
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.metaKey && charCode === 's') {
      // Action on Cmd + S
      $event.preventDefault();
      this.saveScreen(this.curScreen, this.curScreenForm())
    }
  }

  handleWindowsKeyEvents($event) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.ctrlKey && charCode === 's') {
      // Action on Ctrl + S
      $event.preventDefault();
      this.saveScreen(this.curScreen, this.curScreenForm())
      // alert("save");
    }
  }

  process(str) {

    var div = document.createElement('div');
    div.innerHTML = str?.trim(); //.replace(/\n/g,"");

    return this.format(div, 0).innerHTML.replace(/^\s*[\r\n]/gm, '');
  }

  format(node, level) {

    var indentBefore = new Array(level++ + 1).join('\t'),
      indentAfter = new Array(level - 1).join('\t'),
      textNode;

    for (var i = 0; i < node.children.length; i++) {
      // console.log(node.children[i]);

      textNode = document.createTextNode('\n' + indentBefore);
      node.insertBefore(textNode, node.children[i]);

      this.format(node.children[i], level);

      if (node.lastElementChild == node.children[i]) {
        textNode = document.createTextNode('\n' + indentAfter);
        node.appendChild(textNode);
      }
    }

    return node;
  }

  chatSuggestData:any;
  addChatSuggestion(tpl,data, isNew){
    if (!this.curScreen?.data?.suggestion){
      this.curScreen.data.suggestion = [];
    } 
    this.chatSuggestData = data;
    // console.log(this.chatSuggestData);
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' })
      .result.then(res => {
        if (isNew){
          this.curScreen.data.suggestion.push(res);
        }        
        this.screenService.saveScreen(this.app.id, this.curScreen)
          .subscribe(res => {
            this.getScreenData(res.id);
            this.toastService.show("Screen saved successfully", { classname: 'bg-success text-light' });
          });
      }, res => { });
  }

  addCombineCompData:any;
  addCombineComp(tpl,data, isNew){
    if (!this.curScreen?.data?.comps){
      this.curScreen.data.comps = [];
    } 
    this.addCombineCompData = data;
    if (this.addCombineCompData?.appId){
      this.loadOtherAppList(this.addCombineCompData?.type,this.addCombineCompData?.appId);
    }else{
      this.addCombineCompData.appId = this.app.id;
    }
    // console.log(this.addCombineCompData);
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static' })
      .result.then(res => {
        if (isNew){
          this.curScreen.data.comps.push(res);
        }        
        this.screenService.saveScreen(this.app.id, this.curScreen)
          .subscribe(res => {
            this.getScreenData(res.id);
            this.toastService.show("Screen saved successfully", { classname: 'bg-success text-light' });
          });
      }, res => { });
  }

  removeCombineComp(index){
    if (confirm("Are you sure you want to remove this component?")){
      this.curScreen.data.comps.splice(index, 1);
      this.screenService.saveScreen(this.app.id, this.curScreen)
          .subscribe(res => {
            this.getScreenData(res.id);
            this.toastService.show("Screen saved successfully", { classname: 'bg-success text-light' });
          });
    }
  }

  // getIcon=(str)=>str?str.split(":"):['far','question-circle'];

  removeChatSuggestion(index){
    if (confirm("Are you sure you want to remove this chat suggestion?")){
      this.curScreen.data.suggestion.splice(index, 1);
      this.screenService.saveScreen(this.app.id, this.curScreen)
          .subscribe(res => {
            this.getScreenData(res.id);
            this.toastService.show("Screen saved successfully", { classname: 'bg-success text-light' });
          });
    }
  }

  formatJson(text) {
    var g = JSON.stringify(JSON.parse(text));
    return g;
  }

  facetList:any[]=[];
  loadFacet(formId){
    this.formService.getForm(formId)
    .subscribe(res => {
      this.facetList = this.removeFromArray(this.getAsList(res?.x?.facet),['add','edit','view'])
    });
  }

  getAsList = splitAsList;

  removeFromArray(array, item) {
      return (array ? array : []).filter(r => item.indexOf(r) == -1);
  }

  dropSubs(event: CdkDragDrop<number[]>, parent) {
    moveItemInArray(parent, event.previousIndex, event.currentIndex);
    parent = parent
        .map(function (val, $index) {
            val.sortOrder = $index;
            return val;
        });
    this.saveScreen(this.curScreen, this.curScreenForm());
  }

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }



}
