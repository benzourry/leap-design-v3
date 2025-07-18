import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
// import { compileTpl, splitAsList } from '../../utils';
// import { SafePipe } from '../../pipe/safe.pipe';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbInputDatepicker, NgbTimepicker } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { SafePipe } from '../../../_shared/pipe/safe.pipe';
import { splitAsList, compileTpl } from '../../../_shared/utils';

@Component({
    selector: 'app-user-entry-filter',
    templateUrl: './user-entry-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./user-entry-filter.component.scss'],
    imports: [FormsModule, NgbInputDatepicker, NgbTimepicker, NgSelectModule, SafePipe]
})
export class UserEntryFilterComponent {


  filtersConfig = input<any[]>([]);

  presetFilters = model<any>({});

  formHolder = input<any>({});

  filtersData = model<any>({});

  scopeId = input<string>();

  lookup = input<any>({})

  getAsList = splitAsList;

  lookupSearchFn=(term: string, item: any)=>{
    term = term.toLocaleLowerCase();
    return JSON.stringify(Object.values(item)).toLocaleLowerCase().includes(term);
  }

  compileTpl(a, b, keep?) {
    var f = "";
    try {
      f = compileTpl(a, b, this.scopeId());
    } catch (e) {
    }
    return f;
  }
}
