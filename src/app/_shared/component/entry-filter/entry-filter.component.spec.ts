import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntryFilterComponent } from './entry-filter.component';
import { filterOperatorOptions, getFilterOperator, operatorSettingKey } from './filter-operators';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

describe('EntryFilterComponent', () => {
  let component: EntryFilterComponent;
  let fixture: ComponentFixture<EntryFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [EntryFilterComponent]
})
    .compileComponents();

    TestBed.inject(FaIconLibrary).addIcons(faTrash);
    fixture = TestBed.createComponent(EntryFilterComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('formHolder', {});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('moves a preset to the selected operator and emits the saved selection', () => {
    fixture.componentRef.setInput('presetFilters', { '$.name': 'Alice' });
    fixture.detectChanges();
    const select = document.createElement('select');
    select.add(new Option('Contains', 'contain'));
    select.value = 'contain';

    component.changeOperator({ type: 'text' }, '$.name', select);

    expect(component.presetFilters()).toEqual({
      '$.name~contain': 'Alice',
      [operatorSettingKey('$.name')]: 'contain'
    });
    component.clearPreset(component.getClearKeys({ type: 'text' }, '$.name'));
    expect(component.presetFilters()['$.name~contain']).toBeUndefined();
  });

  it('preserves both range bounds if changing to a single-value operator', () => {
    fixture.componentRef.setInput('presetFilters', { '$.age~from': 0, '$.age~to': 50 });
    fixture.detectChanges();
    const select = document.createElement('select');
    select.add(new Option('Range', 'range'));
    select.add(new Option('Equals', 'default'));
    select.value = 'default';

    component.changeOperator({ type: 'number' }, '$.age', select);

    expect(select.value).toBe('range');
    expect(component.presetFilters()).toEqual({ '$.age~from': 0, '$.age~to': 50 });
    expect(component.operatorError).toContain('Clear');
  });

  it('keeps existing numeric range defaults and does not offer misleading list operators', () => {
    expect(getFilterOperator({}, { type: 'number' }, '$.age')).toBe('range');
    expect(filterOperatorOptions({ type: 'select', subType: 'multiple' }, '$.gender*.code'))
      .toEqual([{ value: 'default', label: 'Default match' }]);
  });

  it('updates the displayed preset when an operator is selected', async () => {
    const field = { code: 'name', label: 'Name', type: 'text', subType: 'input' };
    fixture.componentRef.setInput('formHolder', {
      data: { id: 1, title: 'Form', items: { name: field }, tiers: [] }
    });
    fixture.componentRef.setInput('sectionItems', {
      data: [{ section: { id: 1, type: 'section', title: 'Details' }, items: [{ code: 'name' }] }]
    });
    fixture.componentRef.setInput('presetFilters', { '$.name': 'Alice' });
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'contain';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.presetFilters()['$.name~contain']).toBe('Alice');
    expect((fixture.nativeElement.querySelector('.input-group input[type="text"]') as HTMLInputElement).value)
      .toBe('Alice');
  });

  it('selects saved operators when the editor opens and fields load', async () => {
    const name = { code: 'name', label: 'Name', type: 'text' };
    const age = { code: 'age', label: 'Age', type: 'number' };
    fixture.componentRef.setInput('presetFilters', {
      'filterOperator.$.name': 'contain',
      '$.name~contain': 'Alice',
      'filterOperator.$.age': 'from',
      '$.age~from': 21
    });
    fixture.detectChanges();
    fixture.componentRef.setInput('formHolder', {
      data: { id: 1, title: 'Form', items: { name, age }, tiers: [] }
    });
    fixture.componentRef.setInput('sectionItems', {
      data: [{ section: { id: 1, type: 'section', title: 'Details' }, items: [{ code: 'name' }, { code: 'age' }] }]
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nameOperator: HTMLSelectElement = fixture.nativeElement.querySelector('[aria-label="Operator for Name"]');
    const ageOperator: HTMLSelectElement = fixture.nativeElement.querySelector('[aria-label="Operator for Age"]');
    expect(nameOperator.value).toBe('contain');
    expect(ageOperator.value).toBe('from');
    expect((fixture.nativeElement.querySelector('[aria-label="Preset for Name"]') as HTMLInputElement).value).toBe('Alice');
    expect((fixture.nativeElement.querySelector('[aria-label="Preset for Age"]') as HTMLInputElement).value).toBe('21');
  });

  it('keeps the previous selection when a range change would discard a preset', async () => {
    const age = { code: 'age', label: 'Age', type: 'number' };
    fixture.componentRef.setInput('formHolder', {
      data: { id: 1, title: 'Form', items: { age }, tiers: [] }
    });
    fixture.componentRef.setInput('sectionItems', {
      data: [{ section: { id: 1, type: 'section', title: 'Details' }, items: [{ code: 'age' }] }]
    });
    fixture.componentRef.setInput('presetFilters', { '$.age~from': 10, '$.age~to': 50 });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('[aria-label="Operator for Age"]');
    select.value = 'default';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(select.value).toBe('range');
    expect(component.presetFilters()).toEqual({ '$.age~from': 10, '$.age~to': 50 });
    expect(fixture.nativeElement.textContent).toContain('Clear the conflicting preset values');

    const upperBound: HTMLInputElement = fixture.nativeElement.querySelector('[aria-label="Preset to for Age"]');
    upperBound.value = '';
    upperBound.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    select.value = 'default';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(select.value).toBe('default');
    expect(component.presetFilters()['filterOperator.$.age']).toBe('default');
    expect(component.presetFilters()['$.age']).toBe(10);
  });

  it('preserves a legacy dynamic numeric preset when switching its operator', () => {
    fixture.componentRef.setInput('presetFilters', { '$.age': '{{age}}' });
    fixture.detectChanges();
    const select = document.createElement('select');
    select.add(new Option('From', 'from'));
    select.value = 'from';

    component.changeOperator({ type: 'number' }, '$.age', select);

    expect(component.presetFilters()['$.age~from']).toBe('{{age}}');
    expect(component.presetFilters()['$.age']).toBeUndefined();
  });

  it('groups the operator and preset while keeping Dynamic beside the field name', async () => {
    const gender = { code: 'gender', label: 'Gender', type: 'select' };
    const name = { code: 'name', label: 'Name', type: 'text' };
    fixture.componentRef.setInput('formHolder', {
      data: { id: 1, title: 'Form', items: { gender, name }, tiers: [] }
    });
    fixture.componentRef.setInput('sectionItems', {
      data: [{ section: { id: 1, type: 'section', title: 'Details' }, items: [{ code: 'gender' }, { code: 'name' }] }]
    });
    fixture.componentRef.setInput('presetFilters', { '$.gender.code': 'M' });
    fixture.componentRef.setInput('lookup', { gender: [{ code: 'M', name: 'Male' }] });
    fixture.nativeElement.style.width = '360px';
    fixture.detectChanges();

    const operator: HTMLSelectElement = fixture.nativeElement.querySelector('[aria-label="Operator for Gender"]');
    const preset: HTMLSelectElement = fixture.nativeElement.querySelector('[aria-label="Preset for Gender"]');
    const dynamic: HTMLInputElement = fixture.nativeElement.querySelector('#filtergenderdata-dyn');
    const field: HTMLInputElement = fixture.nativeElement.querySelector('#filtergenderdata');
    expect(operator.parentElement).toBe(preset.parentElement);
    expect(dynamic.parentElement?.parentElement).toBe(field.parentElement?.parentElement);
    expect(fixture.nativeElement.querySelector('#filternamedata-dyn')).toBeNull();
    expect(Math.abs(operator.getBoundingClientRect().top - preset.getBoundingClientRect().top)).toBeLessThan(2);
    expect(operator.parentElement!.scrollWidth).toBeLessThanOrEqual(operator.parentElement!.clientWidth);

    dynamic.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dynamicPreset: HTMLInputElement = fixture.nativeElement.querySelector('input[aria-label="Preset for Gender"]');
    expect(dynamicPreset.value).toBe('M');
    expect(dynamicPreset.parentElement).toBe(operator.parentElement);
  });
});
