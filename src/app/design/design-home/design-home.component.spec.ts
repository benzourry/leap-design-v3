import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DesignHomeComponent } from './design-home.component';

describe('DesignHomeComponent', () => {
  let component: DesignHomeComponent;
  let fixture: ComponentFixture<DesignHomeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [DesignHomeComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DesignHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
