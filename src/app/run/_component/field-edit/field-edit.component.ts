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

import { Component, OnInit, forwardRef, ViewChild, Optional, Inject, ChangeDetectorRef, output, input, computed, AfterViewInit, effect } from '@angular/core';
import { baseApi } from '../../../_shared/constant.service';
import { NG_VALUE_ACCESSOR, NG_ASYNC_VALIDATORS, NG_VALIDATORS, NgModel, FormsModule } from '@angular/forms';
import { NgbDateAdapter, NgbTimeAdapter, NgbTooltip, NgbDatepicker, NgbInputDatepicker, NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
// import { NgbUnixTimestampAdapter } from '../../service/date-adapter';
// import { of } from 'rxjs';
// import { debounceTime, switchMap } from 'rxjs/operators';
// import { ElementBase } from './element-base';
import { ViewEncapsulation } from '@angular/core';
import { BrowserQRCodeReader } from '@zxing/browser';
// import { compileTpl, splitAsList } from '../../utils';
// import { NgbUnixTimestampTimeAdapter } from '../../service/time-adapter';
// import { LogService } from '../../service/log.service';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
// import { SecurePipe } from '../../pipe/secure.pipe';
// import { SafePipe } from '../../pipe/safe.pipe';
import { NgSelectModule } from '@ng-select/ng-select';
// import { MaskDirective } from '../../directive/mask.directive';
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
// import { ElementBase } from '../../../_shared/component/element-base';
// import { NgLeafletComponent } from '../ng-leaflet/ng-leaflet.component';
// declare const qrcode: any;
// declare const zdecoder: any;



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
    templateUrl: './field-edit.component.html',
    styleUrls: ['./field-edit.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
        { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter },
        CUSTOMINPUT_VALUE_ACCESSOR],
    encapsulation: ViewEncapsulation.None,
    imports: [FaIconComponent, NgClass, NgTemplateOutlet, FormsModule, MaskDirective, AngularEditorModule,
        NgbTooltip, NgbDatepicker, NgbInputDatepicker, NgbTimepicker, NgSelectModule, NgStyle, AsyncPipe,
        SafePipe, SecurePipe, NgLeafletComponent, SpeechToTextComponent]
})

export class FieldEditComponent extends ElementBase<any> implements OnInit, AfterViewInit {


  // @Input() field: any;
  field = input<any>();
  // @Input() user: any;
  user= input<any>();
  // @Input() data: any;
  data = input<any>();
  // @Input() loading: any;
  loading=input<boolean>();
  extractLoading=input<boolean>();
  // @Input() itemList: any;
  itemList= input<any>();
  // @Input() always: boolean = false;
  always = input<boolean>(false);
  // @Input() id: string = "";
  id = input<string>("");
  // @Input() facet: string = "";
  // facet = input<string>("");
  // @Input() fileProgress: number;
  fileProgress = input<number>();
  
  file: any = {}
  scaleTo = { scaleTo10 : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              scaleTo5 : [1, 2, 3, 4, 5]}
  // minDate = { year: 1850, month: 1, day: 1 };
  baseApi: string = baseApi;
  codeReader = new BrowserQRCodeReader();
  // qrCodeWriter = new BrowserQRCodeSvgWriter();
  // evin="";

  // @Input() lookupList: any;
  lookupList = input<any>();
  // @Input() hideAddAction: boolean;
  hideAddAction = input<boolean>();

  // @Output() valueChange = new EventEmitter();
  valueChange = output<any>();

  valueBlur = output<any>();
  // @Output() valueSearch = new EventEmitter();
  valueSearch = output<any>();
  // @Output() selectFocus = new EventEmitter();
  selectFocus = output<any>();
  // @Output() fileValueChange = new EventEmitter();
  fileValueChange = output<any>();
  // @Output() fileValueClear = new EventEmitter();
  fileValueClear = output<any>();
  // @Output() addAction = new EventEmitter();
  addAction = output<any>();

  defaultValue = input<any>();

  // txtQueryChanged: Subject<string> = new Subject<string>();
  



  @ViewChild(NgModel, { static: false }) model: NgModel;
  // model = viewChild(NgModel)

  @ViewChild('formField', { static: false }) formField;
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

  // preCompile= computed(()=>{
  //   console.log("&&&&&&&")
  //   return this.compileTpl(this.field().placeholder,this.data(),this.field().subType=='htmlSave')
  // });


