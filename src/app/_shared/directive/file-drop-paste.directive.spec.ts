import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FileDropPasteDirective } from './file-drop-paste.directive';

@Component({
  imports: [FileDropPasteDirective],
  template: `<div appFileDropPaste tabindex="0" [fileDropEnabled]="enabled"
    (filesReceived)="files = $event" (unreadableDrop)="unreadable = true"></div>`,
})
class TestDropZoneComponent {
  enabled = true;
  files: File[] = [];
  unreadable = false;
}

describe('FileDropPasteDirective', () => {
  it('accepts dropped files and pasted images, but leaves plain text alone', () => {
    const fixture = TestBed.createComponent(TestDropZoneComponent);
    fixture.detectChanges();
    const zone: HTMLElement = fixture.nativeElement.querySelector('div');
    const image = new File(['image'], 'image.png', { type: 'image/png' });
    const data = new DataTransfer();
    data.items.add(image);

    const drag = new DragEvent('dragover', { dataTransfer: data, bubbles: true, cancelable: true });
    zone.dispatchEvent(drag);
    fixture.detectChanges();
    expect(drag.defaultPrevented).toBeTrue();
    expect(zone.classList.contains('is-dragging-files')).toBeTrue();

    const drop = new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true });
    zone.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.files).toEqual([image]);

    fixture.componentInstance.files = [];
    const paste = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    zone.dispatchEvent(paste);
    expect(paste.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.files).toEqual([image]);

    const text = new DataTransfer();
    text.setData('text/plain', 'hello');
    const textPaste = new ClipboardEvent('paste', { clipboardData: text, bubbles: true, cancelable: true });
    zone.dispatchEvent(textPaste);
    expect(textPaste.defaultPrevented).toBeFalse();
  });

  it('does not receive files while disabled', () => {
    const fixture = TestBed.createComponent(TestDropZoneComponent);
    fixture.componentInstance.enabled = false;
    fixture.detectChanges();
    const zone: HTMLElement = fixture.nativeElement.querySelector('div');
    const data = new DataTransfer();
    data.items.add(new File(['pdf'], 'file.pdf', { type: 'application/pdf' }));

    const drop = new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true });
    zone.dispatchEvent(drop);
    const paste = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    zone.dispatchEvent(paste);
    expect(drop.defaultPrevented).toBeTrue();
    expect(paste.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.files).toEqual([]);
  });
});
