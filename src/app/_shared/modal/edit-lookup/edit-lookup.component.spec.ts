import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faInfoCircle, faKey, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

import { EditLookupComponent } from './edit-lookup.component';

describe('EditLookupComponent', () => {
  let component: EditLookupComponent;
  let fixture: ComponentFixture<EditLookupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLookupComponent]
    })
    .compileComponents();

    TestBed.inject(FaIconLibrary).addIcons(faInfoCircle, faKey, faPlus, faTrash);
    fixture = TestBed.createComponent(EditLookupComponent);
    fixture.componentRef.setInput('lookup', { x: {} });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse additional data field configuration', () => {
    expect(component.parseAdditionalDataFields(
      'gender:options:Male|Female,department:lookup:4121@/data/department/id',
    )).toEqual([
      { name: 'gender', type: 'options', config: 'Male|Female', path: '' },
      { name: 'department', type: 'lookup', config: '4121', path: '/data/department/id' },
    ]);
  });

  it('should generate the additional data syntax from editor fields', () => {
    component._lookup = {};
    component.additionalDataFields = [
      { name: 'designation', type: 'text', config: '', path: '/data/designation/name' },
      { name: 'gender', type: 'options', config: 'Male|Female', path: '' },
    ];

    component.syncAdditionalDataFields();

    expect(component._lookup.dataFields).toBe(
      'designation:text@/data/designation/name,gender:options:Male|Female',
    );
  });

  it('should preserve raw code until visual mode is selected', () => {
    component._lookup.dataFields = 'custom:unknown@/custom/path';

    component.setAdditionalDataMode('code');
    expect(component._lookup.dataFields).toBe('custom:unknown@/custom/path');

    component.setAdditionalDataMode('visual');
    expect(component.additionalDataFields).toEqual([
      { name: 'custom', type: 'unknown', config: '', path: '/custom/path' },
    ]);
  });

  it('should ignore empty fields while parsing configuration', () => {
    expect(component.parseAdditionalDataFields('name:text,,age:number,')).toEqual([
      { name: 'name', type: 'text', config: '', path: '' },
      { name: 'age', type: 'number', config: '', path: '' },
    ]);
  });

  it('should not mutate lookup options while editing', () => {
    const sourceLookup = { x: { wide: true } };
    const isolatedFixture = TestBed.createComponent(EditLookupComponent);
    isolatedFixture.componentRef.setInput('lookup', sourceLookup);
    isolatedFixture.detectChanges();

    isolatedFixture.componentInstance._lookup.x.wide = false;

    expect(sourceLookup.x.wide).toBeTrue();
  });
});
