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

import { Component, OnInit, TemplateRef, ChangeDetectorRef, viewChild, inject, ChangeDetectionStrategy, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormService } from '../../../../service/form.service';
import { MailerService } from '../../../../service/mailer.service';
import { NgbModal, NgbDateAdapter, NgbTimeAdapter, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbNavOutlet, NgbInputDatepicker, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { UtilityService } from '../../../../_shared/service/utility.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { PlatformLocation, NgClass, NgStyle, DatePipe, KeyValuePipe, JsonPipe } from '@angular/common';
import { UserService } from '../../../../_shared/service/user.service';
import { AppService } from '../../../../service/app.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPreview } from '@angular/cdk/drag-drop';
import { DatasetService } from '../../../../service/dataset.service';
import { GroupService } from '../../../../service/group.service';
import { CommService } from '../../../../_shared/service/comm.service';
import { NgbUnixTimestampAdapter } from '../../../../_shared/service/date-adapter';
import { NgbUnixTimestampTimeAdapter } from '../../../../_shared/service/time-adapter';
import { EndpointService } from '../../../../service/endpoint.service';
import { btoaUTF, cleanText, extractVariables, hashObject, splitAsList, tblToExcel, toSnakeCase, toSpaceCase } from '../../../../_shared/utils';
import { base, baseApi } from '../../../../_shared/constant.service';
import { BucketService } from '../../../../service/bucket.service';
import { ScreenService } from '../../../../service/screen.service';
import { Observable, first, map, shareReplay, tap, switchMap, of, catchError, forkJoin } from 'rxjs';
import { SafePipe } from '../../../../_shared/pipe/safe.pipe';
import { GroupByPipe } from '../../../../_shared/pipe/group-by.pipe';
import { FilterPipe } from '../../../../_shared/pipe/filter.pipe';
import { EditDatasetComponent } from '../../../../_shared/modal/edit-dataset/edit-dataset.component';
import { CloneFormComponent } from '../../../../_shared/modal/clone-form/clone-form.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { IconPickerComponent } from '../../../../_shared/component/icon-picker/icon-picker.component';
import { NgCmComponent } from '../../../../_shared/component/ng-cm/ng-cm.component';
import { EditFormComponent } from '../../../../_shared/modal/edit-form/edit-form.component';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faThumbtack } from '@fortawesome/free-solid-svg-icons';
import { CognaService } from '../../../../service/cogna.service';
import { EditLookupComponent } from '../../../../_shared/modal/edit-lookup/edit-lookup.component';
import { EditLookupEntryComponent } from '../../../../_shared/modal/edit-lookup-entry/edit-lookup-entry.component';
import { EditMailerComponent } from '../../../../_shared/modal/edit-mailer/edit-mailer.component';
import { EditRoleComponent } from '../../../../_shared/modal/edit-role/edit-role.component';
import { FieldEditComponent } from '../../../../run/_component/field-edit-myds-ifta/field-edit.component';
import { FieldViewComponent } from '../../../../run/_component/field-view.component';
import { EntryService } from '../../../../run/_service/entry.service';
import { LookupService } from '../../../../run/_service/lookup.service';
import { FIELD_SUB_TYPE_MAP, FIELD_TYPE_LIST, HEIGHT_LIST, SIZE_FIX_LIST, SIZE_LIST } from '../../assistant/assistant-knowledge';
import { IconSplitPipe } from '../../../../_shared/pipe/icon-split.pipe';
import { KryptaService } from '../../../../service/krypta.service';
import { AsListPipe } from '../../../../_shared/pipe/as-list.pipe';
import { MetaTrailViewerComponent } from '../../../../_shared/modal/meta-trail-viewer/meta-trail-viewer.component';
import { HttpClient } from '@angular/common/http';
import { MetaTrailService } from '../../../../service/metatrail.service';
import { AssistantPaletteDirective } from '../../assistant/assistant-palette.directive';
import { AssistantLocalContextService } from '../../assistant/assistant-local-context.service';
import { AssistantSidePanelService } from '../../assistant/assistant-side-panel.service';
import { ASSISTANT_PALETTE_DRAG_DELAY, flattenAssistantPalette, groupAssistantPalette } from '../../assistant/assistant-palette';
import { EditorIdChipComponent } from '../editor-id-chip.component';
import { ProcessEditorComponent } from './process-editor/process-editor.component';

