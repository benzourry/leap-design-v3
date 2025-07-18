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

  editGroupData = model<any>({})
  _editGroupData:any = {};

  accessList = input<any[]>([])

  lookupList = input<any[]>([])

  close = input<any>();

  dismiss = input<any>();

  constructor() { }

  ngOnInit() {
    this._editGroupData = {...this.editGroupData()};
    if (!this._editGroupData.x) {
      this._editGroupData.x = {};
    }
  }

  done(data) {
    this.editGroupData.set(data);
    this.close()?.(data);
  }

}
