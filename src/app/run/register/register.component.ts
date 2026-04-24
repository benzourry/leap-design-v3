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

import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { RunService } from '../_service/run.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FaIconComponent]
})
export class RegisterComponent implements OnInit {

  user = input<any>();
  app = input<any>();
  
  done = output<any>();
  cancel = output<any>();

  groupList = signal<any[]>([]);
  
  // Converted to a signal to ensure OnPush triggers view updates perfectly
  selectedRoles = signal<any[]>([]);

  public runService = inject(RunService);
  private destroyRef = inject(DestroyRef);
  
  ngOnInit(): void {
    this.runService.getGroupRegList({ appId: this.app()?.id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        this.groupList.set(res);
      });
  }

  checkValue(cId: any) {
    return this.selectedRoles().includes(cId);
  }

  toggleValue(cId: any, regType: string) {
    if (this.checkValue(cId)) {
      // Remove the item from the array
      this.selectedRoles.update(roles => roles.filter(v => v !== cId));
    } else {
      // Add the item, clearing previous if regType is 'one'
      if (regType === 'one') {
        this.selectedRoles.set([cId]);
      } else {
        this.selectedRoles.update(roles => [...roles, cId]);
      }
    }
  }

  save(event) {
    // Emit the actual selected data to the parent component, not the DOM event
    this.done.emit(this.selectedRoles());
  }

  logout(event) {
    this.cancel.emit(event);
  }

}