@Component({
    selector: 'app-form-editor',
    templateUrl: './form-editor.component.html',
    styleUrls: ['../../../../../assets/css/element-action.css',
        './form-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
    { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
    imports: [FaIconComponent, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent,
        FormsModule, RouterLink, NgClass, NgStyle, CdkDropList, CdkDrag, FieldViewComponent, FieldEditComponent, CdkDragHandle,
        NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbNavOutlet, CdkDragPreview,
        EditFormComponent, NgCmComponent, IconPickerComponent, NgSelectModule, NgbInputDatepicker, CloneFormComponent,
        NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, EditDatasetComponent, FilterPipe, GroupByPipe, SafePipe, DatePipe,
        KeyValuePipe, EditLookupComponent, EditLookupEntryComponent, EditRoleComponent, EditMailerComponent, IconSplitPipe, JsonPipe, AsListPipe, AssistantPaletteDirective,
    MetaTrailViewerComponent, EditorIdChipComponent, ProcessEditorComponent]
})
export class FormEditorComponent implements OnInit {

    itemSearch: string = "";
    formTotal: number = 0;
    formList: any;
    user: any;
    items: any;
    lookupList: any;
    mailerList: any;
    datasetList: any;
    screenList: any;
    curForm: any;
    formError: any;
    curFormId: any;
    formSearchText: string = "";
    data: any;
    formPageSize: number = 9999;
    searchText: string = "";
    formPageNo: number = 1;
    element: any;
    builtInVar: any[] = [{ var: 'imgPath', label: 'Image Path' }];
    showCurFormItem = true
    showPrevFormItem = false;
    showFunc: any = {};
    baseApi = baseApi;
    base = base;
    filterField: string = "";
    readonly headIcon = faThumbtack;
    readonly activeFormTab = signal<string | null>(null);

    sizeList: any[] = SIZE_LIST;
    sizeFixList: any[] = SIZE_FIX_LIST;
    heightList: any[] = HEIGHT_LIST;

    facetList: any[];
    facetMode = ['edit', 'view', 'disabled', 'hidden', 'none'];
    facetTabMode = ['disabled', 'hidden', 'none'];

    typeList: any[] = FIELD_TYPE_LIST;

    subType: any = FIELD_SUB_TYPE_MAP;

    newForm: any = {
        nav: 'simple', type: 'db', sections: [{ sortOrder: 0, size: 'col-sm-12', type: 'section', title: 'Section 1', code: 'section1' }], canEdit: true, canRetract: true, canSave: true, canSubmit: true, validateSave: true,
        x: { facet: 'add,edit,view', restrictAccess: true, accessByUser: true, accessByApprover: true, autoSync: true }
    }

    palettes = signal<any[]>([]);
    paletteSearch = signal('');
    showSuper: boolean = true;
    showPalette: boolean = true;
    buildPalettes() {
        var palettes = [];
        this.typeList.forEach(t => {
            if (this.subType[t.value]) {
                this.subType[t.value].forEach(st => {
                    var obj: any = {
                        label: st.name,
                        item: {
                            type: t.value,
                            subType: st.code,
                            size: 'col-sm-12',
                            readOnly: t.value == 'eval',
                            x: {},
                            v: ['image', 'imagemulti'].indexOf(st.code) > -1 ? { max: 780, q: 0.8 } : {}
                        }
                    };
                    palettes.push(obj);
                });
            } else {
                palettes.push({
                    label: t.name,
                    item: {
                        type: t.value,
                        size: 'col-sm-12',
                        x: {},
                        v: ['scale'].indexOf(t.value) > -1 ? { min: 1, max: 5 } : {}
                    }
                });
            }
        })
        this.palettes.set(palettes);
    }

    readonly paletteGroups = computed(() => groupAssistantPalette(this.palettes(), this.paletteSearch(), true));
    readonly paletteItems = computed(() => flattenAssistantPalette(this.paletteGroups()));
    readonly paletteIcons: Record<string, string> = {
        text: 'align-left', number: 'hashtag', date: 'calendar', select: 'list',
        radio: 'circle', checkbox: 'check-square', checkboxOption: 'check-square',
        simpleOption: 'toggle-on', modelPicker: 'database', scaleTo5: 'star',
        scaleTo10: 'star', scale: 'star', file: 'file',
        imagePreview: 'image', eval: 'terminal', static: 'code', qr: 'qrcode',
        color: 'sliders', btn: 'square', dataset: 'table', screen: 'window-restore',
        map: 'map-marked-alt', speech: 'microphone'
    };

    superItems = [];
    buildSuper() {
        this.superItems = Object.values(this.superForm?.items).map((i: any) => {
            delete i.id;
            if (!i.x) i.x = {};
            i.x.extended = true;
            return {
                label: i.label,
                item: i
            }
        })
    }

    formLoading: boolean; 
    curFormColumns: any[];

    offline: boolean = false;
    editCode: boolean = false;
    editSectionCode: boolean = false;
    previewFacet: string = "edit";
    app: any;

    editFormTpl = viewChild('editFormTpl');

    // Core services
    private formService = inject(FormService);
    private lookupService = inject(LookupService);
    private mailerService = inject(MailerService);

    // Navigation services
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private location = inject(PlatformLocation);

    // UI services
    private modalService = inject(NgbModal);
    private toastService = inject(ToastService);
    private cdr = inject(ChangeDetectorRef);
    private destroyRef = inject(DestroyRef);
    private assistantContext = inject(AssistantLocalContextService).createRegistration();
    readonly assistantPanel = inject(AssistantSidePanelService);
    readonly paletteDragDelay = ASSISTANT_PALETTE_DRAG_DELAY;

    // Business services
    private userService = inject(UserService);
    private appService = inject(AppService);
    private entryService = inject(EntryService);
    private utilityService = inject(UtilityService);
    private groupService = inject(GroupService);
    private bucketService = inject(BucketService);
    private cognaService = inject(CognaService);
    private kryptaService = inject(KryptaService);
    private endpointService = inject(EndpointService);
    private datasetService = inject(DatasetService);
    private screenService = inject(ScreenService);
    private commService = inject(CommService);
    // private http = inject(HttpClient);
    private metaTrailService = inject(MetaTrailService);


    private readonly processEditor = viewChild(ProcessEditorComponent);
    processRefreshVersion = 0;

    scheduleTierLineRedraw() {
        this.processEditor()?.scheduleTierLineRedraw();
    }

    otherAppList: any[] = [];
    ngOnInit() {

        this.destroyRef.onDestroy(() => {
            if (this.curFormId) {
                delete (window as any)['_this_form_' + this.curFormId + '_design'];
            }
            this.assistantContext.clear();
        });

        this.location.onPopState(() => {
            if (document.querySelector('.cm-fullscreen-mode')) {
                return;
            }
            this.modalService.dismissAll('')
        });

        this.utilityService.testOnline$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(online => this.offline = !online);

        this.commService.changeEmitted$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(data => {
                if (data.value == 'import') {
                    this.getFormList(1);
                }
                if (data.value == 'form-add') {
                    this.editForm(this.editFormTpl(), {}, true);
                }
                if (data.key === 'form-detail' && Number(data.value) === Number(this.curFormId)) {
                    this.getFormData(this.curFormId);
                }
            });

        this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((queryParams: Params) => {
            const id = queryParams['id'];
            if (id) {
                this.getFormData(id);
            }
        });

        this.userService.getCreator()
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                tap((user) => {
                    this.user = user;
                    this.cdr.detectChanges();

                    this.appService.getAppMyList({
                        email: this.user.email,
                        size: 999,
                        sort: 'id,desc'
                    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
                        this.otherAppList = res.content;
                    });
                }),
                switchMap(() => this.route.parent.parent.parent.params)
            )
            .subscribe(params => {
                const appId = params['appId'];
                this.buildPalettes();

                if (appId) {
                    let appParams = { email: this.user.email }
                    this.appService.getApp(appId, appParams)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe(res => {
                            this.app = res;
                            this.getFormList(1);
                            this.getLookupList(this.app.id);
                            this.getMailerList();
                            this.getAccessList();
                            this.getBucketList();
                            this.getCognaList();
                            this.getWalletList();
                            this.getDatasetList(this.app.id);
                            this.getScreenList(this.app.id);
                            this.getEndpointList();
                            this.cdr.detectChanges();
                        });
                }
            });

    }

    canEditForm(): boolean {
        if (!this.curForm || !this.curForm.email) return true; 
        if (this.curForm.email.trim() === '') return true; 

        const allowedEmails = this.curForm.email.split(',').map((e: string) => e.trim());
        return allowedEmails.includes(this.user?.email);
    }

    bucketList: any[] = [];
    getBucketList() {
        this.bucketService.getBucketList({ appId: this.app.id })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.bucketList = res.content;
            });
    }

    cognaList: any[] = [];
    getCognaList() {
        this.cognaService.getCognaList({ appId: this.app.id })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.cognaList = res.content;
            });
    }

    walletList: any[] = [];
    getWalletList() {
        this.kryptaService.getWalletList({ appId: this.app.id })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.walletList = res.content;
                this.cdr.detectChanges(); 
            });
    }

    accessList: any[] = [];
    accessMap: any = {};
    getAccessList() {
        this.accessMap = {};
        this.groupService.getGroupList({ appId: this.app.id, size: 999 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.accessList = res.content;
                this.cdr.detectChanges(); 
                this.accessList.forEach(i => {
                    this.accessMap[i.id] = i;
                })
            });
    }

    endpointList: any[] = [];
    getEndpointList() {
        let params = { appId: this.app.id }
        this.endpointService.getEndpointList(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.endpointList = res.content;
                this.cdr.detectChanges(); 
            })
    }

    getLookupList(appId) {
        let params = { appId: appId }
        this.lookupService.getFullLookupList(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.lookupList = res.content;
                this.cdr.detectChanges(); 
            })
    }

    getMailerList() {
        let params = { appId: this.app.id, size: 9999 }
        this.mailerService.getMailerList(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.mailerList = res.content;
                this.cdr.detectChanges(); 
            })
    }

    getDatasetList(appId) {
        this.datasetService.getDatasetList(appId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.datasetList = res;
                this.cdr.detectChanges(); 
            })
    }

    getScreenList(appId) {
        this.screenService.getScreenList(appId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.screenList = res;
                this.cdr.detectChanges(); 
            })
    }

    resetAutoComplete() {
        this.extraAutoCompleteHtml = [];
        this.extraAutoCompleteJs = [
            { c: 1, label: "$form$.canSave", type: "keyword", apply: "$form$.canSave", detail: "Show/hide save button" },
            { c: 1, label: "$form$.canSubmit", type: "keyword", apply: "$form$.canSubmit", detail: "Show/hide submit button" },
            { c: 1, label: "$action$", type: "keyword", apply: "$action$", detail: "Get facet in use" },
            { c: 1, label: "$lookupList$", type: "property", apply: "$lookupList$.#{field-code}", detail: "Get/set lookup list for the field" },
            { c: 2, label: "$el$", type: "text", apply: "$el$.#{field-code}", detail: "Access field\'s metadata" },
            { c: 2, label: "$activate$", type: "function", apply: "$activate$(#{tab-index})", detail: "Activate selected tab/accordion" },
            { c: 2, label: "$activeIndex$", type: "function", apply: "$activeIndex$", detail: "Get current tab/accordion index" },
            { c: 2, label: "$save$", type: "function", apply: "$save$().subscribe(res=>{\n\t#{//after save}\n})", detail: "Save entry data" },
            { c: 2, label: "$saveAndView$", type: "function", apply: "$saveAndView$()", detail: "Save entry data and navigate to view entry" },
            { c: 2, label: "$submit$", type: "function", apply: "$submit$(#{resubmit?})", detail: "Submit entry", info: "After-submit navigation depends on form setting" },
        ];
        this.extraAutoCompleteTier = [];
    }

    dataset: any;
    loadDataset(id) {
        this.datasetService.getDataset(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.dataset = res;
                this.cdr.detectChanges(); 
            })
    }

    codeList: any = {};

    itemExist = (f) => (!f.id && this.codeList[f.code]) || (f.id && f.id != this.codeList[f.code]?.id && this.codeList[f.code]);

    populateCodeList() {
        this.codeList = {};
        this.curForm.sections.filter(s => s.type == 'list')
            .forEach(s => this.codeList[s.code] = { id: s.id, text: 'section: ' + s?.title });
        Object.keys(this.curForm.items)
            .forEach(key => this.codeList[key] = { id: this.curForm.items[key].id, text: 'field: ' + this.curForm.items[key]?.label });
    }

    getSectionItems(form, types: any[]) {
        let items = [];
        form.sections.filter(s => types.indexOf(s.type) > -1)
            .forEach(element => {
                items = items.concat(element.items);
            });
        return items;
    }

    moreAutocomplete() {
        this.formService.moreAutocompleteJs()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                if (res?.list) {
                    this.extraAutoCompleteJs.push(...res.list);
                }
                this.cdr.detectChanges();       
            })
        this.formService.moreAutocompleteHtml()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                if (res?.list) {
                    this.extraAutoCompleteHtml.push(...res.list);
                }
                this.cdr.detectChanges();       
            })
    }

    getFormList(pageNumber) {
        this.formPageNo = pageNumber;
        this.formLoading = true;

        let params = {
            appId: this.app.id,
            size: this.formPageSize,
            page: pageNumber - 1,
            searchText: this.formSearchText
        }

        this.formService.getListBasic(params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.formList = res.content;
                this.formTotal = res.page?.totalElements;
                this.formLoading = false;
                this.commService.emitChange({ key: 'form', value: this.formTotal });
                this.cdr.detectChanges(); 
            }, res => {
                this.formLoading = false;
                this.cdr.detectChanges(); 
            });
    }

    getHiddenList = (list) => list.filter(i => i.hidden == true);

    superForm: any = null; 
    cleanBackendForm: any = null;

    getFormData(id) {
        if (this.isTimeWarpingForm) {
            this.exitTimeWarpForm();
        }

        delete this.superForm
        delete this.formError;
        this.superItems = [];
        if (String(this.curFormId) !== String(id)) this.activeFormTab.set(null);
        this.curFormId = id;
        this.formService.getForm(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {

                this.cleanBackendForm = JSON.parse(JSON.stringify(res));
                
                this.curForm = res;
                this.processRefreshVersion++;
                this.assistantContext.set({ type: 'form', id: Number(res.id), label: res.title });
                this.buildGroupedItems(); 
                this.cdr.detectChanges(); 

                this.curForm.sections.forEach(s => s.parentObj = this.getTab(s.parent));
                this.curForm.sections.sort((a, b) => {
                    const pa = a.parentObj?.sortOrder ?? 0;
                    const pb = b.parentObj?.sortOrder ?? 0;
                    if (pa !== pb) return pa - pb;
                    const sa = a.sortOrder ?? 0;
                    const sb = b.sortOrder ?? 0;
                    return sa - sb;
                });

                this.getLookupIdList(this.curForm.id);
                this.facetList = this.getAsList(this.curForm.x?.facet);
                this.curFormColumns = [];

                this.populateAutoComplete();
                this.populateCodeList();
                if (res?.x?.extended) {
                    this.formService.getForm(res?.x?.extended)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe(r1 => {
                            this.superForm = r1;
                            this.buildSuper();
                            this.cdr.detectChanges();
                        }
                        );
                }

                Reflect.defineProperty(window, '_this_form_' + res.id + '_design', {
                    get: () => {},
                    configurable: true
                }); 

                this.loadTrails(this.curForm.id, 1);
                this.cdr.detectChanges();
                this.scheduleTierLineRedraw();
            }, err => {
                this.formError = err.error;
            })
    }

    compareByIdFn(a, b): boolean {
        return (a && a.id) === (b && b.id);
    }

    exceptCurForm = (form) => this.formList.filter(f => f.id != form.id);

    lookupIds = [];
    lookupKey = {};
    lookupMap = {}; 
    lookup = {}; 
    mod = {};

    private lookupMapCache: { [dataSource: string]: Observable<any> } = {};

    getLookupIdList(id) {
        this.lookupService.getInForm(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.lookupIds = res;
                this.lookupIds.forEach(key => {
                    this.lookupKey[key.code] = {
                        ds: key.dataSource,
                        type: key.type
                    };
                    
                    this.getLookup(key.code, key.dataSourceInit ? this.parseJson(key.dataSourceInit) : null);
                    
                    if (key.type != 'modelPicker') {
                        if (!this.lookupMapCache[key.dataSource]) {
                            this.lookupMapCache[key.dataSource] = this.lookupService.getLookup(key.dataSource).pipe(shareReplay(1));
                        }
                        this.lookupMapCache[key.dataSource]
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe({
                                next: res => {
                                    this.lookupMap[key.dataSource] = res;
                                    this.cdr.detectChanges();
                                },
                                error: err => { }
                            });
                    }

                });
                this.cdr.detectChanges(); 
            });
    }

    parseJson(str) {
        var g = {};
        try { g = JSON.parse(str) } catch (e) { };
        return g;
    }


    insertTextAtCursor(text, cm) {
        cm.insertText("{{" + text + "}}");
    }

    getLookup = (code, params?: any) => {
        this._getLookup(code, params);
    }

    _getLookup = (code, param, cb?, err?) => {
        if (code) {
            this._getLookupObs(code, param, cb, err)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: res => {
                        this.lookup[code] = res;
                        this.cdr.detectChanges(); 
                    }, error: err => {
                    }
                })
        }
    }

    lookupDataObs: any = {};

    _getLookupObs(code, param, cb?, err?): Observable<any> {
        var cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}), null);
        if (this.lookupDataObs[cacheId]) {
            return this.lookupDataObs[cacheId]
        }
        if (this.lookupKey[code].type == 'modelPicker') {
            param = Object.assign(param || {}, { email: this.user.email });
            this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(this.lookupKey[code].ds, param ? param : null)
                .pipe(
                    tap({ next: cb, error: err }), first(), shareReplay(1)
                )
        } else {
            param = Object.assign(param || {}, {});
            this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param ? param : null)
                .pipe(
                    tap({ next: cb, error: err }), first(),
                    map((res: any) => res.content), shareReplay(1)
                )
        }
        return this.lookupDataObs[cacheId];
    }

    editFormData: any;
    editForm(content, data, isNew) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (!isNew) {
            this.formService.getForm(data.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(r1 => {
                    this.editFormData = r1;
                });
        }

        if (!data.x) data.x = {};

        this.editFormData = data;

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(form => {
                if (this.isTimeWarpingForm) this.exitTimeWarpForm();
                
                if (!form.x.extended) {
                    delete form.x.extended;
                }
                this.formService.saveForm(form.appId ?? this.app.id, form)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.getFormList(this.formPageNo);
                            this.getFormData(res.id);
                            this.toastService.show("Form saved successfully", { classname: 'bg-success text-light' });
                            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                        },
                        error: (err) => {
                            this.toastService.show("Form saving failed:" + err.message, { classname: 'bg-danger text-light' });
                        }
                    })
                this.cdr.detectChanges(); 
            }, res => { 
                if (this.isTimeWarpingForm) this.exitTimeWarpForm();
            });
    }

    cloneForm(content) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(cloneFormData => {
                this.formService.cloneForm(cloneFormData.formId, this.app.id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.getFormList(1);
                            this.editForm(this.editFormTpl(), res, false);
                            this.toastService.show("Form cloned successfully", { classname: 'bg-success text-light' });
                        }, error: (err) => {
                            this.toastService.show("Form cloning failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { });
    }

    unlinkPrevForm(formId) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (confirm('Are you sure you want to unlink previous form')) {
            this.formService.unlinkPrevForm(formId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(res => {
                    this.getFormData(formId);
                    this.toastService.show("Previous form successfully unlinked", { classname: 'bg-success text-light' });
                }, res => {
                    this.toastService.show("Previous form unlink failed", { classname: 'bg-danger text-light' });
                })
        }
    }

    removeFormData: any;
    removeForm(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.removeFormData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.formService.removeForm(data)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(res => {
                        this.getFormList(1);
                        delete this.curForm;
                        this.toastService.show("Form removed successfully", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); 
                    }, res => {
                        this.toastService.show("Form removal failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { });
    }

    rcognaExtractor(val) {
        this.editItemData.x.rcognaFields = extractVariables(["$"], val)?.["$"] || [];
    }

    editItemData: any;
    editItemSection: any;
    selectedTierForEf: any;
    tierListForEf: any[] = [];
    editItemFromPalette: boolean = false;

    editItem(content, section, data, sortOrder, fromPalette: boolean = false) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (!data.v) {
            data['v'] = {};
        }
        if (!data.x) {
            data['x'] = { facet: {} };
        }
        if (!data.x.facet) {
            data.x.facet = {};
        }
        this.editItemData = data;

        if (!this.editItemData.x.appId) {
            this.editItemData.x.appId = this.app.id;
        }

        this.editItemSection = section;

        this.selectedTierForEf = null;
        this.tierListForEf = [];
        if (section && section.type === 'approval') {
            this.tierListForEf = this.curForm.tiers
                .filter(t => t.section && t.section.id === section.id)
                .map(t => ({ id: t.id, label: t.name }));

            if (this.tierListForEf.length > 0) {
                this.selectedTierForEf = this.tierListForEf[0].id;
            }
        }

        this.loadOtherAppList(this.editItemData.type, this.editItemData.x.appId);

        if (this.editItemData.type == 'modelPicker' && this.editItemData.dataSource) {
            this.loadDataset(this.editItemData.dataSource);
        } else {
            this.dataset = null;
        }
        this.editItemFromPalette = fromPalette;
        
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                var fieldList = [];
                if (rItem.bulkAdd) {
                    var labels = rItem.label.split(",");
                    labels.forEach(we => {
                        var h = Object.assign({}, rItem, { label: we, code: this.toSnakeCase(we) });
                        fieldList.push(h);
                    })
                } else {
                    fieldList.push(rItem);
                }
                fieldList.forEach((aa, index) => {
                    if (aa.x?.rtxtcls || aa.x?.rtxtgen) {
                        aa.x.rcognaFields = extractVariables(["$"], aa.x?.rcognaTpl)?.["$"] || [];
                    }
                    this.formService.saveItem(this.curForm.id, section.id, aa, sortOrder + index)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe({
                            next: (e) => {
                                this.getFormData(this.curForm.id);
                                this.getLookupIdList(this.curForm.id);
                                this.saveItemOrder(section);
                                this.toastService.show("Item saved successfully", { classname: 'bg-success text-light' });
                                this.cdr.detectChanges(); 
                            }, error: (e) => {
                                this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });
                            }
                        })
                })
                this.cdr.detectChanges(); 

            }, res => { });
    }

    removeItemData: any;
    removeItem(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.removeItemData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                this.formService.removeItem(this.curForm.id, rItem.id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.getFormData(this.curForm.id)
                            this.toastService.show("Item removed successfully", { classname: 'bg-success text-light' });

                        }, error: (error) => {
                            this.toastService.show("Item removal failed", { classname: 'bg-danger text-light' });

                        }
                    })
            }, res => { });
    }

    removeItemSource(formId, id) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.formService.removeItemSource(formId, id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    this.getFormData(this.curForm.id)
                    this.toastService.show("Item removed successfully", { classname: 'bg-success text-light' });
                }, error: err => {
                    this.toastService.show("Item removal failed", { classname: 'bg-danger text-light' });
                }
            })
    }

    reorderItem(section: any, itemRef: any, op: number) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        let index = section.items.findIndex((i: any) => (i.id && i.id === itemRef.id) || (i.code && i.code === itemRef.code));

        if (index > -1 && index + op >= 0 && index + op < section.items.length) {
            this.reorder(section.items, index, op);
            this.saveItemOrder(section);
        }
    }
    getTab = (id) => {
        if (id == "-1") {
            return { id: -1, sortOrder: -1, title: "(HEAD)" }
        } else if (id == "-999") {
            return { id: -999, sortOrder: 999, title: "(BOTTOM)" }
        } else {
            return this.curForm.tabs.filter(e => e.id == id)[0]
        }
    };

    scrollToFormTab(container: HTMLElement, tabId: string | number): void {
        const key = String(tabId);
        const heading = Array.from(container.querySelectorAll<HTMLElement>('[data-form-group]'))
            .find(element => element.dataset['formGroup'] === key);
        if (!heading) {
            this.toastService.show('This tab has no sections to scroll to.', { classname: 'bg-warning text-dark' });
            return;
        }
        const toolbar = container.querySelector<HTMLElement>('.form-editor-tabs > .nav-wrap');
        const top = container.scrollTop + heading.getBoundingClientRect().top
            - container.getBoundingClientRect().top - (toolbar?.offsetHeight ?? 0);
        container.scrollTo({ top, behavior: 'smooth' });
        this.activeFormTab.set(key);
    }


    saveItemOrder(section) {
        var list = section.items
            .map((val, $index) => {
                return { id: val.id, sortOrder: $index }
            });
        return this.formService.saveItemOrder(list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.cdr.detectChanges(); 
                return res;
            });
    }

    editItemTpl = viewChild<TemplateRef<any>>('editItemTpl');

    dropItem(event: CdkDragDrop<any[]>, parent) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (event.previousContainer.id == "palette-pane") {
            var item = event.previousContainer.data[event.previousIndex].item;
            if (['html', 'clearfix'].indexOf(item.subType) > -1) {
                var rnd = Math.floor(1000 + Math.random() * 9000);
                item.hideLabel = true;
                item['label'] = item.subType + '_' + rnd;
                item['code'] = item.subType + '_' + rnd;
            }

            if (!item.x?.extended) {
                this.editItem(this.editItemTpl(), parent, Object.assign({}, item), event.currentIndex - 1, true);
            } else {
                if (!this.curForm.items[item.code]) {
                    this.formService.saveItem(this.curForm.id, parent.id, item, event.currentIndex - 1)
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe({
                            next: (e) => {
                                this.getFormData(this.curForm.id);
                                this.getLookupIdList(this.curForm.id);
                                this.saveItemOrder(parent);
                                this.toastService.show("Item saved successfully", { classname: 'bg-success text-light' });
                            }, error: (e) => {
                                this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });
                            }
                        })
                }
            }

        } else {
            if (event.previousContainer === event.container) {
                moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
                this.saveItemOrder(parent);
            } else {
                transferArrayItem(event.previousContainer.data,
                    event.container.data,
                    event.previousIndex,
                    event.currentIndex);

                this.formService.moveItem(this.curForm.id, event.container.data[event.currentIndex].id, parent.id, event.currentIndex)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(res => {
                        this.cdr.detectChanges(); 
                    });

            }
        }
    }

    getTabList(pageNumber) {
        this.formService.getTabList(this.curForm.id, pageNumber)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.curForm.tabs = res.content;
                this.cdr.detectChanges(); 
            })
    }

    editSectionData: any;
    editSection(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (!data.x) {
            data['x'] = { facet: {} };
        }
        if (!data.x.facet) {
            data.x.facet = {};
        }
        this.editSectionData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(section => {
                this.formService.saveSection(this.curForm.id, section)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(res => {
                        this.getFormData(this.curForm.id)
                        this.toastService.show("Section saved successfully", { classname: 'bg-success text-light' });
                    }, error => {
                        this.toastService.show("Section saving failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { });
    }

    checkSectionField = (code) => this.editSectionData.x?.tableFields?.includes(code);
    toggleSectionField = (code) => {
        if (!this.editSectionData.x?.tableFields) this.editSectionData.x.tableFields = [];
        if (this.editSectionData.x?.tableFields.includes(code)) {
            this.editSectionData.x.tableFields = this.editSectionData.x?.tableFields.filter(e => e != code);
        } else {
            this.editSectionData.x?.tableFields.push(code);
        }
    }

    checkAllSectionFields() {
        if (this.editSectionData.x?.tableFields) {
            this.editSectionData.x.tableFields = []
        }
        this.editSectionData.x.tableFields = this.editSectionData.items.filter(i => i.subType != 'clearfix').map(i => i.code);
    }

    uncheckAllSectionFields() {
        if (this.editSectionData.x?.tableFields) {
            this.editSectionData.x.tableFields = []
        }
    }

    ensureTableStyleCleared() {
        if (this.editSectionData.inline) {
            delete this.editSectionData.x.tableStyle;
            this.editSectionData.x.tableFields = []
        }
    }

    clearSortable() {
        if (!this.editSectionData.x?.sortable) {
            delete this.editSectionData.x?.defSort;
            delete this.editSectionData.x?.defSortDir;
            delete this.editSectionData.x?.userSort;
        }
    }

    defaultMapLat: any = {}
    prepareMapCoordinate() {
        if (this.editItemData.type == 'map' && !this.editItemData.x?.useCurrent) {
            this.editItemData.x.default = this.editItemData.subType == 'multiple' ? [this.defaultMapLat] : this.defaultMapLat;
        } else {
            delete this.editItemData.x.default;
        }
    }

    collapsibleItemGroup: any = {};
    viewItems(content) {
        this.buildGroupedItems(); 
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(res => { }, err => { });
    }

    backendEfSave(item, section, force, tierId?) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        let sectionCode = '';
        if (section?.type == 'list') {
            sectionCode = section.code;
        }
        this.formService.saveItemOnly(this.curForm.id, item)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (e) => {
                    this.backendEf(item, sectionCode, force, tierId);
                }, error: (e) => {
                    this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });
                    this.cdr.detectChanges(); 
                }
            })

    }

    force: any = {};
    showlog: any = {};
    efResult: any = {};
    efLoading: any = {};
    backendEf(item, sectionCode, force, tierId?) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.efLoading[item.code] = true;
        this.cdr.detectChanges();
        this.formService.backendEf(this.curForm.id, item.code, sectionCode, force == true, tierId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                let result = `<table width="100%">
                            <tr><td>Success</td><td>: ${res.successCount}</td></tr>
                            <tr><td>Failed</td><td>: ${res.errorCount}</td></tr>
                            <tr><td>Not empty (unchanged)</td><td>: ${res.notEmptyCount}</td></tr>
                          </table>`;
                this.efResult[item.code] = res;

                this.toastService.show("Backend EF evaluated successfully " + result + " ", { classname: 'bg-success text-light' });
                this.efLoading[item.code] = false;
                this.cdr.detectChanges(); 
            })
    }

    removeSectionData: any;
    removeSection(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.removeSectionData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((data) => {
                this.formService.removeSection(data.id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.getFormData(this.curForm.id);
                            this.toastService.show("Section removed successfully", { classname: 'bg-success text-light' });

                        }, error: (err) => {
                            this.toastService.show("Section removal failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { });
    }

    reorderSection(list, index, op) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (index > -1 && index + op >= 0 && index + op < list.length) {
            this.reorder(list, index, op);
            this.saveSectionOrder(this.curForm)
        }
    }

    saveSectionOrder(form) {
        var list = form.sections
            .map((val, $index) => {
                return { id: val.id, sortOrder: val.sortOrder }
            });

        return this.formService.saveSectionOrder(list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                return res;
            });
    }

    editTabData: any;
    editTab(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (!data.x) {
            data['x'] = { facet: {} };
        }
        if (!data.x.facet) {
            data.x.facet = {};
        }
        this.editTabData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(tab => {
                this.formService.saveTab(this.curForm.id, tab)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(res => {
                        this.getTabList(1)
                        this.toastService.show("Tab saved successfully", { classname: 'bg-success text-light' });
                    }, error => {
                        this.toastService.show("Tab saving failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { });
    }

    removeTabData: any;
    removeTab(content, data) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.removeTabData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((data) => {
                this.formService.removeTab(data.id)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.getTabList(1);
                            this.toastService.show("Tab removed successfully", { classname: 'bg-success text-light' });

                        }, error: (err) => {
                            this.toastService.show("Tab removal failed", { classname: 'bg-danger text-light' });

                        }
                    })
            }, res => { });
    }

    checkCode = (code) => {
        try {
            new Function(code);
            return "OK";
        } catch (e) {
            return "ERR: " + e;
        }
    };

    reorderTab(tab: any, op: number) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        let index = this.curForm.tabs.findIndex((t: any) => t.id === tab.id);

        if (index > -1 && index + op >= 0 && index + op < this.curForm.tabs.length) {
            this.reorder(this.curForm.tabs, index, op);
            this.saveTabOrder();
        }
    }
    saveTabOrder() {
        var list = this.curForm.tabs
            .map((val) => {
                return { id: val.id, sortOrder: val.sortOrder }
            });
        return this.formService.saveTabOrder(list)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                return res;
            });
    }

    getAsList = splitAsList;

    reorder(items, index, op) {
        items[index + op].altClass = 'swapStart';
        items[index].altClass = 'swapStart';

        items.forEach((i, $index) => {
            i.sortOrder = $index;
        }); 

        var temp = items[index + op];
        var tempSortOrder = items[index + op].sortOrder;
        items[index + op].sortOrder = items[index].sortOrder;
        items[index + op] = items[index];

        items[index].sortOrder = tempSortOrder;
        items[index] = temp;
        
        setTimeout(() => {
            items[index + op].altClass = 'swapEnd';
            items[index].altClass = 'swapEnd';
            this.processEditor()?.refreshView();
            this.cdr.detectChanges(); 
        }, 500);
    }

    extraAutoCompleteHtml: any[] = [];
    extraAutoCompleteJs: any[] = [];
    extraAutoCompleteTier: any[] = [];
    populateAutoComplete() {

        this.resetAutoComplete();

        Object.keys(this.curForm?.items).forEach(key => {
            var value = this.curForm?.items[key];
            if (this.curForm?.items[key].type != 'static') {
                if (['select', 'radio'].indexOf(value?.type) > -1) {
                    this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}.name}}`, type: "text", apply: `{{$.${key}.name}}`, label: value.label })
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}.name`, type: "text", apply: `$.${key}.name`, label: value.label })
                } else if (['date'].indexOf(value?.type) > -1) {
                    this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}|date:'DD-MM-YYYY'}}`, label: value.label })
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `$.${key}`, label: value.label })
                } else if (['file'].indexOf(value?.type) > -1) {
                    this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}|src}}`, label: value.label })
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `"${baseApi}/entry/file/" + $.${key}`, label: value.label })
                } else {
                    this.extraAutoCompleteHtml.push({ c: 1, detail: `{{$.${key}}}`, type: "text", apply: `{{$.${key}}}`, label: value.label })
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `$.${key}`, label: value.label })
                }
            }
        });

        this.curForm?.tiers.forEach(t => {
            this.extraAutoCompleteJs.push({ c: 1, label: `(tierId:${t.id}) ${t.name}`, apply: t.id + "", detail: t.name });
            this.extraAutoCompleteHtml.push({ c: 1, label: `(tierId:${t.id}) ${t.name}`, apply: t.id + "", detail: t.name });

        })

        if (this.curForm?.prev) {
            Object.keys(this.curForm?.prev?.items).forEach(key => {
                var value = this.curForm?.prev?.items[key];
                if (this.curForm?.prev?.items[key].type != 'static') {
                    this.extraAutoCompleteHtml.push({ c: 1, label: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, type: "text", apply: `{{$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}}}`, detail: value.label })
                    this.extraAutoCompleteJs.push({ c: 1, label: `$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, type: "text", apply: `$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, detail: value.label })
                }
            });
        }
        if (this.curForm) {
            this.curForm?.sections?.forEach(section => {
                if (section.type == 'list') {
                    this.extraAutoCompleteHtml.push({ c: 2, label: '(child) $.' + section.code, type: "text", apply: this.getLoopCode(section), detail: '' + section.title })
                    this.extraAutoCompleteJs.push({ c: 2, label: '(child) $.' + section.code, type: "text", apply: this.getLoopCodeJs(section), detail: '' + section.title })
                }
            })
        }
        this.accessList?.forEach(i => {
            this.extraAutoCompleteJs.push({ c: 1, label: `(groupId:${i.id}) ${i.name}`, apply: i.id + "", detail: i.name });
            this.extraAutoCompleteHtml.push({ c: 1, label: `(groupId:${i.id}) " ${i.name}`, apply: i.id + "", detail: i.name });
        });
        this.datasetList?.forEach(i => {
            this.extraAutoCompleteJs.push({ c: 1, type: 'text', label: `(datasetId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
            this.extraAutoCompleteJs.push({ c: 2, type: 'function', label: `(http-dataset:${i.id}) ${i.title}`, apply: `$http$(\"${baseApi}/entry/list?datasetId=${i.id}&email=\"+$user$.email, res=>{\n\t$this$.dataset_${i.id} = res.content;\n\t$this$.dataset_${i.id}_total = res.page?.totalElements;\n\t#{//more codes}\n})`, detail: i.title });
        });
        this.formList?.forEach(i => {
            this.extraAutoCompleteJs.push({ c: 1, type: 'text', label: `(formId:${i.id}) ${i.title}`, apply: "" + i.id + "", detail: i.title });
            this.extraAutoCompleteJs.push({ c: 2, type: 'function', label: `(http-form:${i.id}) ${i.title}`, apply: `$http$(\"${baseApi}/entry/by-params?formId=${i.id}&key=\"+value, res=>{\n\t$this$.entry_${i.id} = res;\n\t#{//more codes}\n})`, detail: i.title });
        });

        this.moreAutocomplete();

        this.extraAutoCompleteTier = [
            ...this.extraAutoCompleteJs,
            { c: 1, label: '$$_.status', apply: "$$_.status", detail: 'Tier approval status' },
            { c: 1, label: '$$_.remark', apply: "$$_.remark", detail: 'Tier approval remark' },
            { c: 1, label: '$$_.timestamp', apply: "$$_.timestamp", detail: 'Tier approval timestamp' },
            { c: 1, label: '$$.', apply: "$$.#{field-code}", detail: 'Tier approval form data' },
        ]
    }

    getLoopCode = (section) => "<x-foreach $=\"i of $." + section.code + "\">\n" + this.getItems(section) + "\n\t${}\n<\/x-foreach>"
    getLoopCodeJs = (section) => "$." + section.code + ".forEach(i=>{\n" + this.getItemsJs(section) + "\n\t${//More codes}\n})";

    getItems(section) {
        return section.items
            .filter(i => this.curForm.items[i.code].type != 'static')
            .map(i => {
                var type = this.curForm.items[i.code].type;
                var pipe = ''
                if (type == 'date') {
                    pipe = '|date';
                } else if (['select', 'radio'].indexOf(type) > -1) {
                    pipe = '.name';
                } else if (type == 'qr') {
                    pipe = '|qr';
                } else if (type == 'file') {
                    pipe = '|src';
                }
                return '\t{{i.' + i.code + pipe + '}}';
            })
            .join("<br/>\n");
    }
    getItemsJs(section) {
        return section.items
            .filter(i => this.curForm.items[i.code].type != 'static')
            .map(i => {
                var type = this.curForm.items[i.code].type;
                var pipe = ''
                if (['select', 'radio'].indexOf(type) > -1) {
                    pipe = '.name';
                }
                return '\ti.' + i.code + pipe + ';';
            })
            .join("\n");
    }

    swapPositions = (array, a, b) => [array[a], array[b]] = [array[b], array[a]];

    toSpaceCase = toSpaceCase; 
    toSnakeCase = toSnakeCase; 
    cleanText = cleanText;

    removeIndex(parent, list, code) {
        parent[list] = parent[list].filter(el => {
            return el.code !== code;
        })
    }

    clearPreset(item, key) {
        delete item[key];
    }

    modelPickerData: any = {}
    setModelPickerData(obj) {
        this.modelPickerData = obj;
    }

    importExcelData: any;
    importExcel(content) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.importExcelData = null;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {

            }, res => { })
    }

    moveFormToAppData: any = {};
    formRelatedComps: any = {};
    moveFormToApp(content) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.formService.getRelatedComps(this.curFormId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(res => {
                this.formRelatedComps = res;
                history.pushState(null, null, window.location.href);
                this.modalService.open(content, { backdrop: 'static' })
                    .result.then(data => {
                        this.moveFormToAppData.datasetIds = this.formRelatedComps.dataset.filter(e => e.isChecked).map(e => e.id);
                        this.moveFormToAppData.screenIds = this.formRelatedComps.screen.filter(e => e.isChecked).map(e => e.id);
                        this.formService.moveToApp(this.curFormId, this.moveFormToAppData)
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe(data => {
                                this.commService.emitChange({ key: 'form', value: 0 });
                                this.commService.emitChange({ key: 'dataset', value: 0 });
                                this.commService.emitChange({ key: 'screen', value: 0 });
                                this.toastService.show("Form moved successfully", { classname: 'bg-success text-light' });
                                this.cdr.detectChanges(); 
                            });
                        this.cdr.detectChanges(); 

                    }, res => { })
            });
    }

    formJsonSchema: any;
    viewJsonSchema(content) {
        this.cognaService.getFormatter(this.curFormId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: res => {
                    let schema = {
                        "$schema": "https://json-schema.org/draft/2020-12/schema",
                        "$id": this.baseApi + '/cogna/get-formatter/' + this.curFormId,
                        "title": this.curForm?.title,
                        "description": this.curForm?.description,
                        "type": "object",
                        "properties": {
                            "id": { "type": "integer", "description": "System generated unique ID" },
                            "data": {
                                "type": "object",
                                "properties": {
                                    ...{
                                        "$id": { "type": "integer", "description": "System generated unique ID" },
                                        "$code": { "type": "string", "description": "Generated code using code formatter" },
                                        "$counter": { "type": "integer", "description": "Form auto-counter" }
                                    }, ...JSON.parse(res.schema)
                                }
                            },
                            "email": {
                                "type": "string"
                            }
                        }
                    }

                    this.formJsonSchema = schema;
                    this.cdr.detectChanges(); 

                    history.pushState(null, null, window.location.href);
                    this.modalService.open(content, { backdrop: 'static' })
                        .result.then(data => {
                        }, res => { })
                },
                error: err => {
                    alert("Failed to get the JSON Schema")
                }
            })
    }

    createField: boolean;
    createDataset: boolean;
    createDashboard: boolean;
    importToLive: boolean;
    importFileType: string = 'xlsx';
    file: any;
    importLoading: boolean = false;
    uploadExcel($event, createField, createDataset, createDashboard, importToLive, format) {
        if ($event.target.files && $event.target.files.length) {
            this.importLoading = true;
            this.formService.uploadData(this.curForm.id, $event.target.files[0], this.user.email, createField, createDataset, createDashboard, importToLive, format)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (res) => {
                        this.importExcelData = res;
                        this.importLoading = false;
                        this.getFormData(this.curFormId);
                        this.commService.emitChange({ key: 'form', value: "import" });
                        this.toastService.show("Data " + format + " successfully imported", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); 

                    }, error: (error) => {
                        this.importExcelData = {
                            success: false,
                            message: error.message
                        }
                        this.importLoading = false;
                        this.cdr.detectChanges(); 
                    }
                })
        }
    }

    clearEntry() {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        if (prompt("Are you sure you want to permanently delete entries of this form?\n Type 'delete' and press OK to proceed") == 'delete') {
            if (confirm("Are you sure? This action is not reversible. The entries will be permanently removed.")) {
                this.formService.clearData(this.curFormId)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: res => {
                            this.toastService.show("Entry removed: " + res.rows + ", Attachment removed: " + res.files, { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); 
                        }, error: err => {
                            this.toastService.show("Entry removal failed", { classname: 'bg-danger text-light' });
                        }
                    });
            }
        }
    }

    notEmptyObject = (obj: any) => obj && Object.keys(obj).length > 0;

    loadOtherAppList(type, appId) {
        if (['modelPicker', 'dataset'].indexOf(type) > -1) {
            this.getDatasetList(appId);
        }
        if (['screen'].indexOf(type) > -1) {
            this.getScreenList(appId);
        }
        if (['select', 'radio', 'radioBtn', 'checkboxOption', 'text'].indexOf(type) > -1) {
            this.getLookupList(appId);
        }
    }

    editDatasetData: any;
    editDataset(content, datasetId) {
        this.datasetService.getDataset(datasetId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(dataset => {
                this.editDatasetData = dataset;
                history.pushState(null, null, window.location.href);
                this.modalService.open(content, { backdrop: 'static' })
                    .result.then(data => {
                        this.datasetService.saveDataset(this.app.id, data)
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe(res => {
                                this.toastService.show("Dataset successfully saved");
                                this.cdr.detectChanges(); 
                            })
                    }, res => { })
                this.cdr.detectChanges(); 
            })
    }

    trailsSearchText: string = "";
    trails: any[] = [];
    trailsTotal: number = 0;
    trailsPageSize: number = 25;
    trailsPageNumber: number = 1;
    loadTrails(id, pageNumber, trailsPageSize?) {
        this.trailsPageNumber = pageNumber;
        if (trailsPageSize) {
            this.trailsPageSize = trailsPageSize
        }
        var params = {
            page: pageNumber - 1,
            size: this.trailsPageSize,
            searchText: this.trailsSearchText,
            actions: this.trailStatusFilter,
            sort: ['timestamp,desc']
        }
        if (this.trailFrom) {
            params['dateFrom'] = this.trailFrom;
        }
        if (this.trailTo) {
            params['dateTo'] = this.trailTo;
        }
        this.formService.getEntryTrailByFormId(id, params)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(trail => {
                this.trails = trail.content;
                this.trailsTotal = trail.page?.totalElements;
                this.cdr.detectChanges(); 
            });
    }
    viewEntryTrails(content) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(res => { }, err => { });
    }

    showPossibleTrailAction: boolean;

    undelete(entryId, trailId) {
        if (confirm('Are you sure you want to restore this entry?')) {
            this.formService.undeleteEntry(entryId, trailId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: res => {
                        this.loadTrails(this.curForm.id, this.trailsPageNumber);
                        this.toastService.show(`Entry restored: ${res.entry}<br/> Approval restored: ${res.approval}`, { classname: 'bg-success text-light' });
                    }, error: err => {
                        this.toastService.show(`Entry restoration failed`, { classname: 'bg-danger text-light' });
                    }
                })
        }
    }

    undo(entryId, trailId) {
        if (confirm("Are you sure you want to undo this action?")) {
            this.formService.undoEntry(entryId, trailId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: res => {
                        this.loadTrails(this.curForm.id, this.trailsPageNumber);
                        this.toastService.show(`Entry restored: ${res.entry}<br/> Approval restored: ${res.approval}`, { classname: 'bg-success text-light' });
                    }, error: err => {
                        this.toastService.show(`Entry restoration failed`, { classname: 'bg-danger text-light' });
                    }
                })
        }
    }

    trailStatusMap = {
        created: 'Created',
        saved: 'Saved',
        updated: 'Updated',
        xupdated: 'Saved/Updated and reverted',
        reverted: 'Reverted',
        removed: 'Removed',
        xremoved: 'Removed (restored)',
        restored: 'Restored',
        retracted: 'Retracted',
    }
    trailStatusList = Object.keys(this.trailStatusMap);
    trailStatusFilter: any[] = this.trailStatusList;
    trailFrom: any;
    trailTo: any;
    checkTrailFilter(c) {
        return this.trailStatusFilter ? this.trailStatusFilter?.filter(v => v == c).length > 0 : false;
    }

    toggleTrailFilter(c) {
        if (this.checkTrailFilter(c)) {
            this.trailStatusFilter = this.trailStatusFilter?.filter(v => v != c);
        } else {
            if (!this.trailStatusFilter) {
                this.trailStatusFilter = [];
            }
            this.trailStatusFilter = this.trailStatusFilter.concat([c]);
        }
        this.loadTrails(this.curForm.id, 1);
    }

    exportTrailToExcel() {
        tblToExcel("form-" + this.curForm.title, document.querySelector("#form_trail_" + this.curForm.id).outerHTML)
    }

    genView(formId) {
        this.formService.genView(formId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: res => this.toastService.show("RDB view successfully created/updated") })
    }

    futureLookupId: number;
    editLookupData: any = {};
    editLookup(content, item) {
        this.editLookupData = item;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.lookupService.save(this.user.email, this.app.id, data)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (res) => {
                            this.getLookupList(this.app.id);
                            item.dataSource = res.id;
                            this.lookupMap[res.id] = res;
                            this.editItemData.dataSource = res.id;
                            this.toastService.show("Lookup successfully saved", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); 
                        }, error: (err) => {
                            this.toastService.show("Lookup saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { })
    }

    editLookupItem: any = {};
    editLookupEntryData: any = {};
    editLookupEntry(content, field, dsId, data) {
        this.lookupService.getLookup(dsId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(lookup => {
                this.editLookupItem = lookup;
                this.editLookupEntryData = { enabled: 1 };
                history.pushState(null, null, window.location.href);
                this.modalService.open(content, { backdrop: 'static' })
                    .result.then(data => {
                        if (lookup.x?.codeHidden) {
                            data.code = data.name
                        }
                        this.lookupService.saveEntry(lookup.id, data)
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe({
                                next: (res) => {
                                    let param = field.dataSourceInit ? this.parseJson(field.dataSourceInit) : null;
                                    var cacheId = 'key_' + btoaUTF(this.lookupKey[field.code].ds + hashObject(param ?? {}), null);
                                    delete this.lookupDataObs[cacheId];

                                    this.getLookup(field.code, param);
                                    this.toastService.show("Entry successfully saved", { classname: 'bg-success text-light' });
                                }, error: (err) => {
                                    this.toastService.show("Entry saving failed", { classname: 'bg-danger text-light' });
                                }
                            })
                    }, res => { })
            })
    }

    editGroupData: any;
    editGroup(content, group, obj, prop, multi) {
        this.editGroupData = group;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.groupService.save(this.app.id, data)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(res => {
                        this.getAccessList();
                        if (multi) {
                            if (!obj[prop]) {
                                obj[prop] = [];
                            }
                            obj[prop] = obj[prop].concat(res.id);
                        } else {
                            obj[prop] = res.id;
                        }
                        this.toastService.show("Group successfully saved", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); 
                    }, res => {
                        this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { })
    }

    editMailerData: any;
    editMailer = (content, mailer, obj, prop) => {
        if (!mailer.content) mailer.content = '';
        this.editMailerData = mailer;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
                this.mailerService.save(this.user.email, this.app.id, data)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(res => {
                        this.getMailerList();
                        this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
                        if (!obj[prop]) {
                            obj[prop] = [];
                        }
                        obj[prop] = obj[prop].concat(res.id);
                        this.cdr.detectChanges(); 
                    }, res => {
                        this.toastService.show("Template saving failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { })
    }

    groupedItems: { sectionTitle: string, sectionCode: string, sectionType: string, tiers?: any[], items: any[], isOrphan?: boolean }[] = [];
    selectedTierView: any = {}; 

    buildGroupedItems() {
        this.groupedItems = [];
        const seenCodes = new Set<string>();

        if (this.curForm && this.curForm.sections) {
            this.curForm.sections.forEach(section => {
                const sectionItems = [];
                if (section.items) {
                    section.items.forEach(itemRef => {
                        seenCodes.add(itemRef.code);
                        if (this.curForm.items && this.curForm.items[itemRef.code]) {
                            sectionItems.push(this.curForm.items[itemRef.code]);
                        }
                    });
                }

                let tiers = [];
                if (section.type === 'approval') {
                    tiers = this.curForm.tiers
                        .filter(t => t.section && t.section.id === section.id)
                        .map(t => ({ id: t.id, label: t.name }));

                    if (tiers.length > 0) {
                        sectionItems.forEach(f => {
                            if (!this.selectedTierView[f.code]) {
                                this.selectedTierView[f.code] = tiers[0].id;
                            }
                        });
                    }
                }

                this.groupedItems.push({
                    sectionTitle: section.title || '(No Title)',
                    sectionCode: section.type === 'list' ? section.code : '',
                    sectionType: section.type,
                    tiers: tiers,
                    items: sectionItems
                });
            });
        }

        const orphanedItems = [];
        if (this.curForm && this.curForm.items) {
            Object.keys(this.curForm.items).forEach(code => {
                if (!seenCodes.has(code)) {
                    orphanedItems.push(this.curForm.items[code]);
                }
            });
        }

        if (orphanedItems.length > 0) {
            this.groupedItems.push({
                sectionTitle: 'Orphaned Fields',
                sectionCode: '',
                sectionType: '',
                items: orphanedItems,
                isOrphan: true
            });
        }
    }

    compareByCodeFn = (a, b): boolean => (a && a.code) === (b && b.code);

    viewSectionJsonData: any;

    viewSectionJson(content: any, section: any) {
        let sectionClone = JSON.parse(JSON.stringify(section));
        delete sectionClone.id; 
        
        let itemsClone: any = {};

        if (sectionClone.items && Array.isArray(sectionClone.items)) {
            sectionClone.items.forEach(ref => {
                delete ref.id; 
                
                if (this.curForm.items && this.curForm.items[ref.code]) {
                    let itemObj = JSON.parse(JSON.stringify(this.curForm.items[ref.code]));
                    delete itemObj.id; 
                    itemsClone[ref.code] = itemObj;
                }
            });
        }

        this.viewSectionJsonData = {
            sourceFormId: this.curForm.id, 
            items: itemsClone,
            section: sectionClone
        };
        
        history.pushState(null, '', window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg', scrollable: true }).result.then(() => {}, () => {});
    }

    copyToClipboard(data: any) {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
            this.toastService.show("JSON copied to clipboard", { classname: 'bg-success text-light' });
        });
    }

    pastedSectionJson: string = '';
    pasteSuffix: string = '';
    parsedPasteData: any = null;
    isSameForm: boolean = false;

    onPasteJsonChange(val: string) {
        try {
            this.parsedPasteData = JSON.parse(val);
            this.isSameForm = this.parsedPasteData.sourceFormId === this.curForm.id;
        } catch(e) {
            this.parsedPasteData = null;
            this.isSameForm = false;
        }
    }

    pasteSection(content: any) {
        if (this.isTimeWarpingForm) { 
            this.toastService.show("Action disabled during TimeWarp.", { classname: 'bg-warning text-dark' }); 
            return; 
        }

        this.pastedSectionJson = '';
        this.pasteSuffix = '';
        this.parsedPasteData = null;
        this.isSameForm = false;

        history.pushState(null, '', window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(result => {
                if (result !== 'proceed' || !this.parsedPasteData) return;

                try {
                    let parsed = this.parsedPasteData;
                    let section = parsed.section || parsed;
                    let items = parsed.items || {};

                    if (this.pasteSuffix) {
                        if (section.code) section.code += this.pasteSuffix;
                        const newItems: any = {};
                        
                        Object.entries(items).forEach(([key, item]: [string, any]) => {
                            if (item.code) item.code += this.pasteSuffix;
                            newItems[key + this.pasteSuffix] = item;
                        });
                        items = newItems;
                    }

                    section.sortOrder = this.curForm.sections?.length || 0;
                    section.items = []; 

                    this.formService.saveSection(this.curForm.id, section).pipe(
                        takeUntilDestroyed(this.destroyRef),
                        switchMap((savedSection:any) => {
                            const itemKeys = Object.keys(items);
                            
                            if (itemKeys.length === 0) return of(null);

                            const saveItemRequests = itemKeys.map((k, index) => 
                                this.formService.saveItem(this.curForm.id, savedSection.id, items[k], index).pipe(
                                    catchError(() => {
                                        this.toastService.show(`Failed to save item: ${k}`, { classname: 'bg-danger text-light' });
                                        return of(null); 
                                    })
                                )
                            );

                            return forkJoin(saveItemRequests);
                        })
                    ).subscribe({
                        next: () => {
                            this.getFormData(this.curForm.id);
                            this.getLookupIdList(this.curForm.id);
                            this.toastService.show("Section pasted successfully", { classname: 'bg-success text-light' });
                        },
                        error: () => {
                            this.toastService.show("Failed to paste section", { classname: 'bg-danger text-light' });
                        }
                    });
                    
                } catch (e) {
                    this.toastService.show("Invalid data format during paste", { classname: 'bg-danger text-light' });
                }
            }, () => {});
    }

 // ==========================================
    // META TRAILS LOGIC
    // ==========================================
    currentMetaTrailScope: string = "";
    currentObj: any = null;

    viewMetaTrails(content: any, scope: string, currentObj: any) {
        this.currentMetaTrailScope = scope;
        this.currentObj = currentObj;
        history.pushState(null, '', window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' }).result.then(() => {}, () => {});
    }

    onTrailReverted(modalCloseFn: any) {
        this.getFormData(this.curForm.id); 
    }

    // ==========================================
    // TIMEWARP LOGIC
    // ==========================================
    timeWarpFormTrails: any[] = [];
    liveFormSnapshot: any = null;
    timeWarpFormIndex: number = 0;
    isTimeWarpingForm: boolean = false;

    private clone = <T>(obj: T): T => obj ? JSON.parse(JSON.stringify(obj)) : obj;

    toggleTimeWarpForm() {
        this.isTimeWarpingForm ? this.exitTimeWarpForm() : this.startTimeWarpForm();
    }

    startTimeWarpForm() {
        this.metaTrailService.getMetaTrails(`form_${this.curForm.id}`, { sort: 'timestamp,desc', size: 99 }).subscribe({
            next: (res) => {
                const recentTrails = (res.content || []).reverse();
                const trails = recentTrails?.filter((t: any) => ['form', 'form_item', 'form_section'].includes(t.module?.toLowerCase())) || [];
                if (!trails.length) {
                    this.toastService.show("No Form-level MetaTrail history available.", { classname: 'bg-warning text-dark' });
                    return;
                }

                this.liveFormSnapshot = this.clone(this.curForm);
                this.timeWarpFormTrails = [...trails, {
                    timestamp: new Date().toISOString(),
                    action: 'CURRENT',
                    email: this.user?.email || 'You',
                    module: 'form',
                    data: this.clone(this.liveFormSnapshot)
                }];

                this.isTimeWarpingForm = true;
                this.timeWarpFormIndex = this.timeWarpFormTrails.length - 1;
                this.applyTimeWarpForm(this.timeWarpFormIndex);
            },
            error: () => this.toastService.show("Failed to load MetaTrails for TimeWarp.", { classname: 'bg-danger text-light' })
        });
    }

    applyTimeWarpForm(index: number) {
        if (!this.timeWarpFormTrails[index]) return;

        let baseIdx = index;
        while (baseIdx >= 0 && this.timeWarpFormTrails[baseIdx].module?.toLowerCase() !== 'form') baseIdx--;
        if (baseIdx < 0) return;

        this.applyFormSnapshot(this.timeWarpFormTrails[baseIdx].data);

        for (let i = baseIdx + 1; i <= index; i++) {
            const { action, data, moduleId } = this.timeWarpFormTrails[i];
            const module = this.timeWarpFormTrails[i].module?.toLowerCase();
            const isRemoved = 'delete'==action?.toLowerCase();

            if (module === 'form_item' && data?.code) {
                isRemoved ? delete this.curForm.items[data.code] : this.curForm.items[data.code] = this.clone(data);
            } else if (module === 'form_section' && data) {
                const sId = data.id || moduleId;
                const secIdx = this.curForm.sections.findIndex((s: any) => (s.id || s.code) === (sId || data.code));

                if (isRemoved) {
                    if (secIdx > -1) this.curForm.sections.splice(secIdx, 1);
                } else {
                    const snap = this.clone(data);
                    if (secIdx > -1) {
                        snap.items = snap.items?.length ? snap.items : (this.curForm.sections[secIdx].items || []);
                        this.curForm.sections[secIdx] = snap;
                    } else {
                        snap.items ||= [];
                        this.curForm.sections.push(snap);
                    }
                }
            }
        }

        // Map orphaned items to sections
        const assignedCodes = new Set<string>();
        this.curForm.sections.forEach((sec: any) => sec.items?.forEach((ref: any) => assignedCodes.add(ref.code)));

        Object.keys(this.curForm.items).forEach(code => {
            if (!assignedCodes.has(code)) {
                let targetSec = this.curForm.sections.find((s: any) => 
                    (this.liveFormSnapshot.sections || []).find((ls: any) => ls.id === s.id)?.items?.some((r: any) => r.code === code)
                ) || this.curForm.sections[0];

                if (targetSec) {
                    targetSec.items ||= [];
                    const liveRef = this.liveFormSnapshot.sections?.flatMap((s:any)=>s.items).find((r:any)=>r.code===code);
                    targetSec.items.push(liveRef ? this.clone(liveRef) : { code, sortOrder: targetSec.items.length });
                }
            }
        });

        this.finalizeFormView();
    }

    exitTimeWarpForm() {
        if (this.liveFormSnapshot) {
            this.applyFormSnapshot(this.liveFormSnapshot);
            this.finalizeFormView();
        }
        this.isTimeWarpingForm = false;
        this.liveFormSnapshot = null;
        this.cdr.detectChanges();
    }

    // restoreTimeWarpFormVersion() {
    //     const selectedTrail = this.timeWarpFormTrails[this.timeWarpFormIndex];

    //     if (!selectedTrail?.id || selectedTrail.action === 'CURRENT') {
    //         this.toastService.show("You are already on the current version.", { classname: 'bg-info text-dark' });
    //         this.exitTimeWarpForm();
    //         return;
    //     }

    //     if (confirm("Are you sure you want to revert the form to this historical version?")) {
    //         this.isTimeWarpingForm = false; 
            
    //         this.metaTrailService.revertMetaTrail(selectedTrail.id).subscribe({
    //             next: () => {
    //                 this.toastService.show("Historical form version restored successfully.", { classname: 'bg-success text-light' });
    //                 this.liveFormSnapshot = null;
    //                 this.getFormData(this.curForm.id); 
    //             },
    //             error: () => {
    //                 this.isTimeWarpingForm = true;
    //                 this.toastService.show("Failed to restore version.", { classname: 'bg-danger text-light' });
    //             }
    //         });
    //     }
    // }

    private applyFormSnapshot(snapshot: any) {
        const copy = this.clone(snapshot);
        ['title', 'description', 'email', 'publicEp', 'nav', 'type', 'align', 'admin', 'x', 'items', 'sections', 'tiers']
            .forEach(k => this.curForm[k] = copy[k]);

        this.curForm.items ||= {};
        this.curForm.sections ||= [];
        this.curForm.tiers ||= [];
        this.curForm.sections.forEach((s: any) => s.items ||= []);
    }

    private finalizeFormView() {
        this.curForm.sections.forEach((s: any) => s.parentObj = this.getTab(s.parent));
        this.curForm.sections.sort((a: any, b: any) => 
            ((a.parentObj?.sortOrder ?? 0) - (b.parentObj?.sortOrder ?? 0)) || ((a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        );
        this.curForm.sections.forEach((sec: any) => sec.items?.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        this.buildGroupedItems();
        this.processEditor()?.refreshView();
        this.cdr.detectChanges();
    }
}
