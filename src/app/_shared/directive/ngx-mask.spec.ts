import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { initialConfig, NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  standalone: true,
  imports: [FormsModule, NgxMaskDirective],
  providers: [
    provideNgxMask({
      dropSpecialCharacters: false,
      patterns: {
        ...initialConfig.patterns,
        a: { pattern: /[a-z]/ },
        A: { pattern: /[A-Z]/ },
        B: { pattern: /[a-zA-Z]/ }
      }
    })
  ],
  template: `
    <input [mask]="mask" [showMaskTyped]="true" [(ngModel)]="value">
  `
})
class MaskHostComponent {
  mask = '00-00';
  value = '123';
}

describe('ngx-mask integration', () => {
  let fixture: ComponentFixture<MaskHostComponent>;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaskHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MaskHostComponent);
  });

  it('formats the model value and shows remaining mask placeholders', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');

    expect(input.value).toBe('12-3_');
    expect(fixture.componentInstance.value).toBe('12-3');
  });

  it('supports the existing lowercase, uppercase, and alphabetic mask tokens', async () => {
    fixture.componentInstance.mask = 'aA-B';
    fixture.componentInstance.value = 'cZ-x';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');

    expect(input.value).toBe('cZ-x');
  });
});
