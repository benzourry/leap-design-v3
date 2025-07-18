import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
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

  single:any;
  user = input<any>();
  app = input<any>();
  done = output<any>();
  cancel = output<any>()

  groupList = signal<any[]>([]);
  selectedRoles:any[]=[];

  public runService = inject(RunService);
  
  constructor() { }

  ngOnInit(): void {
    this.runService.getGroupRegList({appId:this.app()?.id})
    .subscribe(res=>{
      this.groupList.set(res);
    })
  }

  checkValue(cId) {
    return this.selectedRoles ? this.selectedRoles?.filter(v => v == cId).length > 0 : false;
  }

  toggleValue(cId, regType) {
    if (this.checkValue(cId)) {
      this.selectedRoles = this.selectedRoles?.filter(v => v != cId);
    } else {
      if (!this.selectedRoles || regType=='one') {
        this.selectedRoles = [];
      }
      this.selectedRoles = this.selectedRoles.concat([cId]);
    }
  }

  save(event) {
    this.done.emit(event);
  }

  logout(event) {
    this.cancel.emit(event);
  }

}
