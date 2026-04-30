import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
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
  lookup = input<any>({});

  // Helper arrays to clean up HTML logic
  excludedTypes = ['static', 'file', 'imagePreview', 'btn', 'dataset', 'screen', 'map'];

  getAsList = splitAsList;

  lookupSearchFn = (term: string, item: any) => {
    term = term.toLocaleLowerCase();
    return JSON.stringify(Object.values(item)).toLocaleLowerCase().includes(term);
  }

  compileTpl(a: any, b: any, keep?: any) {
    let f = "";
    try {
      f = compileTpl(a, b, this.scopeId());
    } catch (e) {
    }
    return f;
  }

  // --- NEW DRY HELPERS ---

  // Centralizes the complex binding path logic and fixes the checkboxOption bug
  getBindingKey(fil: any, field: any): string {
    const baseKey = `${fil.prefix}.${fil.code}`;
    
    if (['select', 'radio'].includes(field.type)) {
      return `${baseKey}${field.subType === 'multiple' ? '*' : ''}.code`;
    }
    if (field.type === 'checkboxOption') {
      return `${baseKey}*.code`; // Fixed typo/mismatch in original template
    }
    if (field.type === 'modelPicker') {
      return `${baseKey}.${field.bindLabel}`;
    }
    return baseKey;
  }

  // Safe Signal Writer for Radio Buttons
  updateFilter(key: string, value: any) {
    this.filtersData.update(data => {
      const newData = { ...data };
      if (value === undefined) {
        delete newData[key];
      } else {
        newData[key] = value;
      }
      return newData;
    });
  }
}