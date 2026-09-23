import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  // 1. This signal is shared across the entire app
  readonly isMobile = signal<boolean>(false);

  constructor() {
    // 2. Safety check in case you ever use SSR (Server-Side Rendering)
    if (typeof window !== 'undefined') {
      const mql = window.matchMedia('(max-width: 767.98px)');
      
      // 3. Set initial state
      this.isMobile.set(mql.matches);

      // 4. Attach ONE global event listener for the lifetime of the app
      mql.addEventListener('change', (e: MediaQueryListEvent) => {
        this.isMobile.set(e.matches);
      });
    }
  }
}