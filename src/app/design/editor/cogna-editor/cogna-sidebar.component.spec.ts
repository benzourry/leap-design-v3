import { Clipboard } from '@angular/cdk/clipboard';
import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom, of, Subject } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { CommService } from '../../../_shared/service/comm.service';
import { ToastService } from '../../../_shared/service/toast-service';
import { AppService } from '../../../service/app.service';
import { BucketService } from '../../../service/bucket.service';
import { CognaService } from '../../../service/cogna.service';
import { FormService } from '../../../service/form.service';
import { LambdaService } from '../../../service/lambda.service';
import { CognaEditDialogComponent } from './cogna-edit-dialog.component';
import { CognaEditDialogService } from './cogna-edit-dialog.service';
import { CognaSidebarComponent } from './cogna-sidebar.component';

@Component({ template: '' })
class WorkspaceStubComponent {}

describe('Cogna sidebar', () => {
  let cognas: jasmine.SpyObj<CognaService>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let router: Router;

  beforeEach(async () => {
    cognas = jasmine.createSpyObj<CognaService>('CognaService',
      ['getCognaList', 'save', 'isCodeTaken', 'getFormatter']);
    cognas.getCognaList.and.returnValue(of({
      content: [{ id: 2, name: 'First Cogna' }, { id: 3, name: 'Second Cogna' }],
      page: { totalElements: 30 }
    }));
    cognas.isCodeTaken.and.returnValue(of(false));
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    clipboard.copy.and.returnValue(true);
    await TestBed.configureTestingModule({
      imports: [CognaSidebarComponent],
      providers: [
        provideRouter([
          { path: 'design/:appId/lookup', component: WorkspaceStubComponent },
          { path: 'design/:appId/cogna', component: WorkspaceStubComponent }
        ]),
        { provide: CognaService, useValue: cognas },
        { provide: Clipboard, useValue: clipboard },
        { provide: AppService, useValue: {} },
        { provide: BucketService, useValue: { getBucketList: () => of({ content: [{ id: 8, name: 'Images' }] }) } },
        { provide: FormService, useValue: { getListBasic: () => of({ content: [{ id: 9, title: 'Form' }] }) } },
        { provide: LambdaService, useValue: { getSecretList: () => of([{ key: 'secret' }]) } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } }
      ]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    router = TestBed.inject(Router);
    await router.navigateByUrl('/design/1/lookup?id=3');
  });

  function createSidebar() {
    const fixture = TestBed.createComponent(CognaSidebarComponent);
    fixture.componentRef.setInput('appId', 1);
    fixture.componentRef.setInput('user', { email: 'creator@example.test' });
    fixture.detectChanges();
    return fixture;
  }

  it('filters, paginates and copies without navigation; item highlighting uses the actual route', async () => {
    const fixture = createSidebar();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'First';
    search.dispatchEvent(new Event('input'));
    search.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Second Cogna');
    expect(cognas.getCognaList).toHaveBeenCalledWith({ appId: 1, page: 0, size: 15, searchText: 'First' });
    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    Array.from(host.querySelectorAll<HTMLAnchorElement>('.pagination a'))
      .find(link => link.textContent?.trim() === '2')!.click();
    await fixture.whenStable();
    expect(cognas.getCognaList).toHaveBeenCalledWith({ appId: 1, page: 1, size: 15, searchText: '' });
    host.querySelector<HTMLElement>('.ui-item-id')!.click();
    expect(clipboard.copy).toHaveBeenCalledWith('2');
    expect(router.url).toBe('/design/1/lookup?id=3');
    await router.navigateByUrl('/design/1/cogna?id=3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('a[routerlinkactive]'));
    expect(links[0].classList.contains('active')).toBeFalse();
    expect(links[1].classList.contains('active')).toBeTrue();
  });

  it('respects TimeWarp, cancels without navigating and completes creation after destruction', async () => {
    const fixture = createSidebar();
    const saveResult = new Subject<{ id: number }>();
    cognas.save.and.returnValue(saveResult);
    const open = spyOn(TestBed.inject(CognaEditDialogService), 'open').and.returnValues(
      Promise.reject('cancel'), Promise.resolve({ type: 'txtgen', data: {}, email: 'creator@example.test' })
    );
    fixture.componentRef.setInput('timeWarping', true);
    fixture.detectChanges();
    fixture.componentInstance.createCogna();
    expect(open).not.toHaveBeenCalled();
    fixture.componentRef.setInput('timeWarping', false);
    fixture.detectChanges();
    fixture.componentInstance.createCogna();
    await fixture.whenStable();
    expect(cognas.save).not.toHaveBeenCalled();
    expect(router.url).toBe('/design/1/lookup?id=3');
    fixture.componentInstance.createCogna();
    await fixture.whenStable();
    expect(open.calls.mostRecent().args[0].cogna.inferModelName).toBe('gpt-5.4-mini');
    expect(cognas.save).toHaveBeenCalledWith('creator@example.test', 1,
      { type: 'txtgen', data: {}, email: 'creator@example.test' });
    fixture.destroy();
    saveResult.next({ id: 7 });
    saveResult.complete();
    await fixture.whenStable();
    expect(router.url).toBe('/design/1/cogna?id=7');
  });

  it('opens the original form with model options and loads related form and bucket data', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    spyOn(history, 'pushState');
    const result = TestBed.inject(CognaEditDialogService).open({
      appId: 1, cogna: { type: 'txtgen', data: {}, email: 'creator@example.test', content: 'a<br/>b' }, cognas: []
    });
    const reference = open.calls.mostRecent().returnValue;
    const dialog: CognaEditDialogComponent = reference.componentInstance;
    const hidden = firstValueFrom(reference.hidden);
    const rejection = expectAsync(result).toBeRejected();
    TestBed.inject(ApplicationRef).tick();
    const modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.textContent).toContain('Add Cogna');
    expect(dialog.editCognaData.content).toBe('a\nb');
    expect(dialog.bucketList[0].name).toBe('Images');
    expect(dialog.formList[0].title).toBe('Form');
    expect(dialog.secretList[0].key).toBe('secret');
    expect(dialog.inferModelNameList.some(model => model.code === 'gpt-5.4-mini')).toBeTrue();
    dialog.setImgGenModels();
    expect(dialog.editCognaData.data.imgSize).toBe('512x512');
    dialog.setImgClsModels();
    expect(dialog.editCognaData.inferModelName).toBe('resnet50-v2-7.onnx');
    cognas.getFormatter.and.returnValue(of({ schema: '{"type":"object"}' }));
    dialog.loadFormatter(9);
    expect(dialog.editCognaData.data.extractSchema).toBe('{"type":"object"}');
    dialog.loadFormatter(null);
    expect(dialog.editCognaData.data.extractSchema).toBe('');
    modal.querySelector<HTMLButtonElement>('.modal-footer .btn-round')!.click();
    await rejection;
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });

  it('converts edited content back to HTML when the dialog is saved', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    spyOn(history, 'pushState');
    const result = TestBed.inject(CognaEditDialogService).open({
      appId: 1, cogna: { type: 'txtgen', data: {}, email: 'creator@example.test', content: 'first<br/>second' },
      cognas: []
    });
    const reference = open.calls.mostRecent().returnValue;
    const hidden = firstValueFrom(reference.hidden);
    const dialog: CognaEditDialogComponent = reference.componentInstance;
    expect(dialog.editCognaData.content).toBe('first\nsecond');
    dialog.activeModal.close(dialog.editCognaData);
    expect((await result).content).toBe('first<br/>second');
    await hidden;
    expect(router.url).toBe('/design/1/lookup?id=3');
  });
});
