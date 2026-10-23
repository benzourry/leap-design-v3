import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditCustomProviderComponent } from './edit-custom-provider.component';

describe('EditCustomProviderComponent', () => {
  let component: EditCustomProviderComponent;
  let fixture: ComponentFixture<EditCustomProviderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCustomProviderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCustomProviderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
