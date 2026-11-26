import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { SharedModule } from '../../../_shared/shared.module';
import { MailerEditDialogService } from './mailer-edit-dialog.service';

describe('Mailer edit dialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
    spyOn(history, 'pushState');
  });

  it('opens the original form and cancels without navigation', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    const result = TestBed.inject(MailerEditDialogService).open({ enabled: 1 }, [{ id: 1, title: 'Form' }]);
    const reference = open.calls.mostRecent().returnValue;
    const hidden = firstValueFrom(reference.hidden);
    const rejected = expectAsync(result).toBeRejected();
    TestBed.inject(ApplicationRef).tick();
    const modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.querySelector('.modal-title')?.textContent).toContain('Add Mailer');
    expect(modal.textContent).toContain('Form');
    modal.querySelector<HTMLButtonElement>('.modal-footer button')!.click();
    await rejected;
    await hidden;
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('returns the edited mailer with original content conversion on save', async () => {
    const open = spyOn(TestBed.inject(NgbModal), 'open').and.callThrough();
    const result = TestBed.inject(MailerEditDialogService).open(
      { id: 2, name: 'Mailer', subject: 'Subject', enabled: 1, content: 'first<br/>second' }, []
    );
    const reference = open.calls.mostRecent().returnValue;
    const hidden = firstValueFrom(reference.hidden);
    TestBed.inject(ApplicationRef).tick();
    const modal = document.querySelector<HTMLElement>('ngb-modal-window')!;
    expect(modal.querySelector('.modal-title')?.textContent).toContain('Edit Mailer');
    modal.querySelector<HTMLButtonElement>('.modal-footer button:last-child')!.click();
    expect((await result).content).toBe('first<br/>second');
    await hidden;
  });
});
