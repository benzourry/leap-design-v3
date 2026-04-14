import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AppService } from '../../../service/app.service';
import { DatePipe, JsonPipe, PlatformLocation } from '@angular/common';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { NgbDateAdapter, NgbDatepicker, NgbInputDatepicker, NgbModal, NgbTimeAdapter } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../../_shared/service/toast-service';
import { UtilityService } from '../../../_shared/service/utility.service';
import { RunService } from '../../../run/_service/run.service';
import { UserService } from '../../../_shared/service/user.service';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from '../../../_shared/pipe/filter.pipe';
import { LambdaService } from '../../../service/lambda.service';
import { EndpointService } from '../../../service/endpoint.service';
import { CognaService } from '../../../service/cogna.service';
import { FormService } from '../../../service/form.service';
import { DatasetService } from '../../../service/dataset.service';
import { NgbUnixTimestampTimeAdapter } from '../../../_shared/service/time-adapter';
import { NgbUnixTimestampAdapter } from '../../../_shared/service/date-adapter';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Subscription, switchMap, timer } from 'rxjs';
import { MailerService } from '../../../service/mailer.service';

@Component({
  selector: 'app-app-log',
  imports: [JsonPipe, FormsModule, FilterPipe, NgbInputDatepicker, FaIconComponent, DatePipe],
  templateUrl: './app-log.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
    { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
  styleUrl: './app-log.component.scss',
})
export class AppLogComponent implements OnInit, OnDestroy {

  private appService = inject(AppService);
  private userService = inject(UserService);
  private lambdaService = inject(LambdaService);
  private endpointService = inject(EndpointService);
  private cognaService = inject(CognaService);
  private formService = inject(FormService);
  private datasetService = inject(DatasetService);
  private mailerService = inject(MailerService);
  private route = inject(ActivatedRoute);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private router = inject(Router);
  private runService = inject(RunService);
  private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);
  private cdr = inject(ChangeDetectorRef);

  user:any;
  appId:number;
  app:any;

  params:any={
    size:1000,
    sort:['timestamp,desc']
  };

  modules:any[] = [
    {code:'lambda', name:'Lambda'},
    {code:'form', name:'Form'},
    {code:'dataset', name:'Dataset'},
    {code:'endpoint', name:'Endpoint'},
    {code:'cogna', name:'Cogna'},
    {code:'mailer', name:'Mailer'}
  ]

  showColumn:any = {
    module:true,
    moduleId:false,
    log:true,
    principal:true,
    timestamp:true,
  }

  ngOnInit(): void {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        this.cdr.detectChanges();

        this.route.parent.params
          // NOTE: I do not use switchMap here, but subscribe directly
          .subscribe((params: Params) => {
            this.appId = params['appId'];
            this.cdr.detectChanges();
            


            if (this.appId) {

              this.loadComps(this.appId);

              let params = { email: user.email }

              this.appService.getApp(this.appId, params)
                .subscribe(res => {
                  this.app = res;
                  this.cdr.detectChanges();
                });

              // this.loadLogs();
              this.startPolling();
            }

          });

      });
  }

  logList:any[] = [];

  lambdaList:any[] = [];
  endpointList:any[] = [];
  cognaList:any[] = [];
  formList:any[] = [];
  datasetList:any[] = [];
  mailerList:any[] = [];

  loadComps(appId:number){
    this.lambdaService.getLambdaList({appId:appId}).subscribe(res => {
      this.lambdaList = res.content || [];
    });

    this.endpointService.getEndpointList({appId:appId}).subscribe(res => {
      this.endpointList = res.content || [];
    });

    this.cognaService.getCognaList({appId:appId}).subscribe(res => {
      this.cognaList = res.content || [];
    });

    this.formService.getListBasic({appId:appId}).subscribe(res => {
      this.formList = res.content || [];
    });

    this.datasetService.getDatasetList(appId).subscribe(res => {
      this.datasetList = res.content || [];
    });

    this.mailerService.getMailerList({appId:appId}).subscribe(res => {
      this.mailerList = res.content || [];
    });

  }

  loadLogs() {

    const cleanParams = Object.fromEntries(
      Object.entries(this.params).filter(([_, value]) => value !== undefined)
    );
    
    console.log("LOAD LOGS with params", cleanParams);
    this.appService.getLogs(this.appId, cleanParams)
    .subscribe(res => {
      this.logList = res.content || [];
    })
  }

  clearLogs() {

    if (!confirm('Are you sure you want to clear logs?')) {
      return;
    }

    const cleanParams = Object.fromEntries(
      Object.entries(this.params).filter(([_, value]) => value !== undefined)
    );

    console.log("CLEAR LOGS with params", cleanParams);
    this.appService.clearLogs(this.appId, cleanParams)
    .subscribe(res => {
      this.toastService.show('Logs cleared', { classname: 'bg-success text-light' });
      this.loadLogs();
    })
  }

  private pollingSub?: Subscription;

  // 3. Define the polling methods
startPolling() {
  this.stopPolling(); 
  this.isPolling = true; 

  this.pollingSub = timer(0, 3000).pipe(
    switchMap(() => {
      // Get params just like you do in loadLogs()
      const cleanParams = Object.fromEntries(
        Object.entries(this.params).filter(([_, value]) => value !== undefined)
      );
      
      // Return the HTTP observable so switchMap can manage it
      return this.appService.getLogs(this.appId, cleanParams);
    })
  ).subscribe(res => {
    // Only updates when the latest, un-cancelled request finishes
    this.logList = res.content || [];
  });
}

  stopPolling() {
    this.isPolling = false; // Keep state in sync
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  isPolling: boolean = true;

  togglePolling() {
    if (this.isPolling) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  // 4. Implement ngOnDestroy to prevent memory leaks
  ngOnDestroy() {
    this.stopPolling();
  }

}
