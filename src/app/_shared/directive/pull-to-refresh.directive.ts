import { Directive, ElementRef, HostListener, input, output } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective {
  onRefresh = output<void>();
  pullDisabled = input<boolean>(false); // 👈 Added input flag

  private startY = -1;
  private isPulling = false;
  private timer: any;

  constructor(private el: ElementRef<HTMLElement>) {}

  private isScrolled(target: HTMLElement): boolean {
    return !!target.closest('*')?.scrollTop || window.scrollY > 0 || document.documentElement.scrollTop > 0;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    if (this.pullDisabled()) return; // 👈 Skip if disabled
    this.startY = this.isScrolled(e.target as HTMLElement) ? -1 : e.touches[0].clientY;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (this.pullDisabled() || this.startY < 0) return; // 👈 Skip if disabled

    const dist = e.touches[0].clientY - this.startY;

    if (dist > 0 && !this.isScrolled(e.target as HTMLElement)) {
      this.isPulling = true;
      if (e.cancelable) e.preventDefault();

      const el = this.el.nativeElement;
      el.style.transition = 'none';
      el.style.transform = `translateY(${dist * 0.4}px)`;

      if (dist > 100 && !this.timer) {
        this.timer = setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate(40);
          this.onRefresh.emit();
          this.onTouchEnd();
        }, 500);
      } else if (dist <= 100) {
        this.clearTimer();
      }
    } else {
      this.onTouchEnd();
    }
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  onTouchEnd() {
    if (this.pullDisabled()) return;
    this.startY = -1;
    this.clearTimer();
    if (this.isPulling) this.resetUI();
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  private resetUI() {
    this.isPulling = false;
    const el = this.el.nativeElement;
    el.style.transition = 'transform 0.3s ease-out';
    el.style.transform = 'translateY(0)';

    setTimeout(() => {
      if (!this.isPulling) el.style.transition = el.style.transform = '';
    }, 300);
  }
}