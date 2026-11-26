// Copyright (C) 2018 Razif Baital
// 
// This file is part of LEAP.
// ... (Standard License Header)

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild, DestroyRef, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbDateAdapter, NgbTypeahead, NgbHighlight } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppService } from '../../service/app.service';
import { PlatformLocation } from '@angular/common';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { ToastService } from '../../_shared/service/toast-service';
import { Title } from '@angular/platform-browser';
import { baseApi, domainBase } from '../../_shared/constant.service';
import { debounceTime, distinctUntilChanged, filter, map, Observable, OperatorFunction, switchMap, tap, of } from 'rxjs';
import Fuse from 'fuse.js';
import { atobUTF } from '../../_shared/utils';
import { LoadingService } from '../../_shared/service/loading.service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ThemeToggleComponent } from '../../run/_component/theme-toggle.component';
import { AssistantSidePanelComponent } from './assistant/assistant-side-panel.component';
import { AssistantStatusService } from './assistant/assistant-status.service';
import { AssistantChanged } from './assistant/assistant.types';
import { AssistantSidePanelService } from './assistant/assistant-side-panel.service';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ViewportService } from '../../_shared/service/viewport.service';
import { EditorSearchService } from './editor-search.service';
import { SplitPaneComponent } from '../../_shared/component/split-pane/split-pane.component';
import { UiSidebarComponent } from './ui-editor/ui-sidebar.component';
import { LookupSidebarComponent } from './lookup-editor/lookup-sidebar.component';
import { MailerSidebarComponent } from './mailer-editor/mailer-sidebar.component';
import { EndpointSidebarComponent } from './endpoint-editor/endpoint-sidebar.component';
import { GroupSidebarComponent } from './group-editor/group-sidebar.component';
import { BucketSidebarComponent } from './bucket-manager/bucket-sidebar.component';
import { LambdaSidebarComponent } from './lambda-editor/lambda-sidebar.component';
import { CognaSidebarComponent } from './cogna-editor/cogna-sidebar.component';
import { KryptaSidebarComponent } from './krypta-editor/krypta-sidebar.component';
import { SignaSidebarComponent } from './signa-editor/signa-sidebar.component';

type EditorSidebar = 'ui' | 'lookup' | 'mailer' | 'endpoint' | 'user' | 'bucket' | 'lambda' | 'cogna' | 'krypta' | 'signa';
const EDITOR_SIDEBARS: readonly EditorSidebar[] = ['ui', 'lookup', 'mailer', 'endpoint', 'user', 'bucket', 'lambda', 'cogna', 'krypta', 'signa'];

@Component({
    selector: 'app-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './editor.component.html',
    styleUrls: [
        '../../../assets/css/side-menu.css',
        '../../../assets/css/element-action.css',
        '../../../assets/css/tile.scss', 
        './editor.component.scss'
    ],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }, EditorSearchService],
    imports: [RouterLink, RouterLinkActive, FaIconComponent, FormsModule, NgbTypeahead,
        NgbHighlight, RouterOutlet, AppEditComponent, ThemeToggleComponent, AssistantSidePanelComponent, CdkDropListGroup,
        SplitPaneComponent, UiSidebarComponent, LookupSidebarComponent, MailerSidebarComponent, EndpointSidebarComponent,
        GroupSidebarComponent, BucketSidebarComponent, LambdaSidebarComponent, CognaSidebarComponent,
        KryptaSidebarComponent, SignaSidebarComponent]
})
export class EditorComponent implements OnInit {

    baseApi = baseApi;
    appId: number;

    // Upgraded to Signals for flawless OnPush UI updates
    user = signal<any>(null);
    app = signal<any>(null);
    authorized = signal<boolean>(false);
    offline = signal<boolean>(false);
    copyRequestList = signal<any[]>([]);
    editAppData = signal<any>(null);
    readonly selectedSidebar = signal<EditorSidebar | null>(null);
    readonly activeWorkspace = signal<unknown>(null);

