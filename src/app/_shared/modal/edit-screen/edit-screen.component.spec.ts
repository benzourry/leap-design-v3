import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { SharedModule } from '../../shared.module';

import { EditScreenComponent } from './edit-screen.component';

describe('EditScreenComponent', () => {
  let component: EditScreenComponent;
  let fixture: ComponentFixture<EditScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [EditScreenComponent]
})
    .compileComponents();

    new SharedModule(TestBed.inject(FaIconLibrary));
    fixture = TestBed.createComponent(EditScreenComponent);
    fixture.componentRef.setInput('screen', {
      title: 'Example', type: 'list', data: {}, dataset: { id: 5 }
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets linked data and shows the matching fields when changing type', async () => {
    const host = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    fixture.detectChanges();
    host.querySelector<HTMLLabelElement>('label[for="type-page"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component._editScreenData.type).toBe('page');
    expect(component._editScreenData.dataset).toBeUndefined();
    expect(host.querySelector('select[name="form"]')).not.toBeNull();
    expect(host.querySelector('select[name="dataset"]')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')!.disabled).toBeTrue();
  });
});
