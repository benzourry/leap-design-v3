// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// 
// LEAP is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// LEAP is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LEAP.  If not, see <http://www.gnu.org/licenses/>.

import { Component, forwardRef, Optional, Inject, ChangeDetectorRef, output, input, computed, effect, viewChild, ChangeDetectionStrategy, untracked, Signal } from '@angular/core';
import { baseApi } from '../../../_shared/constant.service';
import { NG_VALUE_ACCESSOR, NG_ASYNC_VALIDATORS, NG_VALIDATORS, NgModel, FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbTimeAdapter, NgbDatepicker, NgbInputDatepicker, NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
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

// export const CUSTOMINPUT_VALUE_VALIDATOR: any = {
//   provide: NG_VALIDATORS,
//   useExisting: forwardRef(() => FieldEditComponent),
//   multi: true,
// }

@Component({
  selector: 'field-edit',
  templateUrl: './field-edit-b.component.html',
  styleUrls: ['./field-edit-b.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // mcm ok
  providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
  { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter },
    CUSTOMINPUT_VALUE_ACCESSOR],
  encapsulation: ViewEncapsulation.None,
  imports: [FaIconComponent, NgClass, NgTemplateOutlet, FormsModule, MaskDirective, AngularEditorModule,
    NgbDatepicker, NgbInputDatepicker, NgbTimepicker, NgSelectModule, NgStyle, AsyncPipe, MorphHtmlDirective,
    SafePipe, SecurePipe, NgLeafletComponent, SpeechToTextComponent]
})

export class FieldEditComponent extends ElementBase<any> {


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

  file: any = {}
  scaleTo = {
    scaleTo10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    scaleTo5: [1, 2, 3, 4, 5]
  }
  baseApi: string = baseApi;
  codeReader = new BrowserQRCodeReader();

  lookupList = input<any>();
  hideAddAction = input<boolean>();

  valueChange = output<any>();

  valueBlur = output<any>();
  valueSearch = output<any>();
  selectFocus = output<any>();
  fileValueChange = output<any>();
  fileValueClear = output<any>();
  addAction = output<any>();

  defaultValue = input<any>();

  readonly model = viewChild<NgModel>('formField');
  // formField = viewChild<NgModel>('formField');

  public identifier = `form-text-${identifier++}`;
  hasFocus: boolean = false;

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
    // uploadUrl: 'v1/image',
    //upload: (file: File) => {  }
    uploadWithCredentials: false,
    sanitize: false,
    toolbarPosition: 'bottom',
    toolbarHiddenButtons: [
      // [
      // 'undo',
      // 'redo',
      // 'bold',
      // 'italic',
      // 'underline',
      // 'strikeThrough',
      // 'subscript',
      // 'superscript',
      // 'justifyLeft',
      // 'justifyCenter',
      // 'justifyRight',
      // 'justifyFull',
      // 'indent',
      // 'outdent',
      // 'insertUnorderedList',
      // 'insertOrderedList',
      // 'heading',
      // 'fontName'
      // ],
      [
        // 'fontSize',
        // 'textColor',
        // 'backgroundColor',
        'customClasses',
        // 'link',
        // 'unlink',
        'insertImage',
        'insertVideo',
        // 'insertHorizontalRule',
        // 'removeFormat',
        'toggleEditorMode'
      ]
    ]
  };

  constructor(
    @Optional() @Inject(NG_VALIDATORS) validators: Array<any>,
    @Optional() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: Array<any>,
    private cdref: ChangeDetectorRef,
    private logService: LogService
  ) {
    super(validators, asyncValidators);

    // !!! WHY use effect() to handle snap value? Value itself is not even a signal, so, this will not trigger when value change.
    // REASON TOK ARIYA SBB lookupList() often arrive late. So, engkah dlm effect supaya once it is arrive, snap the value.
    // REPLACE with this simple block reusing autoSnapValue function
    effect(() => {
      if (this.lookupList() != null && this.lookupList().length > 0 && this.value != null) {
        untracked(() => {
          queueMicrotask(() => {
            this.value = this.autoSnapValue(this.value);
          })
        });
      }
    });

    effect(() => {
      if (this.field().x?.inlineImg) {
        this.editorConfig.toolbarHiddenButtons[1].splice(this.editorConfig.toolbarHiddenButtons[1].indexOf('insertImage'), 1);
      }
    })

  }

  compiledData = computed(() => this.compileTpl(this.field().placeholder, this.data(), this.field().subType == 'htmlSave'))

  scales: Signal<number[]> = computed(() => this.createRange(this.field()));

  selectGroupBy = (item) => this.field() ? this.compileTpl(this.field()?.x?.groupBy, { '$': item }) : undefined;

  createRange = (f: any) => {
    if (f.type == 'scaleTo5') {
      return [1, 2, 3, 4, 5];
    } else if (f.type == 'scaleTo10') {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    } else {
      return Array.from({ length: f.v?.max - f.v?.min + 1 }, (_, i) => f.v?.min + i)
    }
  }

  toNgbDateStruct = (timestamp) => {
    var date = new Date(timestamp);
    return timestamp ? { day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear() } : null;
  }

  fileclick(input) {
    input.value = null;
  }

  clear(native?) {
    this.fileValueClear.emit(this.value);
    this.value = undefined;
    if (native) {
      native.value = null;
    }
    // this.model().control.updateValueAndValidity();
    this.model().control.reset();
    this.model().control.markAsTouched();
    //delete this.file[this.field.code];
    return false;
  }

  VALUE_SNAP_TYPE = ['radio', 'select', 'modelPicker', 'checkboxOption']; // if type in this, then need to auto snap value to lookupList reference

  // autoSnapValueOld(oldValue: any){
  //   let retVal = oldValue;
  //   if (oldValue === undefined || oldValue === null) return oldValue;

  //   // console.log(`autoSnapValue called with`,this.field()?.type,this.lookupList(),oldValue);

  //   if (this.field()?.type == 'radio') {
  //     // … do the mutation without tracking it:    
  //     if (this.lookupList() != null && this.lookupList().length > 0 && oldValue != null) {
  //       retVal = this.lookupList().find(option => option.code === oldValue.code) || oldValue;
  //     }
  //   }else if (this.field()?.type == 'select') {
  //     // … do the mutation without tracking it:    
  //     if (this.lookupList() != null && this.lookupList().length > 0 && oldValue != null) {
  //       if (this.field().subType == 'multiple') {
  //         retVal = retVal.map(v => this.lookupList().find(option => option.code === v.code) || v);
  //       } else {
  //         retVal = this.lookupList().find(option => option.code === oldValue.code) || oldValue;
  //       }
  //     }
  //   }else if (this.field()?.type == 'modelPicker') {
  //     // … do the mutation without tracking it:    
  //     if (this.lookupList() != null && this.lookupList().length > 0 && oldValue != null) {
  //       if (this.field().subType == 'multiple') {
  //         retVal = retVal.map(v => this.lookupList().find(option => option?.$id === v?.$id) || v);
  //       } else {
  //         retVal = this.lookupList().find(option => option?.$id === oldValue?.$id) || oldValue;
  //       }
  //     }
  //   }else if (this.field()?.type == 'checkboxOption') {
  //     // … do the mutation without tracking it:    
  //     if (this.lookupList() != null && this.lookupList().length > 0 && oldValue != null && oldValue.length > 0) {
  //       if (oldValue instanceof Array) {
  //             const newVal = oldValue?.map(v => this.lookupList().find(option => option?.code === v?.code) || v)
  //             retVal = newVal;
  //       }
  //     }
  //   }
  //   // console.log(`autoSnapValue: ${JSON.stringify(oldValue)} -> ${JSON.stringify(retVal)}`);
  //   return retVal;
  // }


  autoSnapValue(oldValue: any) {
    const field = this.field();
    const list = this.lookupList();

    if (oldValue == null || !list?.length) return oldValue;

    const type = field?.type;
    const isMultiple = field?.subType === 'multiple' || type === 'checkboxOption';

    const key = (type === 'modelPicker') ? '$id' : 'code';

    const snap = (val: any) => {
      if (!val || typeof val !== 'object') return val;
      // console.log(`Auto-snapping value for type ${type}:`, val);
      return list.find(option => option[key] === val[key]) ?? val;
    };

    if (isMultiple && Array.isArray(oldValue)) {
      return oldValue.map(v => snap(v));
    }

    return snap(oldValue);
  }

  compareFn = (val1: any, val2: any) => val1 && val1.code == val2.code;

  valueBlured(event) {
    this.valueBlur.emit(event);
  }

  private previousEmitted: any;

  BASE_DATE_EPOCH = 800000000000;

  valueChanged(next: any) {

    const field = this.field();

    // no need to worry. write value for btn will not trigger valueChanged, because in writeValue, if type btn, it will return before set the value
    // if (field?.type == 'btn') {
    //   console.log("VALUE-CHANGING "+ field.code);
    // }

    // this.value = next;
    // this.valueChange.emit(next);
    // jika value b4<>next, emit
    // field type button, perlu sentiasa emit
    if (!deepEqual(next, this.previousEmitted) || field?.type=='btn') {

      let processedValue = next;

      if (field?.subType == 'time') {
        const inputDate = new Date(next);
        const baseDate = new Date(this.BASE_DATE_EPOCH);
        inputDate.setDate(baseDate.getDate());
        inputDate.setMonth(baseDate.getMonth());
        inputDate.setFullYear(baseDate.getFullYear());

        processedValue = inputDate.getTime();
        this.value = processedValue;
      }
      
      if (this.VALUE_SNAP_TYPE.includes(field?.type)) {
        processedValue = this.autoSnapValue(next);
        // console.log("PROCESSED-VALUE", processedValue);
        this.value = processedValue;
      }

      this.previousEmitted = processedValue;

      this.valueChange.emit(processedValue);
    }
  }

  checkValueChanged(event) {
    this.value = event ? true : undefined;
    this.valueChange.emit(this.value);
    //   this.onChangeCallback(event); 
  }

  valueSearched(event) {
    this.valueSearch.emit(event);
    //   this.onChangeCallback(event);
  }

  selectFocused(event) {
    this.selectFocus.emit(event);
    this.hasFocus = true;
    // if (this.field() && this.field().type == 'simpleOption') {
    //   this.list = this.getAsList(this.field().options);
    // }
  }

  simpleList = computed(() => this.getAsList(this.field().options))

  fileValueChanged($event) {
    var fileList = [];
    var fileError = [];
    if (this.value && $event.target.files.length != 0) {
      this.fileValueClear.emit(this.value);
    }

    if ($event.target.files.length > 0) {
      var i = 0;
      [...$event.target.files].forEach(f => {
        if (this.field().v?.max && f.size > this.field().v?.max * 1024 * 1024) {
          fileError.push(f);
          i++; // if size nok ok, then increment
        } else {
          fileList.push(f); // if size ok, masok list
        }
      });

      if (i > 0) {
        this.model().control.setErrors({ 'maxsize': true, files: fileError.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(2)}MB)`).join(", ") });
        this.model().control.markAsTouched();
        this.value = null;
      }
    }

    this.fileValueChange.emit(fileList);
  }

  isArray = (value) => Array.isArray(value)

  checkValue(c) {
    if (!this.value) { // if value is null, directly return false
      return false;
    }

    if (!this.isArray(this.value)) { // if not array, convert to array
      this.value = [this.value];
    }

    return this.value ? this.value?.filter(v => v.code == c.code).length > 0 : false;
  }

  toggleValue(c) {
    if (this.checkValue(c)) {
      this.value = this.value?.filter(v => v.code != c.code);
    } else {
      if (!this.value) {
        this.value = [];
      }
      this.value = this.value.concat([c]);
    }
    this.valueChanged(this.value);
  }


  qrValueChanged(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    if (file) {
      reader.readAsDataURL(file);
      reader.onload = (e: any) => {
        const data = e.target.result;

        const img = new Image();

        img.onload = () => {

          this.codeReader
            .decodeFromImageElement(img)
            .then(result => {
              this.value = result;
              this.valueChanged(result);
            })
            .catch(err => console.error(err));

        };
        img.src = data;
      };
    }
  }

  translate = (value: number): string => Number.isNaN(value) ? "" : value + "";

  compileTpl(a, b, keep?) {
    var f = "";
    try {
      f = compileTpl(a, b, this.scopeId());
    } catch (e) {
      this.logService.log(`{field-${this.field().code}-compiletpl}-${e}`)
    }
    // this.valueChange.emit(f);
    if (keep) {
      // TO-DO!!! tok nyuruh form jd dirty jak2
      this.value = f;
      // this.formField?.control?.markAsPristine();
    }
    return f;
  }

  getAsList = splitAsList;


  triggerAddAction = (addValue) => { // using lambda supaya this <- refer to class
    this.addAction.emit(addValue);
  }

  lookupSearchFn = (term: string, item: any) => {
    term = term.toLocaleLowerCase();
    return JSON.stringify(Object.values(item)).toLocaleLowerCase().includes(term);
  }

  encodeURIComponent = encodeURIComponent;

  // use this instead of effect to set default value
  // using effect, the issue is when actual value arrived late, the value will be set with default value
  override writeValue(value: any): void {

    const field = this.field();

    // ignore/skip if type == btn
    if (field?.type == 'btn') {
      return;
    }    

    if (value === undefined || value === null) {
      // Only set default if no value is provided
      const useDef = field.x?.use_default;
      const defaultValue = this.defaultValue();
      if (useDef && defaultValue !== undefined && defaultValue !== null) {
        // queueMicroTask run before setTimeout
        // seems to work for now
        queueMicrotask(() => {
          // just before set the value, recheck if the value still null
          if (this.value === undefined || this.value === null){
            this.value = defaultValue;
            super.writeValue(defaultValue); // must be inside this, otherwise it will not work
            this.valueChanged(defaultValue); // not needed
            return;
          }
        });
      }
    }else{ // if value provided
      if (field.type != 'eval') { // if eval, then do not emit valueChanged, because it will cause loop esp when value always change ie Date.now()
        queueMicrotask(() => {
          this.valueChanged(value); // need to emit changes, if set programmatically
        })
      }
    }    
    // Otherwise, set the provided value
    super.writeValue(value);
  }

}

let identifier = 0;
