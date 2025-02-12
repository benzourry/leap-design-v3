import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLookupEntryComponent } from './edit-lookup-entry.component';

describe('EditLookupEntryComponent', () => {
  let component: EditLookupEntryComponent;
  let fixture: ComponentFixture<EditLookupEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLookupEntryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditLookupEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
