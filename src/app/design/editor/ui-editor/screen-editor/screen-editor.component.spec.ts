import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ScreenEditorComponent } from './screen-editor.component';

describe('ScreenEditorComponent', () => {
  let component: ScreenEditorComponent;
  let fixture: ComponentFixture<ScreenEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [ScreenEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ScreenEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
