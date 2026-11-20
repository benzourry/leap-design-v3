import { TestBed } from '@angular/core/testing';
import { CommService } from '../../../_shared/service/comm.service';
import { AssistantContextService } from './assistant-context.service';
import { AssistantDrawerComponent } from './assistant-drawer.component';
import { AssistantExecutorService } from './assistant-executor.service';
import { AssistantService } from './assistant.service';
import { AssistantSettingsService } from './assistant-settings.service';

describe('AssistantDrawerComponent attachments', () => {
  let component: AssistantDrawerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AssistantService, useValue: {} },
        { provide: AssistantSettingsService, useValue: {} },
        { provide: AssistantContextService, useValue: {} },
        { provide: AssistantExecutorService, useValue: {} },
        { provide: CommService, useValue: {} },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AssistantDrawerComponent());
  });

  function transfer(...files: File[]): DataTransfer {
    const data = new DataTransfer();
    files.forEach(file => data.items.add(file));
    return data;
  }

  it('attaches dropped files and prevents the browser default', () => {
    const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' });
    const dataTransfer = transfer(file);
    const drag = new DragEvent('dragover', { dataTransfer, cancelable: true });
    component.onDragOver(drag);
    expect(drag.defaultPrevented).toBeTrue();
    expect(component.draggingFiles()).toBeTrue();

    const drop = new DragEvent('drop', { dataTransfer, cancelable: true });
    component.onDrop(drop);
    expect(drop.defaultPrevented).toBeTrue();
    expect(component.draggingFiles()).toBeFalse();
    expect(component.attachments()).toEqual([file]);
  });

  it('attaches pasted images without interfering with text paste', () => {
    const image = new File(['image'], 'image.png', { type: 'image/png' });
    const imagePaste = new ClipboardEvent('paste', { clipboardData: transfer(image), cancelable: true });
    component.onPaste(imagePaste);
    expect(imagePaste.defaultPrevented).toBeTrue();
    expect(component.attachments()).toEqual([image]);

    const clipboard = transfer();
    clipboard.setData('text/plain', 'prompt text');
    const textPaste = new ClipboardEvent('paste', { clipboardData: clipboard, cancelable: true });
    component.onPaste(textPaste);
    expect(textPaste.defaultPrevented).toBeFalse();
    expect(component.attachments()).toEqual([image]);
  });

  it('allows text to paste when the clipboard also contains an image', () => {
    const data = transfer(new File(['image'], 'image.png', { type: 'image/png' }));
    data.setData('text/plain', 'prompt text');
    const paste = new ClipboardEvent('paste', { clipboardData: data, cancelable: true });
    component.onPaste(paste);
    expect(paste.defaultPrevented).toBeFalse();
    expect(component.attachments().length).toBe(1);
  });

  it('applies existing type and size limits to pasted and dropped files', () => {
    const unsupported = new File(['text'], 'notes.txt', { type: 'text/plain' });
    component.onPaste(new ClipboardEvent('paste', { clipboardData: transfer(unsupported), cancelable: true }));
    expect(component.attachments()).toEqual([]);
    expect(component.error()).toContain('not supported');

    const oversized = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' });
    component.onDrop(new DragEvent('drop', { dataTransfer: transfer(oversized), cancelable: true }));
    expect(component.attachments()).toEqual([]);
    expect(component.error()).toContain('4 MB');

    const files = Array.from({ length: 5 }, (_, i) => new File(['x'], `${i}.png`, { type: 'image/png' }));
    component.onDrop(new DragEvent('drop', { dataTransfer: transfer(...files), cancelable: true }));
    expect(component.attachments().length).toBe(4);
    expect(component.error()).toContain('no more than 4');
  });

  it('does not attach dropped files while the assistant is busy', () => {
    component.loading.set(true);
    const dataTransfer = transfer(new File(['image'], 'image.png', { type: 'image/png' }));
    const drop = new DragEvent('drop', { dataTransfer, cancelable: true });
    component.onDrop(drop);
    expect(drop.defaultPrevented).toBeTrue();
    expect(component.attachments()).toEqual([]);
    expect(component.error()).toContain('Wait until');
  });
});
