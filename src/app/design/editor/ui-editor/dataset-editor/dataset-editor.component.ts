import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import { FormService } from '../../../../service/form.service';
// import { LookupService } from '../../../../service/lookup.service';
import { MailerService } from '../../../../service/mailer.service';
import { NgbModal, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../../../_shared/service/user.service';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { AppService } from '../../../../service/app.service';
// import { EntryService } from '../../../../service/entry.service';
import { UtilityService } from '../../../../_shared/service/utility.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { PlatformLocation, NgTemplateOutlet, NgClass, KeyValuePipe } from '@angular/common';
// import { HttpParams } from '@angular/common/http';
import { DatasetService } from '../../../../service/dataset.service';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { GroupService } from '../../../../service/group.service';
import { CommService } from '../../../../_shared/service/comm.service';
import { ScreenService } from '../../../../service/screen.service';
import { baseApi } from '../../../../_shared/constant.service';
import { cleanText, splitAsList, toSnakeCase, toSpaceCase } from '../../../../_shared/utils';
import { IconPickerComponent } from '../../../../_shared/component/icon-picker/icon-picker.component';
import { NgCmComponent } from '../../../../_shared/component/ng-cm/ng-cm.component';
import { FormsModule } from '@angular/forms';
import { EditDatasetComponent } from '../../../../_shared/modal/edit-dataset/edit-dataset.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { LookupService } from '../../../../run/_service/lookup.service';
import { EntryService } from '../../../../run/_service/entry.service';
import { RunService } from '../../../../run/_service/run.service';
import { ChangeDetectorRef } from '@angular/core';
import { IconSplitPipe } from '../../../../_shared/pipe/icon-split.pipe';

@Component({
    selector: 'app-dataset-editor',
    templateUrl: './dataset-editor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['../../../../../assets/css/element-action.css',
        './dataset-editor.component.scss'],
    imports: [FaIconComponent, RouterLink, CdkDropList, CdkDrag, CdkDragHandle, NgTemplateOutlet, EditDatasetComponent, 
        FormsModule, NgCmComponent, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, 
        NgbNavLinkBase, NgbNavContent, NgClass, IconPickerComponent, NgbNavOutlet, 
        KeyValuePipe, IconSplitPipe]
})
export class DatasetEditorComponent implements OnInit {

    private formService = inject(FormService);
    private datasetService = inject(DatasetService);
    private lookupService = inject(LookupService);
    private mailerService = inject(MailerService);
    private modalService = inject(NgbModal);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private appService = inject(AppService);
    private entryService = inject(EntryService);
    private utilityService = inject(UtilityService);
    private groupService = inject(GroupService);
    private toastService = inject(ToastService);
    private commService = inject(CommService);
    private screenService = inject(ScreenService);
    private runService = inject(RunService);
    private location = inject(PlatformLocation);
    private cdr = inject(ChangeDetectorRef);
    
    constructor() {
        this.location.onPopState(() => this.modalService.dismissAll(''));
        this.utilityService.testOnline$().subscribe(online => this.offline = !online);
        this.commService.changeEmitted$.subscribe(data => {
            if (data.value == 'import') {
                this.getDatasetList(1);
            }
        });

        // effect(() => {
        //     let data = commService.changeEmitted();
        //     if (data?.value == 'import') {
        //         this.getDatasetList(1);
        //     }
        // })
    }

    // curModel: any;
    user: any;
    app: any;
    curDataset: any;
    curDatasetId: number;
    dsError: any;
    datasetList: any[];
    formList: any[];
    subFormList: any[];
    offline: boolean;
    appId: number;
    datasetLoading: boolean;
    formLoading: boolean;
    baseApi = baseApi;
    dynamic: any = {};

    filterField: string = "";

    btnColors = ['btn-secondary', 'btn-light', 'btn-primary', 'btn-success', 'btn-danger'];

    isArray = Array.isArray;

