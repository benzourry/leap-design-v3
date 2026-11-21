import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RunService } from '../../_service/run.service';

import { UserEntryFilterComponent } from './user-entry-filter.component';

describe('UserEntryFilterComponent', () => {
  let component: UserEntryFilterComponent;
  let fixture: ComponentFixture<UserEntryFilterComponent>;
  const app = signal<{ x?: { lang: string } }>({});

  beforeEach(async () => {
    app.set({});
    await TestBed.configureTestingModule({
    imports: [UserEntryFilterComponent],
    providers: [{ provide: RunService, useValue: { $app: app } }]
})
    .compileComponents();

    fixture = TestBed.createComponent(UserEntryFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the editor-selected operator for user filter values', () => {
    fixture.componentRef.setInput('presetFilters', { 'filterOperator.$.name': 'contain' });
    fixture.detectChanges();
    expect(component.getBindingKey({ prefix: '$', code: 'name' }, { type: 'text' }))
      .toBe('$.name~contain');
  });

  it('uses the selected lookup key and preserves legacy numeric ranges', () => {
    fixture.componentRef.setInput('presetFilters', { 'filterOperator.$.gender.code': 'not' });
    fixture.detectChanges();
    expect(component.getBindingKey({ prefix: '$', code: 'gender' }, { type: 'select' }))
      .toBe('$.gender.code~not');
    expect(component.getBindingKey({ prefix: '$prev$', code: 'age' }, { type: 'number' }))
      .toBe('$prev$.age');
    expect(component.getOperator({ prefix: '$prev$', code: 'age' }, { type: 'number' }))
      .toBe('range');
  });

  it('writes a numeric user value under the selected operator key', async () => {
    fixture.componentRef.setInput('formHolder', {
      data: { items: { age: { type: 'number' } } }
    });
    fixture.componentRef.setInput('filtersConfig', [
      { prefix: '$', code: 'age', root: 'data', label: 'Age' }
    ]);
    fixture.componentRef.setInput('presetFilters', { 'filterOperator.$.age': 'from' });
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="number"]');
    input.value = '21';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.filtersData()['$.age~from']).toBe(21);
    expect(fixture.nativeElement.textContent).toContain('Greater than or equal to');
  });

  it('displays the operator indicator in Malay and updates when the language changes', () => {
    fixture.componentRef.setInput('formHolder', {
      data: { items: { name: { type: 'text' } } }
    });
    fixture.componentRef.setInput('filtersConfig', [
      { prefix: '$', code: 'name', root: 'data', label: 'Name' }
    ]);
    fixture.componentRef.setInput('presetFilters', { 'filterOperator.$.name': 'contain' });
    app.set({ x: { lang: 'ms' } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('(Mengandungi)');
    expect(component.getBindingKey({ prefix: '$', code: 'name' }, { type: 'text' }))
      .toBe('$.name~contain');

    app.set({ x: { lang: 'en' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('(Contains)');
  });

  it('translates numeric and comma-separated operator indicators', () => {
    app.set({ x: { lang: 'ms' } });
    fixture.componentRef.setInput('presetFilters', {
      'filterOperator.$.age': 'from',
      'filterOperator.$.name': 'notin'
    });
    fixture.detectChanges();

    expect(component.getOperatorLabel({ prefix: '$', code: 'age' }, { type: 'number' }))
      .toBe('Lebih besar daripada atau sama dengan');
    expect(component.getOperatorLabel({ prefix: '$', code: 'name' }, { type: 'text' }))
      .toBe('Tiada dalam senarai (dipisahkan dengan koma)');
  });
});
