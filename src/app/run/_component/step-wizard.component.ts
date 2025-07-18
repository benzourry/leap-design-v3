// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// 
// LEAP is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 2 of the License, or
// (at your option) any later version.
// 
// LEAP is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with LEAP.  If not, see <http://www.gnu.org/licenses/>.

import { ChangeDetectionStrategy, Component, OnInit, input } from '@angular/core';
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
          <span [style.background-color]="tier?.actions[approval()[tier.id]?.status]?.color"  [class.half]="tier.sortOrder>=entry().currentTier">
            @if (!entry()?.approval[tier.id]) {
              <fa-icon [icon]="['fas','question']"></fa-icon>
            } @else {
              @if (tier?.actions[approval()[tier.id]?.status] && ['submitted','resubmitted'].indexOf(approval()[tier.id]?.status)==-1) {
                <fa-icon
                  [icon]="['fas',tier.actions[approval()[tier.id].status]?.icon]">
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
      color: white;
  }
  .step .half{
      filter: grayscale(85%) brightness(1.4);
  }
  .step .cur{
    border: 2px solid rgba(0, 123, 255, 1);
  }
  .mini.wizardstep .step span{
      display: block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      line-height: 16px;
      text-align: center;
      border: 2px solid #7d7d7d;
      background-color: #7d7d7d;
      color: white;
  }
  .mini.wizardstep .step:after {
      width: 100%;
      height: 20px;
      content: '';
      position: absolute;
      background-color: #bbb;
      top: 0px;
      left: -50%;
      z-index: -1;
  }
  .mini.wizardstep .step.active span {
      border-color: green;
      background-color: green;
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
      border: 2px solid #7d7d7d;
      background-color: white;
  }
  .wizardstep .step p{
      margin-top: 10px;
      color:#333;
  }
  .wizardstep .step:after {
      width: 100%;
      height: 2px;
      content: '';
      position: absolute;
      background-color: #7d7d7d;
      top: 15px;
      left: -50%;
      z-index: -1;
  }
  .wizardstep .step:first-child:after {
      content: none;
  }
  .wizardstep .step.active span {
      border-color: green;
  }`],
    imports: [NgClass, NgbTooltip, FaIconComponent]
})
export class StepWizardComponent implements OnInit {

    constructor() { }

    // @Input() tiers: any;
    tiers = input<any>();
    // @Input() approval: any;
    approval = input<any>();
    // @Input() entry: any;
    entry = input<any>();
    // @Input() user: any;
    user = input<any>();
    // @Input() type: string;
    type = input<string>();

    ngOnInit() {
    }

    _eval = (data, v) => new Function('$_', '$', '$prev$','$user$', `return ${v}`)(this.entry(), this.entry()?.data, this.entry()?.prev, this.user());

    preCheck(pre, dataV?: any) {
        let res = undefined;
        // if (pre) {
            try {
                if (!dataV) {
                    dataV = this.entry().data;
                }
                res = this._eval(dataV, pre);
            } catch (e) { }
        // }
        return !pre || res;
    }

    createTooltip(tier,approval){
        var tt = tier.name;
        if (approval[tier.id]){
            tt+='\n'+new Date(approval[tier.id].timestamp).toLocaleString() ;
        }
        return tt;
    }

}
