import { Component, OnInit, TemplateRef, ChangeDetectorRef, AfterViewChecked, viewChild, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormService } from '../../../../service/form.service';
import { MailerService } from '../../../../service/mailer.service';
import { NgbModal, NgbDateAdapter, NgbTimeAdapter, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbNavOutlet, NgbInputDatepicker, NgbPagination, NgbPaginationFirst, NgbPaginationLast, NgbPaginationPrevious, NgbPaginationNext } from '@ng-bootstrap/ng-bootstrap';
// import { LookupService } from '../../../../service/lookup.service';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
// import { EntryService } from '../../../../service/entry.service';
import { UtilityService } from '../../../../_shared/service/utility.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { KeyValue, PlatformLocation, NgClass, NgStyle, DatePipe, KeyValuePipe, JsonPipe } from '@angular/common';
import { UserService } from '../../../../_shared/service/user.service';
import { AppService } from '../../../../service/app.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPreview } from '@angular/cdk/drag-drop';
import { DatasetService } from '../../../../service/dataset.service';
import { GroupService } from '../../../../service/group.service';
import { CommService } from '../../../../_shared/service/comm.service';
import { NgbUnixTimestampAdapter } from '../../../../_shared/service/date-adapter';
import { NgbUnixTimestampTimeAdapter } from '../../../../_shared/service/time-adapter';
import { EndpointService } from '../../../../service/endpoint.service';
import { btoaUTF, cleanText, extractVariables, hashObject, splitAsList, tblToExcel, toSnakeCase, toSpaceCase } from '../../../../_shared/utils';
import { baseApi } from '../../../../_shared/constant.service';
import { BucketService } from '../../../../service/bucket.service';
import { ScreenService } from '../../../../service/screen.service';
import { Observable, first, map, shareReplay, tap } from 'rxjs';
import { SafePipe } from '../../../../_shared/pipe/safe.pipe';
import { GroupByPipe } from '../../../../_shared/pipe/group-by.pipe';
import { FilterPipe } from '../../../../_shared/pipe/filter.pipe';
import { EditDatasetComponent } from '../../../../_shared/modal/edit-dataset/edit-dataset.component';
import { CloneFormComponent } from '../../../../_shared/modal/clone-form/clone-form.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { IconPickerComponent } from '../../../../_shared/component/icon-picker/icon-picker.component';
import { NgCmComponent } from '../../../../_shared/component/ng-cm/ng-cm.component';
import { EditFormComponent } from '../../../../_shared/modal/edit-form/edit-form.component';
// import { FieldEditComponent } from '../../../../_shared/component/field-edit/field-edit.component';
// import { FieldViewComponent } from '../../../../_shared/component/field-view.component';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { CognaService } from '../../../../service/cogna.service';
import { EditLookupComponent } from '../../../../_shared/modal/edit-lookup/edit-lookup.component';
import { EditLookupEntryComponent } from '../../../../_shared/modal/edit-lookup-entry/edit-lookup-entry.component';
import { EditMailerComponent } from '../../../../_shared/modal/edit-mailer/edit-mailer.component';
import { EditRoleComponent } from '../../../../_shared/modal/edit-role/edit-role.component';
import { FieldEditComponent } from '../../../../run/_component/field-edit-b/field-edit-b.component';
import { FieldViewComponent } from '../../../../run/_component/field-view.component';
import { EntryService } from '../../../../run/_service/entry.service';
import { LookupService } from '../../../../run/_service/lookup.service';
import { IconSplitPipe } from '../../../../_shared/pipe/icon-split.pipe';
// declare var LeaderLine: any;
// import { combineLatest } from 'rxjs';

@Component({
    selector: 'app-form-editor',
    templateUrl: './form-editor.component.html',
    styleUrls: ['../../../../../assets/css/element-action.css',
        './form-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: NgbDateAdapter, useClass: NgbUnixTimestampAdapter },
    { provide: NgbTimeAdapter, useClass: NgbUnixTimestampTimeAdapter }],
    imports: [CdkDropListGroup, FaIconComponent, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent,
        FormsModule, RouterLink, NgClass, NgStyle, CdkDropList, CdkDrag, FieldViewComponent, FieldEditComponent, CdkDragHandle,
        NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem, NgbNavOutlet, CdkDragPreview,
        EditFormComponent, NgCmComponent, IconPickerComponent, NgSelectModule, NgbInputDatepicker, CloneFormComponent,
        NgbPagination, NgbPaginationFirst, NgbPaginationPrevious, NgbPaginationNext, NgbPaginationLast, EditDatasetComponent, FilterPipe, GroupByPipe, SafePipe, DatePipe,
        KeyValuePipe, EditLookupComponent, EditLookupEntryComponent, EditRoleComponent, EditMailerComponent, IconSplitPipe, JsonPipe]
})
export class FormEditorComponent implements OnInit, AfterViewChecked {

    itemSearch: string = "";
    formTotal: number = 0;
    formList: any;
    user: any;
    editTierItems: { sections: any; };
    items: any;
    lookupList: any;
    mailerList: any;
    datasetList: any;
    screenList: any;
    curForm: any;
    formError: any;
    // prevForm: any;
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
    filterField: string = "";

    sizeList: any[] = [
        { name: "100%", value: "col-sm-12" },
        { name: "75%", value: "col-sm-9" },
        { name: "67%", value: "col-sm-8" },
        { name: "58%", value: "col-sm-7" },
        { name: "50%", value: "col-sm-6" },
        { name: "42%", value: "col-sm-5" },
        { name: "33%", value: "col-sm-4" },
        { name: "25%", value: "col-sm-3" }
    ]
    sizeFixList: any[] = [
        { name: "100%", value: "col-12" },
        { name: "75%", value: "col-9" },
        { name: "67%", value: "col-8" },
        { name: "58%", value: "col-7" },
        { name: "50%", value: "col-6" },
        { name: "42%", value: "col-5" },
        { name: "33%", value: "col-4" },
        { name: "25%", value: "col-3" }
    ]
    heightList: any[] = [
        { name: "1w x 1h", value: "100" },
        { name: "2w x 1h", value: "50" },
        { name: "1w x 2h", value: "200" },
        { name: "3w x 1h", value: "33" },
        { name: "1h x 3w", value: "300" }
    ]

