import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DatasetEditorComponent } from './dataset-editor.component';

describe('DatasetEditorComponent', () => {
  let component: DatasetEditorComponent;
  let fixture: ComponentFixture<DatasetEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [DatasetEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
