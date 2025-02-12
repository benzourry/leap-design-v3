import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TilesComponent } from './tiles.component';

describe('TilesComponent', () => {
  let component: TilesComponent;
  let fixture: ComponentFixture<TilesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    imports: [TilesComponent]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
