import { Component, input, model } from '@angular/core';
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
    styleUrls: ['./user-entry-filter.component.scss'],
    imports: [FormsModule, NgbInputDatepicker, NgbTimepicker, NgSelectModule, SafePipe]
})
export class UserEntryFilterComponent {

  // @Input()
  // filtersConfig:any=[];
  filtersConfig = input<any[]>([]);


  // @Input()
  // presetFilters:any={};
  presetFilters = model<any>({});

  // @Input()
  // formHolder:any={};
  formHolder = input<any>({});

  // @Input()
  // filtersData:any={};
  filtersData = model<any>({});

  // @Output()
  // filtersDataChange = new EventEmitter<string>();

  // @Output()
  // mockDataChange = new EventEmitter<any>();
  
  // @Input()
  // lookup:any = {}
  lookup = input<any>({})

  getAsList = splitAsList;


  // public change(model){
  //   // this.filtersDataChange.emit(model);
  //   this.filtersData.set(model)


  //   // this.mockDataChange.emit(altObj);
  // }

  lookupSearchFn=(term: string, item: any)=>{
    term = term.toLocaleLowerCase();
    return JSON.stringify(Object.values(item)).toLocaleLowerCase().includes(term);
  }

  compileTpl(a, b, keep?) {
    var f = "";
    // console.log(a);
    try {
      f = compileTpl(a, b);
    } catch (e) {
    }
    // this.valueChange.emit(f);
    // if (keep) {
    //   // TO-DO!!! tok nyuruh form jd dirty jak2
    //   this.value = f;
    //   // this.formField?.control?.markAsPristine();
    // }
    // console.log(f);
    return f;
  }
}
