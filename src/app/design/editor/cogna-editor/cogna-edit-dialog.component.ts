import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, InjectionToken, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbAccordionModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { base, OAUTH } from '../../../_shared/constant.service';
import { NgCmComponent } from '../../../_shared/component/ng-cm/ng-cm.component';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { ToastService } from '../../../_shared/service/toast-service';
import { UniqueAppPathDirective } from '../../../_shared/app-path-validator';
import { toHyphen } from '../../../_shared/utils';
import { BucketService } from '../../../service/bucket.service';
import { CognaService } from '../../../service/cogna.service';
import { FormService } from '../../../service/form.service';
import { LambdaService } from '../../../service/lambda.service';

interface CognaConfig {
  cohereApiKey?: string;
  embedBaseUrl?: string;
  embedLocation?: string;
  embedProject?: string;
  extractFormId?: number;
  extractPrompt?: string;
  extractSchema?: string;
  genBucket?: boolean;
  genBucketId?: number;
  imgSize?: string;
  imgQuality?: string;
  imgStyle?: string;
  imgclsCat?: string;
  imgclsCogna?: string;
  imgclsLimit?: number;
  imgclsMinScore?: number;
  imgclsOn?: boolean;
  imgclsShowScore?: boolean;
  imggenCogna?: string;
  imggenOn?: boolean;
  inferBaseUrl?: string;
  inferLocation?: string;
  inferProject?: string;
  jsonOutput?: boolean;
  metadataKeys?: string;
  overrideDb?: boolean;
  overrideEmbed?: boolean;
  overrideInfer?: boolean;
  reRankMinScore?: number;
  txtclsCogna?: string;
  txtclsLlm?: boolean;
  txtclsOn?: boolean;
  txtextractOn?: boolean;
  withMetadata?: boolean;
}

export interface CognaEditData {
  id?: number;
  type: string;
  data: CognaConfig;
  augmentor?: string;
  chunkLength?: number;
  chunkOverlap?: number;
  code?: string;
  content?: string;
  description?: string;
  email: string;
  embedMaxResult?: number;
  embedMinScore?: number;
  embedModelApiKey?: string;
  embedModelName?: string;
  embedModelType?: string;
  inferModelApiKey?: string;
  inferModelName?: string;
  inferModelType?: string;
  maxChatMemory?: number;
  mmSupport?: boolean;
  name?: string;
  postMessage?: string;
  publicAccess?: boolean;
  streamSupport?: boolean;
  systemMessage?: string;
  temperature?: number;
  vectorStoreDim?: number;
  vectorStoreHost?: string;
  vectorStorePort?: number;
  vectorStoreType?: string;
}

interface CognaListItem {
  id: number;
  name: string;
}

export interface CognaDialogData {
  appId: number;
  cogna: CognaEditData;
  cognas: CognaListItem[];
}
export const COGNA_DIALOG_DATA = new InjectionToken<CognaDialogData>('COGNA_DIALOG_DATA');

