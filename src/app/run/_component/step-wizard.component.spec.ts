import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepWizardComponent } from './step-wizard.component';

describe('StepWizardComponent', () => {
  let fixture: ComponentFixture<StepWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepWizardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StepWizardComponent);
  });

  it('should treat an empty precondition as passing', () => {
    expect(fixture.componentInstance.preCheck('')).toBeTrue();
  });

  it('should evaluate preconditions against entry data', () => {
    fixture.componentRef.setInput('entry', { data: { approved: true } });

    expect(fixture.componentInstance.preCheck('approved')).toBeTrue();
    expect(fixture.componentInstance.preCheck('!approved')).toBeFalse();
  });

  it('should expose entry, previous entry, and user bindings to expressions', () => {
    fixture.componentRef.setInput('entry', {
      data: { amount: 5 },
      prev: { approved: true }
    });
    fixture.componentRef.setInput('user', { active: true });

    const result = fixture.componentInstance._eval(
      fixture.componentInstance.entry().data,
      '$.amount > 3 && $prev$.approved && $user$.active'
    );

    expect(result).toBeTrue();
  });
});
