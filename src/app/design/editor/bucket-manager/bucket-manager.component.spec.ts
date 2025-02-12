import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BucketManagerComponent } from './bucket-manager.component';

describe('BucketManagerComponent', () => {
  let component: BucketManagerComponent;
  let fixture: ComponentFixture<BucketManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [BucketManagerComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BucketManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
