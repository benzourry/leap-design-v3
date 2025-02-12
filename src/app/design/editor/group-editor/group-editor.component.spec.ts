import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GroupEditorComponent } from './group-editor.component';

describe('GroupEditorComponent', () => {
  let component: GroupEditorComponent;
  let fixture: ComponentFixture<GroupEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [GroupEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
