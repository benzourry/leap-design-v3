import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyManagerComponent } from './key-manager.component';

describe('KeyManagerComponent', () => {
  let component: KeyManagerComponent;
  let fixture: ComponentFixture<KeyManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [KeyManagerComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KeyManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
