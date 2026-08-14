import { Component, inject, input } from '@angular/core';
import { ThemeService } from '../../_shared/service/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button 
      type="button" 
      class="theme-toggle-btn" 
      (click)="toggleTheme()" 
      [attr.aria-label]="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      title="{{isDarkMode ? lang() == 'ms' ? 'Tukar ke Mod Terang' : 'Switch to Light Mode' : lang() == 'ms' ? 'Tukar ke Mod Gelap' : 'Switch to Dark Mode'}}">
      
      @if (isDarkMode) {
        <!-- Sun Icon (visible in dark mode) -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2"/>
          <path d="M12 20v2"/>
          <path d="m4.93 4.93 1.41 1.41"/>
          <path d="m17.66 17.66 1.41 1.41"/>
          <path d="M2 12h2"/>
          <path d="M20 12h2"/>
          <path d="m6.34 17.66-1.41 1.41"/>
          <path d="m19.07 4.93-1.41 1.41"/>
        </svg>
      } @else {
        <!-- Moon Icon (visible in light mode) -->
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      }
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      line-height: 1;
    }

    .theme-toggle-btn {
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      color: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .theme-toggle-btn svg {
      display: block;
    }

    /* Twist effect on hover */
    .theme-toggle-btn:hover {
      transform: rotate(-25deg) scale(1.1);
    }

    .theme-toggle-btn:active {
      transform: rotate(0deg) scale(0.95);
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);

  lang = input<string>('en');

  get isDarkMode(): boolean {
    return this.themeService.currentTheme() === 'dark';
  }

  toggleTheme(): void {
    const nextTheme = this.isDarkMode ? 'light' : 'dark';
    this.themeService.setTheme(nextTheme);
  }
}