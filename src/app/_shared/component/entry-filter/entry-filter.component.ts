import { Component, input, model } from '@angular/core';
import { splitAsList } from '../../utils';
import { FilterPipe } from '../../pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
// import { JsonPipe } from '@angular/common';

@Component({
    selector: 'app-entry-filter',
    templateUrl: './entry-filter.component.html',
    styleUrls: ['./entry-filter.component.scss'],
    imports: [FormsModule, NgbInputDatepicker, FaIconComponent, FilterPipe]
})
export class EntryFilterComponent {

  filterField: string = "";

  // @Input()
  // presetFilters: any = {}
  presetFilters = model<any>({});


  // @Input()
  // filters: any = {}
  filters = model<any[]>([]);


  // @Output() filtersChange = new EventEmitter<number>();
  // filtersChange = output<number>();

  // @Input()
  // formHolder: any = {}
  formHolder = input<any>({})

  // @Input()
  // sectionItems: any = {};
  sectionItems = input<any>({});

  hasFocus: any = {};

  // @Input()
  // lookup:any = {}
  lookup = input<any>({})

  getPrefix = (fm, section) => {
    // console.log("fm,section:"+fm+","+section.id+","+section.type)
    var mapFm = { 'data': '$', 'prev': '$prev$', 'approval': '$$' };
    var tier = this.getTierFromSection(section && section.id, this.formHolder()['data']);
    if (section && section.type == 'approval') {
      if (tier) {
        return '$$.' + tier.id;
      } else {
        return mapFm[fm];
      }
    } else if (section && section.type == 'list') {
      return mapFm[fm] + '.' + section.code + '*';
    } else {
      return mapFm[fm];
    }
  }


  clearPreset(key) {
    key.forEach(k => {
      this.presetFilters.update(pf=>{
        delete pf[k];
        return pf;
      })
    })
  }

  getTierFromSection = (sectionId, form) => form && form.tiers.filter(t => t.section && t.section.id == sectionId)[0];

  toggleItem(f, root, formId, type, prefix) {
    // console.log(list, f, root, formId, type, prefix);
    let size = this.filters().filter(i => i.code == f.code && i.root == root).length;

    // let locFilter = [];
    // console.log("size:"+size);
    // console.log("root:"+ root);
    // Is currently selected
    if (size > 0) {
      // console.log(parent[list].filter(i => i.code != f.code));
      // locFilter = list.filter(i => !(i.code == f.code && i.root == root));
      this.filters.update(filters => filters.filter(i => !(i.code == f.code && i.root == root)));
    } else {
    //   locFilter = this.filters().concat([{
    //     code: f.code,
    //     label: f.label,
    //     sortOrder: list.length,
    //     root: root,
    //     type: type,
    //     prefix: prefix,
    //     formId: formId
    //   }])
    // }
    this.filters.update(filters => [...filters, {
        code: f.code,
        label: f.label,
        sortOrder: this.filters().length,
        root: root,
        type: type,
        prefix: prefix,
        formId: formId
      }])
    }
      // console.log(this.filters())
    // this.filtersChange.emit(this.filters);
  }

  checkItem(f, root) {
    return this.filters().filter(i => f.code == i.code && i.root == root).length > 0;
  }

  getFilterPath(fm, section,f){
    return this.getPrefix(fm,section)+'.'+f.code+(this.formHolder()[fm].items[f.code].subType=='multiple'?'*':'')+'.code';
  }

  getAsList = splitAsList;


}
