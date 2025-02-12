import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgLeafletComponent } from './ng-leaflet.component';

describe('NgLeafletComponent', () => {
  let component: NgLeafletComponent;
  let fixture: ComponentFixture<NgLeafletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgLeafletComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgLeafletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
