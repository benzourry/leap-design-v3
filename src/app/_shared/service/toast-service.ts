import { Injectable, TemplateRef, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSignal = signal<{ textOrTpl: string | TemplateRef<any>; [key: string]: any }[]>([]);

  // Expose toasts as a computed signal for derived state
  toasts = computed(() => this.toastsSignal());

  show(textOrTpl: string | TemplateRef<any>, options: Record<string, any> = {}): void {
    const currentToasts = this.toastsSignal();
    this.toastsSignal.set([...currentToasts, { textOrTpl, ...options }]);
  }

  remove(toast: { textOrTpl: string | TemplateRef<any>; [key: string]: any }): void {
    const currentToasts = this.toastsSignal();
    this.toastsSignal.set(currentToasts.filter(t => t !== toast));
  }
}