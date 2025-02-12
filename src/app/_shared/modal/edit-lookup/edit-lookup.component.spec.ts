import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLookupComponent } from './edit-lookup.component';

describe('EditLookupComponent', () => {
  let component: EditLookupComponent;
  let fixture: ComponentFixture<EditLookupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLookupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditLookupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
