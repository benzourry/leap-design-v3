// Copyright (C) 2018-2026 Razif Baital
// Part of LEAP - GNU GPL v3

import { 
  Component, forwardRef, Optional, Inject, ChangeDetectorRef, 
  output, input, computed, effect, viewChild, ChangeDetectionStrategy, 
  untracked, Signal, 
  signal,
  Injectable
} from '@angular/core';
import { baseApi } from '../../../_shared/constant.service';
import { 
  NG_VALUE_ACCESSOR, NG_ASYNC_VALIDATORS, NG_VALIDATORS, 
  NgModel, FormsModule, 
  Validator,
  ValidationErrors,
  AbstractControl
} from '@angular/forms';
import { 
  NgbDateAdapter, NgbTimeAdapter, NgbDatepicker, 
  NgbInputDatepicker, NgbTimepicker 
} from '@ng-bootstrap/ng-bootstrap';
import { ViewEncapsulation } from '@angular/core';
import { BrowserQRCodeReader } from '@zxing/browser';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgClass, NgTemplateOutlet, NgStyle, AsyncPipe, DatePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MaskDirective } from '../../../_shared/directive/mask.directive';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { SecurePipe } from '../../../_shared/pipe/secure.pipe';
import { NgbUnixTimestampAdapter } from '../../../_shared/service/date-adapter';
import { LogService } from '../../../_shared/service/log.service';
import { NgbUnixTimestampTimeAdapter } from '../../../_shared/service/time-adapter';
import { compileTpl, deepEqual, getFieldErrorMessages, splitAsList } from '../../../_shared/utils';
import { NgLeafletComponent } from '../ng-leaflet/ng-leaflet.component';
import { ElementBase } from '../element-base';
import { SpeechToTextComponent } from '../speech-to-text/speech-to-text.component';
import { MorphHtmlDirective } from '../../../_shared/directive/morph-html.directive';

@Injectable()
export class FieldCustomValidator implements Validator {
  private validationFn: () => ValidationErrors | null = () => null;

  // The component will use this to wire itself up safely
  register(fn: () => ValidationErrors | null) {
    this.validationFn = fn;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return this.validationFn();
  }
}

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
    CUSTOMINPUT_VALUE_ACCESSOR,
    FieldCustomValidator, // <-- Add the class
    { provide: NG_VALIDATORS, useExisting: FieldCustomValidator, multi: true } // <-- Register to NG_VALIDATORS
  ],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    FaIconComponent, NgClass, NgTemplateOutlet, FormsModule, MaskDirective, 
    AngularEditorModule, NgbDatepicker, NgbInputDatepicker, NgbTimepicker, 
    NgSelectModule, NgStyle, AsyncPipe, MorphHtmlDirective, SafePipe, DatePipe,
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
  prefixClick = output<any>();
  suffixClick = output<any>();

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
  compiledDataPrefix = computed(() => this.compileTpl(this.field()?.x?.prefix, this.data(), this.field()?.subType === 'htmlSave'));
  compiledDataSuffix = computed(() => this.compileTpl(this.field()?.x?.suffix, this.data(), this.field()?.subType === 'htmlSave'));
  compiledDataPlaceholder = computed(() => this.compileTpl(this.field()?.placeholder, this.data(), this.field()?.subType === 'htmlSave'));
  compiledDataLabel = computed(() => this.compileTpl(this.field()?.label, this.data(), this.field()?.subType === 'htmlSave'));
  simpleList = computed(() => splitAsList(this.field()?.options));

  compiledLookupMap = computed(() => {
    const list = this.lookupList();
    const processedList = this.processedLookupList();
    const f = this.field();
    
    // Initialize a Map instead of a standard Record object
    const map = new Map<any, string>();

    if (!list || !f?.placeholder) return map;

    // Both lists will always be the same length
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const processedItem = processedList[i];
      
      const html = this.compileTpl(f.placeholder, { '$': item, '$prev$': item.$prev });

      // 1. Map the original item reference (used by radio/checkbox loops)
      map.set(item, html);
      
      // 2. If the item was cloned for a disabled state, map the clone too (used by ng-select)
      if (item !== processedItem) {
        map.set(processedItem, html);
      }
    }

    return map;
  });

