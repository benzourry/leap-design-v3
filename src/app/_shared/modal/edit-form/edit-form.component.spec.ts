import { provideHttpClient } from '@angular/common/http';
import { Component, forwardRef, getDebugNode, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbNavConfig } from '@ng-bootstrap/ng-bootstrap';
import { of, throwError } from 'rxjs';
import { MailerService } from '../../../service/mailer.service';
import { FormService } from '../../../service/form.service';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { QueryBuilderComponent } from '../../component/query-builder/query-builder.component';
import { SharedModule } from '../../shared.module';
import { EditFormComponent } from './edit-form.component';

@Component({
  selector: 'app-cm',
  template: '',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => EditorStubComponent), multi: true }]
})
class EditorStubComponent implements ControlValueAccessor {
  extraAutoComplete = input<unknown>();
  linenumber = input<unknown>();
  skipCheck = input<unknown>();
  hideControl = input<unknown>();

  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

describe('EditFormComponent options', () => {
  let fixture: ComponentFixture<EditFormComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditFormComponent],
      providers: [
        provideHttpClient(),
        { provide: MailerService, useValue: { getMailerList: () => of({ content: [] }) } },
        { provide: FormService, useValue: { getForm: () => of({
          id: 42, items: { name: { code: 'name', label: 'Name', type: 'text' } },
          sections: [{ type: 'section', title: 'Details', items: [{ code: 'name' }] }]
        }) } }
      ]
    })
      .overrideComponent(EditFormComponent, {
        remove: { imports: [NgCmComponent] },
        add: { imports: [EditorStubComponent] }
      })
      .compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    TestBed.inject(NgbNavConfig).animation = false;
    fixture = TestBed.createComponent(EditFormComponent);
    fixture.componentRef.setInput('app', { id: 1 });
    fixture.componentRef.setInput('form', { nav: 'tabs', tiers: [{}], x: {} });
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    host.style.display = 'block';
    document.body.appendChild(host);
    Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.trim() === 'Options')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    host.remove();
  });

  it('uses the modal background for main and nested tab content', async () => {
    host.style.setProperty('--bs-modal-bg', 'rgb(23, 45, 67)');
    host.querySelector<HTMLInputElement>('#wallet')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const outlets = host.querySelectorAll<HTMLElement>('.tab-content');
    expect(outlets.length).toBe(2);
    for (const outlet of outlets) {
      expect(getComputedStyle(outlet).backgroundColor).toBe('rgb(23, 45, 67)');
    }
  });

  it('loads form fields and stores visual and JSON query edits', async () => {
    fixture.componentInstance._editFormData.id = 42;
    host.querySelector<HTMLInputElement>('#single')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    host.querySelector<HTMLInputElement>('#enableQFilter')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const builderElement = host.querySelector('app-query-builder')!;
    const builder = getDebugNode(builderElement)!.injector.get(QueryBuilderComponent);
    expect(builder.isKnownField('$.name')).toBeTrue();
    builder.addCriterion(builder.root());
    fixture.detectChanges();
    expect(JSON.parse(fixture.componentInstance._editFormData.x.qFilter).length).toBe(1);
    builder.toggleAdvanced();
    fixture.detectChanges();
    builder.updateAdvanced('[{"$.name":"Alice"}]');
    fixture.detectChanges();
    builder.toggleAdvanced();
    fixture.detectChanges();
    expect(fixture.componentInstance._editFormData.x.qFilter).toBe('[{"$.name":"Alice"}]');
    expect(builder.root().children.length).toBe(1);
  });

  it('reports a field-loading failure without discarding the saved query', async () => {
    spyOn(TestBed.inject(FormService), 'getForm').and.returnValue(throwError(() => new Error('offline')));
    fixture.componentInstance._editFormData.id = 42;
    fixture.componentInstance._editFormData.x.qFilter = '[{"$.name":"Alice"}]';
    host.querySelector<HTMLInputElement>('#single')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    host.querySelector<HTMLInputElement>('#enableQFilter')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Unable to load form fields');
    expect(fixture.componentInstance._editFormData.x.qFilter).toBe('[{"$.name":"Alice"}]');
    expect(host.querySelector('app-query-builder')).not.toBeNull();
  });

  it('keeps dependent settings inside their toggle rows with consistent spacing', async () => {
    for (const id of ['single', 'progression', 'canSave', 'canSubmit', 'wallet']) {
      host.querySelector<HTMLInputElement>(`#${id}`)!.click();
      fixture.detectChanges();
    }
    await fixture.whenStable();
    fixture.detectChanges();

    const referencePanel = host.querySelector<HTMLElement>('#single')!
      .closest<HTMLElement>('.switch-row')!.querySelector<HTMLElement>('.nested-panel')!;
    const referenceStyle = getComputedStyle(referencePanel);
    for (const [toggleId, childSelector] of [
      ['single', '#enableQFilter'],
      ['progression', '#validateProgress'],
      ['canSave', '#saveAndStay'],
      ['canSubmit', '#submitAndStay'],
      ['wallet', '.card']
    ]) {
      const row = host.querySelector<HTMLInputElement>(`#${toggleId}`)!.closest<HTMLElement>('.switch-row')!;
      const panel = row.querySelector<HTMLElement>('.nested-panel')!;
      expect(panel.querySelector(childSelector)).withContext(toggleId).not.toBeNull();
      const style = getComputedStyle(panel);
      expect(style.paddingLeft).withContext(toggleId).toBe(referenceStyle.paddingLeft);
      expect(style.marginLeft).withContext(toggleId).toBe(referenceStyle.marginLeft);
      expect(style.marginTop).withContext(toggleId).toBe(referenceStyle.marginTop);
      expect(panel.getBoundingClientRect().left).withContext(toggleId)
        .toBeGreaterThanOrEqual(row.getBoundingClientRect().left);
    }

    host.querySelector<HTMLInputElement>('#saveAndStay')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance._editFormData.x.saveAndStay).toBeTrue();
    host.querySelector<HTMLInputElement>('#canSave')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#saveAndStay')).toBeNull();
  });

  it('separates the date controls from the following fields and clears each date independently', () => {
    const component = fixture.componentInstance;
    component._editFormData.startDate = { year: 2026, month: 1, day: 2 };
    component._editFormData.endDate = { year: 2026, month: 2, day: 3 };
    fixture.detectChanges();

    const start = host.querySelector<HTMLInputElement>('#startDate')!;
    const end = host.querySelector<HTMLInputElement>('#endDate')!;
    const dateBottom = Math.max(
      start.closest<HTMLElement>('.date-time-row')!.getBoundingClientRect().bottom,
      end.closest<HTMLElement>('.date-time-row')!.getBoundingClientRect().bottom
    );
    const nextRow = host.querySelector<HTMLInputElement>('[name="codeFormat"]')!
      .closest<HTMLElement>('.row')!;
    expect(nextRow.getBoundingClientRect().top - dateBottom).toBeGreaterThanOrEqual(12);

    start.closest<HTMLElement>('.form-group')!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(component._editFormData.startDate).toBeUndefined();
    expect(component._editFormData.endDate).toBeDefined();
    end.closest<HTMLElement>('.form-group')!.querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(component._editFormData.endDate).toBeUndefined();
  });
});

