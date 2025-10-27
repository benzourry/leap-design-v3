import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { KryptaEditorComponent } from './krypta-editor.component';

describe('KryptaEditorComponent', () => {
  let component: KryptaEditorComponent;
  let fixture: ComponentFixture<KryptaEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [KryptaEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KryptaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
