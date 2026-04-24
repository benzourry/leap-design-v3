// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbDateAdapter, NgbTypeahead, NgbHighlight } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, Params, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppService } from '../../service/app.service';
import { PlatformLocation, NgClass } from '@angular/common';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { ToastService } from '../../_shared/service/toast-service';
import { Title } from '@angular/platform-browser';
import { baseApi, domainBase } from '../../_shared/constant.service';
import { debounceTime, distinctUntilChanged, map, Observable, OperatorFunction, switchMap, tap, of } from 'rxjs';
import Fuse from 'fuse.js';
import { atobUTF } from '../../_shared/utils';
import { LoadingService } from '../../_shared/service/loading.service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'app-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './editor.component.html',
    styleUrls: [
        '../../../assets/css/side-menu.css',
        '../../../assets/css/element-action.css',
        '../../../assets/css/tile.css', 
        './editor.component.css'
    ],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }],
    imports: [RouterLink, RouterLinkActive, FaIconComponent, NgClass, FormsModule, NgbTypeahead,
        NgbHighlight, RouterOutlet, AppEditComponent]
})
export class EditorComponent implements OnInit {

    bgClassName: string = domainBase.replace(/\./g,'-');
    baseApi = baseApi;
    appId: number;

    // Upgraded to Signals for flawless OnPush UI updates
    user = signal<any>(null);
    app = signal<any>(null);
    authorized = signal<boolean>(false);
    offline = signal<boolean>(false);
    copyRequestList = signal<any[]>([]);
    editAppData = signal<any>(null);

    private modalService = inject(NgbModal);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private appService = inject(AppService);
    private router = inject(Router);
    private utilityService = inject(UtilityService);
    private toastService = inject(ToastService);
    private location = inject(PlatformLocation);
    private titleService = inject(Title);
    public loadingService = inject(LoadingService);
    private destroyRef = inject(DestroyRef); // <-- Inject for subscription cleanup

    constructor() {
        this.location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$()
            .pipe(takeUntilDestroyed())
            .subscribe(online => this.offline.set(!online));
    }

    public model: any;
    loading = computed(() => this.loadingService.isLoadingSignal());

    searchElement = viewChild<ElementRef>('searchInput');  

    focusSearch() {
        setTimeout(() => { 
            this.searchElement()?.nativeElement.focus();
        }, 0);
    }

    fuseSearch: any;
    
    search: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map((term:string) => term.length < 2 ? [] : this.fuseSearch?.search(term).map(r => r.item).slice(0, 10)),
        );

    formatter = (result: any) => result.name;

selectItem(event: any) {
        // 1. Prevent NgBootstrap from auto-filling the input with the selected item's name
        event.preventDefault();
        
        const item = event.item;
        
        // 2. Perform your navigation
        this.router.navigate(['design', this.app().id, ...item.route], item.opt);
        
        // 3. Clear the search bar
        this.model = '';
        
        // 4. Refocus the search bar (using your existing focus method)
        this.focusSearch();
    }

    setFuseSearch() {
        if (!this.fuseSearch) {
            this.fuseSearch = new Fuse([...this.appService.searchInApp.values()], {
                shouldSort: true,
                threshold: 0.6,
                location: 0,
                distance: 100,
                minMatchCharLength: 1,
                includeScore: true,
                keys: ["name"]
            });
        }
    }

    ngOnInit() {
        // Flattened Pyramid of Doom using switchMap
        this.userService.getCreator().pipe(
            takeUntilDestroyed(this.destroyRef),
            tap(user => this.user.set(user)),
            switchMap((user) => this.route.params.pipe(
                map(params => ({ user, appId: params['appId'] }))
            )),
            switchMap(({ user, appId }) => {
                this.appId = appId;
                if (appId) {
                    return this.appService.getApp(appId, { email: user.email }).pipe(
                        tap(res => {
                            this.app.set(res);
                            this.authorized.set(res.email.includes(user.email) || res.group?.manager?.includes(user.email));
                            this.titleService.setTitle("Design - " + res.title);
                            this.getCopyRequestList();
                        })
                    );
                }
                return of(null);
            })
        ).subscribe();
    }

    handleImageError(event: Event) {
        (event.target as HTMLImageElement).src = 'assets/icons/logo.svg';
    }

    popShare(id: any) {
        const currentApp = this.app();
        let separator = currentApp?.live ? '.' : '--dev.';
        let note = currentApp?.live ? '' : '* Please note that this app is currently in DEV mode';
        let url = currentApp.appPath ? currentApp.appPath + separator + domainBase : domainBase + "/#/run/" + id;
        prompt('App URL (Press Ctrl+C to copy)\n' + note, url);
    }

    getCopyRequestList() {
        this.appService.getCopyRequestList(this.app().id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.copyRequestList.set(res.content);
            });
    }

    viewCopyRequest(content: any) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(() => { });
    }

    activateCp(id: any, action: any) {
        this.appService.activateCp(id, action)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.getCopyRequestList();
            });
    }

    runApp() {
        let runas = this.user().email;
        if (localStorage.getItem("user")) {
            runas = JSON.parse(atobUTF(localStorage.getItem("user"), null)).email;
        }

        runas = prompt("Run preview as (email): ", runas);

        if (runas) {
            this.userService.getUserDebug(runas, this.appId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: () => {
                        this.router.navigate(['run', this.app().id]);
                    }, 
                    error: () => {
                        alert("User " + runas + " not found in this app");
                    }
                });
        }
    }

    editApp(tpl: any, data: any) {
        this.editAppData.set(data);

        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(rItem => {
                // Flattened overlapping nested subscription using switchMap
                this.appService.save(rItem, this.user().email)
                    .pipe(
                        switchMap(res => this.appService.getApp(res.id, { email: this.user().email })),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe({
                        next: refreshedApp => {
                            this.app.set(refreshedApp);
                            this.getCopyRequestList();
                            this.toastService.show("App properties saved successfully", { classname: 'bg-success text-light' });
                        },
                        error: error => {
                            this.toastService.show("App properties saving failed: " + error.error.message, { classname: 'bg-danger text-light' });
                        }
                    });
            }, () => { });
    }
}