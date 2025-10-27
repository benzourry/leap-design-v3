import { Component, OnInit, computed, input, model, ChangeDetectorRef, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbInputDatepicker, NgbTimepicker, NgbNavOutlet, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { MailerService } from '../../../service/mailer.service';
import { ToastService } from '../../service/toast-service';
import { EditMailerComponent } from '../edit-mailer/edit-mailer.component';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-edit-form',
  templateUrl: './edit-form.component.html',
  styleUrls: ['./edit-form.component.scss'],
  imports: [FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgSelectModule,
    FaIconComponent, NgbInputDatepicker, NgbTimepicker, NgCmComponent, NgbNavOutlet,
    EditMailerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFormComponent implements OnInit {

  private modalService = inject(NgbModal);
  private mailerService = inject(MailerService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  formList = input<any[]>([])
  formListRoot = computed(() => this.formList().filter(f => !f.x?.extended));
  editFormData = model<any>({}, { alias: 'form' });
  _editFormData: any = {};
  accessList = input<any[]>([]);
  mailerList = signal<any[]>([]);
  walletList = input<any[]>([]);
  extraAutoCompleteJs = input<any[]>([]);
  extraAutoCompleteHtml = input<any[]>([]);
  close = input<any>();
  app = input<any>();
  user = input<any>();
  dismiss = input<any>();

  walletMap = computed(() => {
    let map = {};
    (this.walletList() || []).forEach(w => {
      map[w.id] = w;
    });
    return map;
  });

  // fnObj:any={}


  constructor() { }

  ngOnInit() {

    this._editFormData = { ...this.editFormData() };

    if (!this._editFormData.x) {
      this._editFormData.x = {};
    }

    
    // const fnList = this.walletMap()[this._editFormData.x.walletId]?.contract?.abiSummary?.functions || [];
    // // const selected = fnList.find(f => f.name === fnName);

    // ['Init','Save','Submit'].forEach(fn=>{ 
    //   this.fnObj['on'+fn]=fnList.find(f => f.name === this._editFormData.x['walletFnOn'+fn]) ;
    // });



    this.getMailerList();
  }

  exceptCurForm = (form) => this.formList().filter(f => f.id != form.id);

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }


  editMailerData: any;
  editMailer = (content, mailer, obj, prop) => {
    if (!mailer.content) mailer.content = '';
    this.editMailerData = mailer;
    history.pushState(null, null, window.location.href);
    this.modalService.open(content, { backdrop: 'static', size: 'lg' })
      .result.then(data => {
        this.mailerService.save(this.user().email, this.app().id, data)
          .subscribe(res => {
            this.getMailerList();
            this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
            if (!obj[prop]) {
              obj[prop] = [];
            }
            obj[prop] = obj[prop].concat(res.id);
            this.cdr.detectChanges();
          }, res => {
            this.toastService.show("Template saving failed", { classname: 'bg-danger text-light' });
            this.cdr.detectChanges();
          });
      }, res => { })
  }

  getMailerList() {
    let params = { appId: this.app().id, size: 9999 }
    this.mailerService.getMailerList(params)
      .subscribe(res => {
        this.mailerList.set(res.content);
      })
  }

  done(data) {
    this.editFormData.set(data);
    this.close()?.(data);
  }


  // walletFnOnInit:any;

  // setKryptaInput(hook,fn){
  //   this.fnObj[hook]=fn;
  //   this._editFormData.x.walletFnOnInit=fn.name;
  //   this.cdr.detectChanges();
  // }

  // onWalletFunctionSelect(event, fnName: string) {
  //   const fnList = this.walletMap()[this._editFormData.x.walletId]?.contract?.abiSummary?.functions || [];
  //   const selected = fnList.find(f => f.name === fnName);

  //   // if (selected) {
  //         this.fnObj[event]=selected;
  //   // } else {
  //   //   this._editFormData.x.fnInputs = [];
  //   //   this._editFormData.x.fnOutputs = [];
  //   //   this._editFormData.x.fnType = null;
  //   // }
  // }

}
