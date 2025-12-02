import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
    selector: 'app-edit-lookup',
    imports: [FormsModule, FaIconComponent, NgSelectModule],
    templateUrl: './edit-lookup.component.html',
    styleUrl: './edit-lookup.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditLookupComponent {

  cdr = inject(ChangeDetectorRef);
  lookup = model<any>({})
  _lookup:any = {};
  accessList = input<any>({})
  close = input<any>();
  dismiss = input<any>();

  constructor() { }

  ngOnInit() {
    this._lookup = {...this.lookup()};
    if (!this._lookup.x) {
      this._lookup.x = {};
    }
  }
  
  compareByIdFn(a, b): boolean {
    return (a && a.id) === (b && b.id);
  }

  done(data) {
    this.lookup.set(data);
    this.close()?.(data);
  }

  setLocal(){
    this._lookup.x.autoResync = true;
    this._lookup.x.refCol = 'id';
    this.cdr.markForCheck();
  }

}
