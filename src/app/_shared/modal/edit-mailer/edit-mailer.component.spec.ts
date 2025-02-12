import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMailerComponent } from './edit-mailer.component';

describe('EditMailerComponent', () => {
  let component: EditMailerComponent;
  let fixture: ComponentFixture<EditMailerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMailerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditMailerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
