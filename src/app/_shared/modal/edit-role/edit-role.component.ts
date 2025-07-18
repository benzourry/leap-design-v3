import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-edit-role',
    imports: [FormsModule, FaIconComponent, NgSelectModule],
    templateUrl: './edit-role.component.html',
    styleUrl: './edit-role.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditRoleComponent {

  // @Input("editGroupData")
  editGroupData = model<any>({})

  accessList = input<any[]>([])

  // @Input("lookupList")
  lookupList = input<any[]>([])

  // @Input("roleEntry")
  // roleEntry:any={}
  
  // @Input()
  close = input<any>();

  // @Input()
  dismiss = input<any>();

  // roleEntryFields: any[];

  // isNumber = (val) => typeof val === 'number';

  // deleteDataRow = (obj, key) => delete obj[key];

  constructor() { }

  ngOnInit() {
    // if (!this.role.x) {
    //   this.role['x'] = {};
    // }
    // if (this.role.dataEnabled) {
    //   if (!this.roleEntry.data) {
    //       this.roleEntry.data = {}
    //   }
    //   this.roleEntryFields = this.fieldsAsList(this.role.dataFields);
    //   this.roleEntryFieldsOrphan = this.fieldsExistOrphan(this.roleEntry.data);
    // }
    // this.editRoleEntryData = roleEntry;
  }

}
