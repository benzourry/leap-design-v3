import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DashboardEditorComponent } from './dashboard-editor.component';

describe('DashboardEditorComponent', () => {
  let component: DashboardEditorComponent;
  let fixture: ComponentFixture<DashboardEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [DashboardEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
