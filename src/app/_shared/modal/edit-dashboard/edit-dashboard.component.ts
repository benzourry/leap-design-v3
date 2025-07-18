import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { toSnakeCase, toSpaceCase } from '../../utils';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-edit-dashboard',
    templateUrl: './edit-dashboard.component.html',
    styleUrls: ['./edit-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, FaIconComponent, NgSelectModule]
})
export class EditDashboardComponent {

  editDashboardData = model<any>({},{alias:'dashboard'});

  accessList = input<any[]>([]);

  close = input<any>();

  dismiss = input<any>();

  ngOnInit() {
    if (!this.editDashboardData().x){
      this.editDashboardData.update(dashboard=>{
        dashboard.x = {};
        return dashboard;
      });
    }
  }

  compareByIdFn = (a, b): boolean => (a && a.id) === (b && b.id);

  toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';

  toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

}

