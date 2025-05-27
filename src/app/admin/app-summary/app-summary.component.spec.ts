import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSummaryComponent } from './app-summary.component';

describe('AppSummaryComponent', () => {
  let component: AppSummaryComponent;
  let fixture: ComponentFixture<AppSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
