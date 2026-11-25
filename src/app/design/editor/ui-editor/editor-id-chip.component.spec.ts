import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { SharedModule } from '../../../_shared/shared.module';
import { ToastService } from '../../../_shared/service/toast-service';
import { EditorIdChipComponent } from './editor-id-chip.component';

describe('EditorIdChipComponent', () => {
  it('copies the ID and reports both success and failure', () => {
    TestBed.configureTestingModule({ imports: [EditorIdChipComponent] });
    new SharedModule(TestBed.inject(FaIconLibrary));
    const fixture = TestBed.createComponent(EditorIdChipComponent);
    fixture.componentRef.setInput('id', 123);
    fixture.componentRef.setInput('kind', 'Dataset');
    const copy = spyOn(fixture.debugElement.injector.get(Clipboard), 'copy').and.returnValue(true);
    const toast = spyOn(TestBed.inject(ToastService), 'show');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Copy Dataset ID');
    button.click();
    expect(copy).toHaveBeenCalledWith('123');
    expect(toast).toHaveBeenCalledWith('Dataset ID copied to clipboard', jasmine.anything());

    copy.and.returnValue(false);
    button.click();
    expect(toast).toHaveBeenCalledWith('Failed to copy Dataset ID', jasmine.anything());
  });
});
