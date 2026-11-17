import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Theme, ThemeService } from '../../_shared/service/theme.service';
import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  let currentTheme: Theme;
  let setTheme: jasmine.Spy;

  beforeEach(async () => {
    currentTheme = 'light';
    setTheme = jasmine.createSpy('setTheme');

    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [{
        provide: ThemeService,
        useValue: {
          currentTheme: () => currentTheme,
          setTheme
        }
      }]
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
  });

  it('should request dark mode when clicked in light mode', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('aria-label')).toBe('Switch to Dark Mode');

    button.click();

    expect(setTheme).toHaveBeenCalledOnceWith('dark');
  });

  it('should request light mode when clicked in dark mode', () => {
    currentTheme = 'dark';
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to Light Mode');

    button.click();

    expect(setTheme).toHaveBeenCalledOnceWith('light');
  });
});
