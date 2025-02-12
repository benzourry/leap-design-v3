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

import {Component, input, output} from '@angular/core';
// import { PageTitleService } from '../service/page-title-service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PageTitleService } from '../../_shared/service/page-title-service';
@Component({
    selector: 'page-title',
    template: `
@if (!asComp()) {
  <div class="nav-icon" (click)="open(true)"><div></div></div>
}@else{
  <fa-icon class="nav-close" [icon]="['fas','times']" (click)="dismiss()"></fa-icon>
}
<div class="title-text" (click)="open(true)"><ng-content></ng-content></div>
`,
    imports: [FaIconComponent]
})
export class PageTitleComponent {
  // @Input() title: String;
  // title = input<string>();
  // @Input() asComp: boolean;
  asComp = input<boolean>();
  
  // @Output() closed = new EventEmitter();
  closed = output<any>()

  constructor(private pageTitleService: PageTitleService){

  }

  open(open: boolean){
    this.pageTitleService.open(open);
  }

  dismiss(){
    this.closed.emit(true);
  }
}
