import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
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
// Added forkJoin to the RxJS imports
import { Subscription, switchMap, timer, forkJoin, exhaustMap, catchError, of } from 'rxjs';
import { MailerService } from '../../../service/mailer.service';
import { KryptaService } from '../../../service/krypta.service';
import { LookupService } from '../../../run/_service/lookup.service';

@Component({
  selector: 'app-app-log',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FilterPipe, NgbInputDatepicker, FaIconComponent, DatePipe],
  templateUrl: './app-log.component.html',
  providers: [
    { provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
    { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }
  ],
  styleUrl: './app-log.component.scss',
})
export class AppLogComponent implements OnInit, OnDestroy {

  private appService = inject(AppService);
  private userService = inject(UserService);
  private lambdaService = inject(LambdaService);
  private endpointService = inject(EndpointService);
  private cognaService = inject(CognaService);
  private formService = inject(FormService);
  private lookupService = inject(LookupService);
  private datasetService = inject(DatasetService);
  private mailerService = inject(MailerService);
  private kryptaService = inject(KryptaService);
  private route = inject(ActivatedRoute);
  private modalService = inject(NgbModal);
  private location = inject(PlatformLocation);
  private router = inject(Router);
  private runService = inject(RunService);
  private toastService = inject(ToastService);
  private utilityService = inject(UtilityService);
  private cdr = inject(ChangeDetectorRef);

  user: any;
  appId: number;
  app: any;

  params: any = {
    size: 1000,
    sort: ['timestamp,desc']
  };

  modules: any[] = [
    { code: 'lambda', name: 'Lambda' },
    { code: 'form', name: 'Form' },
    { code: 'dataset', name: 'Dataset' },
    { code: 'endpoint', name: 'Endpoint' },
    { code: 'cogna', name: 'Cogna' },
    { code: 'krypta', name: 'Krypta' },
    { code: 'mailer', name: 'Mailer' },
    { code: 'lookup', name: 'Lookup' }
  ];

  showColumn: any = {
    module: true,
    moduleId: false,
    log: true,
    principal: true,
    timestamp: true,
  };

  logList: any[] = [];
  lambdaList: any[] = [];
  endpointList: any[] = [];
  cognaList: any[] = [];
  formList: any[] = [];
  datasetList: any[] = [];
  mailerList: any[] = [];
  kryptaList: any[] = [];
  lookupList: any[] = [];

  isPolling: boolean = true;
  private pollingSub?: Subscription;

  ngOnInit(): void {
    this.userService.getCreator()
      .subscribe((user) => {
        this.user = user;
        // IMPROVEMENT: markForCheck is generally preferred over detectChanges inside async callbacks
        this.cdr.markForCheck(); 

        this.route.parent.params
          .subscribe((params: Params) => {
            this.appId = params['appId'];
            this.cdr.markForCheck();

            if (this.appId) {
              this.loadComps(this.appId);

              let appParams = { email: user.email };

              this.appService.getApp(this.appId, appParams)
                .subscribe(res => {
                  this.app = res;
                  this.cdr.markForCheck();
                });

              this.startPolling();
            }
          });
      });
  }

