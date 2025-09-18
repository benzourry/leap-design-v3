import { Component, inject, OnInit, signal, viewChild, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
import { LambdaService } from '../../../service/lambda.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, NgClass, JsonPipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { DatasetService } from '../../../service/dataset.service';
import { DashboardService } from '../../../service/dashboard.service';
import { FormService } from '../../../service/form.service';
import { base, baseApi, domainBase } from '../../../_shared/constant.service';
// import { LookupService } from '../../../service/lookup.service';
import { EndpointService } from '../../../service/endpoint.service';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';
import { map, withLatestFrom } from 'rxjs';
import { br2nl, nl2br, toHyphen, toSnakeCase, toSpaceCase } from '../../../_shared/utils';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { UniqueAppPathDirective } from '../../../_shared/app-path-validator';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgCmComponent as NgCmComponent_1 } from '../../../_shared/component/ng-cm/ng-cm.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
import { LookupService } from '../../../run/_service/lookup.service';
import { JsonViewerComponent } from '../../../_shared/component/json-viewer/json-viewer.component';

@Component({
    selector: 'app-lambda-editor',
    templateUrl: './lambda-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './lambda-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, RouterLink, FaIconComponent, NgbPagination, 
      NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, NgbDropdown, 
      NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgClass, NgCmComponent_1, 
      JsonViewerComponent,
      NgSelectModule, UniqueAppPathDirective, FilterPipe, SafePipe],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LambdaEditorComponent implements OnInit {

  offline = false;
  app: any;

  lambdaTotal = signal<number>(0);
  // loading: boolean;
  lambdaList = signal<any[]>([]);
  // lambdaEntryTotal = signal<number>(0);
  // lambdaEntryList = signal<any[]>([]);
  // sharedList: any;
  // sharedTotal: any;
  // sharedLoading: any;
  // totalItems: any;
  lambda: any;
  itemLoading = signal<boolean>(false);
  appId: number;
  baseApi = baseApi;

  readonly codeeditorinit = viewChild<NgCmComponent>('codeeditorinit');

  private userService = inject(UserService)
  private route = inject(ActivatedRoute)
  private lambdaService = inject(LambdaService)
  private datasetService = inject(DatasetService)
  private dashboardService = inject(DashboardService)
  private lookupService = inject(LookupService)
  // private formService = inject(FormService)
  private modalService = inject(NgbModal)
  private location = inject(PlatformLocation)
  private router = inject(Router)
  private appService = inject(AppService)
  private toastService = inject(ToastService)
  private endpointService = inject(EndpointService)
  private utilityService = inject(UtilityService)
  cdr = inject(ChangeDetectorRef);

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  isCodeTaken = (code) => this.lambdaService.isCodeTaken(code);

  ngOnInit() {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        this.cdr.detectChanges();

        this.route.parent.params
          // NOTE: I do not use switchMap here, but subscribe directly
          .subscribe((params: Params) => {
            this.appId = params['appId'];


            if (this.appId) {
              let params = {
                email: user.email
              }
              this.appService.getApp(this.appId, params)
                .subscribe(res => {
                  this.app = res;
                  this.cdr.detectChanges();
                });
            }

            this.loadLambdaList(1);
            // this.loadSharedList(1);
            this.loadBindingSrcs();

          });

        this.route.queryParams
          .subscribe((params: Params) => {
            const id = params['id'];
            if (id) {
              this.loadLambda(id);
            }
          })
      });
  }

  user: any;
  lambdaId = '';
  pageSize = 45;
  itemsPerPage = 15;
  searchText: string = "";

  pageNumber = signal<number>(1);

  //   popShare(id) {
  //     let url = this.app.appPath ? this.app.appPath + '.' + domainBase : domainBase + "/#/run/" + id;
  //     prompt('App URL (Press Ctrl+C to copy)', url);
  // }

  // this.loadLambdaList = loadLambdaList;
  loadLambdaList(pageNumber) {
    this.pageNumber.set(pageNumber);
    this.itemLoading.set(true);

    let params = {
      searchText: this.searchText,
      appId: this.appId,
      page: pageNumber - 1,
      size: this.itemsPerPage
    }
    this.lambdaService.getLambdaList(params)
      .subscribe(res => {
        this.lambdaList.set(res.content);
        this.lambdaTotal.set(res.page?.totalElements);
        this.itemLoading.set(false);
      }, res => this.itemLoading.set(false))
  }

  editCode: boolean;
  editLambdaData: any;
  editLambda(content, lambda, isNew) {
    // console.log(lambda);
    lambda.content = this.br2nl(lambda.content);
    this.editLambdaData = lambda;
    this.editLambdaData.email = lambda.email || this.user.email;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        data.content = this.nl2br(data.content);
        this.lambdaService.save(data.email, this.appId, data)
          .subscribe(res => {
            this.loadLambdaList(this.pageNumber());
            this.loadLambda(res.id);            
            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
            this.toastService.show("Lambda successfully saved", { classname: 'bg-success text-light' });
          }, err => {
            this.toastService.show("Lambda saving failed", { classname: 'bg-danger text-light' });
          });
      }, res => { })
  }

  removeLambdaData: any;
  removeLambda(content, lambda) {
    this.removeLambdaData = lambda;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.lambdaService.deleteLambda(lambda.id, data)
          .subscribe(res => {
            this.loadLambdaList(1);
            delete this.lambda;
            this.toastService.show("Lambda successfully saved", { classname: 'bg-success text-light' });
          }, err => {
            this.toastService.show("Lambda removal failed", { classname: 'bg-danger text-light' });
          });
      }, res => { });
  }

  initialCode: string = "";

  // params: string[];
  domainBase = domainBase;

  // url: string = "";
  loadLambda(id) {
    this.lambdaId = id;
    // console.log(id);
    this.lambdaService.getLambda(id)
      .subscribe(lambda => {
        this.lambda = lambda;
        // console.log(lambda.code)
        this.initialCode = lambda.code;
        // this.runRes[id] = undefined;
        this.extraAutoComplete = [];
        this.populateAutoComplete();
        this.moreAutocomplete();
        this.cdr.detectChanges();
        // this.url = 'https://' +
        //   (this.app.appPath ? `${this.app.appPath}.${domainBase}/#/web/${lambda.code}` : `${domainBase}/#/run/${id}/web/${lambda.code}`);
      }, error => {
        // console.log(error);
      })

  }

  extraAutoComplete: any[] = [];
  populateAutoComplete() {
    // console.log("#########");
    // this.extraAutoComplete = [];
    this.lambda.binds.forEach(b => {
      if (b.type == 'lookup') {
        this.extraAutoComplete.push({ label: "lookup_" + b.srcId, type: "enum", apply: `lookup_${b.srcId}.content.forEach(le=>{\n\tle.getCode();\n\t#{//more codes}\n})`, detail: b.name },)
      }
      if (b.type == 'dataset') {
        this.extraAutoComplete.push({ label: "dataset_" + b.srcId, type: "enum", apply: `dataset_${b.srcId}.forEach(e=>{\n\te.getId();\n\t#{//more codes}\n})`, detail: b.name },)
      }
      if (b.type == '_mail') {
        this.extraAutoComplete.push({ label: "_mail.send", type: "function", apply: "_mail.send({\n\tto:'${to-email}',\n\tsubject:'${subject}',\n\tcontent:'${content}'\n}, _this);", detail: "Send email" },)
        this.extraAutoComplete.push({ label: "_mail.sendWithTemplate", type: "function", apply: "_mail.sendWithTemplate(${template-id}, ${entry}, _this);", detail: "Send email with template" },)
      }
      if (b.type == '_endpoint') {
        this.endpointService.getEndpointList({ appId: this.appId })
          .subscribe(res => {
            res.content.forEach(r => {
              this.extraAutoComplete.push({ label: `_endpoint.run(${r.code})`, type: "function", apply: `_endpoint.run('${r.code}', {\n\t#{/*Parameter Obj*/}\n}, {\n\t#{/*Body Obj*/}\n}, _this)`, detail: r.name })
            })
          })
      }
      if (b.type == '_mapper') {
        this.extraAutoComplete.push(
          { label: "_mapper.convertValue", type: "function", apply: "_mapper.convertValue({#{key:value}},#{Object}.class)", detail: "Convert from different class" },
          { label: "_mapper.readTree", type: "function", apply: "_mapper.readTree(`#{json-text}`)", detail: "Convert json string to actual JsonNode" },
          { label: "_mapper.writeValueAsString", type: "function", apply: "_mapper.writeValueAsString(#{object})", detail: "Convert object to json string" },
          { label: "_toMap", type: "function", apply: "_toMap(#{object})", detail: "Convert object to Map" },
          { label: "_toEntry", type: "function", apply: "_toEntry(#{object})", detail: "Convert object to Entry" },
        );
      }
      if (b.type == '_jsoup') {
        this.extraAutoComplete.push(
          { label: "_jsoup.connect", type: "function", apply: "_jsoup.connect('#{url}').get()", detail: "Fetch data from URL and get Document object" }
        );
      }
      if (b.type == '_user') {
        this.extraAutoComplete.push(
          { label: "_user.name", type: "property", apply: "_user.name", detail: "Name of logged in user" },
          { label: "_user.email", type: "property", apply: "_user.email", detail: "Email of logged in user" },
          { label: "_user.imageUrl", type: "property", apply: "_user.imageUrl", detail: "Photo URL of logged in user" },
          { label: "_user.provider", type: "property", apply: "_user.provider", detail: "Identity provider (ie: google, facebook)" },
          { label: "_user.providerId", type: "property", apply: "_user.providerId", detail: "User ID provided by the identity provider" },
        )
      }
      if (b.type == '_token') {
        this.extraAutoComplete.push(
          { label: "_token.clearAccessToken", type: "function", apply: "_token.clearAccessToken('${client-id:client-secret}')", detail: "Clear access token for the specified clientId" },
          { label: "_token.getAccessToken", type: "text", apply: "_token.getAccessToken('${token-endpoint}','${client-id}','${client-secret}')", detail: "Get access token using the specified info" },
        )
      }
      if (b.type == '_util') {
        this.extraAutoComplete.push(
          { label: "_util.ocr", type: "function", apply: "_util.ocr('${pathUrl}','${eng}')", detail: "Perform OCR on the given image path URL" },
          { label: "_util.replaceMulti", type: "function", apply: "_util.replaceMulti('${text}',{${map}})", detail: "Perform multi replace on the text" },
          { label: "_util.readExcel", type: "function", apply: "_util.readExcel('${filePath}')", detail: "Read excel file as XSSFWorkbook" },
          { label: "_util.btoa", type: "function", apply: "_util.btoa('${text-to-encode}')", detail: "Encode text to Base64" },
          { label: "_util.atob", type: "function", apply: "_util.atob('${text-to-decode}')", detail: "Decode Base64 to text" },
          { label: "_util.hash", type: "function", apply: "_util.hash('${text-to-encode}','#{SHA-256}')", detail: "Hash text using the specified encoder" },
          // { label: "_token.getAccessToken", type: "text", apply: "_token.getAccessToken('${token-endpoint}','${client-id}','${client-secret}')", detail: "Get access token using the specified info" },
        )
      }
      if (b.type == '_io') {
        this.extraAutoComplete.push(
          { label: "_io.write", type: "function", apply: "_io.write('${content}','${filename}')", detail: "Write textual file to server storage" },
          { label: "_io.read", type: "function", apply: "_io.read('${filename}')", detail: "Read textual file to server storage" },
          { label: "_io.path", type: "function", apply: "_io.path('${bucket-filename}')", detail: "Get actual path for uploaded file" },
          { label: "_io.zip", type: "function", apply: "_io.zip(#{string-list})", detail: "Zip all provided file path list, return URL to download zip" },
          { label: "_io.pathFromBucket", type: "function", apply: "_io.pathFromBucket(#{bucket-id})", detail: "Get list of files path from bucket" },
        )
      }
      if (b.type == '_sql') {
        this.extraAutoComplete.push(
          { label: "_sql.select", type: "function", apply: "_sql.select('${query}',{#{/*named parameters*/}},true)", detail: "Run SQL query" },
          { label: "_sql.count", type: "function", apply: "_sql.count('${query}',{#{/*named parameters*/}},true)", detail: "Run SQL count query " },
        )
      }
      if (b.type == '_http') {
        this.extraAutoComplete.push(
          { label: "_http.GET", type: "function", apply: "_http.GET('#{url}',{ headers:{} }).body()", detail: "HTTP GET Request" },
          { label: "_http.POST", type: "function", apply: "_http.POST('#{url}',{ headers:{}, body:{#{/*payload*/}}},'#{json}').body()", detail: "HTTP POST Request" },
        )
      }
      if (b.type == '_pdf') {
        this.extraAutoComplete.push(
          { label: "_pdf.fromHtml", type: "function", apply: "_pdf.fromHtml('#{html}')", detail: "Render PDF from HTML" },
        )
      }
      if (b.type == '_cogna') {
        this.extraAutoComplete.push(
          { label: "_cogna.prompt", type: "function", apply: "_cogna.prompt(#{cognaId},{\n\t#{\n\t\tprompt:'#{text}'\n\t}\n},'#{email}')", detail: "Prompt for cogna" },
          { label: "_cogna.classify", type: "function", apply: "_cogna.classify(#{cognaId},#{text})", detail: "Classify text using cogna" },
          { label: "_cogna.extract", type: "function", apply: "_cogna.extract(#{cognaId},{\n\t#{\n\t\ttext:'#{text}',\n\t\tdocList:[]\n\t}\n})", detail: "Extract data from text" },
          { label: "_cogna.summarize", type: "function", apply: "_cogna.summarize(#{cognaId},'#{text}',#{pointCount})", detail: "Summarize text into points" },
          { label: "_cogna.translate", type: "function", apply: "_cogna.translate(#{cognaId},'#{text}',#{lang})", detail: "Translate text into other language" },
          { label: "_cogna.generateImage", type: "function", apply: "_cogna.generateImage(#{cognaId},'#{text}')", detail: "Generate image from the provided text" },
          { label: "_cogna.findSimilarity", type: "function", apply: "_cogna.findSimilarity(#{cognaId},'#{search}',#{maxResult},#{minScore})", detail: "Search cogna vector DB" },
        )
      }
      if (b.type == '_entry') {
        this.extraAutoComplete.push(
          { label: "_entry.byId", type: "function", apply: "_entry.byId(${id}, _this)", detail: "Entry by Id", boost: 10 },
          { label: "_entry.save", type: "function", apply: "_entry.save({\n\tdata:{#{/*Data obj*/}}\n},#{formId}, #{prev-entry-id}, _this)", detail: "Save entry", boost: 10 },
          { label: "_entry.update", type: "function", apply: "_entry.update(${entryId}, {\n\t#{/*Data obj*/}\n}, _this)", detail: "Update entry", boost: 10 },
          { label: "_entry.approval", type: "function", apply: "_entry.approval(${entryId}, {\n\ttier:{id:000},\n\tstatus:'approved',\n\tremark:'',\n\tdata:{}\n}, _user.email, _this)", detail: "Approve entry", boost: 10 },
          { label: "_entry.submit", type: "function", apply: "_entry.submit(${entryId})", detail: "Submit entry", boost: 10 },
          { label: "_entry.chart", type: "function", apply: "_entry.chart(${chartId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Run specified chart ID", boost: 10 },
          { label: "_entry.chartAsMap", type: "function", apply: "_entry.chartAsMap(${chartData})", detail: "Convert chart data to Map", boost: 10 },
          { label: "_entry.chartize", type: "function", apply: "_entry.chartize(${formId}, {\n\tagg:'#{count}',\n\tby:'#{$.category.name}',\n\tvalue:'#{$.$id}',\n\tseries:'',\n\tshowAgg: true,\n\tstatus: {},\n\tfilter: {}\n}, _user.email, _this)", detail: "Generate ad-hoc chart", boost: 10 },
          { label: "_entry.delete", type: "function", apply: "_entry.delete(${entryId}, _this)", detail: "Delete entry" },
          { label: "_entry.count", type: "function", apply: "_entry.count(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Get dataset entries count", boost: 10 },
          { label: "_entry.dataset", type: "function", apply: "_entry.dataset(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Load dataset entries", boost: 10 },
          { label: "_entry.flatDataset", type: "function", apply: "_entry.flatDataset(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Load flat dataset entries (without envelope)", boost: 10 },
          { label: "_entry.streamDataset", type: "function", apply: "_entry.streamDataset(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Stream dataset entries", boost: 10 },
          { label: "_entry.relinkPrev", type: "function", apply: "_entry.relinkPrev(${entryId}, ${prevEntryId}, _this)", detail: "Relink entry with specified prev entry", boost: 10 },
        )
      }
      if (b.type == '_lookup') {
        this.extraAutoComplete.push(
          { label: "_lookup.list", type: "function", apply: "_lookup.list(${lookup-id}, {\n\t#{/*Filter obj*/}\n}, _this)", detail: "List lookup by ID", boost: 10 },
        )
      }
    });
    this.extraAutoComplete.push(
      { label: "_env.IO_BASE_API_URL", type: "function", apply: "_env.IO_BASE_API_URL", detail: "Base API/backend URL" },
      { label: "_env.IO_BASE_URL", type: "function", apply: "_env.IO_BASE_URL", detail: "Base backend URL" },
      { label: "_env.UI_BASE_URL", type: "function", apply: "_env.UI_BASE_URL", detail: "Base UI/frontend URL" },
      { label: "_env.UPLOAD_DIR", type: "function", apply: "_env.UPLOAD_DIR", detail: "Upload dir" },
      { label: "_env.TMP_DIR", type: "function", apply: "_env.TMP_DIR", detail: "Temp file dir" },
    )

  }

  moreAutocomplete() {
    this.lambdaService.moreAutocompleteLambda()
      .subscribe(res => {
        if (res?.list){
          this.extraAutoComplete.push(...res.list);
        }
      })
  }

  evictCache() {
    this.lambdaService.evictCache(this.lambda.code, 'out')
      .subscribe(res => this.toastService.show("Endpoint Cache evicted: " + this.lambda.code));
    this.lambdaService.evictCache(this.lambda.code, 'print')
      .subscribe(res => this.toastService.show("Print Stream Cache evicted: " + this.lambda.code));
  }

  saveLambda(data) {
    this.lambdaService.save(data.email, this.appId, data)
      .subscribe(res => {
        this.loadLambdaList(this.pageNumber());
        this.loadLambda(res.id);
        this.toastService.show("Lambda successfully saved", { classname: 'bg-success text-light' });
      }, err => {
        this.toastService.show("Lambda saving failed: " + err.error.message, { classname: 'bg-danger text-light' });
      });
  }

  consoleType = 'text';
  request: any = {}
  // showPrompt(script) {
  //   this.request = {};
  //   const array = [...script.matchAll(/_request\.getParameter\(["'](.+?)["']\s*\)/ig)];
  //   const arrayParam = [...script.matchAll(/_param\.(.+?)\s*/ig)];
  //   [...array, ...arrayParam].forEach(e => {
  //     if (!this.request[e[1]]) {
  //       this.request[e[1]] = prompt("Enter value for parameter '" + e[1] + "'");
  //     }
  //   })
  // }
  lambdaPromptsKeys:any[] = []
  lambdaPromptsData :any = {}
  showPrompt(script) {
    this.request = {};

    this.lambdaPromptsKeys = [];
    this.lambdaPromptsData = {};
  
    const array = [...script.matchAll(/_request\.getParameter\(["'](.+?)["']\s*\)/ig)];
    const arrayParam = [...script.matchAll(/_param\.(\w+)/ig)];
  
    const matches = [...array, ...arrayParam];
  
    for (const match of matches) {
      if (!match || !match[1]) continue; // skip if malformed
  
      const paramName = match[1].trim();
      if (!this.lambdaPromptsKeys.includes(paramName)) {
        this.lambdaPromptsKeys.push(paramName);
        this.lambdaPromptsData[paramName] = '';
        // this.request[paramName] = prompt(`Enter value for parameter '${paramName}'`);
      }
    }
  }

  resultLoading = signal<any>({});
  runRes = signal<any>({});

  lambdaPromptTpl = viewChild('lambdaPromptTpl');
  runLambda(lambda) {

    const run = (data) =>{
      this.resultLoading.update(rl=>({...rl,[lambda.id]:true}));
      this.lambdaService.runLambda(lambda.id, data)
      .subscribe(res => {
        this.runRes.update(rr => ({...rr, [lambda.id]:res}));
        this.toastService.show("Script executed successfully", { classname: 'bg-success text-light' });
        this.resultLoading.update(rl => ({...rl, [lambda.id]:false}));
      }, err => {
        this.toastService.show("Script execution failed", { classname: 'bg-danger text-light' });
        this.runRes.update(rr => ({...rr,[lambda.id]:{ message: JSON.stringify(err.error), success: false }}));
        this.resultLoading.update(rl => ({...rl, [lambda.id]:false}));
      });
    }

    this.lambdaService.save(this.user.email, this.appId, lambda)
      .subscribe(res => {
        
        this.showPrompt(lambda.data.f);

        if (this.lambdaPromptsKeys.length > 0) {

          // IF THERE ARE PROMPTS
          this.modalService.open(this.lambdaPromptTpl(), { backdrop: 'static' })
          .result.then(data => {
            run(data);
          }, res=>{});
        }else{
          // IF NO PROMPTS
          run({});
        }
      });
  }

  getPdfUrl() {
    return this.lambda?.code ? base + '/~/' + this.lambda.code + '/pdf' : baseApi + '/lambda/' + this.lambda?.id + '/pdf'
  }

  // streamRes:any;
  streamLambda(lambda) {
    this.resultLoading.update(rl =>({...rl, [lambda.id]:false}));
    this.lambdaService.save(this.user.email, this.appId, lambda)
      .subscribe(res => {
        this.showPrompt(lambda.data.f);
        this.lambdaService.streamLambda(lambda.id, this.request)
          .pipe(
            map(res => {    
              if (res['type'] == 4) {
                this.runRes.update(rr =>({...rr, [lambda.id]:{ print: res['body'], success: true, out: {} }}));
              } else {
                this.runRes.update(rr =>({...rr, [lambda.id]:{ print: res['partialText'], success: true, out: {} }}));
              }
            })
          )
          .subscribe(res => {
          }, err => {
            this.toastService.show("Script execution failed", { classname: 'bg-danger text-light' });
            this.runRes.update(rr => ({...rr, [lambda.id]:{ message: JSON.stringify(err.error), success: false }}));
          });
      });
  }


  base = base;

  bindingSrcs: any[] = [];
  loadBindingSrcs() {
    this.bindingSrcs = [];
    this.getDatasetList();
    this.getDashboardList();
    this.getLookupList();
    this.otherBinds();
    // this.getFormList();
  }

  datasetList: any[];
  dashboardList: any[];
  formList: any[];
  getDatasetList() {
    this.datasetService.getDatasetList(this.appId)
      .subscribe(res => {
        this.datasetList = res;
        this.datasetList.forEach(d => {
          this.bindingSrcs.push({ name: d.title, type: 'dataset', srcId: d.id })
        })
        this.cdr.detectChanges();
      })
  }

  getDashboardList() {
    this.dashboardService.getDashboardList(this.appId)
      .subscribe(res => {
        this.dashboardList = res;
        this.dashboardList.forEach(d => {
          this.bindingSrcs.push({ name: d.title, type: 'dashboard', srcId: d.id })
        })
        this.cdr.detectChanges();
      })
  }
  keepMinute00 = (object) => {
    if (object['clock'].length >= 4) {
      object['clock'] = object['clock'].slice(0, -1) + '0';
    }
  }
  otherBinds() {
    this.bindingSrcs.push({ name: "⚙ Mailer", type: '_mail' })
    this.bindingSrcs.push({ name: "⚙ Entry", type: '_entry' })
    this.bindingSrcs.push({ name: "⚙ Lookup", type: '_lookup' })
    this.bindingSrcs.push({ name: "⚙ Cogna", type: '_cogna' })
    this.bindingSrcs.push({ name: "⚙ Endpoint", type: '_endpoint' })
    this.bindingSrcs.push({ name: "⚙ User", type: '_user' })
    this.bindingSrcs.push({ name: "⚙ Mapper", type: '_mapper' })
    this.bindingSrcs.push({ name: "⚙ Jsoup", type: '_jsoup' })
    this.bindingSrcs.push({ name: "⚙ Token", type: '_token' })
    this.bindingSrcs.push({ name: "⚙ SQL", type: '_sql' })
    this.bindingSrcs.push({ name: "⚙ IO/File", type: '_io' })
    this.bindingSrcs.push({ name: "⚙ Utility", type: '_util' })
    this.bindingSrcs.push({ name: "⚙ HTTP", type: '_http' })
    this.bindingSrcs.push({ name: "⚙ PDF", type: '_pdf' })
  }
  getLookupList() {
    this.lookupService.getLookupList({ appId: this.appId, size: 999 })
      .subscribe(res => {
        res.content.forEach(d => {
          this.bindingSrcs.push({ name: d.name, type: 'lookup', srcId: d.id })
        })
        this.cdr.detectChanges();
      });
  }

  // getFormList() {
  //   this.formService.getListBasic({appId:this.appId})
  //     .subscribe(res => {
  //       this.formList = res.content;
  //       this.formList.forEach(d=>{
  //         this.bindingSrcs.push({name:d.title,type:'form',srcId:d.id})
  //       })
  //     });
  // }

  isEmptyObject = (obj: any) => obj && Object.keys(obj).length == 0;

  keyList = (obj: any) => obj && Object.keys(obj).join(", ");

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
      this.saveLambda(this.lambda)
    }
  }

  handleWindowsKeyEvents($event) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.ctrlKey && charCode === 's') {
      // Action on Ctrl + S
      $event.preventDefault();
      this.saveLambda(this.lambda)
    }
  }

  nl2br = nl2br;// (text) => text ? text.replace(/\n/g, "<br/>") : text;
  br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

  toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

  toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';

  toHyphen = toHyphen; //(string) => string ? this.toSpaceCase(string).replace(/\s/g, '-').toLowerCase() : '';


  itemExist = (f) => this.lambdaList().filter(e => e.code == f.code).length > 0 && !f.id;

  dayOfWeekList = [
    { name: "Sunday", value: 1 },
    { name: "Monday", value: 2 },
    { name: "Tuesday", value: 3 },
    { name: "Wednesday", value: 4 },
    { name: "Thursday", value: 5 },
    { name: "Friday", value: 6 },
    { name: "Saturday", value: 7 }
  ]
  monthOfYearList = [
    { name: "January", value: 0 },
    { name: "February", value: 1 },
    { name: "March", value: 2 },
    { name: "April", value: 3 },
    { name: "May", value: 4 },
    { name: "June", value: 5 },
    { name: "July", value: 6 },
    { name: "August", value: 7 },
    { name: "September", value: 8 },
    { name: "October", value: 9 },
    { name: "November", value: 10 },
    { name: "Disember", value: 11 }
  ]

  dayOfMonthList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];


}