    facetList: any[];
    facetMode = ['edit', 'view', 'disabled', 'hidden', 'none'];
    facetTabMode = ['disabled', 'hidden', 'none'];

    typeList: any[] = [
        { name: "Text", value: "text" },
        { name: "Number", value: "number" },
        // { name: "Slider", value: "slider" },
        { name: "Date Picker", value: "date" },
        // { name: "Long Text", value: "textarea" },
        { name: "Dropdown", value: "select" },
        { name: "Radio Option", value: "radio" },
        // { name: "Toggle Button", value: "radioBtn" },
        { name: "Checkbox", value: "checkbox" },
        { name: "Checkbox Option", value: "checkboxOption" },
        { name: "Simple Option", value: "simpleOption" },
        { name: "Scale 1-5", value: "scaleTo5" },
        { name: "Scale 1-10", value: "scaleTo10" },
        { name: "Scale", value: "scale" },
        { name: "File Upload", value: "file" },
        { name: "Image Preview", value: "imagePreview" },
        { name: "Evaluated Field", value: "eval" },
        { name: "Static Element", value: "static" },
        { name: "QR Scanner", value: "qr" },
        { name: "Model Picker", value: "modelPicker" },
        { name: "Color Picker", value: "color" },
        { name: "Button", value: "btn" },
        { name: "Dataset", value: "dataset" },
        { name: "Screen", value: "screen" },
        { name: "Map Picker", value: "map" },
        { name: "Speech To Text", value: "speech" },
        // { name: "Tab Set", value: "tabset",type:['db','rest'] },
        // { name: "Panel", value: "panel",type:['db','rest'] }
    ];
    subType: any = {
        text: [
            { name: 'Simple Text', code: 'input' },
            { name: 'Long text', code: 'textarea' },
            { name: 'Rich text', code: 'richtext' }
        ],
        select: [
            { name: 'Dropdown (Single)', code: 'single' },
            { name: 'Dropdown (Multiple)', code: 'multiple' }
        ],
        modelPicker: [
            { name: 'Model Picker (Single)', code: 'single' },
            { name: 'Model Picker (Multiple)', code: 'multiple' }
        ],
        // lookup: [
        //     { name: 'Toggle Button', code: 'btn' },
        //     { name: 'Select Dropdown', code: 'select' },
        //     { name: 'Radio Option', code: 'radio' }
        // ],
        radio: [
            { name: 'Toggle Button', code: 'btn' },
            { name: 'Radio Option', code: 'radio' }
        ],
        checkboxOption: [
            { name: 'Checkbox Button', code: 'btn' },
            { name: 'Checkbox Option', code: 'checkbox' }
        ],
        number: [
            { name: 'Number Input', code: 'number' },
            { name: 'Range Slider', code: 'range' }
        ],
        file: [
            { name: 'Image File (Single)', code: 'image' },
            { name: 'Image File (Multiple)', code: 'imagemulti' },
            { name: 'Other File (Single)', code: 'other' },
            { name: 'Other File (Multiple)', code: 'othermulti' }
        ],
        simpleOption: [
            { name: 'Simple Toggle Button', code: 'btn' },
            { name: 'Simple Radio', code: 'radio' },
            { name: 'Simple Dropdown', code: 'select' }
        ],
        date: [
            { name: 'Date Picker', code: 'date' },
            { name: 'Date Time Picker', code: 'datetime' },
            { name: 'Date (inline)', code: 'date-inline' },
            { name: 'Date Time (inline)', code: 'datetime-inline' },
            { name: 'Time Picker', code: 'time' }
        ],
        eval: [
            { name: 'Evaluated Text', code: 'text' },
            { name: 'Evaluated QR Code', code: 'qr' }
        ],
        static: [
            { name: 'HTML Text', code: 'html' },
            { name: 'HTML Text (keep value)', code: 'htmlSave' },
            { name: 'Clearfix', code: 'clearfix' }
        ],
        map: [
            { name: 'Map (Single)', code: 'single' },
            { name: 'Map (Multiple)', code: 'multiple' }
        ]
    }

    newForm: any = {
        nav: 'simple', type: 'db', sections: [{ sortOrder: 0, size: 'col-sm-12', type: 'section', title: 'Section 1', code: 'section1' }], canEdit: true, canRetract: true, canSave: true, canSubmit: true, validateSave: true,
        x: { facet: 'add,edit,view', restrictAccess: true, accessByUser: true, accessByApprover: true, autoSync: true }
    }

