import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CloneDatasetComponent } from './clone-dataset.component';

describe('CloneDatasetComponent', () => {
  let component: CloneDatasetComponent;
  let fixture: ComponentFixture<CloneDatasetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [CloneDatasetComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(CloneDatasetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