  // IMPROVEMENT: Refactored to use forkJoin. This runs all requests in parallel 
  // and only triggers Angular change detection ONCE when they all complete.
  loadComps(appId: number) {
    forkJoin({
      lambdas: this.lambdaService.getLambdaList({ appId }),
      endpoints: this.endpointService.getEndpointList({ appId }),
      cognas: this.cognaService.getCognaList({ appId }),
      forms: this.formService.getListBasic({ appId }),
      datasets: this.datasetService.getDatasetList(appId),
      mailers: this.mailerService.getMailerList({ appId }),
      wallets: this.kryptaService.getWalletList({ appId }),
      lookups: this.lookupService.getLookupList({ appId })
    }).subscribe((results: any) => { // <--- Add ': any' right here
      this.lambdaList = results.lambdas.content || [];
      this.endpointList = results.endpoints.content || [];
      this.cognaList = results.cognas.content || [];
      this.formList = results.forms.content || [];
      this.datasetList = results.datasets.content || [];
      this.mailerList = results.mailers.content || [];
      this.kryptaList = results.wallets.content || [];
      this.lookupList = results.lookups.content || [];
      
      this.cdr.markForCheck(); 
    });
  }

loadLogs() {
    // 1. Clear the current logs immediately.
    // This gives the user instant visual feedback that the filter changed,
    // and it prevents the polling timer from using the old timestamp!
    this.logList = [];
    this.cdr.markForCheck(); 

    // Optional but recommended: If they change the main module to 'All Modules', 
    // clear out the specific moduleId so it doesn't send a dead query parameter.
    if (!this.params.module) {
      delete this.params.moduleId;
    }

    // 2. Clean params and fetch
    const cleanParams = Object.fromEntries(
      Object.entries(this.params).filter(([_, value]) => value !== undefined)
    );
    
    // console.log("LOAD LOGS with params", cleanParams);

    this.appService.getLogs(this.appId, cleanParams)
      .subscribe(res => {
        this.logList = res.content || [];
        
        // 3. THIS IS THE MAGIC LINE. 
        // It tells Angular: "Hey, the data arrived! Update the HTML right now!"
        this.cdr.markForCheck(); 
      });
  }

  clearLogs() {
    if (!confirm('Are you sure you want to clear logs?')) {
      return;
    }

    const cleanParams = Object.fromEntries(
      Object.entries(this.params).filter(([_, value]) => value !== undefined)
    );

    this.appService.clearLogs(this.appId, cleanParams)
      .subscribe(res => {
        this.toastService.show('Logs cleared', { classname: 'bg-success text-light' });
        this.logList = []; // Clear the log list immediately for better UX
        this.loadLogs();
      });
  }

  // startPolling() {
  //   this.stopPolling(); 
  //   this.isPolling = true; 

  //   this.pollingSub = timer(0, 3000).pipe(
  //     switchMap(() => {
  //       const cleanParams = Object.fromEntries(
  //         Object.entries(this.params).filter(([_, value]) => value !== undefined)
  //       );
  //       return this.appService.getLogs(this.appId, cleanParams);
  //     })
  //   ).subscribe(res => {
  //     this.logList = res.content || []; 
  //     this.cdr.markForCheck(); // IMPROVEMENT: Notify Angular that logs arrived
  //   });
  // }

  startPolling() {
    this.stopPolling();
    this.isPolling = true;

    this.pollingSub = timer(0, 3000).pipe(
      exhaustMap(() => {
        // 1. Clone the base params so we don't accidentally mutate this.params globally
        const pollParams = { ...this.params };

        // 2. If we already have logs, find the newest timestamp
        if (this.logList && this.logList.length > 0) {
          const newestLog = this.logList[0]; // Index 0 is the newest because of 'desc' sort
          
          // Add 1 to the timestamp to avoid fetching the exact same log again
          // (Assuming your timestamp is a Unix number based on your NgbUnixTimestampAdapter)
          pollParams.dateFrom = newestLog.timestamp + 1; 
        }

        const cleanParams = Object.fromEntries(
          Object.entries(pollParams).filter(([_, value]) => value !== undefined)
        );

        return this.appService.getLogs(this.appId, cleanParams).pipe(
          catchError(err => {
            console.error('Failed to fetch new logs during poll:', err);
            return of(null);
          })
        );
      })
    ).subscribe(res => {
      if (res && res.content && res.content.length > 0) {
        
        // Map the incoming logs to include a temporary flag
        const newLogs = res.content.map((log: any) => ({ ...log, isNew: true }));

        // Prepend the mapped logs
        this.logList = [...newLogs, ...this.logList];

        if (this.logList.length > 2000) {
          this.logList = this.logList.slice(0, 2000);
        }

        this.cdr.markForCheck();
      }
    });
  }

  stopPolling() {
    this.isPolling = false; 
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  togglePolling() {
    // FIX: Changed logic so it actually toggles. 
    // Previously: if (isPolling) startPolling() -> Which makes no sense.
    if (this.isPolling) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}