import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatasetCardPreviewComponent } from './dataset-card-preview.component';

describe('DatasetCardPreviewComponent', () => {
  let component: DatasetCardPreviewComponent;
  let fixture: ComponentFixture<DatasetCardPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetCardPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DatasetCardPreviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