describe('EditFormComponent qualifier editor', () => {
    it('keeps line numbers visible inside the qualifier at mobile and modal widths', async () => {
      await TestBed.configureTestingModule({
        imports: [EditFormComponent],
        providers: [
          provideHttpClient(),
          { provide: MailerService, useValue: { getMailerList: () => of({ content: [] }) } }
        ]
      }).compileComponents();
      new SharedModule(TestBed.inject(FaIconLibrary));
      TestBed.inject(NgbNavConfig).animation = false;
      const fixture = TestBed.createComponent(EditFormComponent);
      fixture.componentRef.setInput('app', { id: 1 });
      fixture.componentRef.setInput('form', { nav: 'tabs', tiers: [], single: true, x: {} });
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      document.body.appendChild(host);
      Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
        .find(link => link.textContent?.trim() === 'Options')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const editor = host.querySelector<HTMLElement>('app-cm[name="singleQ"]')!;
      const gutter = Array.from(editor.querySelectorAll<HTMLElement>('.cm-lineNumbers .cm-gutterElement'))
        .find(element => element.textContent?.trim() === '1')!;
      for (const width of [300, 460]) {
        host.style.width = `${width}px`;
        expect(gutter.textContent?.trim()).toBe('1');
        expect(gutter.getBoundingClientRect().left).toBeGreaterThanOrEqual(
          editor.parentElement!.getBoundingClientRect().left
        );
      }
      host.querySelector<HTMLInputElement>('#enableQFilter')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      host.querySelector<HTMLButtonElement>('app-query-builder .query-builder > div button')!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const jsonEditor = host.querySelector<HTMLElement>('app-query-builder app-cm')!;
      const jsonGutter = Array.from(jsonEditor.querySelectorAll<HTMLElement>('.cm-lineNumbers .cm-gutterElement'))
        .find(element => element.textContent?.trim() === '1')!;
      expect(jsonGutter.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        jsonEditor.getBoundingClientRect().left
      );
      fixture.destroy();
      host.remove();
    });
});
