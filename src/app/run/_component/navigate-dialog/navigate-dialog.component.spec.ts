import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavigateDialogComponent } from './navigate-dialog.component';

describe('NavigateDialogComponent', () => {
  let component: NavigateDialogComponent;
  let fixture: ComponentFixture<NavigateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [NavigateDialogComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(NavigateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