  constructor(
    @Optional() @Inject(NG_VALIDATORS) validators: Array<any>,
    @Optional() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: Array<any>,
    private cdref: ChangeDetectorRef,
    private logService: LogService
  ) {
    super(validators, asyncValidators);

    // effect(()=>{
    //   if (this.field().x?.use_now && !this.value){
    //     let now = Date.now();
    //     this.value = now;
    //     this.valueChanged(now)
    //   }
    // })

    // effect(()=>{
    //   console.log("*****")
    //   this.preCompile = this.compileTpl(this.field().placeholder,this.data(),this.field().subType=='htmlSave')
    // })
    // this.txtQueryChanged
    //   .pipe(debounceTime(1000), distinctUntilChanged())
    //   .subscribe(model => {
    //       // this.value = model;
    //       this.valueChange.emit(model);
    //       // api call
    //   });

    // !!!! Why this is not used instead of ngAfterViewInit??!!! Need to monitor... 
    effect(()=>{
      if (this.field().x?.use_default && this.defaultValue()){
        this.value = this.defaultValueComputed();
        // console.log('defaultv',this.defaultValue())
        // console.log('defaultvalue',this.defaultValueComputed())
        // this.value = this.value??this.defaultValue();
        // this.value = this.checkDefValue();
        // console.log("defval",this.field().code, this.defaultValueComputed());

        // tok caused infinite run
        // this.valueChanged(this.value);   
      }
    })
  }
 
  defaultValueComputed = computed(()=>this.value??this.defaultValue())

  ngAfterViewInit(): void {
    // USING effect() above so no need to use setTimeout!!!
    if (this.field().x?.use_default){
      setTimeout(()=>{
        this.value = this.defaultValueComputed();
        // console.log("@@@@@@@@@@@ngAfterViewInit")
        this.valueChanged(this.value);
      })
    }
  }


  // generateQR = (code)=>this.qrCodeWriter.write(code, 256,256).outerHTML;


  ngOnInit(): void {
    this.list = this.getAsList(this.field().options);
    this.scales = this.createRange(this.field());
    if (this.field().x?.inlineImg){
      this.editorConfig.toolbarHiddenButtons[1].splice(this.editorConfig.toolbarHiddenButtons[1].indexOf('insertImage'),1);
    }
    
  }

  // const range = (start, stop) => Array.from({ length: stop - start + 1 }, (_, i) => start + i)

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

  // ngAfterContentChecked() {
  //   // this.cdref.detectChanges();    
  // }

  // fileClear(event){
  //   // alert('kjhjh');
  //   this.fileValueClear.emit(this.value);
  //   // alert("clear");
  // }


  // ngOnChanges(changes: SimpleChanges) {
  //   this.valueChanged(this.value);
  //   // changes.prop contains the old and the new value...
  // }

  // ngAfterViewInit(): void {
  //   // this.ngControl = this.injector.get(NgControl);

  //   // Force restart of validation
  //   if (this.input && this.input.control) {
  //     this.input.control.updateValueAndValidity({
  //       onlySelf: true
  //     });
  //   }
  // }


  // // ControlValueAccessor Interface
  // writeValue(value: any) {
  //   // if (value !== this.data) {
  //     this.data = value;
  //   // }
  // }


  // // ControlValueAccessor Interface
  // registerOnChange(fn: any) {
  //   this.onChangeCallback = fn;
  // }

  // // ControlValueAccessor Interface
  // registerOnTouched(fn: any) {
  //   // this.onTouchedCallback = fn;
  // }

  compareFn = (val1: any, val2: any) => val1 && val1.code == val2.code;

  // textValueChanged(query:string){
  //   this.txtQueryChanged.next(query);
  // }

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

    console.log(">>>>>>>>>valueChanged")

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
  // isNaN(value){
  //   return Number.isNaN(value);
  // }


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
        this.formField.control.setErrors({'maxsize':true, files:fileError.map(f=>`${f.name} (${(f.size/(1024*1024)).toFixed(2)}MB)`).join(", ")});
        this.formField.control.markAsTouched();
        this.value=null;
      }    
    }

    this.fileValueChange.emit(fileList);
  }

  // qrValueChanged(event) {
  //   const file = event.target.files[0];
  //   const reader = new FileReader();
  //   if (file){
  //   reader.readAsDataURL(file);
  //   reader.onload = (e: any) => {
  //       const data = e.target.result;
  //       qrcode.callback = (res) => {
  //         this.value = res;
  //         this.valueChanged(res)};
  //       qrcode.decode(data);
  //     };
  //   }
  // }

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

          // here canvas behavior
          /*elem.width = img.width;
          elem.height = img.height;

          ctx.drawImage(img, 0, 0);
          var imageData = ctx.getImageData(0, 0, img.width, img.height);

          var code = zdecoder.zbarProcessImageData(imageData);
          if (code.length > 0) {
            var res = code[0][2];
            this.value = res;
            this.valueChanged(res);
          }*/
        };
        img.src = data;

      };
    }
  }

  translate = (value: number): string => Number.isNaN(value) ? "" : value + "";


  // // Validator Interface
  // public validate(c: FormControl): any {
  //   // console.log(this.form.invalid);
  //   return this.form.invalid?{'error':true}:null;
  //     // return this.input && this.input.control && this.input.control.errors;
  // }

  // preCheck(f) {
  //   return !f.pre || new Function('$', 'user', 'return ' + f.pre)(this.data.content, this.user);
  // }
  // v:any;
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
