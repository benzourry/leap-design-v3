import { KeyValuePipe } from '@angular/common';
import { Component, input, model, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
// import { LookupService } from '../../../service/lookup.service';
import { ToastService } from '../../service/toast-service';
import { LookupService } from '../../../run/_service/lookup.service';
import { NgSelectComponent } from '@ng-select/ng-select';

@Component({
    selector: 'app-edit-lookup-entry',
    imports: [FormsModule, FaIconComponent, KeyValuePipe, NgbInputDatepicker, NgSelectComponent],
    templateUrl: './edit-lookup-entry.component.html',
    styleUrl: './edit-lookup-entry.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditLookupEntryComponent {

  lookup = input<any>({});
  lookupEntry = model<any>({})
  _lookupEntry:any = {};
  close = input<any>();
  dismiss = input<any>();

  lookupEntryFields: any[];

  isNumber = (val) => typeof val === 'number';

  deleteDataRow = (obj, key) => delete obj[key];

  private lookupService = inject(LookupService)
  private toastService = inject(ToastService)
  private cdr = inject(ChangeDetectorRef);

  constructor() { }

  ngOnInit() {
    this._lookupEntry = {...this.lookupEntry()};
    if (this.lookup().dataEnabled) {
      if (!this._lookupEntry.data) {
        this._lookupEntry.data = {};
      }
      this.lookupEntryFields = this.fieldsAsList(this.lookup().dataFields);
      this.lookupEntryFieldsOrphan = this.fieldsExistOrphan(this._lookupEntry.data);
    }
  }

  lookupEntryFieldsOrphan: any;

  lookupListMap:any = {};

  fieldsAsList = (str: string) => {
    var rval = [];
    var arr = str ? str.split(',') : [];
    arr.forEach(r => {
        var h = r.split("@");
        let g = h[0].split(":");

        const type = g[1]?.trim();
        const isLookupType = ['lookup', 'multiplelookup'].includes(type);

        if (g.length > 2 && isLookupType){
          let lookupId = +g[2].trim();
          this.lookupService.getEntryList(lookupId, {size:9999}).subscribe({
            next: (res) => {            
                this.lookupListMap[lookupId] = res.content;
                this.cdr.detectChanges();
            }, error: (error) => {}
          })
        }
        
        rval.push({
            key: g[0].trim(),
            type: g.length > 1 ? type: 'text',
            opts: g.length > 2 && type == 'options' ? g[2].split('|') :
                  g.length > 2 && isLookupType ? +g[2].trim() : []
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
                    this.cdr.detectChanges();
                }, error: (error) => {}
            })
    }
  }

  compareByCodeFn = (a, b): boolean => (a && a.code) === (b && b.code);

  done(data) {
    this.lookupEntry.set(data);
    this.close()?.(data);
  }


}
