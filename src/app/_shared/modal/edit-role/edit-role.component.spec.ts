import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

import { EditRoleComponent } from './edit-role.component';

describe('EditRoleComponent', () => {
  let component: EditRoleComponent;
  let fixture: ComponentFixture<EditRoleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditRoleComponent]
    })
    .compileComponents();
    
    TestBed.inject(FaIconLibrary).addIcons(faPlus);
    fixture = TestBed.createComponent(EditRoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps conditional group options and save validation working', async () => {
    const host = fixture.nativeElement as HTMLElement;
    const close = jasmine.createSpy('close');
    fixture.componentRef.setInput('close', close);
    const save = host.querySelector<HTMLButtonElement>('.modal-footer .btn-primary')!;
    await fixture.whenStable();
    fixture.detectChanges();
    expect(save.disabled).toBeTrue();

    const name = host.querySelector<HTMLInputElement>('input[name="name"]')!;
    name.value = 'Members';
    name.dispatchEvent(new Event('input'));
    host.querySelector<HTMLInputElement>('#allowReg')!.click();
    host.querySelector<HTMLInputElement>('#dataEnabled')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component._editGroupData.allowReg).toBeTrue();
    expect(host.querySelector('#needApproval')).not.toBeNull();
    expect(host.querySelector('textarea[name="dataFields"]')).not.toBeNull();
    expect(save.disabled).toBeFalse();
    save.click();
    expect(close).toHaveBeenCalledWith(component._editGroupData);
  });
});
