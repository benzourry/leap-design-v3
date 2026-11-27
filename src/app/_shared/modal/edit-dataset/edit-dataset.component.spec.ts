import { provideHttpClient } from '@angular/common/http';
import { Component, forwardRef, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbNavConfig } from '@ng-bootstrap/ng-bootstrap';
import { asapScheduler, observeOn, of } from 'rxjs';
import { FormService } from '../../../service/form.service';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { SharedModule } from '../../shared.module';
import { EditDatasetComponent } from './edit-dataset.component';

@Component({
  selector: 'app-cm',
  template: '',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => EditorStubComponent), multi: true }]
})
class EditorStubComponent implements ControlValueAccessor {
  extraAutoComplete = input<unknown>();
  linenumber = input<unknown>();
  skipCheck = input<unknown>();
  placeholder = input<unknown>();

  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

describe('EditDatasetComponent options', () => {
  let fixture: ComponentFixture<EditDatasetComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDatasetComponent],
      providers: [
        provideHttpClient(),
        { provide: FormService, useValue: { getListBasic: () => of({ content: [] }).pipe(observeOn(asapScheduler)) } }
      ]
    })
      .overrideComponent(EditDatasetComponent, {
        remove: { imports: [NgCmComponent] },
        add: { imports: [EditorStubComponent] }
      })
      .compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    TestBed.inject(NgbNavConfig).animation = false;
    fixture = TestBed.createComponent(EditDatasetComponent);
    fixture.componentRef.setInput('app', { id: 1 });
    fixture.componentInstance.formHolder = { data: { title: 'Form', tiers: [] } };
    fixture.componentInstance.sectionItems = { data: [] };
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
    if (host) host.remove();
  });

  it('keeps switches beside their labels and inside their rows at modal and mobile widths', () => {
    for (const width of [460, 300]) {
      host.style.width = `${width}px`;
      for (const id of ['showStatus', 'tblcard', 'canGroup', 'exportXls', 'exportPdf', 'canBlast', 'canAdd']) {
        const toggle = host.querySelector<HTMLInputElement>(`#${id}`)!;
        const label = host.querySelector<HTMLLabelElement>(`label[for="${id}"]`)!;
        const row = toggle.closest<HTMLElement>('.switch-row')!;
        const toggleBox = toggle.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        const rowBox = row.getBoundingClientRect();
        expect(toggleBox.left).withContext(id).toBeGreaterThanOrEqual(labelBox.right);
        expect(toggleBox.right).withContext(id).toBeLessThanOrEqual(rowBox.right);
        expect(toggleBox.top).withContext(id).toBeLessThan(labelBox.bottom);
      }
    }
  });

  it('keeps dependent settings in their switch panels and updates their models', async () => {
    const component = fixture.componentInstance;
    for (const id of ['tblcard', 'canGroup', 'exportPdf', 'canBlast', 'canAdd']) {
      const toggle = host.querySelector<HTMLInputElement>(`#${id}`)!;
      toggle.click();
      fixture.detectChanges();
    }
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component._editDatasetData.x.tblcard).toBeTrue();
    expect(component._editDatasetData.x.canGroup).toBeTrue();
    expect(component._editDatasetData.exportPdf).toBeTrue();
    expect(component._editDatasetData.canBlast).toBeTrue();
    expect(component._editDatasetData.x.canAdd).toBeTrue();
    for (const [toggleId, childSelector] of [
      ['tblcard', '#forceCard'],
      ['canGroup', '#showGroupFilter'],
      ['exportPdf', '#exportPdfLayout'],
      ['canBlast', '[name="blastTo"]'],
      ['canAdd', '#addlabel'],
      ['canAdd', '#inpopAdd'],
      ['canAdd', 'app-cm[name="pre"]']
    ]) {
      const row = host.querySelector<HTMLInputElement>(`#${toggleId}`)!.closest('.switch-row')!;
      expect(row.querySelector(childSelector)).withContext(childSelector).not.toBeNull();
    }
  });
});
