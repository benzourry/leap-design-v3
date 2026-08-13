import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { NgClass } from '@angular/common';

@Component({
    selector: 'step-wizard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `@if (tiers()?.length>0) {
  <div class="wizardstep" [ngClass]="type()">
    @for (tier of tiers(); track tier.id) {
      @if (preCheck(tier.pre)) {
        <div class="step" [ngbTooltip]="createTooltip(tier,approval())" container="body">
          <span [style.background-color]="tier?.actions?.[approval()?.[tier.id]?.status]?.color"  [class.half]="tier.sortOrder>=entry()?.currentTier">
            @if (!entry()?.approval?.[tier.id]) {
              <fa-icon [icon]="['fas','question']"></fa-icon>
            } @else {
              @if (tier?.actions?.[approval()?.[tier.id]?.status] && !['submitted','resubmitted'].includes(approval()?.[tier.id]?.status)) {
                <fa-icon
                  [icon]="['fas',tier.actions?.[approval()?.[tier.id]?.status]?.icon]">
                </fa-icon>
              } @else {
                <fa-icon [icon]="['fas','reply']" flip="horizontal">
                </fa-icon>
              }
            }
          </span>
          @if (type()!='mini') {
            <p>{{tier.name}}</p>
          }
        </div>
      }
    }
  </div>
}`,
    styles: [`/* mini version */

  mini.wizardstep .step {
      flex:1;
      font-size: 10px;
      position: relative;
      text-align: center;
      color: var(--bs-white, white);
  }
  .step .half{
      filter: grayscale(85%) brightness(1.4);
  }
  .step .cur{
      border: 2px solid var(--bs-primary, rgba(0, 123, 255, 1));
  }
  .mini.wizardstep .step span{
      display: block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      line-height: 16px;
      text-align: center;
      border: 2px solid var(--bs-secondary-color, #7d7d7d);
      background-color: var(--bs-secondary-color, #7d7d7d);
      color: var(--bs-white, white);
  }
  .mini.wizardstep .step:after {
      width: 100%;
      height: 20px;
      content: '';
      position: absolute;
      background-color: var(--bs-border-color, #bbb);
      top: 0px;
      left: -50%;
      z-index: -1;
  }
  .mini.wizardstep .step.active span {
      border-color: var(--bs-success, green);
      background-color: var(--bs-success, green);
  }
  /* full version */
  .wizardstep {
      padding: 0px;
      counter-reset: step;
      display:flex;
      justify-content: space-around;
      z-index: 0;
      position:relative;
  }
  .wizardstep .step {
      flex:1;
      font-size: 12px;
      position: relative;
      text-align: center;
  }
  .wizardstep .step span{
      display: block;
      width: 30px;
      height: 30px;
      margin: 0 auto;
      border-radius: 50%;
      line-height: 24px;
      text-align: center;
      border: 2px solid var(--bs-secondary-color, #7d7d7d);
      background-color: var(--bs-body-bg, white);
      color: var(--bs-body-color, inherit);
  }
  .wizardstep .step p{
      margin-top: 10px;
      color: var(--bs-body-color, #333);
  }
  .wizardstep .step:after {
      width: 100%;
      height: 2px;
      content: '';
      position: absolute;
      background-color: var(--bs-border-color, #7d7d7d);
      top: 15px;
      left: -50%;
      z-index: -1;
  }
  .wizardstep .step:first-child:after {
      content: none;
  }
  .wizardstep .step.active span {
      border-color: var(--bs-success, green);
  }`],
    imports: [NgClass, NgbTooltip, FaIconComponent]
})
export class StepWizardComponent {

    // FIX: Provide default empty structures so they never start strictly undefined
    tiers = input<any[]>([]);
    approval = input<any>({});
    entry = input<any>({});
    user = input<any>({});
    type = input<string>('');

    private preCache = new Map<string, Function>();

    _eval = (dataV: any, v: string) => {
        if (!v) return undefined;
        
        const bindings = {
            $_: this.entry(),
            $: dataV,
            $prev$: this.entry()?.prev,
            $user$: this.user()
        };

        const argNames = Object.keys(bindings);
        let fn = this.preCache.get(v);
        
        if (!fn) {
            fn = new Function(...argNames, `return ${v}`);
            this.preCache.set(v, fn);
        }
        
        return fn(...Object.values(bindings));
    };

    preCheck(pre: string, dataV?: any) {
        let res = undefined;
        try {
            if (!dataV) {
                dataV = this.entry()?.data;
            }
            res = this._eval(dataV, pre);
        } catch (e) { 
            console.warn(`[StepWizard] preCheck failed for expression: ${pre}`, e);
        }
        return !pre || res;
    }

    createTooltip(tier: any, approval: any) {
        let tt = tier.name;
        if (approval && approval[tier.id] && approval[tier.id].timestamp) {
            tt += '\n' + new Date(approval[tier.id].timestamp).toLocaleString();
        }
        return tt;
    }

}