    readonly assistantStatus = inject(AssistantStatusService);
    readonly assistantPanel = inject(AssistantSidePanelService);
    readonly viewport = inject(ViewportService);

    private modalService = inject(NgbModal);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private appService = inject(AppService);
    private editorSearch = inject(EditorSearchService);
    private router = inject(Router);
    private utilityService = inject(UtilityService);
    private toastService = inject(ToastService);
    private location = inject(PlatformLocation);
    private titleService = inject(Title);
    public loadingService = inject(LoadingService);
    private destroyRef = inject(DestroyRef); // <-- Inject for subscription cleanup

    constructor() {
        this.location.onPopState(() => {
            if (document.querySelector('.cm-fullscreen-mode')) {
                return;
            }
            this.modalService.dismissAll('')
        });
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

    readonly fuseSearch = computed(() => new Fuse(this.editorSearch.items(), {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        minMatchCharLength: 1,
        includeScore: true,
        keys: ['name']
    }));
    
    search: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map((term:string) => term.length < 2 ? [] : this.fuseSearch().search(term).map(r => r.item).slice(0, 10)),
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

    ngOnInit() {
        this.syncSidebarToUrl(this.router.getCurrentNavigation()?.finalUrl?.toString() ?? this.router.url);
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(event => this.syncSidebarToUrl(event.urlAfterRedirects));
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
                            if (this.authorized()) {
                                this.editorSearch.load(res.id);
                                this.assistantStatus.check();
                            }
                        })
                    );
                }
                return of(null);
            })
        ).subscribe();
    }

    private syncSidebarToUrl(url: string) {
        const segments = this.router.parseUrl(url).root.children[PRIMARY_OUTLET]?.segments;
        const path = segments?.[2]?.path;
        this.selectedSidebar.set(EDITOR_SIDEBARS.find(sidebar => sidebar === path) ?? null);
    }

    isWorkspaceTimeWarping(kind: 'lambda' | 'cogna'): boolean {
        const workspace = this.activeWorkspace();
        if (!workspace || typeof workspace !== 'object') return false;
        const property = kind === 'lambda' ? 'isTimeWarping' : 'isTimeWarpingCogna';
        return property in workspace && Boolean(workspace[property]);
    }

    handleImageError(event: Event) {
        (event.target as HTMLImageElement).src = 'assets/icons/logo.svg';
    }

    onAssistantChanged(change: AssistantChanged) {
        const total = change.forms + change.datasets + change.dashboards + change.screens
            + change.lambdas + change.emailTemplates + change.lookups;
        if (total > 0) {
            this.toastService.show('Assistant applied ' + total + ' change(s)', { classname: 'bg-success text-light' });
        }
    }

    openAssistant() {
        const isMobile = this.viewport.isMobile();
        const tab = isMobile && this.assistantPanel.palette() ? 'palette' : 'assistant';
        if (isMobile) {
            this.assistantPanel.toggle(tab);
            return;
        }
        this.assistantPanel.open(tab);
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
        if (localStorage.getItem("user-"+this.appId)) {
            runas = JSON.parse(atobUTF(localStorage.getItem("user-"+this.appId), null)).email;
        }

        runas = prompt("Run preview as (email): ", runas);

        if (runas) {

            localStorage.setItem('debugAppId', String(this.appId));

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
                            const message = refreshedApp.reviewStatus === 'pending'
                                ? 'App saved and submitted for platform review'
                                : 'App properties saved successfully';
                            this.toastService.show(message, { classname: 'bg-success text-light' });
                        },
                        error: error => {
                            this.toastService.show("App properties saving failed: " + error.error.message, { classname: 'bg-danger text-light' });
                        }
                    });
            }, () => { });
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        // Check if Ctrl (or Cmd on Mac) and '/' are pressed
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            // Prevent default behavior to avoid interfering with browser shortcuts

            const target = event.target as HTMLElement;

            if (target && target.closest('.cm-editor')) {
                return; // Bail out! Let CodeMirror handle its own shortcut.
            }

            event.preventDefault(); 
            this.focusSearch();
        }
    }
}