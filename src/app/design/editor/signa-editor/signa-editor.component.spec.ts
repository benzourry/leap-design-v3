import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SignaEditorComponent } from './signa-editor.component';

describe('SignaEditorComponent', () => {
  let component: SignaEditorComponent;
  let fixture: ComponentFixture<SignaEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [SignaEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
