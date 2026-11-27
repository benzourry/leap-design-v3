import { provideHttpClient } from '@angular/common/http';
import { Component, forwardRef, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbNavConfig } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';
import { AppService } from '../../../service/app.service';
import { PlatformService } from '../../../service/platform.service';
import { ScreenService } from '../../../service/screen.service';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { SharedModule } from '../../shared.module';
import { AppEditComponent } from './app-edit.component';

@Component({
  selector: 'app-cm',
  template: '',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => EditorStubComponent), multi: true }]
})
class EditorStubComponent implements ControlValueAccessor {
  linenumber = input<unknown>();
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

describe('AppEditComponent', () => {
  let fixture: ComponentFixture<AppEditComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppEditComponent],
      providers: [
        provideHttpClient(),
        { provide: AppService, useValue: {
          getPages: () => of([]),
          getCustomProviders: () => of([{ id: 1, registrationId: 'corp', clientName: 'Corp SSO' }]),
          getAppMyList: () => of({ content: [] }),
          isPathTaken: (path: string) => of(path === 'taken')
        } },
        { provide: ScreenService, useValue: { getScreenList: () => of([]) } },
        { provide: PlatformService, useValue: { listAppGroup: () => of({ content: [] }) } }
      ]
    })
      .overrideComponent(AppEditComponent, {
        remove: { imports: [NgCmComponent] },
        add: { imports: [EditorStubComponent] }
      })
      .compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    TestBed.inject(NgbNavConfig).animation = false;
    fixture = TestBed.createComponent(AppEditComponent);
    fixture.componentRef.setInput('user', { email: 'test@example.invalid' });
    fixture.componentRef.setInput('data', {
      id: 1, title: 'Test', appPath: 'test', layout: 'sidemenu', status: 'local', x: {}
    });
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    host.remove();
  });

  it('uses the modal background rather than the surface token for tab content', () => {
    host.style.setProperty('--bs-modal-bg', 'rgb(23, 45, 67)');
    host.style.setProperty('--reka-bg-surface', 'rgb(89, 90, 91)');
    const outlet = host.querySelector<HTMLElement>('.tab-content')!;
    expect(getComputedStyle(outlet).backgroundColor).toBe('rgb(23, 45, 67)');
  });

  it('lets the modal grow with tall tab content instead of scrolling the pane', () => {
    const pane = host.querySelector<HTMLElement>('.single-pane')!;
    const extraContent = document.createElement('div');
    extraContent.style.height = '120vh';
    pane.appendChild(extraContent);

    expect(pane.getBoundingClientRect().height).toBeGreaterThan(window.innerHeight);
    expect(pane.clientHeight).toBe(pane.scrollHeight);
    expect(getComputedStyle(pane).overflowY).toBe('visible');
  });

  it('updates layout, sign-in tiles, and live review state', async () => {
    for (const id of ['topnav', 'useGoogle', 'p_corp', 'appXLive']) {
      host.querySelector<HTMLInputElement>(`#${id}`)!.click();
      fixture.detectChanges();
    }
    await fixture.whenStable();
    fixture.detectChanges();
    const data = fixture.componentInstance._data;
    expect(data.layout).toBe('topnav');
    expect(data.useGoogle).toBeTrue();
    expect(data.enabledSignin).toContain('corp');
    expect(fixture.componentInstance.isReviewPending).toBeTrue();
    expect(host.querySelector('.alert-warning')).not.toBeNull();
  });

  it('keeps status and role-dependent options functional', async () => {
    Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.trim() === 'Advanced')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.querySelector('#secret')).toBeNull();
    host.querySelector<HTMLInputElement>('#status-published')!.click();
    host.querySelector<HTMLInputElement>('#reg')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('#secret')).not.toBeNull();
    host.querySelector<HTMLInputElement>('#regTypeOnly')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance._data.x.regType).toBe('one');
    host.querySelector<HTMLInputElement>('#reg')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#regTypeOnly')).toBeNull();
  });

  it('retains app path validation after editing the field', async () => {
    const path = host.querySelector<HTMLInputElement>('#appPath')!;
    path.value = 'taken';
    path.dispatchEvent(new Event('input'));
    path.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.textContent).toContain('is already taken');
    expect(host.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')!.disabled).toBeTrue();

    path.value = 'available';
    path.dispatchEvent(new Event('input'));
    path.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.textContent).toContain('is available');
    expect(host.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')!.disabled).toBeFalse();
  });

  it('keeps switches within their rows at modal widths and adapts inputs to the theme', async () => {
    const title = host.querySelector<HTMLInputElement>('#appTitle')!;
    host.setAttribute('data-bs-theme', 'light');
    const lightBackground = getComputedStyle(title).backgroundColor;
    host.setAttribute('data-bs-theme', 'dark');
    expect(getComputedStyle(title).backgroundColor).not.toBe(lightBackground);

    Array.from(host.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.textContent?.trim() === 'Advanced')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    for (const width of [460, 300]) {
      host.style.width = `${width}px`;
      for (const id of ['reg', 'topgap', 'devInData', 'mailbox']) {
        const toggle = host.querySelector<HTMLInputElement>(`#${id}`)!;
        const row = toggle.closest<HTMLElement>('.switch-row')!;
        const label = host.querySelector<HTMLLabelElement>(`label[for="${id}"]`)!;
        expect(toggle.getBoundingClientRect().right).withContext(id).toBeLessThanOrEqual(row.getBoundingClientRect().right);
        expect(toggle.getBoundingClientRect().left).withContext(id).toBeGreaterThanOrEqual(label.getBoundingClientRect().right);
      }
    }
  });
});
