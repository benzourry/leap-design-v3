import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgCmComponent } from './ng-cm.component';

describe('NgCmComponent', () => {
  let component: NgCmComponent;
  let fixture: ComponentFixture<NgCmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [NgCmComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NgCmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