    ngOnInit() {

        this.userService.getCreator().subscribe((user) => {

            this.user = user;

            this.route.parent.parent.parent.params
                // NOTE: I do not use switchMap here, but subscribe directly
                .subscribe((params: Params) => {

                    const appId = params['appId'];
                    this.appId = params['appId'];
                    if (appId) {
                        let params = { email: user.email }

                        this.appService.getApp(appId, params)
                            .subscribe(res => {
                                this.app = res;
                                this.getDatasetList(appId);
                                this.getFormList(appId);
                                this.getLookupList();
                                this.getAccessList();
                                this.getScreenList(appId);
                                this.cdr.detectChanges(); // <--- Add here
                            });
                    }


                });

            this.route.queryParams
                .subscribe((params: Params) => {

                    const id = params['id'];
                    if (id) {
                        this.getDataset(id);
                    }
                })

            this.appService.getAppMyList({
                email: this.user.email,
                size: 999,
                sort: 'id,desc'
            }).subscribe(res => {
                this.otherAppList = res.content;
            })

        });
    }

    // newForm: any = {}

    compareByIdFn(a, b): boolean {
        return (a && a.id) === (b && b.id);
    }
    
    qFilter:any;
    getDataset(datasetId) {
        this.dsError = null;
        this.curDatasetId = datasetId;
        this.datasetLoading = true;
        this.datasetService.getDataset(datasetId)
        .subscribe({
            next: (res) => {
                this.form = {};
                this.curDataset = res;
                this.initSubForm();
                this.editDatasetData = res;
                this.datasetLoading = false;
                if (this.curDataset.form) {
                    this.loadForm(this.curDataset.form.id, this.form, res);
                    // this.getLookupIdList(this.curDataset.form.id);
                    // this.loadData = false;
                }
                if (this.curDataset?.x?.qFilter){
                    this.qFilter = JSON.parse(this.curDataset?.x?.qFilter);
                }else{
                    delete this.qFilter;
                }
                this.cdr.detectChanges(); // <--- Add here
            },
            error: (err) => {
                this.datasetLoading = false;
                this.dsError = err.error;
                this.cdr.detectChanges(); // <--- Add here
            }
        })
    }


    getDatasetList(appId) {
        this.datasetService.getDatasetList(appId)
            .subscribe(res => {
                this.datasetList = res;
                this.commService.emitChange({ key: 'dataset', value: res.length });
                this.cdr.detectChanges(); // <--- Add here
            })
    }

    screenList: any[];
    getScreenList(appId) {
        this.screenService.getScreenList(appId)
            .subscribe(res => {
                this.screenList = res;
                // this.commService.emitChange({key:'screen',value:res.length});
                this.cdr.detectChanges(); // <--- Add here
            });
    }


    lookupList: any[];
    getLookupList() {
        let params = { appId: this.appId }

        this.lookupService.getLookupList(params)
            .subscribe(res => {
                this.lookupList = res.content;
                this.cdr.detectChanges(); // <--- Add here
            })

    }


    itemExist = (f) => this.curDataset.form.items[f.code] && !f.id;


    extraAutoCompleteJs: any[] = [];
    form: any = {};
    loadForm(id, holder, ds) {
        this.formLoading = true;
        this.formService.getForm(id)
            .subscribe(res => {
                if (res) {
                    holder['data'] = res;
                    holder['prev'] = res.prev;

                    this.extraAutoCompleteJs = [
                        { c: 2, label: "$submit$", type: "function", apply: "$submit$($_,#{resubmit?})", detail: "Submit entry", info: "After-submit navigation depends on form setting" },
                    ];
                    this.populateAutoComplete();

                }
                this.formLoading = false;
                this.cdr.detectChanges(); // <--- Add here
            }, err => {
                this.formLoading = false;
                this.cdr.detectChanges(); // <--- Add here
            });


    }

