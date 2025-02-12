import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotiListComponent } from './noti-list.component';

describe('NotiListComponent', () => {
  let component: NotiListComponent;
  let fixture: ComponentFixture<NotiListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotiListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotiListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
