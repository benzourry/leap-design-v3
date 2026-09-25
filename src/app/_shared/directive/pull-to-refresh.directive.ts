import { Directive, ElementRef, HostListener, input, output, inject } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective {
  onRefresh = output<void>();
  pullDisabled = input(false);
  threshold = input(100); 
  holdTime = input(500); 

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private startY = -1;
  private isPulling = false;
  private timer: any;

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    if (this.pullDisabled()) return;
    const top = this.getScrollTop(e.target as HTMLElement);
    this.startY = top <= 0 ? e.touches[0].clientY : -1;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (this.pullDisabled() || this.startY < 0) return;

    const dist = e.touches[0].clientY - this.startY;
    if (dist <= 0) return this.reset(false); // Swiped up -> abort

    this.isPulling = true;
    if (e.cancelable) e.preventDefault();

    this.el.style.transition = 'none';
    this.el.style.transform = `translateY(${dist * 0.4}px)`;

    if (dist > this.threshold()) {
      this.timer ??= setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(40);
        this.onRefresh.emit();
        this.reset(true);
      }, this.holdTime());
    } else {
      this.clearTimer();
    }
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  onTouchEnd() {
    this.reset(true);
  }

  private reset(snapUI: boolean) {
    this.clearTimer();
    this.startY = -1;

    if (snapUI && this.isPulling) {
      this.isPulling = false;
      this.el.style.transition = 'transform 0.3s ease-out';
      this.el.style.transform = 'translateY(0)';
      setTimeout(() => { 
        if (!this.isPulling) this.el.style.transform = this.el.style.transition = ''; 
      }, 300);
    } else {
      this.isPulling = false;
    }
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = null;
  }

  // Ultra-light scroll check: just looks for any parent actually scrolled down
  private getScrollTop(node: HTMLElement | null): number {
    while (node && node !== document.body && node !== document.documentElement) {
      if (node.scrollTop > 0) return node.scrollTop;
      node = node.parentElement;
    }
    return window.scrollY || 0;
  }
}