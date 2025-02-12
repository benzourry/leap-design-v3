import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LambdaEditorComponent } from './lambda-editor.component';

describe('LambdaEditorComponent', () => {
  let component: LambdaEditorComponent;
  let fixture: ComponentFixture<LambdaEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [LambdaEditorComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LambdaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
