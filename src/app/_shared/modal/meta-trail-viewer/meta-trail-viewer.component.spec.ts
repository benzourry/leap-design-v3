import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetaTrailViewerComponent } from './meta-trail-viewer.component';

describe('MetaTrailViewerComponent', () => {
  let component: MetaTrailViewerComponent;
  let fixture: ComponentFixture<MetaTrailViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetaTrailViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MetaTrailViewerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
