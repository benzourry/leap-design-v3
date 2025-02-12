import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestoreManagerComponent } from './restore-manager.component';

describe('RestoreManagerComponent', () => {
  let component: RestoreManagerComponent;
  let fixture: ComponentFixture<RestoreManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [RestoreManagerComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RestoreManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