// --- UNIFIED DISABLE LOGIC ---
  markDisabledFn = computed(() => {
    const field = this.field();
    const script = field?.x?.markDisabledFn;
    
    if (!script) return undefined;

    let cachedFn: Function | null = null;
    let cachedKeys: string[] = [];

    return (target: any) => {
      try {
        let jsDate: number | undefined = undefined;
        let struct: any = undefined;
        let option: any = undefined;

        // Check if target is a Datepicker NgbDateStruct
        if (target && typeof target === 'object' && 'year' in target && 'month' in target && 'day' in target) {
          jsDate = new Date(target.year, target.month - 1, target.day).getTime();
          struct = target;
        } else {
          // Otherwise, it's an Option item (Dropdown, Radio, Checkbox)
          option = target;
        }

        const bindings = { 
          ...(this.data() || {}), 
          $date$: jsDate, 
          $struct$: struct,
          $item$: option
        };

        if (!cachedFn) {
          cachedKeys = Object.keys(bindings);
          cachedFn = new Function(...cachedKeys, `return ${script}`);
        }

        const argValues = cachedKeys.map(k => bindings[k as keyof typeof bindings]);
        return !!cachedFn(...argValues);

      } catch (e) {
        console.error(`{field-${field?.code}-markDisabled}`, e);
        return false; 
      }
    };
  });

  // Helper method for HTML loops (radios, checkboxes, buttons)
  isDisabled(item: any): boolean {
    const fn = this.markDisabledFn();
    return fn ? fn(item) : false;
  }

  checkDisabled = (item: any) => this.isDisabled(item);

