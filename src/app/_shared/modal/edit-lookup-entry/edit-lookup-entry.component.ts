import { KeyValuePipe } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
// import { LookupService } from '../../../service/lookup.service';
import { ToastService } from '../../service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';

@Component({
    selector: 'app-edit-lookup-entry',
    imports: [FormsModule, FaIconComponent, KeyValuePipe, NgbInputDatepicker],
    templateUrl: './edit-lookup-entry.component.html',
    styleUrl: './edit-lookup-entry.component.scss'
})
export class EditLookupEntryComponent {

  
  // @Input("lookup")
  lookup = input<any>({});

  // @Input("lookupEntry")
  lookupEntry = model<any>({})
  
  // @Input()
  close = input<any>();

  // @Input()
  dismiss = input<any>();

  lookupEntryFields: any[];

  isNumber = (val) => typeof val === 'number';

  deleteDataRow = (obj, key) => delete obj[key];

  constructor(private lookupService: LookupService, private toastService: ToastService) { }

  ngOnInit() {
    if (this.lookup().dataEnabled) {
      if (!this.lookupEntry().data) {
        this.lookupEntry.update(le=>{
          le.data = {};
          return le;
        })
          // this.lookupEntry().data = {}
      }
      this.lookupEntryFields = this.fieldsAsList(this.lookup().dataFields);
      this.lookupEntryFieldsOrphan = this.fieldsExistOrphan(this.lookupEntry().data);
    }
    // this.editLookupEntryData = lookupEntry;
  }



  // editLookupEntryData: any;
  // editLookupEntryDataFields: any[];
  lookupEntryFieldsOrphan: any;

  fieldsAsList = (str: string) => {
    var rval = [];
    var arr = str ? str.split(',') : [];
    arr.forEach(r => {
        var h = r.split("@");
        let g = h[0].split(":");
        rval.push({
            key: g[0].trim(),
            type: g.length > 1 ? g[1].trim() : 'text',
            opts: g.length > 2 && g[1].trim() == 'options' ? g[2].split('|') : []
        });
    })
    return rval;
  }

  fieldsExistOrphan = (data) => {
    var hhh = Object.assign({}, data);
    this.lookupEntryFields.forEach(el => {
        delete hhh[el.key];
    });
    return hhh;
  }

  uploadFile($event, data, key) {
    if ($event.target.files && $event.target.files.length) {
        this.lookupService.uploadFile(this.lookup().id, $event.target.files[0])
            .subscribe({
                next: (res) => {
                    data[key]= res.fileUrl;
                    this.toastService.show("File uploaded", { classname: 'bg-success text-light' });
                }, error: (error) => {}
            })
    }
  }


}
