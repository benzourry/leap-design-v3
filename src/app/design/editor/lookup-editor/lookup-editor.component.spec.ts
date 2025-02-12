import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LookupEditorComponent } from './lookup-editor.component';

describe('LookupEditorComponent', () => {
  let component: LookupEditorComponent;
  let fixture: ComponentFixture<LookupEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [LookupEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LookupEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
