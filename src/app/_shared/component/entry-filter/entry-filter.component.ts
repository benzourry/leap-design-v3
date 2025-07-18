import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { splitAsList } from '../../utils';
import { FilterPipe } from '../../pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-entry-filter',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './entry-filter.component.html',
    styleUrls: ['./entry-filter.component.scss'],
    imports: [FormsModule, NgbInputDatepicker, FaIconComponent, FilterPipe]
})
export class EntryFilterComponent {

  filterField: string = "";

  presetFilters = model<any>({});

  filters = model<any[]>([]);

  formHolder = input<any>({})

  sectionItems = input<any>({});

  hasFocus: any = {};

  lookup = input<any>({})

  getPrefix = (fm, section) => {
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
    let size = this.filters().filter(i => i.code == f.code && i.root == root).length;

    // Is currently selected
    if (size > 0) {
      this.filters.update(filters => filters.filter(i => !(i.code == f.code && i.root == root)));
    } else {
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
  }

  checkItem(f, root) {
    return this.filters().filter(i => f.code == i.code && i.root == root).length > 0;
  }

  getFilterPath(fm, section,f){
    return this.getPrefix(fm,section)+'.'+f.code+(this.formHolder()[fm].items[f.code].subType=='multiple'?'*':'')+'.code';
  }

  getAsList = splitAsList;

}
