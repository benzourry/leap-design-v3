// Copyright (C) 2018-2026 Razif Baital
// Part of LEAP - GNU GPL v3

import { 
  Component, forwardRef, Optional, Inject, ChangeDetectorRef, 
  output, input, computed, effect, viewChild, ChangeDetectionStrategy, 
  untracked, Signal, 
  signal
} from '@angular/core';
import { baseApi } from '../../../_shared/constant.service';
import { 
  NG_VALUE_ACCESSOR, NG_ASYNC_VALIDATORS, NG_VALIDATORS, 
  NgModel, FormsModule 
} from '@angular/forms';
import { 
  NgbDateAdapter, NgbTimeAdapter, NgbDatepicker, 
  NgbInputDatepicker, NgbTimepicker 
} from '@ng-bootstrap/ng-bootstrap';
import { ViewEncapsulation } from '@angular/core';
import { BrowserQRCodeReader } from '@zxing/browser';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgClass, NgTemplateOutlet, NgStyle, AsyncPipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MaskDirective } from '../../../_shared/directive/mask.directive';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { SecurePipe } from '../../../_shared/pipe/secure.pipe';
import { NgbUnixTimestampAdapter } from '../../../_shared/service/date-adapter';
import { LogService } from '../../../_shared/service/log.service';
import { NgbUnixTimestampTimeAdapter } from '../../../_shared/service/time-adapter';
import { compileTpl, deepEqual, splitAsList } from '../../../_shared/utils';
import { NgLeafletComponent } from '../ng-leaflet/ng-leaflet.component';
import { ElementBase } from '../element-base';
import { SpeechToTextComponent } from '../speech-to-text/speech-to-text.component';
import { MorphHtmlDirective } from '../../../_shared/directive/morph-html.directive';

export const CUSTOMINPUT_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => FieldEditComponent),
  multi: true,
};

let identifier = 0;

@Component({
  selector: 'field-edit',
  templateUrl: './field-edit.component.html',
  styleUrls: ['./field-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
    { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter },
    CUSTOMINPUT_VALUE_ACCESSOR
  ],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    FaIconComponent, NgClass, NgTemplateOutlet, FormsModule, MaskDirective, 
    AngularEditorModule, NgbDatepicker, NgbInputDatepicker, NgbTimepicker, 
    NgSelectModule, NgStyle, AsyncPipe, MorphHtmlDirective, SafePipe, 
    SecurePipe, NgLeafletComponent, SpeechToTextComponent
  ]
})
export class FieldEditComponent extends ElementBase<any> {
  // Inputs as Signals
  field = input<any>();
  user = input<any>();
  data = input<any>();
  loading = input<boolean>();
  scopeId = input<string>();
  lang = input<string>('en');
  extractLoading = input<boolean>();
  itemList = input<any>();
  always = input<boolean>(false);
  id = input<string>("");
  fileProgress = input<number>();
  imgclsVal = input<boolean>(false);
  lookupList = input<any[]>([]);
  hideAddAction = input<boolean>();
  defaultValue = input<any>();

  // Outputs
  valueChange = output<any>();
  valueBlur = output<any>();
  valueSearch = output<any>();
  selectFocus = output<any>();
  fileValueChange = output<any>();
  fileValueClear = output<any>();
  addAction = output<any>();

  // State
  file: any = {};
  baseApi: string = baseApi;
  codeReader = new BrowserQRCodeReader();
  public identifier = `form-text-${identifier++}`;
  hasFocus: boolean = false;
  private previousEmitted: any;
  private readonly BASE_DATE_EPOCH = 800000000000;
  private readonly VALUE_SNAP_TYPE = ['radio', 'select', 'modelPicker', 'checkboxOption'];

  // ViewChild Signal
  readonly model = viewChild<NgModel>('formField');

  // Computed Values
  compiledData = computed(() => this.compileTpl(this.field()?.placeholder, this.data(), this.field()?.subType === 'htmlSave'));
  simpleList = computed(() => splitAsList(this.field()?.options));
  scales: Signal<number[]> = computed(() => {
    const f = this.field();
    if (!f) return [];
    if (f.type === 'scaleTo5') return [1, 2, 3, 4, 5];
    if (f.type === 'scaleTo10') return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const min = f.v?.min ?? 0;
    const max = f.v?.max ?? 0;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  });

  // Editor Configuration
  editorConfig = computed<AngularEditorConfig>(() => {
    const f = this.field();
    const config: AngularEditorConfig = {
      editable: true,
      spellcheck: true,
      height: 'auto',
      placeholder: f?.placeholder || 'Enter text here...',
      translate: 'yes',
      toolbarPosition: 'bottom',
      toolbarHiddenButtons: [['insertImage', 'insertVideo', 'toggleEditorMode']]
    };
    
    if (f?.x?.inlineImg) {
      // Logic to modify config if needed
    }
    return config;
  });

  constructor(
    @Optional() @Inject(NG_VALIDATORS) validators: Array<any>,
    @Optional() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: Array<any>,
    private cdref: ChangeDetectorRef,
    private logService: LogService
  ) {
    super(validators, asyncValidators);

    // Auto-snap effect when lookupList arrives late


    effect(() => {
      const list = this.lookupList();
      const field = this.field();

      // Guard clauses (V2 style for cleaner reading)
      if (!list?.length || this.value == null || !field) return;
      if (!this.VALUE_SNAP_TYPE.includes(field.type) || field.x?.noSnap) return;
      untracked(() => {
        queueMicrotask(() => {
          const snappedValue = this.autoSnapValue(this.value);
          
          // Safety and UI Update (V1 style for robust performance)
          if (!deepEqual(snappedValue, this.value)) {
            this.value = snappedValue;
            this.cdref.markForCheck(); 
          }
        });
      });
    });
  }
  

