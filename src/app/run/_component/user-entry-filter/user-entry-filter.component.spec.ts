import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserEntryFilterComponent } from './user-entry-filter.component';

describe('UserEntryFilterComponent', () => {
  let component: UserEntryFilterComponent;
  let fixture: ComponentFixture<UserEntryFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [UserEntryFilterComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(UserEntryFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