@Component({
  selector: 'app-cogna-edit-dialog',
  templateUrl: './cogna-edit-dialog.component.html',
  imports: [FormsModule, FaIconComponent, NgbAccordionModule, NgCmComponent, FilterPipe, UniqueAppPathDirective],
  styles: [`.accordion-index {
    float: left; height: 25px; width: 25px; background: var(--bs-secondary-bg, #666);
    color: var(--bs-body-color, white); padding: 0; margin-left: 3px; line-height: 25px;
    text-align: center; margin-right: .8em; border-radius: 20px;
  }`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CognaEditDialogComponent implements OnInit {
  private readonly data = inject(COGNA_DIALOG_DATA);
  readonly editCognaData = this.data.cogna;
  readonly cognaList = this.data.cognas;
  readonly initialCode = this.data.cogna.code || '';
  readonly activeModal = inject(NgbActiveModal);
  readonly base = base;
  readonly allowedVectorStoreType = OAUTH.COGNA_VECTOR_DB;
  readonly toHyphen = toHyphen;
  readonly isCodeTaken = (code: string) => this.cognaService.isCodeTaken(code);
  private readonly cognaService = inject(CognaService);
  private readonly bucketService = inject(BucketService);
  private readonly formService = inject(FormService);
  private readonly lambdaService = inject(LambdaService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  bucketList: { id: number; name: string }[] = [];
  formList: { id: number; title: string }[] = [];
  secretList: { key: string }[] = [];

  embedModelTypeList = [
    { name: 'AllMiniLM', code: 'minilm' },
    { name: 'Multilingual E5SmallV2', code: 'e5small' },
    { name: 'OpenAI', code: 'openai' },
    { name: 'Requesty', code: 'requesty' },
    { name: 'HuggingFace', code: 'huggingface' },
    { name: 'Gemini', code: 'gemini' },
    { name: 'LocalAI', code: 'localai' },
    { name: 'Ollama', code: 'ollama' },
  ]

  embedModelNameList = [
    { name: 'GPT3.5 TURBO', code: 'gpt-3.5-turbo', type: 'openai' },
    { name: 'Text Embedding ADA 002', code: 'text-embedding-ada-002', type: 'openai' },
    { name: 'Text Embedding 3 Small', code: 'text-embedding-3-small', type: 'openai' },
    { name: 'Text Embedding 3 Large', code: 'text-embedding-3-large', type: 'openai' },
    { name: 'All MiniLM L6 v2', code: 'sentence-transformers/all-MiniLM-L6-v2', type: 'huggingface' },
    { name: 'BGE SMall EN v1.5', code: 'BAAI/bge-small-en-v1.5', type: 'huggingface' },
    { name: 'All MPnet Base v2', code: 'sentence-transformers/all-mpnet-base-v2', type: 'huggingface' },
    { name: 'IntFloat E5 Large v2', code: 'intfloat/e5-large-v2', type: 'huggingface' },
    { name: 'Nomic Embed Text', code: 'nomic-embed-text', type: 'ollama' },
    { name: 'Gemini Embedding 001', code: 'gemini-embedding-001', type: 'gemini' },
  ]

  // txtgen, txtcls, txtext, imggen
  inferModelTypeList = [
    { name: 'OpenAI', code: 'openai', use: ['txtgen','txtcls','txtext','imggen'] },
    { name: 'Requesty', code: 'requesty', use: ['txtgen','txtcls','txtext','imggen'] },
    { name: 'Gemini', code: 'gemini', use: ['txtgen','txtcls','txtext','imggen'] },
    { name: 'DeepSeek', code: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'HuggingFace', code: 'huggingface', use: ['txtgen','txtcls','txtext'] },
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
    { name: 'GPT-5.4', code: 'gpt-5.4', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-5.4 MINI', code: 'gpt-5.4-mini', type: 'openai', use: ['txtgen','txtcls','txtext'] },
    { name: 'GPT-5.4 NANO', code: 'gpt-5.4-nano', type: 'openai', use: ['txtgen','txtcls','txtext'] },

    { name: 'Gemini 2.5 Pro', code: 'gemini-2.5-pro', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.5 Flash', code: 'gemini-2.5-flash', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.5 Flash-Lite', code: 'gemini-2.5-flash-lite', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.0 Flash', code: 'gemini-2.0-flash', type: 'gemini', use: ['txtgen','txtcls','txtext'] },
    { name: 'Gemini 2.0 Flash-Lite', code: 'gemini-2.0-flash-lite', type: 'gemini', use: ['txtgen','txtcls','txtext'] },

    { name: 'DeepSeek Reasoner', code: 'deepseek-reasoner', type: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'DeepSeek Chat', code: 'deepseek-chat', type: 'deepseek', use: ['txtgen','txtcls','txtext'] },
    { name: 'DALL.E 2', code: 'dall-e-2', type: 'openai', use: ['imggen'] },
    { name: 'DALL.E 3', code: 'dall-e-3', type: 'openai', use: ['imggen'] },
    { name: 'GPT Image 1', code: 'gpt-image-1', type: 'openai', use: ['imggen'] },
    { name: 'GPT Image 2', code: 'gpt-image-2', type: 'openai', use: ['imggen'] },
    { name: 'YOLOv10s', code: 'yolov10s.onnx', type: 'onnx', use: ['imgcls'] },
    { name: 'ResNet50v2', code: 'resnet50-v2-7.onnx', type: 'onnx', use: ['imgcls'] },
    { name: 'MobileNetv2-1.2', code: 'mobilenetv2-12.onnx', type: 'onnx', use: ['imgcls'] },
    { name: 'Imagen', code: 'imagen-4.0-generate-001', type: 'gemini', use: ['imggen'] },
    { name: 'COGVIEW-3', code: 'cogview-3', type: 'zhipuai', use: ['imggen'] },

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

  imgOutputSize={
    'dall-e-2':['256x256','512x512','1024x1024'],
    'dall-e-3':['1024x1024','1792x1024','1024x1792']
  }

  readonly cognaEp = {
    txtgen: 'prompt', txtext: 'extract', txtcls: 'classify', imggen: 'imggen', imgcls: 'imgcls'
  };
  readonly dbMap = {
    milvus: { name: 'Milvus', logo: 'https://artwork.lfaidata.foundation/projects/milvus/icon/color/milvus-icon-color.png' },
    chromadb: { name: 'ChromaDB', logo: 'https://www.trychroma.com/img/chroma.png' },
    inmemory: { name: 'InMemory', logo: 'assets/icons/icon-72.png' }
  };

  ngOnInit() {
    this.bucketService.getBucketList({ appId: this.data.appId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => { this.bucketList = response.content; this.cdr.markForCheck(); },
      error: () => this.toastService.show('Unable to load buckets', { classname: 'bg-danger text-light' })
    });
    this.formService.getListBasic({ appId: this.data.appId }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => { this.formList = response.content; this.cdr.markForCheck(); },
      error: () => this.toastService.show('Unable to load forms', { classname: 'bg-danger text-light' })
    });
    this.lambdaService.getSecretList(this.data.appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (secrets: { key: string }[]) => { this.secretList = secrets; this.cdr.markForCheck(); },
      error: () => this.toastService.show('Unable to load secrets', { classname: 'bg-danger text-light' })
    });
  }

  loadFormatter(formId: number | null | undefined) {
    if (!formId) {
      this.editCognaData.data.extractSchema = '';
      return;
    }
    this.cognaService.getFormatter(formId, this.editCognaData.type === 'txtext')
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result: { schema: string }) => {
          this.editCognaData.data.extractSchema = result.schema;
          this.cdr.markForCheck();
        },
        error: () => this.toastService.show('Unable to load form schema', { classname: 'bg-danger text-light' })
      });
  }

  setImgGenModels() {
    this.editCognaData.inferModelType = 'openai';
    this.editCognaData.inferModelName = 'dall-e-2';
    this.editCognaData.data.genBucket = true;
    this.editCognaData.data.imgSize = '512x512';
    this.editCognaData.data.imgQuality = 'standard';
    this.editCognaData.data.imgStyle = 'vivid';
  }

  setImgClsModels() {
    this.editCognaData.inferModelType = 'onnx';
    this.editCognaData.inferModelName = 'resnet50-v2-7.onnx';
    this.editCognaData.data.imgclsMinScore = 8;
    this.editCognaData.data.imgclsLimit = 3;
  }
}
