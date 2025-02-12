import { Component, OnInit, input, model } from '@angular/core';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbInputDatepicker, NgbTimepicker, NgbNavOutlet, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { MailerService } from '../../../service/mailer.service';
import { ToastService } from '../../service/toast-service';
import { EditMailerComponent } from '../edit-mailer/edit-mailer.component';

@Component({
    selector: 'app-edit-form',
    templateUrl: './edit-form.component.html',
    styleUrls: ['./edit-form.component.scss'],
    imports: [FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgSelectModule,
        FaIconComponent, NgbInputDatepicker, NgbTimepicker, NgCmComponent, NgbNavOutlet,
        EditMailerComponent]
})
export class EditFormComponent implements OnInit {

  // @Input("formList")
  formList = input<any[]>([])


  // @Input("form")
  editFormData = model<any>({},{alias:'form'});

  // @Input()
  accessList = input<any[]>([]);

  // @Input()
  mailerList:any[]=[];

  // @Input()
  extraAutoCompleteJs = input<any[]>([]);

  // @Input()
  close = input<any>();

  // @Input()
  app = input<any>();

  // @Input()
  user = input<any>();

  // @Input()
  dismiss = input<any>();

  constructor(private modalService: NgbModal, private mailerService: MailerService, private toastService: ToastService) { }

  ngOnInit() {
    // this.initialAppPath = this.data.appPath;
    // this.loadPages();
    // this.loadScreen();
    if (!this.editFormData().x){
      this.editFormData.update(form=>{
        form.x = {};
        return form;
      });
    }

    this.getMailerList();
  }

  exceptCurForm = (form) => this.formList().filter(f => f.id != form.id);

  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

  
  editMailerData: any;
  editMailer=(content, mailer, obj, prop)=>{
      // console.log(mailer);
      // mailer.content = this.br2nl(mailer.content);
      if (!mailer.content) mailer.content = '';
      this.editMailerData = mailer;
      history.pushState(null, null, window.location.href);
      this.modalService.open(content, { backdrop: 'static', size: 'lg' })
          .result.then(data => {
              // data.content = this.nl2br(data.content);
              this.mailerService.save(this.user().email, this.app().id, data)
                  .subscribe(res => {
                      this.getMailerList();
                      // this.loadMailer(res.id);
                      this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
                      if (!obj[prop]){
                          obj[prop]=[];
                      }
                      obj[prop] = obj[prop].concat(res.id);
                  }, res => {
                      this.toastService.show("Template saving failed", { classname: 'bg-danger text-light' });
                  });
          }, res => { })
  }

  getMailerList() {
    let params = { appId: this.app().id, size: 9999 }
    this.mailerService.getMailerList(params)
        .subscribe(res => {
            this.mailerList = res.content;
        })
  }

  
  // editGroupData: any;
  // editGroup(content, group, obj, prop, multi) {
  //   this.editGroupData = group;
  //   history.pushState(null, null, window.location.href);
  //   this.modalService.open(content, { backdrop: 'static' })
  //     .result.then(data => {
  //       this.groupService.save(this.app.id, data)
  //         .subscribe(res => {
  //             this.getAccessList();
  //         //   this.loadGroupList(this.pageNumber);
  //         //   this.loadGroup(res.id);
  //             if (multi){
  //                 if (!obj[prop]){
  //                     obj[prop]=[];
  //                 }
  //                 obj[prop] = obj[prop].concat(res.id);
  //             }else{
  //                 obj[prop] = res.id;
  //             }
  //           this.toastService.show("Group successfully saved", { classname: 'bg-success text-light' });
  //         }, res => {
  //           this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
  //         });
  //     }, res => { })
  // }

}
