import { KeyValuePipe } from '@angular/common';
import { Component, input, model, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormService } from '../../../service/form.service';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { nl2br, br2nl } from '../../utils';

@Component({
    selector: 'app-edit-mailer',
    imports: [FormsModule, FaIconComponent, KeyValuePipe, NgCmComponent],
    templateUrl: './edit-mailer.component.html',
    styleUrl: './edit-mailer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMailerComponent {

  editMailerData = model<any>();
  _editMailerData:any = {};

  editHolderForm:any = {};

  formList = input<any>({})

  selectedForm = input<any>(null);
  selectedFormHint:any = null;

  lookupList = input<any>({});

  close = input<any>();

  dismiss = input<any>();

  cdr = inject(ChangeDetectorRef);
  private formService = inject(FormService);

  constructor() { }

  ngOnInit() {
    this._editMailerData = {...this.editMailerData()};
    if (this.selectedForm()){
        this.selectedFormHint = this.selectedForm();
        this.loadForm(this.selectedForm().id);
    }

    if(this._editMailerData){
        this._editMailerData.content = this.br2nl(this._editMailerData.content);
    }


  }

  loadForm(id) {
      this.formService.getForm(id)
          .subscribe(res => {

              this.editHolderForm['data'] = res;
              this.editHolderForm['prev'] = res.prev;

              this.populateAutoComplete();
              this.cdr.detectChanges();

          });
  }
  
  insertTextAtCursor(text, cm) {
    cm.insertText("{{" + text + "}}");
}


getItemText(pre,item){
    var type = item.type;
    var bindLabel = item.bindLabel;
    var pipe = ''
    if (type == 'date') {
      pipe = ';format="date:dd/MM/yyyy HH:mm"';
    } else if (['select', 'radio'].indexOf(type) > -1) {
      pipe = '.name';
    } else if (type == 'modelPicker') {
      pipe = '.'+bindLabel;
    } else if (type == 'qr') {
      pipe = ';format="qr"';
    } else if (type == 'file') {
      pipe = ';format="src"';
    }
    return pre +'.'+ item.code + pipe;
  }

  
  extraAutoCompleteHtml: any[] = [];
  populateAutoComplete() {

      this.extraAutoCompleteHtml = [];
      if (this.editHolderForm.data?.items) {
          Object.keys(this.editHolderForm.data?.items).forEach(key => {
              var value = this.editHolderForm.data?.items[key];
              if (value.type != 'static') {
                  if (['select', 'radio'].indexOf(value?.type) > -1){
                      this.extraAutoCompleteHtml.push({ detail: `{{$.${key}.name}}`, type: "text", apply: `{{$.${key}.name}}`, label: value.label })
                  }else if (['modelPicker'].indexOf(value?.type) > -1){
                      this.extraAutoCompleteHtml.push({ detail: `{{$.${key}.${value?.bindLabel}}}`, type: "text", apply: `{{$.${key}.${value?.bindLabel}}}`, label: value.label })
                  }else if (['date'].indexOf(value?.type) > -1){
                      this.extraAutoCompleteHtml.push({ detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key};format="date:dd/MM/yyyy HH:mm"}}`, label: value.label })
                  }else if (['file'].indexOf(value?.type) > -1){
                      this.extraAutoCompleteHtml.push({ detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key};format="src"}}`, label: value.label })
                  }else{
                      this.extraAutoCompleteHtml.push({ detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}}}`, label: value.label })
                  }
              }
          });
          if (this.editHolderForm.prev) {
              Object.keys(this.editHolderForm.prev?.items).forEach(key => {
                  var value = this.editHolderForm.prev?.items[key];
                  if (this.editHolderForm.prev?.items[key].type != 'static') {
                      if (['select', 'radio'].indexOf(value?.type) > -1){
                          this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, type: "text", apply: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, label: value.label })
                      }else if (['modelPicker'].indexOf(value?.type) > -1){
                          this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}.${value?.bindLabel}}}`, type: "text", apply: `{{$prev$.${key}.${value?.bindLabel}}}`, label: value.label })
                      }else if (['date'].indexOf(value?.type) > -1){
                          this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}}}`, type: "text", apply: `{{$prev$.${key};format="date:dd/MM/yyyy HH:mm"}}`, label: value.label })
                      }else if (['file'].indexOf(value?.type) > -1){
                          this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}}}`, type: "text", apply: `{{$prev$.${key};format="src"}}`, label: value.label })
                      }else{
                          this.extraAutoCompleteHtml.push({ detail: `{{$prev$.${key}}}`, type: "text", apply: `{{$prev$.${key}}}`, label: value.label })
                      }                    }
              });
          }

          if (this.editHolderForm.data) {
              this.editHolderForm.data?.sections?.forEach(section => {
                  // console.log(section)
                  if (section.type == 'list') {
                      this.extraAutoCompleteHtml.push({ label: '(child) $.' + section.code, type: "text", apply: this.getLoopCode(section), detail: '' + section.title })
                  }
              })
          }
      }

      this.extraAutoCompleteHtml.push({ label: 'If-condition', type: "text", apply: "{{if ($.#{condition})}}\n\t<!--show if true-->\n{{else}}\n\t<!--show if false-->\n{{endif}}", detail: 'Conditional text' })
      this.extraAutoCompleteHtml.push({ label: '$$_.status', type: "text", apply: "$$_.status", detail: 'Approval status' });
      this.extraAutoCompleteHtml.push({ label: '$$_.remark', type: "text", apply: "$$_.remark", detail: 'Approval remark' });
      this.extraAutoCompleteHtml.push({ label: '$viewUri$', type: "text", apply: "{{$viewUri$}}", detail: 'URL to view entry' });
      this.extraAutoCompleteHtml.push({ label: '$editUri$', type: "text", apply: "{{$editUri$}}", detail: 'URL to edit entry' });
      this.extraAutoCompleteHtml.push({ label: '$uiUri$', type: "text", apply: "{{$uiUri$}}", detail: 'Base URL for UI/frontend up to .../#' });

      this.cdr.detectChanges();
  }

  getLoopCode = (section) => "{{$." + section.code + ":{i|" + "\n\t" + this.getItems(section) + "\n}}}"
  getItems(section) {
      return section.items
          .filter(i => this.editHolderForm.data?.items[i.code].type != 'static')
          .map(i => {
              var type = this.editHolderForm.data?.items[i.code].type;
              var bindLabel = this.editHolderForm.data?.items[i.code].bindLabel;
              var pipe = ''
              if (type == 'date') {
                  pipe = ';format="date:dd/MM/yyyy HH:mm"';
              } else if (['select', 'radio'].indexOf(type) > -1) {
                  pipe = '.name';
              } else if (type == 'modelPicker') {
                  pipe = '.'+bindLabel;
              } else if (type == 'qr') {
                  pipe = ';format="qr"';
              } else if (type == 'file') {
                  pipe = ';format="src"';
              }
              return '\t{{i.' + i.code + pipe + '}}';
          })
          .join("<br/>\n");
  }

  onDismiss(){
    this._editMailerData.content = this.nl2br(this._editMailerData.content);
    this.editMailerData.set(this._editMailerData);
    this.dismiss()();
  }

  onClose(){
    this._editMailerData.content = this.nl2br(this._editMailerData.content);
    this.editMailerData.set(this._editMailerData);
    this.close()?.(this._editMailerData);
  }

  nl2br = nl2br; // (text) => text ? text.replace(/\n/g, "<br/>") : text;
  br2nl = br2nl; // (text) => text ? text.replace(/<br\s*[\/]?>/gi, "\n") : text;


}
