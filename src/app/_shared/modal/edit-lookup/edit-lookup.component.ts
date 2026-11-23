import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  model,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgSelectModule } from '@ng-select/ng-select';
import { LambdaService } from '../../../service/lambda.service';
import { LookupService } from '../../../run/_service/lookup.service';

interface AdditionalDataField {
  name: string;
  type: string;
  config: string;
  path: string;
}

interface LookupOption {
  id: number;
  name: string;
}

@Component({
    selector: 'app-edit-lookup',
    imports: [FormsModule, FaIconComponent, NgSelectModule],
    templateUrl: './edit-lookup.component.html',
    styleUrl: './edit-lookup.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditLookupComponent implements OnInit {

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lambdaService = inject(LambdaService);
  private readonly lookupService = inject(LookupService);

  lookup = model<any>({})
  _lookup:any = {};
  accessList = input<any>({})
  close = input<any>();
  dismiss = input<any>();
  appId = input<number>();

  readonly additionalFieldTypes = [
    'text',
    'longtext',
    'number',
    'date',
    'file',
    'options',
    'lookup',
    'multiplelookup',
  ];
  additionalDataFields: AdditionalDataField[] = [];
  additionalDataMode: 'visual' | 'code' = 'visual';
  lookupOptions: LookupOption[] = [];
  lookupOptionsError = '';
  secretList: { key: string }[] = [];
  secretListError = '';

  ngOnInit(): void {
    const lookup = this.lookup();
    this._lookup = {
      ...lookup,
      x: { ...(lookup.x ?? {}) },
    };
    this.additionalDataFields = this.parseAdditionalDataFields(this._lookup.dataFields);
    this.loadLookupOptions();
    this.loadSecretList();
  }

  loadSecretList() {
    const appId = this.appId();
    if (!appId) {
      return;
    }

    this.lambdaService.getSecretList(appId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.secretList = Array.isArray(response) ? response : [];
          this.secretListError = '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.secretList = [];
          this.secretListError = 'Unable to load saved secrets.';
          this.cdr.markForCheck();
        },
      });
  }

  done(data) {
    if (this.additionalDataMode === 'visual') {
      this.syncAdditionalDataFields();
    }
    this.lookup.set(data);
    this.close()?.(data);
  }

  setAdditionalDataMode(mode: 'visual' | 'code'): void {
    if (mode === 'visual') {
      this.additionalDataFields = this.parseAdditionalDataFields(this._lookup.dataFields);
    }
    this.additionalDataMode = mode;
  }

  addAdditionalDataField(): void {
    this.additionalDataFields = [
      ...this.additionalDataFields,
      { name: '', type: 'text', config: '', path: '' },
    ];
    this.syncAdditionalDataFields();
  }

  removeAdditionalDataField(index: number): void {
    this.additionalDataFields = this.additionalDataFields.filter((_, itemIndex) => itemIndex !== index);
    this.syncAdditionalDataFields();
  }

  additionalFieldHasConfig(type: string): boolean {
    return ['options', 'lookup', 'multiplelookup'].includes(type);
  }

  syncAdditionalDataFields(): void {
    this._lookup.dataFields = this.additionalDataFields
      .filter(field => field.name.trim())
      .map(field => {
        const type = field.type.trim() || 'text';
        const config = this.additionalFieldHasConfig(type) && field.config.trim()
          ? `:${field.config.trim()}`
          : '';
        const path = field.path.trim() ? `@${field.path.trim()}` : '';
        return `${field.name.trim()}:${type}${config}${path}`;
      })
      .join(',');
  }

  loadLookupOptions(): void {
    const appId = this.appId();
    if (!appId) {
      return;
    }

    this.lookupService.getFullLookupList({ appId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const lookups = Array.isArray(response) ? response : response?.content;
          this.lookupOptions = Array.isArray(lookups)
            ? lookups.filter(
                (lookup: LookupOption) => lookup?.id != null && `${lookup.id}` !== `${this._lookup.id}`,
              )
            : [];
          this.lookupOptionsError = '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.lookupOptions = [];
          this.lookupOptionsError = 'Unable to load lookup options.';
          this.cdr.markForCheck();
        },
      });
  }

  parseAdditionalDataFields(value: unknown): AdditionalDataField[] {
    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    return value
      .split(',')
      .filter(item => item.trim())
      .map(item => {
        const separatorIndex = item.indexOf('@');
        const schema = separatorIndex >= 0 ? item.slice(0, separatorIndex) : item;
        const path = separatorIndex >= 0 ? item.slice(separatorIndex + 1) : '';
        const [name = '', type = 'text', ...config] = schema.split(':');

        return {
          name: name.trim(),
          type: type.trim() || 'text',
          config: config.join(':').trim(),
          path: path.trim(),
        };
      });
  }

  setLocal(){
    this._lookup.x.autoResync = true;
    this._lookup.x.refCol = 'id';
    this.cdr.markForCheck();
  }

}