// Pre-processes the lookupList for ng-select to natively inject the `disabled` property ONLY if true
  processedLookupList = computed(() => {
    const list = this.lookupList();
    const disableFn = this.markDisabledFn();
    
    if (!disableFn || !list?.length) return list;
    
    return list.map(item => {
      if (item && typeof item === 'object') {
        const isDisabled = disableFn(item);
        if (isDisabled) {
          return { ...item, disabled: true }; // Only clone if disabled
        }
        return item; // Return pristine original item!
      }
      return item; // Fallback for raw strings
    });
  });

  // Ensures ng-select maps selections correctly when using the processed clone
  compareWithFn = (a: any, b: any) => {
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (a.code !== undefined && b.code !== undefined) return a.code === b.code;
      if (a.id !== undefined && b.id !== undefined) return a.id === b.id;
    }
    return a === b;
  };

  rawTextLength: number = 0;
  wordCount: number = 0;

  // calculateTextStats(value: any, isRichText: boolean) {
  //   if (typeof value !== 'string' || !value) {
  //     this.rawTextLength = 0;
  //     this.wordCount = 0;
  //     return;
  //   }
    
  //   // Fast regex: strips HTML tags and replaces &nbsp; with standard spaces
  //   const rawText = isRichText ? value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ') : value;
    
  //   const cleanText = rawText.trim();
  //   this.rawTextLength = cleanText.length;
  //   this.wordCount = cleanText ? cleanText.split(/\s+/).length : 0; // Split by whitespace
  // }

  calculateTextStats(value: any, isRichText: boolean) {
    if (typeof value !== 'string' || !value) {
      this.rawTextLength = 0;
      this.wordCount = 0;
      return;
    }
    
    const rawText = isRichText ? value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ') : value;
    const cleanText = rawText.trim();
    
    this.rawTextLength = cleanText.length;
    
    // Highly performant word count (no arrays created in memory)
    if (!cleanText) {
      this.wordCount = 0;
    } else {
      let count = 1;
      let inWhitespace = false;
      for (let i = 0; i < cleanText.length; i++) {
        const charCode = cleanText.charCodeAt(i);
        // Check for space, tab, newline
        if (charCode === 32 || charCode === 9 || charCode === 10 || charCode === 13) {
          inWhitespace = true;
        } else if (inWhitespace) {
          count++;
          inWhitespace = false;
        }
      }
      this.wordCount = count;
    }
}
  // compiledGroupByMap = computed(() => {
  //   const list = this.lookupList();
  //   const f = this.field();
  //   const weakMap = new WeakMap<any, string>();

  //   // If there's no groupBy template, exit early
  //   if (!f?.x?.groupBy) return weakMap;

  //   // 1. Pre-compile all items in the dropdown list
  //   if (list) {
  //     for (const item of list) {
  //       weakMap.set(item, this.compileTpl(f.x.groupBy, { '$': item }));
  //     }
  //   }

  //   // 2. SAFETY CATCH: Also compile the currently selected value(s)
  //   const currentValue = this.value; 
  //   if (currentValue) {
  //     const valArray = Array.isArray(currentValue) ? currentValue : [currentValue];
  //     for (const sv of valArray) {
  //       if (!weakMap.has(sv)) {
  //         weakMap.set(sv, this.compileTpl(f.x.groupBy, { '$': sv }));
  //       }
  //     }
  //   }

  //   return weakMap;
  // });

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
      toolbarHiddenButtons: [['fontName', 'indent', 'outdent','insertHorizontalRule','link','unlink','removeFormat'], ['insertImage', 'insertVideo', 'toggleEditorMode']]
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
    private logService: LogService,
    private customValidator: FieldCustomValidator // <-- Inject here
  ) {
    // super(validators, asyncValidators);
    super(
      validators ? validators.filter(v => v !== customValidator) : [], 
      asyncValidators
    );

    this.customValidator.register(() => this.getCustomValidationErrors());

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
  
  // Evaluates internal state to report errors to the outer Angular Form
  public getCustomValidationErrors(): ValidationErrors | null {
    const f = this.field();
    let errors: ValidationErrors | null = null;

    if (f?.v?.required) {
      if (this.value == null || this.value === '' || this.value === false || (Array.isArray(this.value) && this.value.length === 0)) {
        errors = { ...(errors || {}), required: true };
      }
    }

    if (this.value && typeof this.value === 'string') {
      
      // 1. Richtext custom limits
      if (f?.subType === 'richtext') {
        if (f?.v?.minlength && this.rawTextLength < f.v.minlength) {
          errors = { ...(errors || {}), minlength: { requiredLength: f.v.minlength } };
        }
        if (f?.v?.maxlength && this.rawTextLength > f.v.maxlength) {
          errors = { ...(errors || {}), maxlength: { requiredLength: f.v.maxlength } };
        }
      }

      // 2. Universal Word Count limits
      if (f?.v?.minwords && this.wordCount < f.v.minwords) {
        errors = { ...(errors || {}), minwords: { requiredWords: f.v.minwords } };
      }
      if (f?.v?.maxwords && this.wordCount > f.v.maxwords) {
        errors = { ...(errors || {}), maxwords: { requiredWords: f.v.maxwords } };
      }
    }

    // 3. Custom Image Classification error
    if (this.value && f?.x?.imgcls && f?.v?.imgcls && !this.imgclsVal()) {
      errors = { ...(errors || {}), imgcls: { requiredImg: f.v.imgcls } };
    }

    return errors;
  }

  get fieldErrors(): string[] {
    const m = this.model();
    const f = this.field();
    
    // Grab native model errors (like required, pattern)
    let errs = m?.errors ? { ...m.errors } : null;

    // Merge in our custom programmatic errors
    const customErrs = this.getCustomValidationErrors();
    if (customErrs) {
      errs = { ...(errs || {}), ...customErrs };
    }

    return getFieldErrorMessages(errs, f, this.lang());
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

      this.calculateTextStats(next, field.subType === 'richtext');

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
    this.model()?.control?.markAsTouched(); // <-- ADD THIS

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

  // Helper to safely generate a unique string key for any item
  // getLookupMapKey(item: any): string {
  //   if (item == null) return '';
  //   if (typeof item !== 'object') return String(item);
  //   return item.code ?? item.id ?? JSON.stringify(item);
  // }
  getLookupMapKey(item: any): any {
    return item; // Just return the item itself to use as an object reference key
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

    this.calculateTextStats(value, field?.subType === 'richtext');

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
  checkValueChanged = (event: any) => { 
    this.model()?.control?.markAsTouched(); // <-- ADD THIS
    this.value = event ? true : undefined; this.valueChange.emit(this.value); 
  };
  triggerAddAction = (val: any) => this.addAction.emit(val);
  selectGroupBy = (item: any) => this.field() ? this.compileTpl(this.field()?.x?.groupBy, { '$': item }) : undefined;
  lookupSearchFn = (term: string, item: any) => item && JSON.stringify(Object.values(item)).toLowerCase().includes(term.toLowerCase());
  encodeURIComponent = encodeURIComponent;
  prefixClicked = () => this.prefixClick.emit(this.value);
  suffixClicked = () => this.suffixClick.emit(this.value);
}