import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MailerEditorComponent } from './mailer-editor.component';

describe('MailerEditorComponent', () => {
  let component: MailerEditorComponent;
  let fixture: ComponentFixture<MailerEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [MailerEditorComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MailerEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