    palettes: any[] = [];
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
        this.palettes = palettes;
    }

    superItems = [];
    buildSuper() {
        console.log("superForm", this.superForm)
        this.superItems = Object.values(this.superForm?.items).map((i: any) => {
            delete i.id;
            i.x.extended = true;
            return {
                label: i.label,
                item: i
            }
        })
    }

    formLoading: boolean; // loading formList
    curFormColumns: any[];

    offline: boolean = false;

    editCode: boolean = false;

    editSectionCode: boolean = false;

    previewFacet: string = "edit";

    app: any;

    // @ViewChild('editFormTpl') editFormTpl;
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

    // Business services
    private userService = inject(UserService);
    private appService = inject(AppService);
    private entryService = inject(EntryService);
    private utilityService = inject(UtilityService);
    private groupService = inject(GroupService);
    private bucketService = inject(BucketService);
    private cognaService = inject(CognaService);
    private endpointService = inject(EndpointService);
    private datasetService = inject(DatasetService);
    private screenService = inject(ScreenService);
    private commService = inject(CommService);

    constructor() {


        // effect(() => {
        //     let data = commService.changeEmitted();
        //     if (data?.value == 'import') {
        //         this.getFormList(1);
        //     }
        //     if (data?.value == 'form-add') {
        //         this.editForm(this.editFormTpl(), {}, true);
        //     }
        // });
    }

    ngAfterViewChecked() {
        this.cdr.detectChanges();
        this.drawTierLines();
    }

    otherAppList: any[] = [];
    ngOnInit() {

        this.location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
        this.commService.changeEmitted$.subscribe(data => {
            if (data.value == 'import') {
                this.getFormList(1);
            }
            if (data.value == 'form-add') {
                this.editForm(this.editFormTpl(), {}, true);
            }
        });

        this.userService.getCreator().subscribe((user) => {
            this.user = user;
            this.cdr.detectChanges(); // <--- Add here if user is used in template

            this.route.parent.parent.parent.params.subscribe(params => {
                const appId = params['appId'];

                this.buildPalettes();

                if (appId) {
                    let appParams = { email: user.email }
                    this.appService.getApp(appId, appParams)
                        .subscribe(res => {
                            this.app = res;
                            this.getFormList(1);
                            this.getLookupList(this.app.id);
                            this.getMailerList();
                            this.getAccessList();
                            this.getBucketList();
                            this.getCognaList();
                            this.getDatasetList(this.app.id);
                            this.getScreenList(this.app.id);
                            this.getEndpointList();
                            this.cdr.detectChanges(); // <--- Add here
                        });
                }
            })

            this.route.queryParams
                .subscribe((queryParams: Params) => {

                    const id = queryParams['id'];
                    if (id) {
                        this.getFormData(id);
                    }

                });

            this.appService.getAppMyList({
                email: this.user.email,
                size: 999,
                sort: 'id,desc'
            }).subscribe(res => {
                this.otherAppList = res.content;
            })

        });

        if (window.matchMedia("(max-width: 768px)").matches) {
            // The viewport is less than 576px wide
            this.showPalette = false;
        }
    }


    bucketList: any[] = [];
    getBucketList() {
        this.bucketService.getBucketList({ appId: this.app.id })
            .subscribe(res => {
                this.bucketList = res.content;
            });
    }


    cognaList: any[] = [];
    getCognaList() {
        this.cognaService.getCognaList({ appId: this.app.id })
            .subscribe(res => {
                this.cognaList = res.content;
            });
    }

    accessList: any[] = [];
    accessMap: any = {};
    getAccessList() {
        this.accessMap = {};
        this.groupService.getGroupList({ appId: this.app.id, size: 999 })
            .subscribe(res => {
                this.accessList = res.content;
                this.cdr.detectChanges(); // <--- Add here
                this.accessList.forEach(i => {
                    this.accessMap[i.id] = i;
                    // this.extraAutoCompleteJs.push({ label: `(groupId:${i.id}) ${i.name}`, apply: i.id + "", detail: i.name });
                    // this.extraAutoCompleteHtml.push({ label: `(groupId:${i.id}) " ${i.name}`, apply: i.id + "", detail: i.name });
                })
            });
    }

    endpointList: any[] = [];
    getEndpointList() {
        let params = { appId: this.app.id }
        this.endpointService.getEndpointList(params)
            .subscribe(res => {
                this.endpointList = res.content;
                this.cdr.detectChanges(); // <--- Add here
            })
    }

    getLookupList(appId) {
        let params = { appId: appId }
        this.lookupService.getFullLookupList(params)
            .subscribe(res => {
                this.lookupList = res.content;
                this.cdr.detectChanges(); // <--- Add here
            })

    }

    getMailerList() {
        let params = { appId: this.app.id, size: 9999 }
        this.mailerService.getMailerList(params)
            .subscribe(res => {
                this.mailerList = res.content;
                this.cdr.detectChanges(); // <--- Add here
            })

    }

    getDatasetList(appId) {
        this.datasetService.getDatasetList(appId)
            .subscribe(res => {
                this.datasetList = res;
                this.cdr.detectChanges(); // <--- Add here
            })
    }

    getScreenList(appId) {
        this.screenService.getScreenList(appId)
            .subscribe(res => {
                this.screenList = res;
                this.cdr.detectChanges(); // <--- Add here
            })
    }

    resetAutoComplete() {
        // console.log("--reset-ac")
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
            .subscribe(res => {
                this.dataset = res;
                this.cdr.detectChanges(); // <--- Add here
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
            .subscribe(res => {
                if (res?.list) {
                    this.extraAutoCompleteJs.push(...res.list);
                }
                this.cdr.detectChanges(); // <--- Add here        
            })
        this.formService.moreAutocompleteHtml()
            .subscribe(res => {
                if (res?.list) {
                    this.extraAutoCompleteHtml.push(...res.list);
                }
                this.cdr.detectChanges(); // <--- Add here        
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
            .subscribe(res => {
                this.formList = res.content;
                this.formTotal = res.page?.totalElements;
                this.formLoading = false;
                this.commService.emitChange({ key: 'form', value: this.formTotal });
                this.cdr.detectChanges(); // <--- Add here
            }, res => {
                this.formLoading = false;
                this.cdr.detectChanges(); // <--- Add here
            });
    }


    getHiddenList = (list) => list.filter(i => i.hidden == true);

    superForm: any = null; // form that is being extended

    getFormData(id) {
        delete this.superForm
        delete this.formError;
        this.superItems = [];
        this.curFormId = id;
        this.formService.getForm(id)
            .subscribe(res => {
                this.curForm = res;
                this.cdr.detectChanges(); // <--- Add here
                this.curForm.sections
                    .map(s => s.parentObj = this.getTab(s.parent))
                    .sort((a, b) => a.parentObj?.sortOrder - b.parentObj?.sortOrder);

                // console.log("sections=",this.curForm.sections)
                this.getLookupIdList(this.curForm.id);
                this.facetList = this.getAsList(this.curForm.x?.facet);
                this.curFormColumns = [];

                this.populateAutoComplete();
                this.populateCodeList();
                // this.drawTierLines();
                if (res.tiers?.length > 0) {
                    // console.log({id:-1, color:'rgb(0, 123, 255)', action:'goTier', nextTier:res.tiers[0].id});
                    // Highlight first line
                    this.highlightSubmit();
                    // this.highlightLine({id:-1}, {id:-1, color:'rgb(0, 123, 255)', action:'goTier', nextTier:res.tiers[0].id});// {
                }
                if (res?.x?.extended) {
                    this.formService.getForm(res?.x?.extended)
                        .subscribe(r1 => {
                            this.superForm = r1;
                            this.buildSuper();
                            this.cdr.detectChanges();
                        }
                        );
                }
                this.loadTrails(this.curForm.id, 1);
                this.cdr.detectChanges();
                // }
            }, err => {
                // console.log(err);
                this.formError = err.error;
            })
    }

    highlightSubmit() {
        this.highlightLine({ id: -1 }, { id: -1, color: 'rgb(0, 123, 255)', action: 'goTier', nextTier: this.curForm.tiers[0].id });// {
    }

    compareByIdFn(a, b): boolean {
        return (a && a.id) === (b && b.id);
    }

    exceptCurForm = (form) => this.formList.filter(f => f.id != form.id);

    lookupIds = [];
    lookupKey = {};
    lookupMap = {}; // map of field-code:lookup
    lookup = {}; // lookup entry list
    mod = {};

    private lookupMapCache: { [dataSource: string]: Observable<any> } = {};

    getLookupIdList(id) {
        this.lookupService.getInForm(id)
            .subscribe(res => {
                this.lookupIds = res;
                this.lookupIds.forEach(key => {
                    this.lookupKey[key.code] = {
                        ds: key.dataSource,
                        type: key.type
                    };
                    // if (!this.lookup[key.code]) {
                    this.getLookup(key.code, key.dataSourceInit ? this.parseJson(key.dataSourceInit) : null);
                    // }

                    if (key.type != 'modelPicker') {
                        // this.lookupService.getLookup(key.dataSource)
                        //     .subscribe({
                        //         next: res => {
                        //             this.lookupMap[key.dataSource] = res;
                        //             this.cdr.detectChanges(); // <--- Add here
                        //         },
                        //         error: err => { }
                        //     })

                        // Use cache to avoid duplicate requests
                        if (!this.lookupMapCache[key.dataSource]) {
                            this.lookupMapCache[key.dataSource] = this.lookupService.getLookup(key.dataSource).pipe(shareReplay(1));
                        }
                        this.lookupMapCache[key.dataSource].subscribe({
                            next: res => {
                                this.lookupMap[key.dataSource] = res;
                                this.cdr.detectChanges();
                            },
                            error: err => { }
                        });
                    }

                });
                this.cdr.detectChanges(); // <--- Add here
            });
    }

    parseJson(str) {
        var g = {};
        try { g = JSON.parse(str) } catch (e) { };
        return g;
    }

    getObjLength = (obj) => Object.keys(obj).length;

    insertTextAtCursor(text, cm) {
        cm.insertText("{{" + text + "}}");
    }

    // getItemText(pre,item){
    //     var type = item.type;
    //     var bindLabel = item.bindLabel;
    //     var pipe = ''
    //     if (type == 'date') {
    //       pipe = '|date';
    //     } else if (['select', 'radio'].indexOf(type) > -1) {
    //       pipe = '.name';
    //     } else if (['modelPicker'].indexOf(type) > -1) {
    //       pipe = '.'+bindLabel;
    //     } else if (type == 'qr') {
    //       pipe = '|qr';
    //     } else if (type == 'file') {
    //       pipe = '|src';
    //     }
    //     return pre +'.'+ item.code + pipe;
    // }


    getLookup = (code, params?: any) => {
        this._getLookup(code, params);
    }


    _getLookup = (code, param, cb?, err?) => {
        if (code) {
            this._getLookupObs(code, param, cb, err)
                .subscribe({
                    next: res => {
                        this.lookup[code] = res;
                        this.cdr.detectChanges(); // <--- Add here
                    }, error: err => {
                    }
                })
        }
    }

    lookupDataObs: any = {};

    _getLookupObs(code, param, cb?, err?): Observable<any> {

        var cacheId = 'key_' + btoaUTF(this.lookupKey[code].ds + hashObject(param ?? {}), null);
        // masalah nya loading ialah async... so, mun simultaneous load, cache blom diset
        // bleh consider cache observable instead of result.
        // tp bila pake observable.. request dipolah on subscribe();
        // settle with share()
        if (this.lookupDataObs[cacheId]) {
            return this.lookupDataObs[cacheId]
        }
        // start loading
        // console.log('loading '+this.lookupKey[code],code);
        if (this.lookupKey[code].type == 'modelPicker') {
            param = Object.assign(param || {}, { email: this.user.email });
            this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(this.lookupKey[code].ds, param ? param : null)
                .pipe(
                    tap({ next: cb, error: err }), first(), shareReplay(1)
                )
        } else {
            // param = Object.assign(param || {}, { sort: 'id,asc' });
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
        if (!isNew) {
            this.formService.getForm(data.id)
                .subscribe(r1 => {
                    this.editFormData = r1;
                });
        }

        if (!data.x) {
            data['x'] = {};
        }

        this.editFormData = data;

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(form => {
                if (!form.x.extended) {
                    // console.log("delete extended", form.x.extended);
                    delete form.x.extended;
                }
                this.formService.saveForm(form.appId ?? this.app.id, form)
                    .subscribe({
                        next: (res) => {
                            this.getFormList(this.formPageNo);
                            this.getFormData(res.id);
                            this.toastService.show("Form saved successfully", { classname: 'bg-success text-light' });
                            this.router.navigate([], { relativeTo: this.route, queryParams: { id: res.id } })
                        },
                        error: (err) => {
                            this.toastService.show("Form saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
                this.cdr.detectChanges(); // <--- Add here
            }, res => { });


    }

    cloneForm(content) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(cloneFormData => {
                this.formService.cloneForm(cloneFormData.formId, this.app.id)
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
        if (confirm('Are you sure you want to unlink previous form')) {
            this.formService.unlinkPrevForm(formId)
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
        this.removeFormData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.formService.removeForm(data)
                    .subscribe(res => {
                        this.getFormList(1);
                        delete this.curForm;
                        this.toastService.show("Form removed successfully", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    }, res => {
                        this.toastService.show("Form removal failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { });
    }

    rcognaExtractor(val){
        // console.log(val)
        this.editItemData.x.rcognaFields = extractVariables(["$"],val)?.["$"]||[];
    }

    editItemData: any;
    editItemFromPalette: boolean = false;
    editItem(content, section, data, sortOrder, fromPalette: boolean = false) {
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

        this.loadOtherAppList(this.editItemData.type, this.editItemData.x.appId);

        // this.editItemData.appId = this.app.id;
        if (this.editItemData.type == 'modelPicker' && this.editItemData.dataSource) {
            this.loadDataset(this.editItemData.dataSource);
        } else {
            this.dataset = null;
        }
        this.editItemFromPalette = fromPalette;
        // var items = {sizeList:this.sizeList, typeList:this.typeList, lookupList: this.lookupList , toSnakeCase: toSnakeCase};
        history.pushState(null, null, window.location.href);
        // this.editItemLabelField.nativeElement.focus();
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                var fieldList = [];
                if (rItem.bulkAdd) {
                    var labels = rItem.label.split(",");
                    labels.forEach(we => {
                        var h = Object.assign({}, rItem, { label: we, code: this.toSnakeCase(we) });
                        // console.log(h);
                        fieldList.push(h);
                    })
                } else {
                    fieldList.push(rItem);
                }
                fieldList.forEach((aa, index) => {
                    if (aa.x?.rtxtcls||aa.x?.rtxtgen){
                        aa.x.rcognaFields = extractVariables(["$"], aa.x?.rcognaTpl)?.["$"]||[];
                    }
                    this.formService.saveItem(this.curForm.id, section.id, aa, sortOrder + index)
                        .subscribe({
                            next: (e) => {
                                this.getFormData(this.curForm.id);
                                this.getLookupIdList(this.curForm.id);
                                this.saveItemOrder(section);
                                this.toastService.show("Item saved successfully", { classname: 'bg-success text-light' });
                                this.cdr.detectChanges(); // <--- Add here
                            }, error: (e) => {
                                this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });
                            }
                        })
                })
                this.cdr.detectChanges(); // <--- Add here

            }, res => { });
    }

    maxValue = (a, b) => Math.max(a, b);

    lines: any[];
    showProcessLine: boolean;
    hasLineToComplete: boolean = false;
    tierMap: any = {}
    drawTierLines() {
        this.lines = [];
        this.tierMap = {};
        var allTaIndex = 0;
        this.curForm?.tiers.forEach((t, indext) => {
            this.tierMap[t.id] = t;
            let actions = Object.keys(t.actions);
            actions.forEach((tak, indexta) => {
                let addToLines = false;
                let ta = t.actions[tak];
                let tElem;
                let toComplete: boolean;
                if (ta.action == 'nextTier') {
                    var nextTier = this.curForm.tiers[t.sortOrder + 1];
                    if (nextTier) {
                        tElem = document.getElementById("t_" + nextTier.id);
                        addToLines = true;
                    } else if (t.sortOrder == this.curForm?.tiers?.length - 1) {
                        tElem = document.getElementById("t_999");
                        this.hasLineToComplete = true;
                        toComplete = true;
                    }
                } else if (ta.action == 'prevTier') {
                    var nextTier = this.curForm.tiers[t.sortOrder - 1];
                    if (nextTier) {
                        tElem = document.getElementById("t_" + nextTier.id);
                        addToLines = true;
                    }
                } else if (ta.action == 'goTier') {
                    tElem = document.getElementById("t_" + ta.nextTier);
                    addToLines = true;
                } else if (ta.action == 'curTier') {
                    if (ta.userEdit) {
                        tElem = document.getElementById("t_" + t.id);
                    }
                }

                if (tElem) {
                    var taElem = document.getElementById("ta_" + ta.id);
                    var taOffsets = taElem.getBoundingClientRect();
                    var taTop = taOffsets.top;

                    var tOffsets = tElem.getBoundingClientRect();
                    var tTop = tOffsets.top;

                    var line = document.getElementById("line_" + ta.id);

                    if (tTop >= taTop) {
                        line.style.height = (tTop - taTop + 8) + "px";
                        if (toComplete) { // if to complete, adjust a lil bit to meet the line
                            line.style.height = (tTop - taTop + 22) + "px";
                        }
                    } else {
                        line.style.height = (taTop - tTop - 8 + 3) + "px"; // +4 utk border width
                        var diff = taTop - (50 + (indexta * 10)); // relative different between top-by-parent vs top-by-client
                        line.style.top = (tTop - diff + 6) + "px"; // get tTo
                    }
                    line.style.opacity = ".5";
                    if (addToLines) {
                        line.style.width = (6 + allTaIndex * 3) + "px";
                        this.lines.push(line);
                        allTaIndex++;
                    }
                }
            });
            this.cdr.detectChanges();
        })
    }
    selectColor(number) {
        const hue = number * 137.508; // use golden angle approximation
        return `hsla(${hue},50%,75%)`;
    }
    selectedLine: number = -1;
    selectedLineTier: number = -1;
    selectedTier: number = -1;
    selectedColor: string = "rgb(0, 123, 255)";
    // selectedTierAction: number = -1;
    highlightLine(tier, tierAction) {
        this.selectedLine = tierAction.id;
        this.selectedTier = tier.id;
        this.selectedColor = tierAction.color;
        // console.log("HHH",tierAction)
        if (tierAction.action == 'goTier') {
            this.selectedLineTier = tierAction.nextTier;
            // console.log("nextTier",tierAction.nextTier);
        } else if (tierAction.action == 'nextTier') {
            if (this.curForm.tiers[tier.sortOrder + 1]) {
                this.selectedLineTier = this.curForm.tiers[tier.sortOrder + 1]?.id;
            } else if (tier.sortOrder == this.curForm?.tiers?.length - 1) {
                // this.selectedLine = ;
                this.selectedLineTier = 999;
            } else {
                this.selectedLineTier = -1;
            }

        } else if (tierAction.action == 'prevTier') {
            this.selectedLineTier = this.curForm.tiers[tier.sortOrder - 1]?.id;

        } else if (tierAction.action == 'curTier') {
            if (tierAction.userEdit) {
                this.selectedLineTier = tier.id;
            } else {
                this.selectedLineTier = -1;
            }
        } else {
            this.selectedLineTier = -1;
        }
    }

    simplifiedProcessView: boolean;

    position() {
        this.lines.forEach(l => l.position());
    }

    editTierData: any;
    editTier(content, data) {
        this.editTierData = data;
        if (this.editTierData.orgMapParam) {
            this.editTierData.orgMapParamStr = JSON.stringify(this.editTierData.orgMapParam);
        }
        this.editTierItems = { sections: this.curForm.sections.filter(function (res) { return res.type == 'approval' }) };
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                if (rItem.orgMapParam) {
                    rItem.orgMapParam = JSON.parse(rItem.orgMapParamStr);
                }
                this.formService.saveTier(this.curForm.id, rItem)
                    .subscribe({
                        next: (res) => {
                            this.formService.getForm(this.curForm.id)
                                .subscribe(res => {
                                    this.curForm = res;
                                    this.reorderAllTier();
                                    this.cdr.detectChanges();
                                }, err => {
                                    this.formError = err.error;
                                })
                            this.toastService.show("Tier saved successfully", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges();
                        },
                        error: (err) => {
                            this.toastService.show("Tier saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
                this.cdr.detectChanges();
            }, dismiss => {
                /// ????
                if (this.editTierData.orgMapParamStr) {
                    this.editTierData.orgMapParam = JSON.parse(this.editTierData.orgMapParamStr);
                }
            });
        this.cdr.detectChanges();
    }

    editTierActionData: any;
    editTierAction(content, tier, data) {
        this.editTierActionData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                this.formService.saveTierAction(tier.id, rItem)
                    .subscribe({
                        next: (res) => {
                            this.getFormData(this.curForm.id);
                            this.reorderAllTier();
                            this.toastService.show("Tier action saved successfully", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); // <--- Add here
                        }, error: (error) => {
                            this.toastService.show("Tier action saving failed", { classname: 'bg-danger text-light' });
                        }
                    })
            }, res => { });
    }

    actionIcons = ['check', 'share', 'reply', 'times', 'square'];
    actionColors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#6c757d'];
    actionPreset: any = {
        approved: {
            action: 'nextTier',
            label: 'Approved',
            code: 'approved',
            color: '#28a745',
            icon: 'check',
            userEdit: false,
            sortOrder: 0
        },
        rejected: {
            action: 'curTier',
            label: 'Rejected',
            code: 'rejected',
            color: '#dc3545',
            icon: 'times',
            userEdit: false,
            sortOrder: 1
        },
        returned: {
            action: 'curTier',
            label: 'Returned',
            code: 'returned',
            color: '#007bff',
            icon: 'reply',
            userEdit: true,
            sortOrder: 2
        }
    }
    removeTierAction(ta) {
        if (confirm('Are you sure you want to remove this action:' + ta.label)) {
            this.formService.removeTierAction(ta.id)
                .subscribe({
                    next: (res) => {
                        this.getFormData(this.curForm.id);
                        this.toastService.show("Tier action removed successfully", { classname: 'bg-success text-light' });

                    }, error: (error) => {
                        this.toastService.show("Tier action removal failed", { classname: 'bg-danger text-light' });
                    }
                })
        }
    }

    removeTierData: any;
    removeTier(content, tier) {
        this.removeTierData = tier;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                this.formService.removeTier(tier.id)
                    .subscribe({
                        next: (res) => {
                            this.formService.getForm(this.curForm.id)
                                .subscribe(res => {
                                    this.curForm = res;
                                    this.reorderAllTier();
                                    this.cdr.detectChanges(); // <--- Add here
                                }, err => {
                                    this.formError = err.error;
                                })
                            this.toastService.show("Tier removed successfully", { classname: 'bg-success text-light' });

                        }, error: (error) => {
                            this.toastService.show("Tier removal failed", { classname: 'bg-danger text-light' });

                        }
                    })
            }, res => { });
    }

    reorderTier(index, op) {
        if (confirm(`Are you sure you want to reorder this tier?\n\nTier: ${this.curForm.tiers[index].name}\nAction: ${op == -1 ? 'Move up' : 'Move down'}`)) {
            this.reorder(this.curForm.tiers, index, op);
            this.saveTierOrder();
        }
    }

    /** recalculate tierorder and save to database */
    reorderAllTier() {
        var list = this.curForm.tiers
            .map((val, index) => {
                return { id: val.id, sortOrder: index }
            });
        return this.formService.saveTierOrder(list)
            .subscribe((res) => {
                return res;
            });
    }

    saveTierOrder() {
        var list = this.curForm.tiers
            .map((val) => {
                return { id: val.id, sortOrder: val.sortOrder }
            });
        return this.formService.saveTierOrder(list)
            .subscribe((res) => {
                this.drawTierLines();
                this.cdr.detectChanges();
                return res;
            });
    }

    reorderTierAction(tierIndex, index, op) {
        var orderList = Object.values(this.curForm.tiers[tierIndex].actions);
        this.reorder(orderList, index, op);
        this.saveTierActionOrder(tierIndex, orderList)
    }

    saveTierActionOrder(tierIndex, orderList) {
        var list = orderList
            .map((val) => {
                return { id: val.id, sortOrder: val.sortOrder }
            });
        return this.formService.saveTierActionOrder(this.curForm.tiers[tierIndex].id, list)
            .subscribe((res) => {
                this.curForm.tiers[tierIndex].actions = res;
                this.cdr.detectChanges(); // <--- Add here
            });
    }

    // Order by descending property key
    sortOrder = (a: KeyValue<string, any>, b: KeyValue<string, any>): number => {
        return a.value.sortOrder - b.value.sortOrder;
    }

    removeItemData: any;
    removeItem(content, data) {
        this.removeItemData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(rItem => {
                this.formService.removeItem(this.curForm.id, rItem.id)
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
        this.formService.removeItemSource(formId, id)
            .subscribe({
                next: res => {
                    this.getFormData(this.curForm.id)
                    this.toastService.show("Item removed successfully", { classname: 'bg-success text-light' });
                }, error: err => {
                    this.toastService.show("Item removal failed", { classname: 'bg-danger text-light' });
                }
            })
    }

    reorderItem(section, index, op) {
        this.reorder(section.items, index, op);
        this.saveItemOrder(section);
    }

    getTab = (id) => {
        // TAMBAHAN UNTUK FEATURE HEAD & BOTTOM SECTION UNTUK TABBED NAV
        if (id == "-1") {
            return { id: -1, sortOrder: -1, title: "(HEAD)" }
        } else if (id == "-999") {
            return { id: -999, sortOrder: 999, title: "(BOTTOM)" }
        } else {
            return this.curForm.tabs.filter(e => e.id == id)[0]
        }
    };


    saveItemOrder(section) {
        var list = section.items
            .map((val, $index) => {
                return { id: val.id, sortOrder: $index }
            });
        return this.formService.saveItemOrder(list)
            .subscribe(res => {
                this.cdr.detectChanges(); // <--- Add here
                return res;
            });
    }

    // @ViewChild("editItemTpl") editItemTpl: TemplateRef<any>;
    editItemTpl = viewChild<TemplateRef<any>>('editItemTpl');
    // @ViewChild("editItemLabel") editItemLabelField: ElementRef<any>;

    dropItem(event: CdkDragDrop<any[]>, parent) {
        // console.log("Container Id:" + event.previousContainer.id);
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
                    .subscribe(res => {
                        this.cdr.detectChanges(); // <--- Add here
                    });

            }
        }
    }

    getTabList(pageNumber) {
        this.formService.getTabList(this.curForm.id, pageNumber)
            .subscribe(res => {
                this.curForm.tabs = res.content;
                this.cdr.detectChanges(); // <--- Add here
            })
    }

    editSectionData: any;
    editSection(content, data) {
        if (!data.x) {
            data['x'] = { facet: {} };
        }
        if (!data.x.facet) {
            data.x.facet = {};
        }
        this.editSectionData = data;
        // var items = {sizeList: this.sizeList, toSnakeCase: toSnakeCase};
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(section => {
                this.formService.saveSection(this.curForm.id, section)
                    .subscribe(res => {
                        this.getFormData(this.curForm.id)
                        this.toastService.show("Section saved successfully", { classname: 'bg-success text-light' });
                        // this.getSectionList(1)
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

    viewItems(content) {
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(res => { }, err => { });
    }

    backendEfSave(item, force) {
        this.formService.saveItemOnly(this.curForm.id, item)
            .subscribe({
                next: (e) => {
                    this.backendEf(item, force);
                }, error: (e) => {
                    this.toastService.show("Item saving failed", { classname: 'bg-danger text-light' });
                    this.cdr.detectChanges(); // <--- Add here
                }
            })

    }

    force: any = {};
    showlog: any = {};
    efResult: any = {};
    efLoading: any = {};
    backendEf(item, force) {
        this.efLoading[item.code] = true;
        this.formService.backendEf(this.curForm.id, item.code, force == true)
            .subscribe(res => {
                let result = `<table width="100%">
                            <tr><td>Success</td><td>: ${res.successCount}</td></tr>
                            <tr><td>Failed</td><td>: ${res.errorCount}</td></tr>
                            <tr><td>Not empty (unchanged)</td><td>: ${res.notEmptyCount}</td></tr>
                          </table>`;
                this.efResult[item.code] = res;

                this.toastService.show("Backend EF evaluated successfully " + result + " ", { classname: 'bg-success text-light' });
                this.efLoading[item.code] = false;
                this.cdr.detectChanges(); // <--- Add here
            })
    }

    forceApf: any = {};
    showlogApf: any = {};
    apfResult: any = {};
    apfLoading: any = {};
    backendApf(tier, force) {

        if (tier.orgMapParamStr) {
            tier.orgMapParam = JSON.parse(tier.orgMapParamStr);
        }


        this.formService.saveTier(this.curForm.id, tier)
            .subscribe({
                next: (res) => {
                    this.getFormData(this.curForm.id);
                    this.toastService.show("Tier saved successfully", { classname: 'bg-success text-light' });


                    this.apfLoading[tier.id] = true;
                    this.formService.backendApf(this.curForm.id, tier.id, force == true)
                        .subscribe(res => {
                            let result = `<table width="100%">
                                <tr><td>Success</td><td>: ${res.successCount}</td></tr>
                                <tr><td>Failed</td><td>: ${res.errorCount}</td></tr>
                                <tr><td>Not updated (unchanged)</td><td>: ${res.notEmptyCount}</td></tr>
                              </table>`;
                            this.apfResult[tier.id] = res;

                            this.toastService.show("Approver updated successfully " + result + " ", { classname: 'bg-success text-light' });
                            this.apfLoading[tier.id] = false;
                            this.cdr.detectChanges(); // <--- Add here
                        })
                    this.cdr.detectChanges(); // <--- Add here

                }, error: (error) => {
                    this.toastService.show("Tier saving failed", { classname: 'bg-danger text-light' });
                    this.cdr.detectChanges(); // <--- Add here
                }
            })
    }

    reconApprover() {
        if (prompt("Are you sure you want to update the approver for all tiers in this form?\n Type 'update-all-tier' and press OK to proceed") == 'update-all-tier') {
            this.efLoading["all"] = true;
            this.formService.reconApprover(this.curForm.id)
                .subscribe({
                    next: (res) => {
                        this.efLoading["all"] = false;
                        this.toastService.show("Tier approver reconstructed successfully ", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    },
                    error: (error) => {
                        this.efLoading["all"] = false;
                        this.toastService.show("Tier approver reconstruction failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    }
                })
        }
    }

    removeSectionData: any;
    removeSection(content, data) {
        this.removeSectionData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((data) => {
                this.formService.removeSection(data.id)
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
        this.reorder(list, index, op);
        this.saveSectionOrder(this.curForm)
    }

    saveSectionOrder(form) {
        var list = form.sections
            .map(function (val, $index) {
                return { id: val.id, sortOrder: val.sortOrder }
            });

        return this.formService.saveSectionOrder(list)
            .subscribe((res) => {
                return res;
            });
    }

    editTabData: any;
    editTab(content, data) {
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
        this.removeTabData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((data) => {
                this.formService.removeTab(data.id)
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
            // console.log(e);
            return "ERR: " + e;
        }
    };

    reorderTab(index, op) {
        this.reorder(this.curForm.tabs, index, op);
        this.saveTabOrder();
    }

    saveTabOrder() {
        var list = this.curForm.tabs
            .map(function (val) {
                return { id: val.id, sortOrder: val.sortOrder }
            });
        return this.formService.saveTabOrder(list)
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
        }); // ensure current sortorder using index, to prevent jumping ordering

        var temp = items[index + op];
        var tempSortOrder = items[index + op].sortOrder;
        items[index + op].sortOrder = items[index].sortOrder;
        items[index + op] = items[index];

        items[index].sortOrder = tempSortOrder;
        items[index] = temp;
        // this.swapPositions(items,index,index+op);
        setTimeout(() => {
            items[index + op].altClass = 'swapEnd';
            items[index].altClass = 'swapEnd';
            this.cdr.detectChanges(); // <--- Add here
        }, 500);
    }

    extraAutoCompleteHtml: any[] = [];
    extraAutoCompleteJs: any[] = [];
    extraAutoCompleteTier: any[] = [];
    populateAutoComplete() {

        this.resetAutoComplete();

        // $ search using label, while $prev$ use detail
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

    getLoopCode = (section) => "<x-foreach $=\"i of $." + section.code + "\">\n" + this.getItems(section) + "\n\t${<!--More codes-->}\n<\/x-foreach>"
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

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';

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
        this.importExcelData = null;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {

            }, res => { })
    }

    moveFormToAppData: any = {};
    formRelatedComps: any = {};
    moveFormToApp(content) {
        this.formService.getRelatedComps(this.curFormId)
            .subscribe(res => {
                this.formRelatedComps = res;
                history.pushState(null, null, window.location.href);
                this.modalService.open(content, { backdrop: 'static' })
                    .result.then(data => {
                        this.moveFormToAppData.datasetIds = this.formRelatedComps.dataset.filter(e => e.isChecked).map(e => e.id);
                        this.moveFormToAppData.screenIds = this.formRelatedComps.screen.filter(e => e.isChecked).map(e => e.id);
                        // console.log(this.moveFormToAppData);
                        this.formService.moveToApp(this.curFormId, this.moveFormToAppData)
                            .subscribe(data => {
                                this.commService.emitChange({ key: 'form', value: 0 });
                                this.commService.emitChange({ key: 'dataset', value: 0 });
                                this.commService.emitChange({ key: 'screen', value: 0 });
                                this.toastService.show("Form moved successfully", { classname: 'bg-success text-light' });
                                this.cdr.detectChanges(); // <--- Add here
                            });
                        this.cdr.detectChanges(); // <--- Add here

                    }, res => { })


            });
    }

    formJsonSchema: any;
    viewJsonSchema(content) {
        // this.importExcelData = null;
        this.cognaService.getFormatter(this.curFormId)
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
                    this.cdr.detectChanges(); // <--- Add here

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
    file: any;
    importLoading: boolean = false;
    uploadExcel($event, createField, createDataset, createDashboard, importToLive) {
        if ($event.target.files && $event.target.files.length) {
            this.importLoading = true;
            this.formService.uploadExcel(this.curForm.id, $event.target.files[0], this.user.email, createField, createDataset, createDashboard, importToLive)
                .subscribe({
                    next: (res) => {
                        this.importExcelData = res;
                        this.importLoading = false;
                        this.getFormData(this.curFormId);
                        this.commService.emitChange({ key: 'form', value: "import" });
                        this.toastService.show("Excel successfully imported", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here

                    }, error: (error) => {
                        this.importExcelData = {
                            success: false,
                            message: error.message
                        }
                        this.importLoading = false;
                        this.cdr.detectChanges(); // <--- Add here
                    }
                })
        }

    }

    clearEntry() {
        if (prompt("Are you sure you want to permanently delete entries of this form?\n Type 'delete' and press OK to proceed") == 'delete') {
            if (confirm("Are you sure? This action is not reversible. The entries will be permanently removed.")) {
                this.formService.clearData(this.curFormId)
                    .subscribe({
                        next: res => {
                            this.toastService.show("Entry removed: " + res.rows + ", Attachment removed: " + res.files, { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); // <--- Add here
                        }, error: err => {
                            this.toastService.show("Entry removal failed", { classname: 'bg-danger text-light' });
                        }
                    });
            }
        }
    }

    // getIcon = (str) => str ? str.split(":") : ['far', 'file'];

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
            .subscribe(dataset => {
                this.editDatasetData = dataset;
                history.pushState(null, null, window.location.href);
                this.modalService.open(content, { backdrop: 'static' })
                    .result.then(data => {
                        this.datasetService.saveDataset(this.app.id, data)
                            .subscribe(res => {
                                this.toastService.show("Dataset successfully saved");
                                this.cdr.detectChanges(); // <--- Add here
                            })
                    }, res => { })
                this.cdr.detectChanges(); // <--- Add here

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
            .subscribe(trail => { 
                this.trails = trail.content; 
                this.trailsTotal = trail.page?.totalElements ;
                this.cdr.detectChanges(); // <--- Add here
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
        // tblToExcel(chart.title,document.querySelector("#chart_" + chart.id).outerHTML)
        tblToExcel("form-" + this.curForm.title, document.querySelector("#form_trail_" + this.curForm.id).outerHTML)
    }

    genView(formId) {
        this.formService.genView(formId)
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
                    .subscribe({
                        next: (res) => {
                            // this.loadLookupList(this.pageNumber);
                            this.getLookupList(this.app.id);
                            item.dataSource = res.id;
                            this.lookupMap[res.id] = res;
                            this.editItemData.dataSource = res.id;
                            this.toastService.show("Lookup successfully saved", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); // <--- Add here
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
                            .subscribe({
                                next: (res) => {
                                    this.getLookup(field.code, field.dataSourceInit ? this.parseJson(field.dataSourceInit) : null);
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
                        this.cdr.detectChanges(); // <--- Add here
                    }, res => {
                        this.toastService.show("Group removal failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { })
    }

    editMailerData: any;
    editMailer = (content, mailer, obj, prop) => {
        // console.log(mailer);
        // mailer.content = this.br2nl(mailer.content);
        if (!mailer.content) mailer.content = '';
        this.editMailerData = mailer;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static', size: 'lg' })
            .result.then(data => {
                // data.content = this.nl2br(data.content);
                this.mailerService.save(this.user.email, this.app.id, data)
                    .subscribe(res => {
                        this.getMailerList();
                        // this.loadMailer(res.id);
                        this.toastService.show("Template successfully saved", { classname: 'bg-success text-light' });
                        if (!obj[prop]) {
                            obj[prop] = [];
                        }
                        obj[prop] = obj[prop].concat(res.id);
                        this.cdr.detectChanges(); // <--- Add here
                    }, res => {
                        this.toastService.show("Template saving failed", { classname: 'bg-danger text-light' });
                    });
            }, res => { })
    }

    compareByCodeFn = (a, b): boolean => (a && a.code) === (b && b.code);

}