    populateAutoComplete() {

        Object.keys(this.form['data']?.items).forEach(key => {
            var value = this.form['data']?.items[key];
            if (this.form['data']?.items[key]?.type != 'static') {
                if (['select', 'radio'].indexOf(value?.type) > -1) {
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}.name`, type: "text", apply: `$.${key}.name`, label: value.label })
                } else if (['date'].indexOf(value?.type) > -1) {
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `$.${key}`, label: value.label })
                } else if (['file'].indexOf(value?.type) > -1) {
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `"${baseApi}/entry/file/" + $.${key}`, label: value.label })
                } else {
                    this.extraAutoCompleteJs.push({ c: 1, detail: `$.${key}`, type: "text", apply: `$.${key}`, label: value.label })
                }
            }
        });

        this.form['data']?.tiers.forEach(t => {
            this.extraAutoCompleteJs.push({ c: 1, label: `(tierId:${t.id}) ${t.name}`, apply: t.id + "", detail: t.name });
        })

        if (this.form['prev']) {
            Object.keys(this.form['prev']?.items).forEach(key => {
                var value = this.form['prev']?.items[key];
                if (this.form['data']?.items[key]?.type != 'static') {
                    this.extraAutoCompleteJs.push({ c: 1, label: `$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, type: "text", apply: `$prev$.${key}${(['select', 'radio'].indexOf(value?.type) > -1 ? '.name' : '')}`, detail: value.label })
                }
            });
        }
        if (this.form['data']) {
            this.form['data']?.sections?.forEach(section => {
                if (section.type == 'list') {
                    this.extraAutoCompleteJs.push({ c: 2, label: '(child) $.' + section.code, type: "text", apply: this.getLoopCodeJs(section), detail: '' + section.title })
                }
            })
        }
        this.accessList?.forEach(i => {
            this.extraAutoCompleteJs.push({ c: 1, label: `(groupId:${i.id}) ${i.name}`, apply: i.id + "", detail: i.name });
        });
        this.datasetList?.forEach(i => {
            this.extraAutoCompleteJs.push({ c: 1, type: 'text', label: `(datasetId:${i.id}) ${i.title}`, apply: i.id + "", detail: i.title });
            this.extraAutoCompleteJs.push({ c: 2, type: 'function', label: `(http-dataset:${i.id}) ${i.title}`, apply: `$http$(\"${baseApi}/entry/list?datasetId=${i.id}&email=\"+$user$.email, res=>{\n\t$this$.dataset_${i.id} = res.content;\n\t$this$.dataset_${i.id}_total = res.page?.totalElements;\n\t#{//more codes}\n})`, detail: i.title });
        });
        this.formList?.forEach(i => {
            this.extraAutoCompleteJs.push({ c: 1, type: 'text', label: `(formId:${i.id}) ${i.title}`, apply: "" + i.id + "", detail: i.title });
            this.extraAutoCompleteJs.push({ c: 2, type: 'function', label: `(http-form:${i.id}) ${i.title}`, apply: `$http$(\"${baseApi}/entry/by-params?formId=${i.id}&key=\"+value, res=>{\n\t$this$.entry_${i.id} = res;\n\t#{//more codes}\n})`, detail: i.title });
        });
        this.cdr.detectChanges(); // <--- Add here
    }

    getLoopCodeJs = (section) => "$." + section.code + ".forEach(i=>{\n" + this.getItemsJs(section) + "\n\t${//More codes}\n})";
    getItemsJs(section) {
        return section.items
            .filter(i => this.form['data'].items[i.code].type != 'static')
            .map(i => {
                var type = this.form['data'].items[i.code].type;
                var pipe = ''
                if (['select', 'radio'].indexOf(type) > -1) {
                    pipe = '.name';
                }
                return '\ti.' + i.code + pipe + ';';
            })
            .join("\n");
    }

    accessList: any[] = [];
    accessListMap: any={}
    getAccessList() {
        this.groupService.getGroupList({ appId: this.app.id, size: 999 })
            .subscribe(res => {
                this.accessList = res.content;
                this.accessListMap={};
                this.accessList.forEach(a=>this.accessListMap[a.id]=a);
                this.cdr.detectChanges(); // <--- Add here
            });
    }

    clearEntry() {
        if (prompt("Are you sure you want to permanently delete entries of this dataset?\n Type 'clear-dataset-entries' and press OK to proceed") == 'clear-dataset-entries') {
            this.datasetService.clearData(this.curDatasetId, this.user.email)
                .subscribe(res => {
                    this.toastService.show("Entry removed: " + res.rows, { classname: 'bg-success text-light' });
                    this.cdr.detectChanges(); // <--- Add here
                })
        }
    }

    editColumnText(item, field) {
        var newLabel = window.prompt("Enter new field title (" + item.code + "):", item.label);
        if (newLabel == null || newLabel == "") {

        } else {
            item.label = newLabel;
            this.datasetService.updateDatasetItem(this.curDataset.id, field)
                .subscribe({
                    next: (res) => {
                        this.toastService.show("Label saved successfully", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    },
                    error: (err) => {
                        this.toastService.show("Label saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    }
                })
        }
    }

    editFilterText(field) {
        var newLabel = window.prompt("Enter new filter title:", field.label);
        if (newLabel == null || newLabel == "") {

        } else {
            field.label = newLabel;
            this.saveDataset();
            this.cdr.detectChanges(); // <--- Add here
        }
    }


    getFormList(appId) {
        // let params = { appId: appId }
        // new HttpParams()
        //     .set("appId", this.app.id)

        this.formService.getListBasic({appId})
            .subscribe(res => {
                this.formList = res.content;
                this.initSubForm();
                this.cdr.detectChanges(); // <--- Add here
            });
    }

    initSubForm(){
        if (this.formList?.length>0 && this.curDataset?.form){
            this.subFormList = this.formList.filter(f=>f.x?.extended == this.curDataset.form.id);
        }
    }


    getHiddenList = (list) => list.filter(i => i.hidden == true);

    editDatasetData: any;
    editHolderForm: any;
    hasFocus: any = {};

    sectionItems: any = {};
    editDataset(content, data, isNew, form) {

        this.editDatasetData = data;
        this.editDatasetData.appId = this.app.id;

        // this.statusFilterForm = this.convertStatusToDisplay(data.statusFilter, form);

        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((rItem) => {

                // rItem.statusFilter = this.convertDisplayToStatus(this.statusFilterForm);


                this.datasetService.saveDataset(this.app.id, rItem)
                    .subscribe((res) => {
                        this.getDatasetList(this.app.id);
                        this.getDataset(res.id);
                        // this.getFormData(this.curForm.id);
                        this.toastService.show("Dataset saved successfully", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    });
            }, res => { });
        // })

    }

    removeDatasetData: any;
    removeDataset(content, data) {
        this.removeDatasetData = data;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then(data => {
                this.datasetService.removeDataset(data.id)
                    .subscribe({
                        next: (res) => {
                            this.getDatasetList(this.app.id);
                            delete this.curDataset;
                            this.toastService.show("Dataset removed successfully", { classname: 'bg-success text-light' });
                            this.cdr.detectChanges(); // <--- Add here
                        },
                        error: (err) => {
                            this.toastService.show("Dataset removal failed", { classname: 'bg-danger text-light' });
                            this.cdr.detectChanges(); // <--- Add here
                        }
                    })
            }, res => { });
    }
    removeDsItem(ds) {
        if (confirm("Remove column \"" + ds.label + "\"?")) {
            this.datasetService.removeDatasetItem(ds.id, null)
                .subscribe(data => {
                    this.getDataset(this.curDataset.id);
                    this.cdr.detectChanges(); // <--- Add here
                })
        }
    }

    exceptCurForm = (form) => this.formList.filter(f => form['data'] && f.id != form['data'].id);

    // reorderDs(ds, index, op) {
    //     this.reorder(ds.items, index, op);
    //     this.saveDsOrder(ds);
    // }

    dropField(event: CdkDragDrop<number[]>, parent) {
        moveItemInArray(parent.items, event.previousIndex, event.currentIndex);
        this.saveDsOrder(parent);
        this.cdr.detectChanges(); // <--- Add here
    }

    curAction:number;

    dropAction(event: CdkDragDrop<number[]>, parent) {
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        this.curDataset.actions = parent
        .map(function (val, $index) {
            val.sortOrder = $index;
            return val;
        });
        this.saveDataset();
        this.cdr.detectChanges(); // <--- Add here
    }

    dropFilter(event: CdkDragDrop<number[]>, parent) {
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        this.curDataset.filters = parent
            .map(function (val, $index) {
                val.sortOrder = $index;
                return val;
            });
        this.saveDataset();
        this.cdr.detectChanges(); // <--- Add here
    }

    dropSubs(event: CdkDragDrop<number[]>, parent) {
        moveItemInArray(parent, event.previousIndex, event.currentIndex);
        parent = parent
            .map(function (val, $index) {
                val.sortOrder = $index;
                return val;
            });
        this.saveDataset();
        this.cdr.detectChanges(); // <--- Add here
    }

    removeSub(sub,field, $index){
        if (confirm("Are you sure you want to remove this sub field: "+sub.label+"?")){
            field.subs.splice($index, 1);
            this.datasetService.updateDatasetItem(this.curDataset.id, field)
                .subscribe({
                    next: (res) => {
                        this.toastService.show("Sub field removal successfully", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    },
                    error: (err) => {
                        this.toastService.show("Sub field removal failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    }
                })
        }
    }

    saveDsOrder(ds) {
        var list = ds.items
            .map(function (val, $index) {
                return { id: val.id, sortOrder: $index }
            });
        return this.datasetService.saveDsOrder(list)
            .subscribe((res) => {
                return res;
            });
    }


    trackByFn = (index, item) => index;

    getCode = (id) => encodeURI(btoa(id));

    getAsList = splitAsList;

    removeFromArray(array, item) {
        return (array ? array : []).filter(r => item.indexOf(r) == -1);
    }

    toSpaceCase = toSpaceCase; // (string) => string.replace(/[\W_]+(.|$)/g, (matches, match) => match ? ' ' + match : '').trim();

    toSnakeCase = toSnakeCase; // (string) => string ? this.toSpaceCase(string).replace(/\s/g, '_').toLowerCase() : '';


    addIndex(list, att) {
        delete att.id;
        list.push(att);
    }
    checkIndex = (list, code) => list.filter(i => i.code == code)[0];

    removeIndex(parent, list, code) {
        parent[list] = parent[list].filter(el => {
            return el.code !== code;
        })
    }


    removeFilter($index) {
        this.curDataset.filters.splice($index, 1);
        this.saveDataset();
        this.cdr.detectChanges(); // <--- Add here
    }

    removePreset(key) {
        delete this.curDataset.presetFilters[key];
        this.saveDataset();
        this.cdr.detectChanges(); // <--- Add here
    }

    resyncDataset(dsId){
        if (confirm("Are you sure you want to resynchronize Model Picker data using this dataset?")){
            this.runService.resyncDataset(this.curDatasetId)
            .subscribe(res=>{
                this.toastService.show("Dataset successfully resynchronized", { classname: 'bg-success text-light' });
                this.cdr.detectChanges(); // <--- Add here
            })            
        }
    }

    saveDataset(reload?: boolean) {
        this.datasetService.saveDataset(this.app.id, this.curDataset)
            .subscribe((res) => {
                if (reload) {
                    this.getDatasetList(this.app.id);
                    this.getDataset(this.curDatasetId);
                }
                this.toastService.show("Dataset saved successfully", { classname: 'bg-success text-light' });
                this.cdr.detectChanges(); // <--- Add here
            });
    }

    modelPickerData: any = {}
    setModelPickerData(obj) {
        this.modelPickerData = obj;
    }

    // getAsList = (str) => str && str.split(',').map(i => i.trim());

    isEmptyObject = (obj: any) => obj && Object.keys(obj).length == 0;


    checkInPop = (str, action) => str?.indexOf(action) > -1;
    toggleInPop = (obj, key, action) => {
        var arr;
        if (!obj[key]) {
            arr = [];
        } else {
            arr = obj[key]?.split(",");
        }
        if (this.checkInPop(obj[key], action)) {
            arr = arr.filter(r => r != action)
        } else {
            arr.push(action);
        }
        obj[key] = arr.join(",");
    }

    editPresetValue(c) {
        var value = prompt('Edit value for :' + c.key + ' (old value: ' + c.value + ')', c.value);
        if (value) {
            this.curDataset.presetFilters[c.key] = value;
            this.saveDataset();
            this.cdr.detectChanges(); // <--- Add here
        }
    }

    editPresetKey(c) {
        var key = prompt('Edit key for :' + c.key + ' (old key: ' + c.key + ')', c.key);
        if (key) {
            this.curDataset.presetFilters[key] = c.value;
            if (c.key != key) {
                delete this.curDataset.presetFilters[c.key]
            }
            this.saveDataset();
            this.cdr.detectChanges(); // <--- Add here
        }

    }

    removeScAction(sc) {
        if (confirm("Are you sure you want to remove this action?")) {
            delete this.curDataset.screen[sc];
            if (this.curDataset.inpop && this.curDataset.inpop.indexOf('sc_' + sc) > -1) {
                var arr = this.curDataset.inpop.split(",")
                arr.splice(this.curDataset.inpop.indexOf('sc_' + sc), 1);
                this.curDataset.inpop = arr.join(",")
            }
            this.saveDataset();
            this.cdr.detectChanges(); // <--- Add here
        }
    }
    removeNextAction(f) {
        if (confirm("Are you sure you want to remove this action?")) {
            delete this.curDataset.next[f];
            if (this.curDataset.inpop && this.curDataset.inpop.indexOf('next_' + f) > -1) {
                var arr = this.curDataset.inpop.split(",")
                arr.splice(this.curDataset.inpop.indexOf('next_' + f), 1);
                this.curDataset.inpop = arr.join(",")
            }
            this.saveDataset();
            this.cdr.detectChanges(); // <--- Add here
        }
    }

    cleanText = cleanText;

    otherAppList: any[] = [];
    loadOtherAppList(appId) {
        this.getFormList(appId);
    }

    editItemData: any;
    editItem(content, data) {
        this.editItemData = data;
        // this.editActionData.appId = this.app.id;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((data) => {

                this.datasetService.updateDatasetItem(this.curDataset.id, data)
                .subscribe({
                    next: (res) => {
                        this.toastService.show("Dataset item saved successfully", { classname: 'bg-success text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    },
                    error: (err) => {
                        this.toastService.show("Dataset item saving failed", { classname: 'bg-danger text-light' });
                        this.cdr.detectChanges(); // <--- Add here
                    }
                })

            }, dismiss => { })
    }

    editActionData: any;
    editAction(content, data) {
        this.editActionData = data;
        this.editActionData.appId = this.app.id;
        history.pushState(null, null, window.location.href);
        this.modalService.open(content, { backdrop: 'static' })
            .result.then((data) => {
                this.datasetService.saveAction(this.curDataset.id, data)
                    .subscribe(res => {
                        this.getDataset(this.curDataset.id);
                        this.toastService.show("Dataset action saved successfully", { classname: 'bg-success text-light' });
                    });
            }, dismiss => { })
    }

    deleteAction(action) {
        if (confirm("Are you sure you want to remove action: " + action.label)) {
            this.datasetService.removeAction(action.id)
                .subscribe(res => {
                    this.getDataset(this.curDataset.id);
                    this.toastService.show("Dataset action removed successfully", { classname: 'bg-success text-light' });
                    this.cdr.detectChanges(); // <--- Add here
                });
        }
    }

}
