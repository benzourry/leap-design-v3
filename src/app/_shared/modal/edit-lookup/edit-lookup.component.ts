import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
// import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-edit-lookup',
    imports: [FormsModule, FaIconComponent, NgSelectModule],
    templateUrl: './edit-lookup.component.html',
    styleUrl: './edit-lookup.component.scss'
})
export class EditLookupComponent {

  lookup = model<any>({})

  accessList = input<any>({})

  close = input<any>();

  dismiss = input<any>();

  constructor() { }

  ngOnInit() {
    if (!this.lookup().x) {
      this.lookup.update(l=>{
        l.x = {};
        return l;
      })
    }
    // if (this.lookup.dataEnabled) {
    //   if (!this.lookupEntry.data) {
    //       this.lookupEntry.data = {}
    //   }
    //   this.lookupEntryFields = this.fieldsAsList(this.lookup.dataFields);
    //   this.lookupEntryFieldsOrphan = this.fieldsExistOrphan(this.lookupEntry.data);
    // }
    // this.editLookupEntryData = lookupEntry;
  }

  
  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

}
