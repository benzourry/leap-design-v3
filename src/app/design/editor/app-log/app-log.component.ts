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
import { RxStompService } from '../../../_shared/service/rx-stomp.service';

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
  private rxStompService = inject(RxStompService);

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
  private liveSub?: Subscription;

  ngOnInit(): void {
    this.userService.getCreator().subscribe((user) => {
      this.user = user;
      this.cdr.markForCheck(); 

      this.route.parent.params.subscribe((params: Params) => {
        this.appId = params['appId'];
        this.cdr.markForCheck();

        if (this.appId) {
          this.loadComps(this.appId);

          let appParams = { email: user.email };
          this.appService.getApp(this.appId, appParams).subscribe(res => {
            this.app = res;
            this.cdr.markForCheck();
          });

          // 1. Load historical logs via HTTP
          this.loadLogs();
          
          // 2. Start WebSocket listener
          this.startPolling();
        }
      });
    });
  }

  // IMPROVEMENT: Refactored to use forkJoin. This runs all requests in parallel 
  // and only triggers Angular change detection ONCE when they all complete.
  loadComps(appId: number) {
    let size = 9999;
    forkJoin({
      lambdas: this.lambdaService.getLambdaList({ appId,size }),
      endpoints: this.endpointService.getEndpointList({ appId,size }),
      cognas: this.cognaService.getCognaList({ appId,size }),
      forms: this.formService.getListBasic({ appId,size }),
      datasets: this.datasetService.getDatasetList(appId),
      mailers: this.mailerService.getMailerList({ appId,size }),
      wallets: this.kryptaService.getWalletList({ appId,size }),
      lookups: this.lookupService.getLookupList({ appId,size })
    }).subscribe((results: any) => { // <--- Add ': any' right here
      this.lambdaList = results.lambdas.content || [];
      this.endpointList = results.endpoints.content || [];
      this.cognaList = results.cognas.content || [];
      this.formList = results.forms.content || [];
      this.datasetList = results.datasets || [];
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

    // Use your existing RxStompService to watch the backend channel
    this.liveSub = this.rxStompService.watch(`/topic/logs/${this.appId}`).subscribe((message: any) => {
      if (message.body) {
        const newLog = JSON.parse(message.body);
        this.handleIncomingLog(newLog);
      }
    });
  }

  handleIncomingLog(newLog: any) {
    // 1. Client-side filter: Ignore logs that don't match the current UI filters
    if (this.params.module && newLog.module !== this.params.module) return;
    if (this.params.moduleId && newLog.moduleId != String(this.params.moduleId)) return;
    if (this.params.searchText && !newLog.data?.toLowerCase().includes(this.params.searchText.toLowerCase())) return;

    // 2. Mark as new for CSS animation
    newLog.isNew = true;

    // 3. Strip 'isNew' from old logs
    const oldLogs = this.logList.map(log => ({ ...log, isNew: false }));
    
    // 4. Prepend and cap at 2000
    this.logList = [newLog, ...oldLogs];
    if (this.logList.length > 2000) {
      this.logList = this.logList.slice(0, 2000);
    }

    // 5. Trigger UI update
    this.cdr.markForCheck();
  }

  stopPolling() {
    this.isPolling = false; 
    if (this.liveSub) {
      this.liveSub.unsubscribe(); // Unsubscribe cleanly closes the listener
    }
  }

  togglePolling() {
    if (this.isPolling) {
      this.stopPolling();
    } else {
      this.startPolling();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}