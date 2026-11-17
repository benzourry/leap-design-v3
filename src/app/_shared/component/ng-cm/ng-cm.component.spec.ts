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

  it('uses Escape to exit fullscreen without allowing the modal to dismiss', () => {
    component.isFullscreen.set(true);
    const toggleFullscreen = spyOn(component, 'toggleFullscreen');
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });

    component['fullscreenKeydownListener'](event);

    expect(event.defaultPrevented).toBeTrue();
    expect(toggleFullscreen).toHaveBeenCalled();
  });
});
