import { Component, inject, OnInit, signal, viewChild, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { LambdaService } from '../../../service/lambda.service';
import { NgbModal, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem } from '@ng-bootstrap/ng-bootstrap';
import { PlatformLocation, DatePipe } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { base, baseApi, domainBase } from '../../../_shared/constant.service';
import { EndpointService } from '../../../service/endpoint.service';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';
import { map, shareReplay, switchMap, tap } from 'rxjs';
import { toSnakeCase, toSpaceCase } from '../../../_shared/utils';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { NgCmComponent as NgCmComponent_1 } from '../../../_shared/component/ng-cm/ng-cm.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { JsonViewerComponent } from '../../../_shared/component/json-viewer/json-viewer.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MetaTrailViewerComponent } from '../../../_shared/modal/meta-trail-viewer/meta-trail-viewer.component';
import { MetaTrailService } from '../../../service/metatrail.service';
import { CommService } from '../../../_shared/service/comm.service';
import { AssistantLocalContextService } from '../assistant/assistant-local-context.service';
import { EditorIdChipComponent } from '../ui-editor/editor-id-chip.component';
import { LambdaEditDialogService } from './lambda-edit-dialog.service';

@Component({
    selector: 'app-lambda-editor',
    templateUrl: './lambda-editor.component.html',
    styleUrls: ['../_workspace-sidebar.scss', '../../../../assets/css/element-action.css', './lambda-editor.component.scss'],
    imports: [FormsModule, FaIconComponent, NgbDropdown,
      NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgCmComponent_1, 
      JsonViewerComponent, EditorIdChipComponent,
      SafePipe, DatePipe, MetaTrailViewerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LambdaEditorComponent implements OnInit {

  offline = false;
  app: any;

  lambda: any;
  appId: number;
  baseApi = baseApi;

  readonly codeeditorinit = viewChild<NgCmComponent>('codeeditorinit');

  private userService = inject(UserService)
  private route = inject(ActivatedRoute)
  private lambdaService = inject(LambdaService)
  private modalService = inject(NgbModal)
  private location = inject(PlatformLocation)
  private router = inject(Router)
  private appService = inject(AppService)
  private editDialog = inject(LambdaEditDialogService)
  private toastService = inject(ToastService)
  private endpointService = inject(EndpointService)
  private utilityService = inject(UtilityService)
  private metaTrailService = inject(MetaTrailService)
  private commService = inject(CommService);
  private destroyRef = inject(DestroyRef); 
  private assistantContext = inject(AssistantLocalContextService).createRegistration();
  cdr = inject(ChangeDetectorRef);

  constructor() {
        this.destroyRef.onDestroy(() => this.assistantContext.clear());
        this.commService.changeEmitted$
            .pipe(takeUntilDestroyed())
            .subscribe(data => {
              if (data.key !== 'assistant-lambda' || !this.appId) return;
              if (this.lambdaId) this.loadLambda(Number(this.lambdaId));
            });
        this.location.onPopState(() => {
            if (document.querySelector('.cm-fullscreen-mode')) {
                return;
            }
            this.modalService.dismissAll('')
        });
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  ngOnInit() {
    const user$ = this.userService.getCreator().pipe(
      takeUntilDestroyed(this.destroyRef),
      tap((user) => {
        this.user = user;
        this.cdr.markForCheck();
      }),
      shareReplay(1)
    );

    user$.pipe(
      switchMap(() => this.route.parent.params),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params: Params) => {
      const newAppId = params['appId'];

      if (newAppId && newAppId !== this.appId) {
        this.appId = newAppId;
        
        let appParams = { email: this.user.email };
        this.appService.getApp(this.appId, appParams)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            this.app = res;
            this.cdr.markForCheck();
          });

        this.loadSecretList();
      }
    });

    user$.pipe(
      switchMap(() => this.route.queryParams),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params: Params) => {
      const id = params['id'];
      const key = params['key'];

      if (id && id !== this.lambdaId) {
        this.loadLambda(id);
      } else if (key) {
        this.showSecret = true;
        this.lambdaId = '';
        this.cdr.markForCheck();
      }
    });
  }

  user: any;
  lambdaId = '';
  pageSize = 45;
  showSecret:boolean=false;
  secretList: any[] = [];
  loadSecretList() {
    this.lambdaService.getSecretList(this.appId)
      .subscribe(res => {
        this.secretList = res;
        this.cdr.detectChanges();
      })
  }

  removeSecretData:any;
  deleteSecret(content, secret){
    if (this.isTimeWarping) { this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); return; }
    
    this.removeSecretData = secret;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content)
      .result.then(res => {
        this.lambdaService.deleteSecret(res.id)
        .subscribe({
          next:(res)=>{
            this.loadSecretList();
            this.toastService.show("Secret successfully removed", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          },
          error:(err)=>{
            this.toastService.show("Secret removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          }
        })
      }, err => { });
  }

  editCode: boolean;
  editLambda(lambda) {
    if (this.isTimeWarping) { this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); return; }
    this.editDialog.open(this.appId, this.user.email, lambda)
      .then(data => {
        this.lambdaService.save(data.email, this.appId, data)
          .subscribe(res => {
            this.commService.emitChange({ key: 'lambda-list-changed' });
            this.loadLambda(res.id);            
            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
            this.toastService.show("Lambda successfully saved", { classname: 'bg-success text-light' });
          }, err => {
            this.toastService.show("Lambda saving failed", { classname: 'bg-danger text-light' });
          });
      }, res => { })
  }

  editSecretCode: boolean;
  editSecretData: any;
  editSecret(content, secret, isNew) {
    if (this.isTimeWarping) { this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); return; }

    this.editSecretData = secret;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.lambdaService.saveSecret(this.appId, data)
          .subscribe(res => {
            this.loadSecretList();
            this.toastService.show("Secret successfully saved", { classname: 'bg-success text-light' });
          }, err => {
            this.toastService.show("Secret saving failed", { classname: 'bg-danger text-light' });
          });
      }, res => { })
  }

  removeLambdaData: any;
  removeLambda(content, lambda) {
    if (this.isTimeWarping) { this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); return; }

    this.removeLambdaData = lambda;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.lambdaService.deleteLambda(lambda.id, data)
          .subscribe(res => {
            this.commService.emitChange({ key: 'lambda-list-changed', page: 1 });
            delete this.lambda;
            this.toastService.show("Lambda successfully saved", { classname: 'bg-success text-light' });
          }, err => {
            this.toastService.show("Lambda removal failed", { classname: 'bg-danger text-light' });
          });
      }, res => { });
  }

  domainBase = domainBase;

  loadLambda(id) {
    if (this.isTimeWarping) this.exitTimeWarp();

    this.lambdaId = id;
    this.lambdaService.getLambda(id)
      .subscribe(lambda => {
        this.showSecret = false;
        this.lambda = lambda;
        this.assistantContext.set({ type: 'lambda', id: Number(lambda.id), label: lambda.name });
        this.extraAutoComplete = [];
        this.populateAutoComplete();
        this.moreAutocomplete();
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.contentForm && this.contentForm()) {
            this.contentForm()?.form.markAsPristine();
          }
        }, 0);
      }, error => {
      })

  }

  extraAutoComplete: any[] = [];
  populateAutoComplete() {
    this.lambda.binds.forEach(b => {
      if (b.type == 'lookup') {
        this.extraAutoComplete.push({ label: "lookup_" + b.srcId, type: "enum", apply: `lookup_${b.srcId}.content.forEach(le=>{\n\tle.getCode();\n\t#{//more codes}\n})`, detail: b.name },)
      }
      if (b.type == 'dataset') {
        this.extraAutoComplete.push({ label: "dataset_" + b.srcId, type: "enum", apply: `dataset_${b.srcId}.forEach(e=>{\n\te.getId();\n\t#{//more codes}\n})`, detail: b.name },)
      }
      if (b.type == '_mail') {
        this.extraAutoComplete.push({ label: "_mail.send", type: "function", apply: "_mail.send({\n\tto:'${to-email}',\n\tsubject:'${subject}',\n\tcontent:'${content}'\n}, _this);", detail: "Send email" },)
        this.extraAutoComplete.push({ label: "_mail.sendWithTemplate", type: "function", apply: "_mail.sendWithTemplate(${template-id},${entry}, _this);", detail: "Send email with template" },)
      }
      if (b.type == '_endpoint') {
        this.endpointService.getEndpointList({ appId: this.appId })
          .subscribe(res => {
            res.content.forEach(r => {
              this.extraAutoComplete.push({ label: `_endpoint.run(${r.code})`, type: "function", apply: `_endpoint.run('${r.code}', {\n\t#{/*Parameter Obj*/}\n}, {\n\t#{/*Body Obj*/}\n}, _this)`, detail: r.name })
            })
          })
      }
      if (b.type == '_secret'){
        this.secretList.forEach(s=>{
          this.extraAutoComplete.push({ label: `_secret.${s.key}`, type: "function", apply: `_secret.${s.key}`, detail: s.name })
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
          { label: "_jsoup.connect", type: "function", apply: "_jsoup.connect('#{url}').get()", detail: "Fetch data from URL and get Document object" },
          { label: "_jsoup.parse", type: "function", apply: "_jsoup.parse(`#{html}`)", detail: "Parse document from HTML text" },
          { label: "_jsoup.parseBodyFragment", type: "function", apply: "_jsoup.parseBodyFragment(`#{html-fragment}`)", detail: "Parse document from HTML fragment text" }
        );
      }
      if (b.type == '_krypta') {
        this.extraAutoComplete.push(
          { label: "_krypta.call", type: "function", apply: "_krypta.call(#{walletId},#{functionName},#{args})", detail: "Call function in smart contract" },
          { label: "_krypta.verify", type: "function", apply: "_krypta.verify(#{walletId},'#{txHash}')", detail: "Verify transaction hash" },
          { label: "_krypta.logs", type: "function", apply: "_krypta.logs(#{walletId},#{eventName})", detail: "View transaction logs for specific event" }
        );
      }
      if (b.type == '_live') {
        this.extraAutoComplete.push(
          { label: "_live.publish", type: "function", apply: "_live.publish(#{channel-list},'#{url}')", detail: "Publish notification for live subscription" }
        );
      }
      if (b.type == '_log') {
        this.extraAutoComplete.push(
          { label: "_log.error", type: "function", apply: "_log.error(#{text})", detail: "Log Error message to AppLog" },
          { label: "_log.success", type: "function", apply: "_log.success(#{text})", detail: "Log Success message to AppLog" },
          { label: "_log.info", type: "function", apply: "_log.info(#{text})", detail: "Log Info message to AppLog" },
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
          { label: "_cogna.classifyWithLlm", type: "function", apply: "_cogna.classifyWithLlm(#{cognaId},{#{key, description}},#{what},#{text},#{multiple})", detail: "Classify text with LLM" },
          { label: "_cogna.classifyWithEmbedding", type: "function", apply: "_cogna.classifyWithEmbedding(#{cognaId},#{text}, #{minScore}, #{multiple})", detail: "Classify text with embedding" },
          { label: "_cogna.classifyField", type: "function", apply: "_cogna.classifyField(#{fieldId},'#{text}')", detail: "Classify text using field's cogna setting" },
          { label: "_cogna.txtgenField", type: "function", apply: "_cogna.txtgenField(#{fieldId},'#{text}','#{action}')", detail: "Generate text using field's cogna setting" },
          { label: "_cogna.generateImageField", type: "function", apply: "_cogna.generateImageField(#{fieldId},'#{text}')", detail: "Generate image using field's cogna setting" },
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
          { label: "_entry.submit", type: "function", apply: "_entry.submit(${entryId}, _user.email, _this)", detail: "Submit entry", boost: 10 },
          { label: "_entry.chart", type: "function", apply: "_entry.chart(${chartId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Run specified chart ID", boost: 10 },
          { label: "_entry.chartAsMap", type: "function", apply: "_entry.chartAsMap(${chartData})", detail: "Convert chart data to Map", boost: 10 },
          { label: "_entry.chartize", type: "function", apply: "_entry.chartize(${formId}, {\n\tagg:'#{count}',\n\tby:'#{$.category.name}',\n\tvalue:'#{$.$id}',\n\tseries:'',\n\tshowAgg: true,\n\tstatus: {},\n\tfilter: {}\n}, _user.email, _this)", detail: "Generate ad-hoc chart", boost: 10 },
          { label: "_entry.delete", type: "function", apply: "_entry.delete(${entryId}, _user.email, _this)", detail: "Delete entry" },
          { label: "_entry.retract", type: "function", apply: "_entry.retract(${entryId}, _user.email)", detail: "Retract entry" },
          { label: "_entry.count", type: "function", apply: "_entry.count(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Get dataset entries count", boost: 10 },
          { label: "_entry.dataset", type: "function", apply: "_entry.dataset(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Load dataset entries", boost: 10 },
          { label: "_entry.flatDataset", type: "function", apply: "_entry.flatDataset(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Load flat dataset entries (without envelope)", boost: 10 },
          { label: "_entry.streamDataset", type: "function", apply: "_entry.streamDataset(${datasetId}, {\n\t#{/*Filter obj*/}\n}, _user.email, _this)", detail: "Stream dataset entries", boost: 10 },
          { label: "_entry.relinkPrev", type: "function", apply: "_entry.relinkPrev(${entryId}, ${prevEntryId}, _this)", detail: "Relink entry with specified prev entry", boost: 10 },
          { label: "_entry.updateOwner", type: "function", apply: "_entry.updateOwner(${entryId}, ${'newOwnerEmail'}, _this)", detail: "Update entry owner", boost: 10 },
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

  readonly contentForm = viewChild<import('@angular/forms').NgForm>('contentForm');

  saveLambda(data) {
    if (this.isTimeWarping) { this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); return; }

    this.lambdaService.save(data.email, this.appId, data)
      .subscribe(res => {
        this.commService.emitChange({ key: 'lambda-list-changed' });
        this.loadLambda(res.id);

        this.contentForm()?.form.markAsPristine();

        this.toastService.show("Lambda successfully saved", { classname: 'bg-success text-light' });
      }, err => {
        this.toastService.show("Lambda saving failed: " + err.error.message, { classname: 'bg-danger text-light' });
      });
  }

  consoleType = 'text';
  request: any = {}
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
      if (!match || !match[1]) continue; 
  
      const paramName = match[1].trim();
      
      if (!this.lambdaPromptsKeys.includes(paramName)) {
        this.lambdaPromptsKeys.push(paramName);
        this.lambdaPromptsData[paramName] = '';
      }
    }
  }

  resultLoading = signal<any>({});
  runRes = signal<any>({});

  lambdaPromptTpl = viewChild('lambdaPromptTpl');
  runLambda(lambda) {
    if (this.isTimeWarping) return;

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
          this.modalService.open(this.lambdaPromptTpl(), { backdrop: 'static' })
          .result.then(data => {
            run(data);
          }, res=>{});
        }else{
          run({});
        }
      });
  }

  getPdfUrl() {
    let accessToken = this.userService.getToken();
    return this.lambda?.code ? base + '/~/' + this.lambda.code + '/pdf?access_token='+accessToken : baseApi + '/lambda/' + this.lambda?.id + '/pdf?access_token='+accessToken
  }

  streamLambda(lambda) {
    if (this.isTimeWarping) return;

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

  isEmptyObject = (obj: any) => obj && Object.keys(obj).length == 0;

  keyList = (obj: any) => obj && Object.keys(obj).join(", ");

  onKeyDown($event): void {
    if (navigator.platform.match('Mac')) {
      this.handleMacKeyEvents($event);
    }
    else {
      this.handleWindowsKeyEvents($event);
    }
  }

  handleMacKeyEvents($event) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.metaKey && charCode === 's') {
      $event.preventDefault();
      this.saveLambda(this.lambda)
    }
  }

  handleWindowsKeyEvents($event) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.ctrlKey && charCode === 's') {
      $event.preventDefault();
      this.saveLambda(this.lambda)
    }
  }

  toSpaceCase = toSpaceCase; 

  toSnakeCase = toSnakeCase;

  // ==========================================
  // META TRAILS LOGIC
  // ==========================================
  currentMetaTrailScope: string = "";
  currentObj: any = {};

  viewMetaTrails(content: any, scope: string, currentObj: any) {
    this.currentMetaTrailScope = scope;
    this.currentObj = currentObj;
    history.pushState(null, '', window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' }).result.then(() => {}, () => {});
  }

  onTrailReverted(modalCloseFn: any) {
    this.loadLambda(this.lambda.id); 
  }

  // ==========================================
  // TIMEWARP LOGIC (LAMBDA LEVEL)
  // ==========================================
  timeWarpTrails: any[] = [];
  liveLambdaSnapshot: any = null;
  timeWarpIndex: number = 0;
  private readonly timeWarping = signal(false);
  get isTimeWarping(): boolean { return this.timeWarping(); }
  set isTimeWarping(value: boolean) { this.timeWarping.set(value); }

  private clone = <T>(obj: T): T => obj ? JSON.parse(JSON.stringify(obj)) : obj;

  toggleTimeWarp() {
    this.isTimeWarping ? this.exitTimeWarp() : this.startTimeWarp();
  }

  startTimeWarp() {
    this.metaTrailService.getMetaTrails(`lambda_${this.lambda.id}`, { sort: 'timestamp,desc', size: 99 }).subscribe({
      next: (res) => {
        const recentTrails = (res.content || []).reverse();
        const trails = recentTrails?.filter((t: any) => ['lambda'].includes(t.module?.toLowerCase())) || [];
        if (!trails.length) {
          this.toastService.show("No MetaTrail history available for this lambda.", { classname: 'bg-warning text-dark' });
          return;
        }

        this.liveLambdaSnapshot = this.clone(this.lambda);
        this.timeWarpTrails = [...trails, {
          timestamp: new Date().toISOString(),
          action: 'CURRENT',
          email: this.user?.email || 'You',
          module: 'lambda',
          data: this.clone(this.liveLambdaSnapshot)
        }];

        this.isTimeWarping = true;
        this.timeWarpIndex = this.timeWarpTrails.length - 1;
        this.applyTimeWarp(this.timeWarpIndex);
      },
      error: () => this.toastService.show("Failed to load MetaTrails for TimeWarp.", { classname: 'bg-danger text-light' })
    });
  }

  applyTimeWarp(index: number) {
    if (!this.timeWarpTrails[index]) return;

    let baseIdx = index;
    while (baseIdx >= 0 && this.timeWarpTrails[baseIdx].module?.toLowerCase() !== 'lambda') baseIdx--;
    if (baseIdx < 0) return;

    this.applyLambdaSnapshot(this.timeWarpTrails[baseIdx].data);
  }

  exitTimeWarp() {
    if (this.liveLambdaSnapshot) {
      this.applyLambdaSnapshot(this.liveLambdaSnapshot);
    }
    this.isTimeWarping = false;
    this.liveLambdaSnapshot = null;
    this.cdr.detectChanges();
  }

  restoreTimeWarpVersion() {
    const selectedTrail = this.timeWarpTrails[this.timeWarpIndex];

    if (!selectedTrail?.id || selectedTrail.action === 'CURRENT') {
      this.toastService.show("You are already on the current version.", { classname: 'bg-info text-dark' });
      this.exitTimeWarp();
      return;
    }

    if (confirm("Are you sure you want to revert the lambda to this historical version?")) {
      this.isTimeWarping = false; 
      
      this.metaTrailService.revertMetaTrail(selectedTrail.id).subscribe({
        next: () => {
          this.toastService.show("Historical lambda version restored successfully.", { classname: 'bg-success text-light' });
          this.liveLambdaSnapshot = null;
          this.loadLambda(this.lambda.id); 
        },
        error: () => {
          this.isTimeWarping = true;
          this.toastService.show("Failed to restore version.", { classname: 'bg-danger text-light' });
        }
      });
    }
  }

  private applyLambdaSnapshot(snapshot: any) {
    const copy = this.clone(snapshot);
    ['name', 'description', 'lang', 'code', 'data', 'binds', 'email', 'publicAccess', 'scheduled', 'freq', 'dayOfWeek', 'dayOfMonth', 'monthOfYear', 'clock', 'signa'].forEach(k => {
      if (copy[k] !== undefined) this.lambda[k] = copy[k];
    });
    this.cdr.detectChanges();
  }

}