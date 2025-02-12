import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UiEditorComponent } from './ui-editor.component';

describe('UiEditorComponent', () => {
  let component: UiEditorComponent;
  let fixture: ComponentFixture<UiEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [UiEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UiEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
