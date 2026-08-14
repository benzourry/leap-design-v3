import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // 1. Default initial signal state to 'light'
  currentTheme = signal<Theme>('light');

  constructor() {
    this.initTheme();

    // Listen for OS/System theme changes dynamically (only active if explicitly set to 'auto')
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.currentTheme() === 'auto') {
        this.applyTheme('auto');
      }
    });

    // Watch for localStorage changes triggered by other windows/iframes (e.g., the parent window)
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'app-theme' && event.newValue) {
        const newTheme = event.newValue as Theme;
        // Update signal and DOM without writing back to localStorage
        this.currentTheme.set(newTheme);
        this.applyTheme(newTheme);
      }
    });
  }

  private initTheme(): void {
    // 2. Retrieve saved preference, default to 'light' if none exists
    const storedTheme = (localStorage.getItem('app-theme') as Theme) || 'light';
    
    // 3. Set state and apply
    this.currentTheme.set(storedTheme);
    this.applyTheme(storedTheme);
  }

  public setTheme(theme: Theme): void {
    // 1. Update signal
    this.currentTheme.set(theme);
    
    // 2. Save to local storage (This triggers the 'storage' event in the iframe)
    localStorage.setItem('app-theme', theme);
    
    // 3. Apply to DOM
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    let resolvedTheme = theme;

    // If explicitly set to 'auto', resolve based on OS settings
    if (theme === 'auto') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Apply Bootstrap 5's theme attribute to the root HTML tag
    document.documentElement.setAttribute('data-bs-theme', resolvedTheme);
  }
}