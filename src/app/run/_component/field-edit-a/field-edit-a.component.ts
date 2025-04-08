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

import { Component, OnInit, forwardRef, ViewChild, Optional, Inject, ChangeDetectorRef, output, input, computed, AfterViewInit, effect, viewChild } from '@angular/core';
import { baseApi } from '../../../_shared/constant.service';
import { NG_VALUE_ACCESSOR, NG_ASYNC_VALIDATORS, NG_VALIDATORS, NgModel, FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbTimeAdapter, NgbTooltip, NgbDatepicker, NgbInputDatepicker, NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
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
import { compileTpl, splitAsList } from '../../../_shared/utils';
import { NgLeafletComponent } from '../ng-leaflet/ng-leaflet.component';
import { ElementBase } from '../element-base';
import { SpeechToTextComponent } from '../speech-to-text/speech-to-text.component';


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
    templateUrl: './field-edit-a.component.html',
    styleUrls: ['./field-edit-a.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter },
        CUSTOMINPUT_VALUE_ACCESSOR],
    encapsulation: ViewEncapsulation.None,
    imports: [FaIconComponent, NgClass, NgTemplateOutlet, FormsModule, MaskDirective, AngularEditorModule,
        NgbTooltip, NgbDatepicker, NgbInputDatepicker, NgbTimepicker, NgSelectModule, NgStyle, AsyncPipe,
        SafePipe, SecurePipe, NgLeafletComponent, SpeechToTextComponent]
})

export class FieldEditComponent extends ElementBase<any> implements OnInit, AfterViewInit {


  field = input<any>();
  user= input<any>();
  data = input<any>();
  loading=input<boolean>();
  extractLoading=input<boolean>();
  itemList= input<any>();
  always = input<boolean>(false);
  id = input<string>("");
  fileProgress = input<number>();
  
  file: any = {}
  scaleTo = { scaleTo10 : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              scaleTo5 : [1, 2, 3, 4, 5]}
  // minDate = { year: 1850, month: 1, day: 1 };
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


  // @ViewChild(NgModel, { static: false }) model: NgModel;
  // model = viewChild(NgModel)

  // @ViewChild('formField', { static: false }) formField: NgModel;
  readonly model = viewChild<NgModel>('formField');

  // formField = viewChild('formField') ;


  public identifier = `form-text-${identifier++}`;
  hasFocus:boolean=false;

  scales:number[]=[1, 2, 3, 4, 5];

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
      [
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
      ],
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

    // !!!! Why this is not used instead of ngAfterViewInit??!!! Need to monitor... 
    effect(()=>{
      if (this.field().x?.use_default && this.defaultValue()){
        this.value = this.defaultValueComputed();
      }
    })
  }
 
  defaultValueComputed = computed(()=>this.value??this.defaultValue())

  ngAfterViewInit(): void {
    // USING effect() above so no need to use setTimeout!!!
    if (this.field().x?.use_default){
      setTimeout(()=>{
        this.value = this.defaultValueComputed();
        this.valueChanged(this.value);
      })
    }
  }

  ngOnInit(): void {
    this.list = this.getAsList(this.field().options);
    this.scales = this.createRange(this.field());
    if (this.field().x?.inlineImg){
      this.editorConfig.toolbarHiddenButtons[1].splice(this.editorConfig.toolbarHiddenButtons[1].indexOf('insertImage'),1);
    }
    
  }

  selectGroupBy = (item) => this.field()?this.compileTpl(this.field()?.x?.groupBy,{'$':item}):undefined;

  createRange = (f:any) => {
    if (f.type=='scaleTo5'){
      return [1, 2, 3, 4, 5];
    }else if (f.type=='scaleTo10'){
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }else{
      return Array.from({ length: f.v?.max - f.v?.min + 1 }, (_, i) => f.v?.min + i)
    }
  }

  toNgbDateStruct = (timestamp) => {
    var date = new Date(timestamp);
    return timestamp?{ day: date.getUTCDate(), month: date.getUTCMonth() + 1, year: date.getUTCFullYear()}:null;
  }

  fileclick(input) {
    input.value = null;
  }

  clear(native?) {
    this.fileValueClear.emit(this.value);
    this.value = undefined;
    if (native){
      native.value=null;
    }
    
    //delete this.file[this.field.code];
    return false;
  }


  compareFn = (val1: any, val2: any) => val1 && val1.code == val2.code;


  valueBlured(event){
    this.valueBlur.emit(event);
  }

  valueChanged(event) {
    // console.log(event)
    // console.log("event",event);
    // perlu x tok???
    if (this.field()?.subType=='time'){
      let d = new Date(this.value);
      let h = new Date(800000000000);
      d.setDate(h.getDate());
      d.setMonth(h.getMonth());
      d.setFullYear(h.getFullYear());
      // console.log("since mid",d.getTime());
      this.value = d.getTime();
      // console.log(d);
    }


    this.valueChange.emit(event);
    // console.log("...")
    // console.log(this.formField.control.errors);
    //   this.onChangeCallback(event);
  }

  checkValueChanged(event) {
    this.value = event?true:undefined;
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
    if (this.field() && this.field().type=='simpleOption'){
      this.list = this.getAsList(this.field().options);
    }
  }

  list = []

  fileValueChanged($event) {
    var fileList = [];
    var fileError = [];
    if (this.value && $event.target.files.length!=0){ 
      this.fileValueClear.emit(this.value);
    }

    if ($event.target.files.length>0){      
      var i = 0;
      [...$event.target.files].forEach(f=>{
        if (this.field().v?.max && f.size>this.field().v?.max*1024*1024){
          fileError.push(f);
          i++; // if size nok ok, then increment
        }else{
          fileList.push(f); // if size ok, masok list
        }
      });

      if (i>0){
        this.model().control.setErrors({'maxsize':true, files:fileError.map(f=>`${f.name} (${(f.size/(1024*1024)).toFixed(2)}MB)`).join(", ")});
        this.model().control.markAsTouched();
        this.value=null;
      }    
    }

    this.fileValueChange.emit(fileList);
  }

  isArray = (value) => Array.isArray(value)

  checkValue(c) {
    if (!this.value){ // if value is null, directly return false
      return false;
    }

    if (!this.isArray(this.value)){ // if not array, convert to array
      this.value = [this.value];
    }

    return this.value ? this.value?.filter(v => v.code == c.code).length > 0 : false;
    // return this.value?this.value.indexOf(code+",")>-1:false;
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

        // var elem = document.createElement('canvas');
        // var ctx = elem.getContext('2d');
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
    // console.log(a);
    try {
      f = compileTpl(a, b);
    } catch (e) {
      this.logService.log(`{field-${this.field().code}-compiletpl}-${e}`)
    }
    // this.valueChange.emit(f);
    if (keep) {
      // TO-DO!!! tok nyuruh form jd dirty jak2
      this.value = f;
      // this.formField?.control?.markAsPristine();
    }
    // console.log(f);
    return f;
  }

  getAsList = splitAsList;


  triggerAddAction=(addValue)=>{ // using lambda supaya this <- refer to class
    // console.log("dlm trigger Add Action")
    this.addAction.emit(addValue);
  }

  lookupSearchFn=(term: string, item: any)=>{
    term = term.toLocaleLowerCase();
    return JSON.stringify(Object.values(item)).toLocaleLowerCase().includes(term);
  }

  encodeURIComponent = encodeURIComponent;

}

let identifier = 0;