  // STANDARD CLASS METHODS (Fixes "is not a function" errors)
  
  fileValueChanged(event: any) {
    const fileList: File[] = [];
    const fileError: any[] = [];
    
    if (this.value && event.target.files.length !== 0) {
      this.fileValueClear.emit(this.value);
    }

    if (event.target.files.length > 0) {
      let i = 0;
      [...event.target.files].forEach(f => {
        if (this.field().v?.max && f.size > this.field().v?.max * 1024 * 1024) {
          fileError.push(f);
          i++;
        } else {
          fileList.push(f);
        }
      });

      if (i > 0) {
        this.model()?.control.setErrors({ 
          'maxsize': true, 
          files: fileError.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(2)}MB)`).join(", ") 
        });
        this.model()?.control.markAsTouched();
        this.value = null;
      }
    }
    this.fileValueChange.emit(fileList);
  }

  valueChanged(next: any) {
    const field = this.field();
    if (!field) return;

    if (!deepEqual(next, this.previousEmitted) || field.type === 'btn') {
      let processedValue = next;

      if (field.subType === 'time' && typeof next === 'number') {
        const inputDate = new Date(next);
        const baseDate = new Date(this.BASE_DATE_EPOCH);
        inputDate.setFullYear(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        processedValue = inputDate.getTime();
        this.value = processedValue;
      }

      if (this.VALUE_SNAP_TYPE.includes(field.type) && !field.x?.noSnap) {
        processedValue = this.autoSnapValue(next);
        this.value = processedValue;
      }

      this.previousEmitted = processedValue;
      this.valueChange.emit(processedValue);
      this.cdref.markForCheck();
    }
  }

  clear(native?: HTMLInputElement) {
    this.fileValueClear.emit(this.value);
    this.value = undefined;
    if (native) native.value = '';
    
    const ctrl = this.model()?.control;
    if (ctrl) {
      ctrl.reset();
      ctrl.markAsTouched();
    }
    return false;
  }

  // HELPERS
  autoSnapValue(oldValue: any) {
    const list = this.lookupList();
    if (oldValue == null || !list?.length) return oldValue;

    const field = this.field();
    const isMultiple = field?.subType === 'multiple' || field?.type === 'checkboxOption';
    const key = (field?.type === 'modelPicker') ? '$id' : 'code';

    const snap = (val: any) => {
      if (!val || typeof val !== 'object') return val;
      const match = list.find(option => option[key] === val[key]);

      return match ? {...match} : {...val};
    };

    return (isMultiple && Array.isArray(oldValue)) ? oldValue.map(v => snap(v)) : snap(oldValue);
  }

  checkValue(c: any) {
    if (!this.value) return false;
    const arr = Array.isArray(this.value) ? this.value : [this.value];
    return arr.some(v => v.code === c.code);
  }

  toggleValue(c: any) {
    if (this.checkValue(c)) {
      this.value = this.value?.filter((v: any) => v.code !== c.code);
    } else {
      this.value = [...(this.value || []), c];
    }
    this.valueChanged(this.value);
  }

  toNgbDateStruct(timestamp: number) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return { day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() };
  }

  compileTpl(a: any, b: any, keep?: boolean) {
    try {
      const f = compileTpl(a, b, this.scopeId());
      if (keep) this.value = f;
      return f;
    } catch (e) {
      this.logService.log(`{field-${this.field()?.code}}-${e}`);
      return '';
    }
  }

  qrError = signal<boolean>(false);
  qrValueChanged(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    this.qrError.set(false);
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        this.codeReader.decodeFromImageElement(img)
          .then(result => {
            this.value = result.getText();
            this.valueChanged(this.value);
          }).catch(err => {
            this.value = null;
            this.qrError.set(true);
            // console.error(err);
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // STANDARD FORM METHODS
  override writeValue(value: any): void {
    const field = this.field();
    if (field?.type === 'btn') return;

    if ((value === null || value === undefined) && field?.x?.use_default) {
      const defaultValue = this.defaultValue();
      if (defaultValue != null) {
        queueMicrotask(() => {
          if (this.value == null) {
            this.value = defaultValue;
            super.writeValue(defaultValue);
            this.valueChanged(defaultValue);
          }
        });
        return;
      }
    } else if (value != null && field?.type !== 'eval') {
      queueMicrotask(() => this.valueChanged(value));
    }
    super.writeValue(value);
  }

  // Handlers for HTML
  fileclick = (input: HTMLInputElement) => input.value = '';
  valueBlured = (event: any) => this.valueBlur.emit(event);
  valueSearched = (event: any) => this.valueSearch.emit(event);
  selectFocused = (event: any) => { this.selectFocus.emit(event); this.hasFocus = true; };
  checkValueChanged = (event: any) => { this.value = event ? true : undefined; this.valueChange.emit(this.value); };
  triggerAddAction = (val: any) => this.addAction.emit(val);
  selectGroupBy = (item: any) => this.field() ? this.compileTpl(this.field()?.x?.groupBy, { '$': item }) : undefined;
  lookupSearchFn = (term: string, item: any) => item && JSON.stringify(Object.values(item)).toLowerCase().includes(term.toLowerCase());
  encodeURIComponent = encodeURIComponent;
}