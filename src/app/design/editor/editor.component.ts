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

import { Component, ElementRef, OnInit, effect, viewChild } from '@angular/core';
import { FormService } from '../../service/form.service';
import { NgbModal, NgbDateAdapter, NgbTypeahead, NgbHighlight } from '@ng-bootstrap/ng-bootstrap';
// import { HttpParams } from '@angular/common/http';
// import { LookupService } from '../../service/lookup.service';
import { UserService } from '../../_shared/service/user.service';
import { ActivatedRoute, Params, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppService } from '../../service/app.service';
import { MailerService } from '../../service/mailer.service';
import { PlatformLocation, NgClass } from '@angular/common';
import { NgbUnixTimestampAdapter } from '../../_shared/service/date-adapter';
import { UtilityService } from '../../_shared/service/utility.service';
import { AppEditComponent } from '../../_shared/modal/app-edit/app-edit.component';
import { ToastService } from '../../_shared/service/toast-service';
// import { EntryService } from '../../service/entry.service';
import { Title } from '@angular/platform-browser';
import { baseApi, domainBase } from '../../_shared/constant.service';
import { debounceTime, distinctUntilChanged, map, Observable, OperatorFunction } from 'rxjs';
import Fuse from 'fuse.js';
import { atobUTF, splitAsList, toSnakeCase, toSpaceCase } from '../../_shared/utils';
import { LoadingService } from '../../_shared/service/loading.service';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { EntryService } from '../../run/_service/entry.service';
import { LookupService } from '../../run/_service/lookup.service';

@Component({
    selector: 'app-editor',
    templateUrl: './editor.component.html',
    styleUrls: ['../../../assets/css/side-menu.css',
        '../../../assets/css/element-action.css',
        '../../../assets/css/tile.css', './editor.component.css'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter }],
    imports: [RouterLink, RouterLinkActive, FaIconComponent, NgClass, FormsModule, NgbTypeahead,
        NgbHighlight, RouterOutlet, AppEditComponent]
})
export class EditorComponent implements OnInit {

    bgClassName: string = domainBase.replace(/\./g,'-');
    // isSearch: boolean = false;
    user: any;
    app: any;
    path: string = "";
    offline: boolean = false;
    designPane: boolean = false;
    baseApi = baseApi;
    appId: number;

    // comp:any;

    // loadComp(){
    //     this.comp = createComponent("<strong>Hi, custom html!</strong>", {})
    // }

    // helpLink = "https://1drv.ms/w/s!AotEjBTyvtX0gq4hcN7-3mgHX5fC1g?e=cj1T8F";
    // helpLink = "https://unimas-my.sharepoint.com/:w:/g/personal/blmrazif_unimas_my/EcX9YxrT4o5NtXnyF-j2dQgBR0rw7rgL8ab7sw3i9SgdyA?e=msJJtB";



    constructor(private formService: FormService, private lookupService: LookupService,
        private mailerService: MailerService,
        private modalService: NgbModal, private userService: UserService,
        private route: ActivatedRoute, private appService: AppService,
        private router: Router,
        private entryService: EntryService,
        private utilityService: UtilityService,
        private toastService: ToastService,
        private location: PlatformLocation, private titleService: Title,
        public loadingService: LoadingService) {
        location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);

