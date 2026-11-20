import { Directive, input, output, signal } from '@angular/core';

@Directive({
  selector: '[appFileDropPaste]',
  host: {
    '[class.is-dragging-files]': 'draggingFiles()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
    '(paste)': 'onPaste($event)',
  },
})
export class FileDropPasteDirective {
  readonly fileDropEnabled = input(true);
  readonly filesReceived = output<File[]>();
  readonly unreadableDrop = output<void>();
  readonly draggingFiles = signal(false);

  onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = this.fileDropEnabled() ? 'copy' : 'none';
    this.draggingFiles.set(this.fileDropEnabled());
  }

  onDragLeave(event: DragEvent): void {
    const container = event.currentTarget as HTMLElement;
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return;
    this.draggingFiles.set(false);
  }

  onDrop(event: DragEvent): void {
    this.draggingFiles.set(false);
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    if (!this.fileDropEnabled()) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) this.filesReceived.emit(files);
    else this.unreadableDrop.emit();
  }

  onPaste(event: ClipboardEvent): void {
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const files = Array.from(clipboard.files);
    if (!files.length) {
      for (const item of Array.from(clipboard.items)) {
        if (item.kind !== 'file') continue;
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (!files.length) return;
    event.preventDefault();
    if (this.fileDropEnabled()) this.filesReceived.emit(files);
  }
}
