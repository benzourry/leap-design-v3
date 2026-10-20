import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomSigninManagerComponent } from './custom-signin-manager.component';

describe('CustomSigninManagerComponent', () => {
  let component: CustomSigninManagerComponent;
  let fixture: ComponentFixture<CustomSigninManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSigninManagerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomSigninManagerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