        effect(() => {
            // this.loading = this.loadingSignal();
            this.loading = this.loadingService.isLoadingSignal();
        })
        // loadingService.isLoading$.subscribe(r=>this.loading=r);
    }

    public model: any;
    loading: boolean = false;
    // loadingSignal = this.loadingService.isLoadingSignal; // toSignal<boolean>(this.loadingService.isLoading$);
    authorized: boolean = false;


    // @ViewChild('searchInput') searchElement: ElementRef;
    searchElement = viewChild<ElementRef>('searchInput');  
    focusSearch() {
        setTimeout(() => { // this will make the execution after the above boolean has changed
            this.searchElement().nativeElement.focus();
        }, 0);
    }

    fuseSearch;
    search: OperatorFunction<string, readonly any[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            distinctUntilChanged(),
            map((term:string) => term.length < 2 ? [] : this.fuseSearch.search(term).map(r => r.item).slice(0, 10)),
        );

    formatter = (result: any) => result.name;

    selectItem(event) {
        // console.log(event);
        var item = event.item;
        this.router.navigate(['design', this.app.id, ...item.route], item.opt);
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
                keys: [
                    "name"
                ]
            });
        }
    }

    ngOnInit() {

        this.loading = true;
        // this.loadingNew.set(true);

        // this.loadingService.isLoading$.subscribe(e=>this.loading=e)

        // Check if d_user exist. If exist, replace user
        // if (localStorage.getItem("d_user")) {
        //     localStorage.setItem("user", localStorage.getItem("d_user"));
        //     localStorage.removeItem("d_user");
        // }
        //////

        this.userService.getCreator().subscribe((user) => {

            this.user = user;

            this.route.params
                // NOTE: I do not use switchMap here, but subscribe directly
                .subscribe((params: Params) => {

                    this.appId = params['appId'];
                    if (this.appId) {
                        let params = {
                            email: user.email
                        }

                        this.appService.getApp(this.appId, params)
                            .subscribe({
                                next: res => {
                                    this.app = res;
                                    this.authorized = res.email.includes(user.email);
                                    this.titleService.setTitle("Design - " + this.app.title);
                                    this.getCopyRequestList();
                                    this.loading = false;
                                    // this.loadingNew.set(false);
                                }, error: err => {
                                    this.loading = false;
                                    // this.loadingNew.set(false);
                                }
                            });
                    }


                });

        });
    }

    setPath(str: string) {
        this.path = str;
    }

    popShare(id) {
        let separator = this.app?.live?'.':'--dev.';
        let note = this.app?.live?'':'* Please note that this app is currently in DEV mode';
        let url = this.app.appPath ? this.app.appPath + separator + domainBase : domainBase + "/#/run/" + id;
        prompt('App URL (Press Ctrl+C to copy)\n'+note, url);
    }

    toggleNext(parent, next, id, text) {
        if (!parent[next]) {
            parent[next] = {};
        }
        if (parent[next][id]) {
            delete parent[next][id]
        } else {
            parent[next][id] = text;
        }
    }

    // exceptCurForm = () => this.formList.filter(f => f.id != this.curForm.id);

    checkNext(next, id) {
        return next && next[id];
    }

    lookupIds = [];
    lookupKey = {};
    lookup = {};
    mod = {};

    getAsList = splitAsList;

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';

    copyRequestList: any = [];
    getCopyRequestList() {
        this.appService.getCopyRequestList(this.app.id)
            .subscribe(res => {
                this.copyRequestList = res.content;
            })
    }

    viewCopyRequest(content) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(res => { });
    }
    activateCp(id, action) {
        this.appService.activateCp(id, action)
            .subscribe(res => {
                this.getCopyRequestList();
            })
    }

    runApp() {

        let runas = this.user.email;
        if (localStorage.getItem("user")) {
            runas = JSON.parse(atobUTF(localStorage.getItem("user"))).email;
        }

        runas = prompt("Run preview as (email): ", runas);

        var appId = this.appId;
        // if (this.app?.x?.userFromApp) {
        //     appId = this.app?.x?.userFromApp;
        // }
        if (runas) {
            this.userService.getUserDebug(runas, appId)
                .subscribe({
                    next: user_debug => {
                        this.router.navigate(['run', this.app.id]);
                    }, error: err => {
                        alert("User " + runas + " not found in this app");
                    }
                })
        }
    }

    // setAppStatus(value) {
    //     // console.log(event);
    //     // alert(value);
    //     if (confirm("Are you sure you want to change your application status?")){
    //         this.appService.setLive(this.app.id,value)
    //             .subscribe({
    //                 next: res => {
    //                     this.app = res;
    //                     this.toastService.show("App status changed to :"+ res.x?.live?"LIVE":"DEV", { classname: 'bg-success text-light' })
    //                 }, error: err => {
    //                     this.toastService.show("App status update failed :"+err.error.message, { classname: 'bg-danger text-light' })
    //                 }
    //             })            
    //     }

    // }

    editAppData:any;
    editApp(tpl,data) {

        // history.pushState(null, null, window.location.href);

        this.editAppData = data;

        history.pushState(null, null, window.location.href);
        this.modalService.open(tpl, { backdrop: 'static' })
            .result.then(rItem => {
                // console.log(rItem);
                this.appService.save(rItem, this.user.email)
                    .subscribe({
                        next: res => {
                            let params = {
                                email: this.user.email
                            }
                            this.appService.getApp(res.id, params)
                                .subscribe(res => {
                                    this.app = res;
                                    this.getCopyRequestList();
                                });
                            this.toastService.show("App properties saved successfully", { classname: 'bg-success text-light' });
                        },
                        error: error => {
                            this.toastService.show("App properties saving failed: " + error.error.message, { classname: 'bg-danger text-light' });
                        }
                    });
            }, dismiss => { })

        // const modalRef = this.modalService.open(AppEditComponent, { backdrop: 'static' })
        // modalRef.componentInstance.user = this.user;
        // modalRef.componentInstance.offline = this.offline;
        // modalRef.componentInstance.data = data;

        // modalRef.result.then(rItem => {
        //     // console.log(rItem);
        //     this.appService.save(rItem, this.user.email)
        //         .subscribe({
        //             next: res => {
        //                 let params = {
        //                     email: this.user.email
        //                 }
        //                 this.appService.getApp(res.id, params)
        //                     .subscribe(res => {
        //                         this.app = res;
        //                         this.getCopyRequestList();
        //                     });
        //                 this.toastService.show("App properties saved successfully", { classname: 'bg-success text-light' });
        //             },
        //             error: error => {
        //                 this.toastService.show("App properties saving failed: " + error.error.message, { classname: 'bg-danger text-light' });
        //             }
        //         });
        // }, res => { });
    }

}
