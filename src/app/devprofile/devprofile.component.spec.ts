import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DevProfileComponent } from './devprofile.component';

describe('DevProfileComponent', () => {
  let component: DevProfileComponent;
  let fixture: ComponentFixture<DevProfileComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [DevProfileComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DevProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
