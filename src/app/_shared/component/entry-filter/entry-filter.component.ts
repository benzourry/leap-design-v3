import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FilterPipe } from '../../pipe/filter.pipe';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { AsListPipe } from '../../pipe/as-list.pipe';
import { filterKey, filterOperatorOptions, getFilterOperator, isRangeFilter, operatorSettingKey, FilterField } from './filter-operators';

@Component({
  selector: 'app-entry-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entry-filter.component.html',
  styleUrls: ['./entry-filter.component.scss'],
  imports: [FormsModule, NgbInputDatepicker, FaIconComponent, FilterPipe, AsListPipe]
})
export class EntryFilterComponent {

  filterField: string = "";
  presetFilters = model<any>({});
  filters = model<any[]>([]);
  formHolder = input<any>();
  sectionItems = input<any>({});
  lookup = input<any>({});
  
  excludedTypes = ['static', 'file', 'imagePreview', 'btn', 'dataset', 'screen', 'map'];
  noDynamicTypes = ['text', 'textarea', 'eval', 'qr'];
  operatorError = '';
  filterOperatorOptions = filterOperatorOptions;
  getFilterOperator = getFilterOperator;
  filterKey = filterKey;
  isRangeFilter = isRangeFilter;

  activePresetCount(): number {
    return Object.entries(this.presetFilters()).filter(([key, value]) =>
      key.startsWith('$') && value !== null && value !== undefined && value !== ''
    ).length;
  }

  changeOperator(field: FilterField, path: string, select: HTMLSelectElement): void {
    const presets = this.presetFilters();
    const oldOperator = getFilterOperator(presets, field, path);
    const nextOperator = filterOperatorOptions(field, path).find(option => option.value === select.value)?.value;
    if (!nextOperator || nextOperator === oldOperator) return;

    const oldKeys = oldOperator === 'range'
      ? [`${path}~from`, `${path}~to`, path]
      : [filterKey(path, oldOperator)];
    const newKeys = nextOperator === 'range' ? [`${path}~from`, `${path}~to`] : [filterKey(path, nextOperator)];
    const hasValue = (key: string) => presets[key] !== undefined && presets[key] !== null && presets[key] !== '';
    const populated = oldKeys.filter(hasValue);
    if ((populated.length > 1 && nextOperator !== 'range')
        || newKeys.some(key => !oldKeys.includes(key) && hasValue(key))) {
      select.value = oldOperator;
      this.operatorError = 'Clear the conflicting preset values before changing this operator.';
      return;
    }

    const updated = { ...presets };
    const value = populated.length ? presets[populated[0]] : undefined;
    oldKeys.forEach(key => delete updated[key]);
    if (value !== undefined) {
      const target = nextOperator === 'range'
        ? (oldOperator === 'to' ? newKeys[1] : newKeys[0])
        : newKeys[0];
      updated[target] = value;
    }
    updated[operatorSettingKey(path)] = nextOperator;
    this.operatorError = '';
    this.presetFilters.set(updated);
  }

  getPrefix(fm: string, section: any): string {
    const mapFm: Record<string, string> = { 'data': '$', 'prev': '$prev$', 'approval': '$$' };
    const tier = this.getTierFromSection(section?.id, this.formHolder()['data']);
    
    if (section?.type === 'approval') {
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

  hasVisibleFields(root: string, items: any[]): boolean {
    const fields = this.formHolder()[root]?.items;
    return items.some(item => fields?.[item.code] && !this.excludedTypes.includes(fields[item.code].type));
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
    const path = this.getBindingPath(field, prefixedField);
    const operator = getFilterOperator(this.presetFilters(), field, path);
    if (operator === 'range') {
      return [`${path}~from`, `${path}~to`];
    }
    return [filterKey(path, operator)];
  }

  isLegacyDynamicNumber(field: any, path: string, dynamic: boolean): boolean {
    return dynamic && field.type !== 'date' && isRangeFilter(field)
      && this.presetFilters()[operatorSettingKey(path)] === undefined
      && this.presetFilters()[path] != null;
  }

}