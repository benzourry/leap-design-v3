import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloneDashboardComponent } from './clone-dashboard.component';

describe('CloneDashboardComponent', () => {
  let component: CloneDashboardComponent;
  let fixture: ComponentFixture<CloneDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [CloneDashboardComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(CloneDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
