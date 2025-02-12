import { HttpClient } from '@angular/common/http';
import { Component, OnInit, input, output } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
// import { RunService } from '../../service/run.service';
import { UserService } from '../../_shared/service/user.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { RunService } from '../_service/run.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss'],
    imports: [FaIconComponent]
})
export class RegisterComponent implements OnInit {

  single:any;
  once:any;
  user = input<any>();
  app = input<any>();
  done = output<any>();
  cancel = output<any>()

  // appUser: any={};
  groupList: any[];
  selectedRoles:any[]=[];

  constructor(private userService: UserService, public runService: RunService,
    private router: Router, private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit(): void {
    this.runService.getGroupRegList({appId:this.app()?.id})
    .subscribe(res=>{
      this.groupList=res;
    })
  }

  checkValue(cId) {
    return this.selectedRoles ? this.selectedRoles?.filter(v => v == cId).length > 0 : false;
    // return this.value?this.value.indexOf(code+",")>-1:false;
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
    //   this.onChangeCallback(event);
  }

  logout(event) {
    this.cancel.emit(event);
    //   this.onChangeCallback(event);
  }

}
