import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { FormEditorComponent } from './form-editor.component';

describe('FormEditorComponent', () => {
  let component: FormEditorComponent;
  let fixture: ComponentFixture<FormEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormEditorComponent],
      providers: [provideHttpClient(), provideRouter([])]
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(FormEditorComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('coalesces tier-line redraws into one animation frame', () => {
    const component = Object.create(FormEditorComponent.prototype) as FormEditorComponent;
    Object.defineProperty(component, 'tierLinesFrame', { value: null, writable: true });

    let scheduledCallback: FrameRequestCallback | undefined;
    const requestAnimationFrameSpy = spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
      scheduledCallback = callback;
      return 1;
    });
    const drawTierLinesSpy = spyOn(component, 'drawTierLines');

    component.scheduleTierLineRedraw();
    component.scheduleTierLineRedraw();

    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
    scheduledCallback?.(0);
    expect(drawTierLinesSpy).toHaveBeenCalledTimes(1);

    component.scheduleTierLineRedraw();
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
  });
});
