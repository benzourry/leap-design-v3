import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CognaEditorComponent } from './cogna-editor.component';

describe('CognaEditorComponent', () => {
  let component: CognaEditorComponent;
  let fixture: ComponentFixture<CognaEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [CognaEditorComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CognaEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
