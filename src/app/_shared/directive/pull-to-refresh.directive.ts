import { Directive, ElementRef, HostListener, input, output } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective {
  onRefresh = output<void>();
  pullDisabled = input<boolean>(false);

  private startY = -1;
  private isPulling = false;
  private timer: any;

  constructor(private el: ElementRef<HTMLElement>) {}

  // Walk up the DOM tree to check if ANY ancestor container is scrolled
  private getScrollTop(node: HTMLElement | null): number {
    let el = node;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollTop > 0) return el.scrollTop;
      el = el.parentElement;
    }
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    if (this.pullDisabled()) return;
    // Only capture touch if the user is at the absolute top (scrollTop <= 0)
    this.startY = this.getScrollTop(e.target as HTMLElement) <= 0 ? e.touches[0].clientY : -1;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (this.pullDisabled() || this.startY < 0) return;

    const dist = e.touches[0].clientY - this.startY;

    // Must be pulling DOWN (dist > 0) AND still at the top
    if (dist > 0 && this.getScrollTop(e.target as HTMLElement) <= 0) {
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
      // Swiping UP or container is scrolled -> release immediately for native scrolling
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