import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloneFormComponent } from './clone-form.component';

describe('CloneFormComponent', () => {
  let component: CloneFormComponent;
  let fixture: ComponentFixture<CloneFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [CloneFormComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(CloneFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
