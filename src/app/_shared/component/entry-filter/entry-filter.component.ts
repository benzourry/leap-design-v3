import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { splitAsList } from '../../utils';
import { FilterPipe } from '../../pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';

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
  formHolder = input<any>();
  sectionItems = input<any>({});
  lookup = input<any>({});
  
  hasFocus: any = {};

  excludedTypes = ['static', 'file', 'imagePreview', 'btn', 'dataset', 'screen', 'map'];
  noDynamicTypes = ['text', 'textarea', 'eval', 'qr'];

  getPrefix(fm: string, section: any): string {
    const mapFm: Record<string, string> = { 'data': '$', 'prev': '$prev$', 'approval': '$$' };
    const tier = this.getTierFromSection(section?.id, this.formHolder()['data']);
    
    if (section?.type === 'approval') {
      // FIXED: Removed the rogue leading dot. Now correctly yields $$.123
      return tier ? `$$.${tier.id}` : mapFm[fm];
    } else if (section?.type === 'list') {
      return `${mapFm[fm]}.${section.code}*`;
    }
    return mapFm[fm];
  }

  clearPreset(keys: string[]) {
    this.presetFilters.update(pf => {
      const newPf = { ...pf }; 
      keys.forEach(k => delete newPf[k]);
      return newPf;
    });
  }

  getTierFromSection = (sectionId: any, form: any) => form?.tiers.find((t: any) => t.section?.id == sectionId);

  toggleItem(f: any, root: string, formId: any, type: string, prefix: string) {
    this.filters.update(filters => {
      const exists = filters.some(i => i.code === f.code && i.root === root);
      if (exists) {
        return filters.filter(i => !(i.code === f.code && i.root === root));
      } else {
        return [...filters, {
          code: f.code, label: f.label, sortOrder: filters.length,
          root: root, type: type, prefix: prefix, formId: formId
        }];
      }
    });
  }

  checkItem(f: any, root: string): boolean {
    return this.filters().some(i => f.code === i.code && i.root === root);
  }

  getBindingPath(field: any, prefixedField: string): string {
    const multi = field.subType === 'multiple' ? '*' : '';
    switch (field.type) {
      case 'select':
      case 'radio': 
        return `${prefixedField}${multi}.code`;
      case 'checkboxOption': 
        return `${prefixedField}*.code`;
      case 'modelPicker': 
        return `${prefixedField}${multi}.${field.bindLabel}`;
      default: 
        return prefixedField;
    }
  }

  getClearKeys(field: any, prefixedField: string): string[] {
    if (['scaleTo5', 'scaleTo10', 'scale', 'number', 'date'].includes(field.type)) {
      return [`${prefixedField}~from`, `${prefixedField}~to`];
    }
    return [this.getBindingPath(field, prefixedField)];
  }

  getAsList = splitAsList;
}