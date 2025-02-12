import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { FormEditorComponent } from './form-editor.component';

describe('FormEditorComponent', () => {
  let component: FormEditorComponent;
  let fixture: ComponentFixture<FormEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [FormEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
