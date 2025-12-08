import { Component, inject, OnInit, signal, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLinkActive, RouterLink, Router } from '@angular/router';
import { CognaService } from '../../../service/cogna.service';
import { NgbModal, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbAccordionModule, NgbDropdownButtonItem, NgbDropdownItem, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { DatePipe, JsonPipe, KeyValuePipe, PlatformLocation } from '@angular/common';
import { UtilityService } from '../../../_shared/service/utility.service';
// import { HttpParams } from '@angular/common/http';
import { AppService } from '../../../service/app.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { DatasetService } from '../../../service/dataset.service';
import { FormService } from '../../../service/form.service';
import { base, baseApi, domainBase, OAUTH } from '../../../_shared/constant.service';
// import { LookupService } from '../../../service/lookup.service';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';
import { lastValueFrom, map } from 'rxjs';
import { BucketService } from '../../../service/bucket.service';
import { br2nl, compileTpl, imagify, linkify, loadScript, nl2br, resizeImage, splitAsList, targetBlank, toHyphen, toSnakeCase, toSpaceCase } from '../../../_shared/utils';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { UniqueAppPathDirective } from '../../../_shared/app-path-validator';
import { NgSelectModule } from '@ng-select/ng-select';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { SplitPaneComponent } from '../../../_shared/component/split-pane/split-pane.component';
// import { RunService } from '../../../service/run.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { LookupService } from '../../../run/_service/lookup.service';
import { RunService } from '../../../run/_service/run.service';
import { marked} from 'marked';
import mermaid from "mermaid";
import { LambdaService } from '../../../service/lambda.service';
import { JsonViewerComponent } from '../../../_shared/component/json-viewer/json-viewer.component';

mermaid.initialize({startOnLoad:false})
// import { RunService } from '../../../service/run.service';

marked.use({
  extensions: [{
     name: 'code',
     renderer({lang, raw, text}) {
      // console.log({lang, raw, text})
      if (lang=='mermaid') {
        return `
          <pre class="mermaid">${text}</pre>
        `;
      } else {
        return '<pre><code>' + text + '</code></pre>';
      }
    }
   }]
 })


@Component({
    selector: 'app-cogna-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './cogna-editor.component.html',
    styleUrls: ['../../../../assets/css/side-menu.css', '../../../../assets/css/element-action.css', './cogna-editor.component.scss'],
    imports: [SplitPaneComponent, FormsModule, RouterLinkActive, KeyValuePipe, DatePipe, JsonPipe, NgCmComponent, 
      NgbAccordionModule, RouterLink, FaIconComponent, NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, 
      NgbPaginationNext, NgbPaginationLast, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownItem, NgCmComponent,
      NgbDropdownButtonItem, NgSelectModule, UniqueAppPathDirective, FilterPipe, JsonViewerComponent]
})
export class CognaEditorComponent implements OnInit {

  offline = false;
  app: any;

  cognaTotal: any;
  loading: boolean;
  cognaList: any;
  cognaEntryTotal: any;
  cognaEntryList: any;
  // sharedList: any;
  // sharedTotal: any;
  // sharedLoading: any;
  totalItems: any;
  cogna: any;
  itemLoading: boolean;
  appId: number;
  baseApi = baseApi;
  rand;

  defaultSysMsg = "STRICTLY do not answer questions which are not related and just say \"Sorry, I don't have the answer\"";

  // modelPathList = [
  //   { name: 'ggml-gpt4all-j-v1.3-groovy.bin', path: 'ggml-gpt4all-j-v1.3-groovy.bin', model: 'GPT4All' },
  //   { name: 'llama-cpp', path: 'llama-cpp.bin', model: 'LlamaCpp' },
  // ]

  embedModelTypeList = [
    { name: 'AllMiniLM', code: 'minilm' },
    { name: 'Multilingual E5SmallV2', code: 'e5small' },
    // { name: 'E5LargeV2', code: 'e5large' },
    { name: 'OpenAI', code: 'openai' },
    { name: 'HuggingFace', code: 'huggingface' },
    // { name: 'VertexAi', code: 'vertex-ai' },
    { name: 'Gemini', code: 'gemini' },
    { name: 'LocalAI', code: 'localai' },
    { name: 'Ollama', code: 'ollama' },
  ]

  embedModelTypeMap = {
    'openai': { name: 'OpenAI', logo: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg' },
    'deepseek': { name: 'DeepSeek', logo: 'https://www.deepseek.com/_next/image?url=https%3A%2F%2Fcdn.deepseek.com%2Flogo.png&w=1920&q=75' },
    'huggingface': { name: 'HuggingFace', logo: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg' },
    // 'vertex-ai': { name: 'Vertex AI', logo: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg' },
    // 'vertex-ai-gemini': { name: 'Vertex AI Gemini', logo: 'https://huggingface.co/front/assets/huggingface_logo-noborder.svg' },
    'gemini': { name: 'Gemini', logo: 'https://www.gstatic.com/devrel-devsite/prod/va726f77ce19c264bc8ae4520f2ee26cc9641a80eead40c2c8c599dc34ccb25d1/googledevai/images/gemini-api-logo.svg' },
    'localai': { name: 'LocalAI', logo: 'https://github.com/go-skynet/LocalAI/assets/2420543/0966aa2a-166e-4f99-a3e5-6c915fc997dd' },
    'ollama': { name: 'Ollama', logo: 'https://ollama.com/public/ollama.png' },
  }
  embedModelNameList = [
    { name: 'GPT3.5 TURBO', code: 'gpt-3.5-turbo', type: 'openai' },
    { name: 'Text Embedding ADA 002', code: 'text-embedding-ada-002', type: 'openai' },
    { name: 'Text Embedding 3 Small', code: 'text-embedding-3-small', type: 'openai' },
    { name: 'Text Embedding 3 Large', code: 'text-embedding-3-large', type: 'openai' },
    // { name: 'Text Embedding Gecko 001', code: 'textembedding-gecko@001', type: 'vertex-ai' },
    { name: 'All MiniLM L6 v2', code: 'sentence-transformers/all-MiniLM-L6-v2', type: 'huggingface' },
    { name: 'BGE SMall EN v1.5', code: 'BAAI/bge-small-en-v1.5', type: 'huggingface' },
    { name: 'All MPnet Base v2', code: 'sentence-transformers/all-mpnet-base-v2', type: 'huggingface' },
    { name: 'IntFloat E5 Large v2', code: 'intfloat/e5-large-v2', type: 'huggingface' },
    { name: 'Nomic Embed Text', code: 'nomic-embed-text', type: 'ollama' },
    { name: 'Gemini Embedding 001', code: 'gemini-embedding-001', type: 'gemini' },
    // { name: 'Nomic Embed Text', code: 'nomic-embed-text', type: 'ollama' },
    // { name: 'tiiuae/falcon-7b-instruct', code: 'tiiuae/falcon-7b-instruct', type: 'huggingface' },
    // { name: 'hkunlp/instructor-xl', code: 'hkunlp/instructor-xl', type: 'huggingface' },
  ]

  // txtgen, txtcls, txtext, imggen
  inferModelTypeList = [
    { name: 'OpenAI', code: 'openai', use: ['txtgen','txtcls','txtext','imggen'] },
    { name: 'Gemini', code: 'gemini', use: ['txtgen','txtcls','txtext','imggen'] },
    { name: 'DeepSeek', code: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'HuggingFace', code: 'huggingface', use: ['txtgen','txtcls','txtext'] },
    // { name: 'VertexAi Gemini', code: 'vertex-ai-gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'LocalAI', code: 'localai', use: ['txtgen','txtcls','txtext'] },
    { name: 'Ollama', code: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'Zhipu AI', code: 'zhipuai', use: ['txtgen','txtcls','txtext'] },
    { name: 'CF Workers AI', code: 'cf-wai', use: ['txtgen','txtcls','txtext'] },
    { name: 'ONNX', code: 'onnx', use: ['imgcls'] },
  ]
  inferModelNameList = [
    { name: 'GPT-3.5 TURBO', code: 'gpt-3.5-turbo', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4', code: 'gpt-4', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4 TURBO', code: 'gpt-4-turbo', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4o', code: 'gpt-4o', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4o MINI', code: 'gpt-4o-mini', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4.1', code: 'gpt-4.1', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4.1 MINI', code: 'gpt-4.1-mini', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4.1 NANO', code: 'gpt-4.1-nano', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-4.1 NANO', code: 'gpt-4.1-nano', type: 'openai', use: ['txtgen','txtcls','txtext'] },

    // { name: 'Gemini 1.0 Pro', code: 'gemini-1.0-pro', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    // { name: 'Gemini 1.5 Pro', code: 'gemini-1.5-pro', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    // { name: 'Gemini 1.5 Flash', code: 'gemini-1.5-flash', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.5 Pro', code: 'gemini-2.5-pro', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.5 Flash', code: 'gemini-2.5-flash', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.5 Flash-Lite', code: 'gemini-2.5-flash-lite', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.0 Flash', code: 'gemini-2.0-flash', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.0 Flash-Lite', code: 'gemini-2.0-flash-lite', type: 'gemini', use: ['txtgen','txtcls','txtext'] },

    // { name: 'R1', code: 'r1', type: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'DeepSeek Reasoner', code: 'deepseek-reasoner', type: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'DeepSeek Chat', code: 'deepseek-chat', type: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'DALL.E 2', code: 'dall-e-2', type: 'openai', use: ['imggen'] },
    { name: 'DALL.E 3', code: 'dall-e-3', type: 'openai', use: ['imggen'] },
    { name: 'GPT Image', code: 'gpt-image-1', type: 'openai', use: ['imggen'] },
    // { name: 'ResNet101v1', code: 'resnet101v1', type: 'onnx', use: ['imgcls'] },
    // { name: 'YOLOv8', code: 'yolov8n', type: 'onnx', use: ['imgcls'] },
    { name: 'YOLOv10s', code: 'yolov10s.onnx', type: 'onnx', use: ['imgcls'] },
    { name: 'ResNet50v2', code: 'resnet50-v2-7.onnx', type: 'onnx', use: ['imgcls'] },
    // { name: 'MobileNetv2-1.0', code: 'mobilenetv2-10.onnx', type: 'onnx', use: ['imgcls'] },
    { name: 'MobileNetv2-1.2', code: 'mobilenetv2-12.onnx', type: 'onnx', use: ['imgcls'] },
    { name: 'Imagen', code: 'imagen-4.0-generate-001', type: 'gemini', use: ['imggen'] },
    // { name: 'CF-WAI-Stable Diffusion', code: 'stable-diffusion-xl', type: 'vertex-ai-gemini', use: ['imggen'] },
    { name: 'COGVIEW-3', code: 'cogview-3', type: 'zhipuai', use: ['imggen'] },

    // { name: 'Gemini Pro', code: 'gemini-pro', type: 'vertex-ai-gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'tiiuae/falcon-7b-instruct', code: 'tiiuae/falcon-7b-instruct', type: 'huggingface', use: ['txtgen','txtcls','txtext'] },
    { name: 'hkunlp/instructor-xl', code: 'hkunlp/instructor-xl', type: 'huggingface', use: ['txtgen','txtcls','txtext'] },

    { name: 'DeepSeek R1', code: 'deepseek-r1', type: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'DeepSeek V3', code: 'deepseek-v3', type: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'Llama3.3', code: 'llama3.3', type: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'Llama3.2', code: 'llama3.2', type: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'Mistral', code: 'mistral', type: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'Phi4', code: 'phi4', type: 'ollama', use: ['txtgen','txtcls','txtext'] },
    { name: 'Qwen2.5', code: 'qwen2.5', type: 'ollama', use: ['txtgen','txtcls','txtext'] },

    { name: 'LLaVA 1.6 Vicuna', code: 'llava-1.6-vicuna', type: 'localai', use: ['txtgen','txtcls','txtext'] },
    { name: 'LLaVA 1.6 Mistral', code: 'llava-1.6-mistral', type: 'localai', use: ['txtgen','txtcls','txtext'] },
    { name: 'Llama 3 8b Instruct', code: 'llama3-8b-instruct', type: 'localai', use: ['txtgen','txtcls','txtext'] },
    { name: 'Llama 3 70b Instruct', code: 'llama3-70b-instruct', type: 'localai', use: ['txtgen','txtcls','txtext'] },
    { name: 'Hermes 2 Pro Mistral', code: 'hermes-2-pro-mistral', type: 'localai', use: ['txtgen','txtcls','txtext'] },
  ]

  cognaEp = {
    "txtgen":"prompt",
    "txtext":"extract",
    "txtcls": "classify",
    "imggen": "imggen",
    "imgcls": "imgcls",
  }

  imgOutputSize={
    'dall-e-2':['256x256','512x512','1024x1024'],
    'dall-e-3':['1024x1024','1792x1024','1024x1792']
  }

  allowedVectorStoreType = OAUTH.COGNA_VECTOR_DB;

  // @ViewChild('codeeditorinit') codeeditorinit: NgCmComponent;

  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private cognaService = inject(CognaService);
  private datasetService = inject(DatasetService)
  private lambdaService = inject(LambdaService)
  private bucketService= inject(BucketService)
  // private dashboardService = inject(DashboardService)
  private lookupService = inject(LookupService)
  private formService = inject(FormService)
  private modalService = inject(NgbModal)
  private location = inject(PlatformLocation)
  private router = inject(Router)
  private appService = inject(AppService)
  private toastService = inject(ToastService)
  // private endpointService = inject(EndpointService)
  private runService = inject(RunService)
  private utilityService = inject(UtilityService)
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.location.onPopState(() => this.modalService.dismissAll(''));
    this.utilityService.testOnline$().subscribe(online => this.offline = !online);
  }

  isCodeTaken = (code) => this.cognaService.isCodeTaken(code);

  lookupList:any[] = [];

  ngOnInit() {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        this.cdr.detectChanges();

        this.rand = Math.random();

        // this.route.url.pipe(
        //   withLatestFrom(this.route.parent.params, this.route.queryParams)
        // ).subscribe(([url, params, queryParams]) => {

        //   this.appId = params['appId'];
        //   if (this.appId) {
        //     let params = {
        //       email: user.email
        //     }
        //     this.appService.getApp(this.appId, params)
        //       .subscribe(res => {
        //         this.app = res;

        //       });
        //   }

        //   const id = queryParams['id'];
        //   if (id) {
        //     this.loadCogna(id);
        //   }

        //   this.loadCognaList(1);
        //   this.loadBindingSrcs();


        // })

        this.route.parent.params
          // NOTE: I do not use switchMap here, but subscribe directly
          .subscribe((params: Params) => {
            this.appId = params['appId'];
            this.cdr.detectChanges();


            if (this.appId) {
              let params = {
                email: user.email
              }
              this.appService.getApp(this.appId, params)
                .subscribe(res => {
                  this.app = res;
                  this.cdr.detectChanges();
                });
                this.getFormList(this.appId);

                this.lookupService.getLookupList({appId:this.appId})
                .subscribe(res=>{
                  this.lookupList = res.content;
                  this.cdr.detectChanges();
                })

                this.getOtherCognaList(this.appId);
            }

            this.loadCognaList(1);
            // this.loadSharedList(1);
            this.loadBindingSrcs();

        });

        this.appService.getAppMyList({
            email: this.user.email,
            size: 999,
            sort: 'id,desc'
        }).subscribe(res => {
            this.otherAppList = res.content;
            this.cdr.detectChanges();
        });

        this.route.queryParams
          .subscribe((params: Params) => {
            const id = params['id'];
            if (id) {
              this.loadCogna(id);
            }
          })
      });


  }

  user: any;
  cognaId = '';
  data = { 'list': [] };
  pageSize = 45;
  currentPage = 1;
  itemsPerPage = 15;
  maxSize = 5;
  startAt = 0;
  searchText: string = "";

  pageNumber: number = 1;
  entryPageNumber: number = 1;

  //   popShare(id) {
  //     let url = this.app.appPath ? this.app.appPath + '.' + domainBase : domainBase + "/#/run/" + id;
  //     prompt('App URL (Press Ctrl+C to copy)', url);
  // }

  // this.loadCognaList = loadCognaList;
  loadCognaList(pageNumber) {
    this.pageNumber = pageNumber;
    this.itemLoading = true;

    let params = {
      searchText: this.searchText,
      appId: this.appId,
      page: pageNumber - 1,
      size: this.itemsPerPage
    }
    this.cognaService.getCognaList(params)
      .subscribe(res => {
        this.cognaList = res.content;
        this.cognaTotal = res.page?.totalElements;
        this.itemLoading = false;
        this.cdr.detectChanges();
      }, res => {
        this.itemLoading = false;
        this.cdr.detectChanges();
      })
  }

  formList: any[];
  getFormList(appId) {
      let params = { appId: appId }

      this.formService.getListBasic(params)
          .subscribe(res => {
              this.formList = res.content;
              this.cdr.detectChanges();
          });
  }

  extractJsonObj:any={};
  loadFormatter(formId){
    if (!formId){
      this.editCognaData.data.extractSchema = "";
      // this.editCognaData.data.extractFmt = "";
      // this.editCognaData.data.extractJson = "";
    }
    
    this.cognaService.getFormatter(formId, this.editCognaData?.type=='txtext')
    .subscribe(res=>{
      this.editCognaData.data.extractSchema = res.schema;
      // this.editCognaData.data.extractFmt = res.fmt;
      // this.editCognaData.data.extractJson = res.json;
      this.extractJsonObj = JSON.parse(res.schema);
    })
  }

  setImgGenModels(){
    this.editCognaData.inferModelType = 'openai';
    this.editCognaData.inferModelName = 'dall-e-2';
    this.editCognaData.data.genBucket = true;
    this.editCognaData.data.imgSize = '512x512';
    this.editCognaData.data.imgQuality = 'standard';
    this.editCognaData.data.imgStyle = 'vivid';
  }

  setImgClsModels(){
    this.editCognaData.inferModelType = 'onnx';
    this.editCognaData.inferModelName = 'resnet50-v2-7.onnx';
    // this.editCognaData.data.imgclsCat = ;
    this.editCognaData.data.imgclsMinScore = 8.00;
    this.editCognaData.data.imgclsLimit = 3;
    // this.editCognaData.data.imgQuality = 'standard';
    // this.editCognaData.data.imgStyle = 'vivid';
  }

  removeFile(index){
    this.fileList.splice(index,1);
  }

  // loadSharedList(pageNumber) {
  //   this.pageNumber = pageNumber;
  //   this.sharedLoading = true;

  //   let params = {
  //     searchText: this.searchText,
  //     page: pageNumber - 1,
  //     size: this.itemsPerPage
  //   }
  //   this.cognaService.getSharedCognaList(params)
  //     .subscribe(res => {
  //       this.sharedList = res.content;
  //       this.sharedTotal = res.page?.totalElements;
  //       this.sharedLoading = false;
  //     }, res => this.sharedLoading = false)
  // }

  editCode: boolean;
  editCognaData: any;
  editCogna(content, cogna, isNew) {
    // console.log(cogna);
    cogna.content = this.br2nl(cogna.content);
    this.editCognaData = cogna;
    this.editCognaData.email = cogna.email || this.user.email;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        data.content = this.nl2br(data.content);
        this.cognaService.save(data.email, this.appId, data)
          .subscribe(res => {
            this.loadCognaList(this.pageNumber);
            this.loadCogna(res.id);
            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
            this.toastService.show("Cogna successfully saved", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, err => {
            this.toastService.show("Cogna saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { })
  }

  editSrcData: any;
  editCognaSrc(content, cognaSrc, isNew) {
    this.editSrcData = cognaSrc;

    if (!this.editSrcData.appId) this.editSrcData.appId = this.app.id;
      
    this.loadOtherAppList(this.editSrcData?.type, this.editSrcData?.appId)

    if (this.editSrcData?.type == 'dataset' && this.editSrcData?.srcId) {
      this.loadDataset(this.editSrcData.srcId);
    } else if (this.editSrcData?.type == 'bucket' && this.editSrcData?.srcId) {
      this.loadBucket(this.editSrcData.srcId);
    } else {
      this.dataset = null;      
    }

    // this.editCognaData.email = cogna.email || this.user.email;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        // data.content = this.nl2br(data.content);
        if (data.src) {
          data.name = data.src.title || data.src.name;
          data.srcId = data.src.id;
        }
        // if (data.type=='dataset'){
        //   data.name = data.src.title;
        //   data.srcId = data.src.id;
        // }

        this.cognaService.saveSrc(this.cognaId, data)
          .subscribe(res => {
            this.loadCognaList(this.pageNumber);
            this.loadCogna(this.cognaId);
            this.toastService.show("Cogna source successfully saved", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, err => {
            this.toastService.show("Cogna source saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { })
  }

  // toSnakeCase = toSnakeCase

  isParamEdit = () => Object.values(this.paramEdit).includes(true);
  paramEdit:any={}
  editToolData: any;
  editCognaTool(content, cognaTool, isNew) {
    this.editToolData = cognaTool;

    if (!this.editToolData.appId) this.editToolData.appId = this.app.id;

    this.getLambdaList(this.editToolData.appId)

    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {

        this.cognaService.saveTool(this.cognaId, data)
          .subscribe(res => {
            this.loadCognaList(this.pageNumber);
            this.loadCogna(this.cognaId);
            this.toastService.show("Cogna tool successfully saved", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, err => {
            this.toastService.show("Cogna tool saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { })
  }

  parameterKey:string;
  parameterDesc:string;
  parameterRequired:boolean = true;
  addToolParam(obj){
    if (!this.editToolData?.params) this.editToolData.params=[];
    this.editToolData.params.push(obj);
    delete this.parameterKey;
    delete this.parameterDesc;
    this.parameterRequired = true;
  }

  removeToolParam(index){
    if (confirm("Are you sure you want to remove this parameter?")){
      this.editToolData.params.splice(index, 1);
      // this.screenService.saveScreen(this.app.id, this.curScreen)
      //     .subscribe(res => {
      //       this.getScreenData(res.id);
      //       this.toastService.show("Screen saved successfully", { classname: 'bg-success text-light' });
      //     });
    }
  }

  editMcpData: any;
  editCognaMcp(content, cognaMcp, isNew) {
    this.editMcpData = cognaMcp;

    if (!this.editMcpData.appId) this.editMcpData.appId = this.app.id;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {

        this.cognaService.saveMcp(this.cognaId, data)
          .subscribe(res => {
            this.loadCognaList(this.pageNumber);
            this.loadCogna(this.cognaId);
            this.toastService.show("Cogna MCP server successfully saved", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, err => {
            this.toastService.show("Cogna MCP server saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { })
  }

  editSubData: any;
  editCognaSub(content, cognaSub, isNew) {
    this.editSubData = cognaSub;

    if (!this.editSubData.appId) this.editSubData.appId = this.app.id;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {

        this.cognaService.saveSub(this.cognaId, data)
          .subscribe(res => {
            this.loadCognaList(this.pageNumber);
            this.loadCogna(this.cognaId);
            this.toastService.show("Cogna Sub Agent successfully saved", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, err => {
            this.toastService.show("Cogna Sub Agent server saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { })
  }


  dataset: any;
  loadDataset(dsId) {
    this.datasetService.getDataset(dsId)
      .subscribe(res => {
        this.dataset = res;
        this.editSrcData.name = res.title;
        Object.keys(this.dataset?.form?.items).forEach(key => {
          var value = this.dataset?.form?.items[key];
          if (this.dataset?.form?.items[key].type != 'static') {
            if (['select', 'radio'].indexOf(value?.type) > -1) {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}.name}}`, type: "text", apply: `{{$.${key}.name}}`, label: value.label })
            } else if (['date'].indexOf(value?.type) > -1) {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}|date:'DD-MM-YYYY'}}`, label: value.label })
            } else if (['file'].indexOf(value?.type) > -1) {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}|file}}`, label: value.label })
            } else {
              this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}}}`, label: value.label })
            }
          }
        });
      })
  }

  loadBucket(bId){
    this.bucketService.getBucket(bId)
    .subscribe(res=>{
      // this.bucket = res;
      this.editSrcData.name = res.name;
    })
  }

  insertTextAtCursor(text, cm) {
    cm.insertText("{{" + text + "}}");
  }

  extraAutoCompleteHtml: any[] = [];

  removeCognaSrc(cognaSrc) {
    if (confirm("Are you sure you want to remove this source?\n Note: Removing source would not remove the knowledge from embedding")) {
      this.cognaService.removeSrc(cognaSrc.id)
        .subscribe({
          next: res => {
            this.toastService.show("Cogna source successfully removed", { classname: 'bg-success text-light' });
            this.loadCogna(this.cognaId);
            this.cdr.detectChanges();
          },
          error: err => {
            this.toastService.show("Cogna source removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          }
        })
    }
  }

  removeCognaTool(cognaTool) {
    if (confirm("Are you sure you want to remove this tool?")) {
      this.cognaService.removeTool(cognaTool.id)
        .subscribe({
          next: res => {
            this.toastService.show("Cogna tool successfully removed", { classname: 'bg-success text-light' });
            this.loadCogna(this.cognaId);
            this.cdr.detectChanges();
          },
          error: err => {
            this.toastService.show("Cogna tool removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          }
        })
    }
  }

  removeCognaMcp(cognaMcp) {
    if (confirm("Are you sure you want to remove this MCP server?")) {
      this.cognaService.removeMcp(cognaMcp.id)
        .subscribe({
          next: res => {
            this.toastService.show("Cogna MCP server successfully removed", { classname: 'bg-success text-light' });
            this.loadCogna(this.cognaId);
            this.cdr.detectChanges();
          },
          error: err => {
            this.toastService.show("Cogna MCP server removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          }
        })
    }
  }


  removeCognaData: any;
  removeCogna(content, cogna) {
    this.removeCognaData = cogna;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static' })
      .result.then(data => {
        this.cognaService.deleteCogna(cogna.id, data)
          .subscribe(res => {
            this.loadCognaList(1);
            delete this.cogna;
            this.toastService.show("Template successfully removed", { classname: 'bg-success text-light' });
            this.cdr.detectChanges();
          }, err => {
            this.toastService.show("Template removal failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { });
  }

  initialCode: string = "";

  params: string[];
  domainBase = domainBase;

  clearMemory(cogna) {
    this.cognaService.clearMemoryById(cogna.id)
      .subscribe({
        next: res => {
          this.toastService.show("Memory successfully cleared ", { classname: 'bg-success text-light' });
          this.cdr.detectChanges();
        },
        error: err => {
          this.toastService.show("Memory cannot be cleared ", { classname: 'bg-danger text-light' });
          this.cdr.detectChanges();
        }
      });
    sessionStorage.removeItem("cogna-" + cogna.id);
    this.chatResponseList = [];
    this.cdr.detectChanges();
  }

  clearUserMemory(cogna) {
    this.runService.clearCognaMemoryByIdAndEmail(cogna.id, this.user.email)
      .subscribe({
        next: res => {
          this.toastService.show("Memory successfully cleared ", { classname: 'bg-success text-light' });
          this.cdr.detectChanges();
        },
        error: err => {
          this.toastService.show("Memory cannot be cleared ", { classname: 'bg-danger text-light' });
          this.cdr.detectChanges();
        }
      });
    sessionStorage.removeItem("cogna-" + cogna.id);
    this.chatResponseList = [];
    this.cdr.detectChanges();
  }

  dbMap = {
    'milvus': { name: 'Milvus', logo: "https://artwork.lfaidata.foundation/projects/milvus/icon/color/milvus-icon-color.png" },
    'chromadb': { name: 'ChromaDB', logo: 'https://www.trychroma.com/img/chroma.png' },
    'inmemory': { name: 'InMemory', logo: 'assets/icons/icon-72.png' }
  }
  clearDbLoading: boolean = false;
  clearDb(cogna) {
    if (confirm("Are you sure you want to clear this database?\n Note: The cleared data is not recoverable.")) {
      this.clearDbLoading = true;
      this.cognaService.clearDb(cogna.id)
        .subscribe({
          next: res => {
            this.clearDbLoading = false;
            this.toastService.show("Vector database collection successfully cleared ", { classname: 'bg-success text-light' });
            this.loadCogna(cogna.id);
            this.ingestRes.set({});
            this.cdr.detectChanges();
          },
          error: err => {
            this.clearDbLoading = false;
            this.toastService.show("Vector database collection cannot be cleared ", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          }
        });
    }
  }

  nestedProp:any = {};
  
  url: string = "";

  lookupEntries:any[]=[];
  
  loadCogna(id) {
    this.cognaId = id;

    this.fileList = [];

    this.cognaService.getCogna(id)
      .subscribe(cogna => {
        this.cogna = cogna;
        this.initialCode = cogna.code;
        if(cogna.data.extractSchema){
          this.extractJsonObj = JSON.parse(cogna.data.extractSchema||{});
        }        
        let fromStorage = sessionStorage.getItem("cogna-" + cogna.id)
        
        if (fromStorage) {
          this.chatResponseList = JSON.parse(fromStorage)
        } else {
          this.chatResponseList = [];
        }

        // if (this.cogna.type=='txtcls' && this.cogna.data.txtclsLookupId){

        // }

        if (this.cogna.type=='imgcls' && this.cogna.data?.imgclsCat){
          let list = this.cogna.data?.imgclsCat.split("\n");
          this.imgclsCat = list.slice(0, 10);
          this.imgclsMore = list.length-10;
          this.imgclsLen = list.length;
        }

        setTimeout(()=>{
          mermaid.run({querySelector:'.mermaid'})
          this.cdr.detectChanges();
        })  
      }, error => {
        this.cdr.detectChanges();
      })

      if (localStorage.getItem("imggen-"+id)){
        try{
          this.imgGenRes = JSON.parse(localStorage.getItem("imggen-"+id));
          this.imgGenText = this.imgGenRes?.text;
        }catch(e){}
      }
      this.cdr.detectChanges();
  }

  loadLookupEntries(lookupId){
    // console.log(lookupId)
    this.lookupService.getEntryList(lookupId,{})
    .subscribe(res=>{
      this.lookupEntries = res.content;
      this.cdr.detectChanges();
    })
  }

  imgclsMore:number=0;
  imgclsLen:number=0;
  imgclsCat:string[]=[]

  ingestSrcLoading = signal<any>({});
  ingestSrc(cognaSrc) {
    this.ingestSrcLoading[cognaSrc.id] = true;
    this.cognaService.ingestSrc(cognaSrc.id, {})
      .subscribe({
        next: res => {
          this.loadCogna(this.cogna.id);
          this.ingestRes.set({...this.ingestRes(), [cognaSrc.id]: res});
          this.toastService.show("Documents successfully ingested<br/>Doc counts: " + res.docCount, { classname: 'bg-success text-light' });
          this.ingestMessage.set({...this.ingestMessage(), [this.cogna.id]: "Documents successfully ingested<br/>Doc counts: " + res.docCount});
          this.ingestSuccess.set({...this.ingestSuccess(), [this.cogna.id]: 'true'});
          this.ingestSrcLoading.set({...this.ingestSrcLoading(), [cognaSrc.id]: false});
        },
        error: err => {
          this.toastService.show("Documents ingestion failure: " + err.error.message, { classname: 'bg-danger text-light' });
          this.ingestMessage.set({...this.ingestMessage(), [this.cogna.id]: "Documents ingestion failure: " + err.error.message});
          this.ingestSuccess.set({...this.ingestSuccess(), [this.cogna.id]: 'false'});
          this.ingestSrcLoading.set({...this.ingestSrcLoading(), [cognaSrc.id]: false});
        }
      })
  }

  clearDbSrcLoading = signal<any>({});
  clearDbSrc(cognaSrc) {
    this.clearDbSrcLoading[cognaSrc.id] = true;
    this.cognaService.clearDbBySrcId(cognaSrc.id)
      .subscribe({
        next: res => {
          this.loadCogna(this.cogna.id);
          // this.ingestRes.set({...this.ingestRes(), [cognaSrc.id]: res});
          this.toastService.show("Source successfully cleared from DB", { classname: 'bg-success text-light' });
          // this.ingestMessage.set({...this.ingestMessage(), [this.cogna.id]: "Documents successfully ingested<br/>Doc counts: " + res.docCount});
          // this.ingestSuccess.set({...this.ingestSuccess(), [this.cogna.id]: 'true'});
          this.clearDbSrcLoading.set({...this.clearDbSrcLoading(), [cognaSrc.id]: false});
        },
        error: err => {
          this.toastService.show("Source DB clear failure: " + err.error.message, { classname: 'bg-danger text-light' });
          // this.ingestMessage.set({...this.ingestMessage(), [this.cogna.id]: "Documents ingestion failure: " + err.error.message});
          // this.ingestSuccess.set({...this.ingestSuccess(), [this.cogna.id]: 'false'});
          this.clearDbSrcLoading.set({...this.clearDbSrcLoading(), [cognaSrc.id]: false});
        }
      })
  }

  ingestRes = signal<any>({});
  // ingestSuccess: string;
  ingestSuccess = signal<any>({});
  // ingestMessage: string;
  ingestMessage = signal<any>({});
  // ingestLoading: boolean = false;
  ingestLoading = signal<any>({});
  ingest(cogna) {
    this.ingestLoading[cogna.id] = true;
    this.cognaService.ingest(cogna.id, {})
      .subscribe({
        next: res => {
          var total = Object.values(res).reduce(((sum,i:any)=>sum+i.docCount),0);
          this.loadCogna(cogna.id);
          this.ingestRes.set(res);
          this.toastService.show("Documents successfully ingested<br/>Doc counts: " + total, { classname: 'bg-success text-light' });
          this.ingestMessage.set({...this.ingestMessage(), [cogna.id]: "Documents successfully ingested<br/>Doc counts: " + total});
          this.ingestSuccess.set({...this.ingestSuccess(), [cogna.id]: 'true'});
          this.ingestLoading.set({...this.ingestLoading(), [cogna.id]: false});
        },
        error: err => {
          this.toastService.show("Documents ingestion failure: " + err.error.message, { classname: 'bg-danger text-light' });
          this.ingestMessage.set({...this.ingestMessage(), [cogna.id]: "Documents ingestion failure: " + err.error.message});
          this.ingestSuccess.set({...this.ingestSuccess(), [cogna.id]: 'false'});
          this.ingestLoading.set({...this.ingestLoading(), [cogna.id]: false});
        }
      })
  }

  reinitCogna(cogna) {
    this.cognaService.reinit(cogna.id)
      .subscribe({
        next: res => {
          this.toastService.show("Cogna successfully re-initialized", { classname: 'bg-success text-light' });
          this.cdr.detectChanges();
        },
        error: err => {
          this.toastService.show("Cogna re-initialization failed<br/>Message: " + err.error.message, { classname: 'bg-danger text-light' });
          this.cdr.detectChanges();
        }
      })
  }

  evictCache() {
    this.cognaService.evictCache(this.cogna.code, 'out')
      .subscribe(res => this.toastService.show("Endpoint Cache evicted: " + this.cogna.code));
    this.cognaService.evictCache(this.cogna.code, 'print')
      .subscribe(res => this.toastService.show("Print Stream Cache evicted: " + this.cogna.code));
  }

  saveCogna(data) {
    this.cognaService.save(data.email, this.appId, data)
      .subscribe(res => {
        this.loadCognaList(this.pageNumber);
        this.loadCogna(res.id);
        this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
        this.cdr.detectChanges();
      }, err => {
        this.toastService.show("Template saving failed: " + err.error.message, { classname: 'bg-danger text-light' });
        this.cdr.detectChanges();
      });
  }

  consoleType = 'text';
  request: any = {}
  showPrompt(script) {
    this.request = {};
    const array = [...script.matchAll(/_request\.getParameter\(["'](.+?)["']\s*\)/ig)];
    array.forEach(e => {
      if (!this.request[e[1]]) {
        this.request[e[1]] = prompt("Enter value for parameter '" + e[1] + "'");
      }
    })
  }

  getPdfUrl() {
    return this.cogna?.code ? base + '/~/' + this.cogna.code + '/pdf' : baseApi + '/cogna/' + this.cogna?.id + '/pdf'
  }

  searchDbData:any={}
  openSearchDb(tpl, cogna){
    this.searchDbList.set([]);
    this.searchDbData = {search:this.lastChatPromptText(), maxResult: cogna.embedMaxResult, minScore: cogna.embedMinScore};
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static', size:'lg' })
      .result.then(data => {
      }, res => { });
  }

  searchDbList = signal<any[]>([]);
  searchDb(cognaId,searchDbData){
    this.cognaService.searchDb(cognaId,searchDbData)
    .subscribe({
      next:res=>{
        this.searchDbList.set(res);
      },
      error:err=>{

      }
    })
  }

  viewChatHistory(tpl, cogna){
    this.loadChatHistory(cogna.id, 1,25);
    history.pushState(null, null, window.location.href);
    this.modalService.open(tpl, { backdrop: 'static', size:'lg' })
      .result.then(data => {
      }, res => { });
  }

  chatHistoryList:any[]=[];
  chatHistorySearchText: string = "";
  // trails: any[] = [];
  chatHistoryTotal: number = 0;
  chatHistoryPageSize: number = 25;
  chatHistoryPageNumber: number = 1;
  loadChatHistory(cognaId, pageNumber, pageSize){
    this.chatHistoryPageNumber = pageNumber;
    if (pageSize) {
        this.chatHistoryPageSize = pageSize
    }
    var params = {
        page: pageNumber - 1,
        size: this.chatHistoryPageSize,
        searchText: this.chatHistorySearchText,
        sort: ['timestamp,desc']
    }
    // if (this.trailFrom) {
    //     params['dateFrom'] = this.trailFrom;
    // }
    // if (this.trailTo) {
    //     params['dateTo'] = this.trailTo;
    // }

    this.cognaService.history(cognaId,params)
    .subscribe({
      next:res=>{
        this.chatHistoryList = res.content;
        this.chatHistoryTotal = res.page?.totalElements;
        this.cdr.detectChanges();
      },
      error:err=>{

      }
    })
  }
  
  chatResponseList: any[] = [];
  lastChatPromptText = signal<string>("");
  chatPromptText = signal<string>("");
  chatPromptParam:string="";
  chatPromptLoading = signal<boolean>(false);
  streamTyping = signal<boolean>(false);
  streamResult = signal<string>("");
  chatPrompt(cogna, prompt){
    if (prompt?.trim() || this.fileList.length>0){
      this.scrollBottom();
      this.chatResponseList.push({type:'prompt', text:prompt, files: this.fileList,timestamp:Date.now()})
      this.chatPromptLoading.set(true);
      sessionStorage.setItem("cogna-"+cogna.id,JSON.stringify(this.chatResponseList))
      this.lastChatPromptText.set(this.chatPromptText());
      this.cdr.detectChanges();

      let param = this._eval({}, compileTpl(this.chatPromptParam,{}, 'cogna_editor_'+ cogna.id));

      if (cogna.streamSupport){
        this.runService.streamCognaPrompt(cogna.id, prompt, this.fileList.map(f=>f.path),param, true, this.user?.email)
        .pipe(
          map(res => {
            // console.log(res);
            if (res['type'] == 4) {
              this.chatPromptLoading.set(false);
              this.streamResult.set(marked.parse(res['body'])+"");
              this.streamTyping.set(false);
              this.chatResponseList.push({type:'response', text:marked.parse(this.streamResult()), timestamp:Date.now()})
              sessionStorage.setItem("cogna-"+cogna.id,JSON.stringify(this.chatResponseList));
              this.scrollBottom();        

              // perlu pake tok utk pastikan element dh wujud dlm html sebelum run mermaid
              setTimeout(()=>{
                mermaid.run({querySelector:'.mermaid'})
                this.cdr.detectChanges();
              })  
            } else {
              this.streamResult.set(marked.parse(res['partialText']??"")+"");
              if (this.streamResult()?.length>0){
                this.chatPromptLoading.set(false);
                this.streamTyping.set(true);                
              }
              this.scrollBottom();  
            }
          })
        )
        .subscribe(res => {
        }, err => {
          this.chatPromptLoading.set(false);
          this.chatResponseList.push({type:'system', text:'Error loading response: '+err.message,timestamp:Date.now()})
          this.toastService.show("Cogna response failed", { classname: 'bg-danger text-light' });
          this.cdr.detectChanges();
        });

      }else{

        this.runService.cognaPrompt(cogna.id, prompt,this.fileList.map(f=>f.path), param, true, this.user?.email)
        .subscribe({
          next:res=>{
            this.chatPromptLoading.set(false);
            this.chatResponseList.push({type:'response', text:marked.parse(res?.result??''), timestamp:Date.now()})
            sessionStorage.setItem("cogna-"+cogna.id,JSON.stringify(this.chatResponseList));
            this.scrollBottom();        
            // this.toastService.show("Prompt success", { classname: 'bg-success text-light' });
            this.fileList=[];
            this.cdr.detectChanges();
          },
          error:err=>{
            this.chatPromptLoading.set(false);
            this.chatResponseList.push({type:'system', text:'Error loading response: '+err.error.message,timestamp:Date.now()})
            this.toastService.show("Prompt failure: "+err.error.message, { classname: 'bg-danger text-light' });
          }
        });
      }
      this.chatPromptText.set("");      
      this.fileList = []; 
      this.cdr.detectChanges();
    }
  }

  extractRes = signal<any>({});
  extractLoading = signal<boolean>(false);
  extractError = signal<any>({});
  startExtractData(cogna){
    this.extractLoading.set(true);
    this.extractError.set({...this.extractError(), [cogna.id]: null});
    this.extractRes.set({...this.extractRes(), [cogna.id]: {}});
    this.runService.cognaExtract(cogna.id,this.extractData.text, this.fileList, true, this.user.email)
    .subscribe({
      next:res=>{
        this.extractLoading.set(false);
        this.extractRes.set({...this.extractRes(), [cogna.id]: res});
      },
      error:err=>{
        this.extractLoading.set(false);
        this.extractError.set({...this.extractError(), [cogna.id]: err.error.message});
      }
    })
  }

  imgclsRes:any={};
  imgclsLoading:boolean;
  imgclsError:any={};
  startImgClsData(cogna){
    this.imgclsLoading = true;
    this.imgclsError[cogna.id]=null;
    this.imgclsRes[cogna.id] = {};
    this.runService.cognaImgCls(cogna.id,this.fileList, true, this.user.email)
    .subscribe({
      next:res=>{
        this.imgclsLoading=false;
        this.imgclsRes[cogna.id] = res;
        this.cdr.detectChanges();
      },
      error:err=>{
        this.imgclsLoading=false;
        this.imgclsError[cogna.id]=err.error.message;
        this.cdr.detectChanges();
      }
    })
  }

  classifyText:string;
  classifyWhat:string;
  classifyMinScore:number=0.8;
  classifyMultiple:boolean=false;
  classifyLookupId:number;
  classifyRes:any={};
  classifyLoading:boolean;
  classifyError:any={};
  classifyIsOk:boolean=true;
  startClassifyData(cogna){
    this.classifyLoading = true;
    this.classifyError[cogna.id]=null;
    this.classifyRes[cogna.id] = {};
    this.runService.cognaClassify(cogna.id,this.classifyText, true, this.classifyLookupId, this.classifyWhat??'Category', this.classifyMinScore, this.classifyMultiple, this.user.email)
    .subscribe({
      next:res=>{
        this.classifyLoading=false;
        this.classifyRes[cogna.id] = res;
        this.classifyIsOk = true;
        this.cdr.detectChanges();
      },
      error:err=>{
        this.classifyIsOk=false;
        this.classifyLoading=false;
        this.classifyError[cogna.id]=err.error.message;
        this.cdr.detectChanges();
      }
    })
  }

  imgGenText:string;
  imgGenRes:any={};
  imgGenLoading:boolean;
  imgGenError:any={};
  startGenerateImg(cogna){
    this.imgGenLoading = true;
    this.imgGenError[cogna.id]=null;
    this.imgGenRes[cogna.id] = {};
    this.runService.cognaImgGen(cogna.id,this.imgGenText, true, this.user.email)
    .subscribe({
      next:res=>{
        this.imgGenLoading=false;
        this.imgGenRes[cogna.id] = res;
        localStorage.setItem("imggen-"+cogna.id,JSON.stringify(this.imgGenRes));
        this.cdr.detectChanges();
      },
      error:err=>{
        this.imgGenLoading=false;
        this.imgGenError[cogna.id]=err.error.message;
        this.cdr.detectChanges();
      }
    })
  }

  scrollBottom(){
    setTimeout(()=>{
      var elemChatViewPort = document.getElementById("chat-response-list");
      elemChatViewPort.scrollTo({
        top: elemChatViewPort.scrollHeight+200,
        left: 0,
        behavior: "smooth",
      })
      this.cdr.detectChanges();
    },0)
  }


  base = base;

  bindingSrcs: any[] = [];
  loadBindingSrcs() {
    this.bindingSrcs = [];
    this.getDatasetList(this.appId);
    this.getBucketList(this.appId);
    // this.getLookupList();
    // this.otherBinds();
    // this.getFormList();
  }

  datasetList: any[];
  bucketList: any[];
  lambdaList: any[];
  otherCognaList: any[];
  // formList: any[];
  getDatasetList(appId) {
    this.datasetService.getDatasetList(appId)
      .subscribe(res => {
        this.datasetList = res;
        this.datasetList.forEach(d => {
          this.bindingSrcs.push({ name: d.title, type: 'dataset', srcId: d.id })
        })
        this.cdr.detectChanges();
      })
  }

  getBucketList(appId) {
    this.bucketService.getBucketList({ appId: appId })
      .subscribe(res => {
        this.bucketList = res.content;
        this.bucketList.forEach(d => {
          this.bindingSrcs.push({ name: d.name, type: 'bucket', srcId: d.id })
        })
        this.cdr.detectChanges();
      })
  }

  getLambdaList(appId) {
    this.lambdaService.getLambdaList({ appId: appId })
      .subscribe(res => {
        this.lambdaList = res.content;
        this.cdr.detectChanges();
      })
  }

  getOtherCognaList(appId) {
    this.cognaService.getCognaList({ appId: appId })
      .subscribe(res => {
        this.otherCognaList = res.content;
        this.cdr.detectChanges();
      })
  }

  getEvalContext = (includeActive: boolean = false, additionalData: any = {}) => {
    let passive = {};
    let active = {};
    return includeActive ? { ...passive, ...active, ...additionalData } : { ...passive, ...additionalData };
  }

  liveSubscription: any = {};
  
  _eval = (data: any, v: string) => {
    const bindings = this.getEvalContext(true, {});
    const argNames = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
      `return ${v}`)(...argValues);
  }

  keepMinute00 = (object) => {
    if (object['clock'].length >= 4) {
      object['clock'] = object['clock'].slice(0, -1) + '0';
    }
  }

  isEmptyObject = (obj: any) => obj===undefined || (obj && Object.keys(obj).length == 0);

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
      this.saveCogna(this.cogna)
    }
  }

  handleWindowsKeyEvents($event) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.ctrlKey && charCode === 's') {
      // Action on Ctrl + S
      $event.preventDefault();
      this.saveCogna(this.cogna)
    }
  }

  nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
  br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;

  toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();
  toSnakeCase = toSnakeCase; //(string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';
  toHyphen = toHyphen; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '-').toLowerCase() : '';

  /*isResponse=(text)=>{
    return text.includes("Here is some information that might be useful for answering:");
  }*/
  linkify=linkify;
  imagify=imagify;
  targetBlank=targetBlank;

  itemExist = (f) => this.cognaList.filter(e => e.code == f.code).length > 0 && !f.id;

  uploadPromptImg;
  uploadPromptImageBase64;
  uploadPromptMimeType;
  uploadPromptLoading = false;
  uploadPromptImage($event){
    if($event.target.files && $event.target.files.length){
      // console.log($event);
      var file = $event.target.files[0];
      this.uploadPromptMimeType = file.type;
      resizeImage({
        file: file,
        maxSize: 640
      }).then((resizedImage:Blob) => {
        this.uploadPromptImageBase64 = URL.createObjectURL(resizedImage)
        // alert(file.name)
        // this.entryService.uploadAttachment(resizedImage, f.id, f.x?.bucket, this.form.appId, file.name)
        //   .subscribe({
        //     next: res => {
        //       if (res.type === HttpEventType.UploadProgress) {
        //         progressSize += res.loaded;
        //         this.uploadProgress[f.code + (index ?? '')] = Math.round(100 * progressSize / totalSize);
        //       } else if (res instanceof HttpResponse) {
        //         list.push(res.body.fileUrl);
        //         data[f.code] = list;
        //         this.filesMap[res.body.fileUrl] = res.body;
        //         this.fieldChange(fileList, data, f, evalEntryData);
        //         this.entryFiles.push(res.body.fileUrl);
        //       }
        //     }, error: err => {
        //       console.error(err);
        //     }
        //   })
      }).catch(function (err) {
        console.error(err);
      });      
    }

  }

  
  uploadProgress: any = {}

  filesMap:any={};
  fileList=[];

  onUpload($event) {
    if ($event.target.files && $event.target.files.length) {
      var totalSize = 0;
      for (var i=0; i <$event.target.files.length; i++) {
        var file = $event.target.files[i];
        totalSize = totalSize + file.size;
      }
      // var totalSize = $event.target.files.reduce((total, i) => total + i.size, 0);
      var progressSize = 0;

      // optimize image file here (ie: resize, compress)
      // files = compressImage(files, 300, 300)
      // const resizedImage = await resizeImage(config)
      // if (f.subType == 'imagemulti') {

      var list = [];
      for (var i = 0; i < $event.target.files.length; i++) {
        let file = $event.target.files[i];
        let fileType = file.type;
        // console.log("fileType",file.type)
        if (file.type.includes("image")){
          resizeImage({
            file: file,
            maxSize: 640
          }).then(resizedImage => {
            this.runService.uploadCognaFile(resizedImage, this.cogna.id, file.name)
              .subscribe({
                next: res => {
                  if (res.type === HttpEventType.UploadProgress) {
                    progressSize = res.loaded;
                    this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                    this.cdr.detectChanges();
                  } else if (res instanceof HttpResponse) {
                    list.push(res.body.fileUrl);
                    this.filesMap[res.body.fileUrl] = res.body;
                    this.fileList.push({path:res.body.filePath,mime: file.type, isImage: true});
                    $event.target.value='';
                    this.cdr.detectChanges();
                  }
                }, error: err => {
                  this.cdr.detectChanges();
                }
              })
          }).catch(function (err) {
            console.error(err);
          });          
        }else{
          this.runService.uploadCognaFile(file, this.cogna.id, file.name)
              .subscribe({
                next: res => {
                  if (res.type === HttpEventType.UploadProgress) {
                    progressSize = res.loaded;
                    this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                    this.cdr.detectChanges();
                  } else if (res instanceof HttpResponse) {
                    list.push(res.body.fileUrl);
                    this.filesMap[res.body.fileUrl] = res.body;
                    this.fileList.push({path:res.body.filePath, mime: file.type, isImage: false});
                    $event.target.value='';
                    this.cdr.detectChanges();
                  }
                }, error: err => {
                  console.error(err);
                  this.cdr.detectChanges();
                }
              })
        }

      }
    }
  }


  extractData:any = {}


  onUploadExtract($event) {
    if ($event.target.files && $event.target.files.length) {
      var totalSize = 0;
      for (var i=0; i <$event.target.files.length; i++) {
        var file = $event.target.files[i];
        totalSize = totalSize + file.size;
      }
      // // var totalSize = $event.target.files.reduce((total, i) => total + i.size, 0);
      var progressSize = 0;

      // optimize image file here (ie: resize, compress)
      // files = compressImage(files, 300, 300)
      // const resizedImage = await resizeImage(config)
      // if (f.subType == 'imagemulti') {

      // console.log($event);
      var list = [];
      for (var i = 0; i < $event.target.files.length; i++) {
        let file = $event.target.files[i];
        // resizeImage({
        //   file: file,
        //   maxSize: 640
        // }).then(resizedImage => {
          this.runService.uploadCognaFile(file, this.cogna.id, file.name)
            .subscribe({
              next: res => {
                if (res.type === HttpEventType.UploadProgress) {
                  progressSize = res.loaded;
                  this.uploadProgress[file.name] = Math.round(100 * progressSize / totalSize);
                  this.cdr.detectChanges();
                } else if (res instanceof HttpResponse) {
                  list.push(res.body.filePath);
                  this.filesMap[res.body.filePath] = res.body;
                  this.fileList.push(res.body.filePath);
                  $event.target.value='';
                  this.cdr.detectChanges();
                }
              }, error: err => {
                console.error(err);
                this.cdr.detectChanges();
              }
            })
        // }).catch(function (err) {
        //   console.error(err);
        // });
      }
    }
  }

  getAsList = splitAsList;

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
  
  otherAppList: any[] = [];

  loadOtherAppList(type, appId) {
    if (['bucket'].indexOf(type) > -1) {
        this.getBucketList(appId);
    }
    if (['dataset'].indexOf(type) > -1) {
        this.getDatasetList(appId);
    }
    if (['lambda'].indexOf(type) > -1) {
        this.getLambdaList(appId);
    }
  }
  

}
