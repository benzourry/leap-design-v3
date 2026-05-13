import { ChangeDetectorRef, Component, computed, inject, input, OnInit } from '@angular/core';
import { EntryService } from '../../../run/_service/entry.service';
import { FieldViewComponent } from '../../../run/_component/field-view.component';
import { base, baseApi } from '../../constant.service';

@Component({
  selector: 'app-datatable',
  imports: [FieldViewComponent],
  templateUrl: './datatable.component.html',
  styleUrl: './datatable.component.scss',
})
export class DatatableComponent implements OnInit {

  form = input<any>({});

  baseApi: string = baseApi;
  base: string = base;
  scopeId = computed<string>(() => "ds_"+this.form().id);
  
  preurl: string = '';
  baseUrl: string = '';

  entryService = inject(EntryService);
  cdr = inject(ChangeDetectorRef);

  items = computed(() => {
    return Object.values(this.form().items) || [];
  });

  entryList: any[] = [];

  ngOnInit() {

    this.entryService.getListByForm(this.form().id, {}).subscribe(res => {
      this.entryList = res.content || [];

    });



    console.log('datatable', this.form);
  }

    getVal(field, entry, data) {
    var value = "";
    if (field) {
      value = data ? data[field.code] : null;
      if (field.type == 'eval' && value == null) {
        if (field.f) {
          try {
            value = this._eval(entry, data, field.f);
          } catch (e) { }
        }
      }
    }
    return value;
  }

    _eval = (data, entry, v) => this._evalRun(entry, v, false);// new Function('$_', '$', '$prev$', `return ${v}`)(entry, data, entry && entry.prev);
  
    private evalCache = new Map<string, Function>();
    _evalRun = (entry: any, f: string, bulk: boolean) => {
      if (!f) return undefined;
      
      let fn = this.evalCache.get(f);
      if (!fn) {
        // Compile ONLY once per unique script string
        fn = new Function('$_', '$', '$prev$', '$base$', '$baseUrl$', '$baseApi$', `return ${f}`);
        this.evalCache.set(f, fn);
      }
      
      // Execute at native speed
      return fn(entry, entry?.data, entry?.prev, this.base, this.baseUrl, this.baseApi);
    };
}
