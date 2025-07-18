import { Component, OnInit, input, model, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { Observable, first, map, share, tap } from 'rxjs';
// import { EntryService } from '../../../service/entry.service';
import { FormService } from '../../../service/form.service';
// import { LookupService } from '../../../service/lookup.service';
import { btoaUTF, deepMerge, hashObject, splitAsList } from '../../utils';
import { FilterPipe } from '../../pipe/filter.pipe';
import { KeyValuePipe } from '@angular/common';
import { EntryFilterComponent } from '../../component/entry-filter/entry-filter.component';
import { NgCmComponent } from '../../component/ng-cm/ng-cm.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { EntryService } from '../../../run/_service/entry.service';
import { LookupService } from '../../../run/_service/lookup.service';
import { GroupByPipe } from '../../pipe/group-by.pipe';

@Component({
    selector: 'app-edit-dataset',
    templateUrl: './edit-dataset.component.html',
    styleUrls: ['./edit-dataset.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, NgbNav, NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent,
        FaIconComponent, NgSelectModule, NgCmComponent, EntryFilterComponent, NgbNavOutlet, KeyValuePipe,
        FilterPipe, GroupByPipe]
})
export class EditDatasetComponent implements OnInit {

  cdr = inject(ChangeDetectorRef);
  private formService = inject(FormService);
  private lookupService = inject(LookupService);
  private entryService = inject(EntryService);

  // @Input("dataset")
  editDatasetData = model<any>({ items:[], filters:[], presetFilters:{}, next:{}, status:'', statusFilter:{} }, {alias:'dataset'});
  _editDatasetData:any = {};

  app = input<any>({})

  formList:any[]=[];

  lookup:any={};

  close = input<any>();

  dismiss = input<any>();

  otherAppList = input<any[]>([], {alias:'appList'});

  accessList = input<any[]>([],{alias:'accessList'});

  hasFocus: any = {};

  formHolder: any = {};

  user = input<any>();

  extraAutoComplete:any=[];

  placeholder: string= `<!-- HTML, support templating -->
  <style>
    .ds-thead {}
    .ds-tbody {}
    .ds-check {}
    .ds-index {}
    .ds-item {}
    .ds-status {}
    .ds-action {}
  </style>`; 

  constructor() {
  }

  ngOnInit(): void {

    this._editDatasetData = {...this.editDatasetData()};

    this.getFormList(this.app().id);

    // this._formList = this.formList();

    if (!this._editDatasetData.x) {
      this._editDatasetData.x = {};
    }
    if (!this._editDatasetData.presetFilters) {
      this._editDatasetData.presetFilters = {};
    }
    if (!this._editDatasetData.id) {
      this._editDatasetData.items = [];
      this._editDatasetData.filters = [];
      this._editDatasetData.presetFilters = {};
      this._editDatasetData.next = {};
      this._editDatasetData.status = "";
      this._editDatasetData.statusFilter = {};
    }

    this._editDatasetData.appId = this.app().id;

    if (this._editDatasetData.form && this._editDatasetData.form.id) {
      this.getForm(this._editDatasetData.form?.id, this._editDatasetData)
        .subscribe(res => {

          if (this.formHolder && this.formHolder['data']?.type == 'rest') {
            this._editDatasetData.type = 'all';
          }

          if (this.formHolder['data']?.id) {
            this.getLookupIdList(this.formHolder['data']?.id);
            this._editDatasetData.form = this.formHolder['data'];
            // this.editDatasetData().form = this.formHolder['data'];
            if (this.formHolder['prev']?.id) {
              this.getLookupIdList(this.formHolder['prev']?.id);
            }
          } else {
            delete this._editDatasetData.form;
            // delete this.editDatasetData().form
          }
          this.getGroupableField();
        })
    }

    this.extraAutoComplete.push(
      { c: 1, detail: `$and`, type: "text", apply: `$and: [{#{filters}}]`, label: `And condition for query builder` },
      { c: 1, detail: `$or`, type: "text", apply: `$or: [{#{filters}}]`, label: `Or condition for query builder` }
    )
  }


  groupableFields:any[]=[];
  getGroupableField(){
    this.groupableFields = [];
    if (this.formHolder['data'].tiers?.length>0){
      this.groupableFields.push({
        fieldPath: 'currentStatus',
        formTitle: this.formHolder['data'].title,
        sectionTitle: 'Built-in',
        itemLabel: 'Current Entry Status'
      });    
      this.groupableFields.push({
        fieldPath: 'submissionDate',
        formTitle: this.formHolder['data'].title,
        sectionTitle: 'Built-in',
        itemLabel: 'Current Entry Submission Date'
      });    
    }

    ['data','prev'].forEach(fm=>{
      if (this.formHolder[fm]) {
        let sectionItems = this.getSectionItemsNew(this.formHolder[fm], ['section'])
        sectionItems.forEach(section=>{
          if (section.section.id!=-1){
            section.items.forEach(item=>{
              let field = this.formHolder[fm].items[item.code];
              if (['static','file','btn','imagePreview','speech','dataset','screen'].indexOf(field?.type)==-1
               && ['multiple'].indexOf(field?.subType)==-1) {
                
                let fieldPath = fm+'.'+item.code;
                
                this.groupableFields.push({
                  fieldPath: fieldPath,
                  formTitle: this.formHolder[fm]?.title,
                  sectionTitle: section.section.title,
                  itemLabel: this.formHolder[fm]?.items[item.code]?.label
                });
              }
            })
          }
        })
      }
    })
  }

  checkGroupField = (code) => this._editDatasetData.x?.groupFields?.[code];
  
  toggleGroupField = (code, title)=>{
    if (!this._editDatasetData.x?.groupFields) this._editDatasetData.x.groupFields={};
    if (this._editDatasetData.x?.groupFields?.[code]){
      delete this._editDatasetData.x?.groupFields?.[code];
    }else{
      this._editDatasetData.x.groupFields[code]=title;
    }
  }

  checkAllGroupFields(){       
    this.groupableFields.forEach(gf=>this._editDatasetData.x.groupFields[gf.fieldPath]=gf.itemLabel) 
  }

  uncheckAllGroupFields(){
    this._editDatasetData.x.groupFields = {}
  }

  getPrefix = (fm, section) => {
    var mapFm = { 'data': '$', 'prev': '$prev$', 'approval': '$$' };
    var tier = this.getTierFromSection(section && section.id, this.formHolder['data']);
    if (section && section.type == 'approval') {
      if (tier) {
        return '$$.' + tier.id;
      } else {
        return mapFm[fm];
      }
    } else if (section && section.type == 'list') {
      return mapFm[fm] + '.' + section.code + '*';
    } else {
      return mapFm[fm];
    }
  }


  clearPreset(item, key) {
    key.forEach(k => {
      delete item[k];
    })
  }

  getTierFromSection = (sectionId, form) => form && form.tiers.filter(t => t.section && t.section.id == sectionId)[0];

  checkAll(prop, datasetData) {
    ['data', 'prev'].forEach(fm => {
      if (this.formHolder[fm]){
        var form = this.formHolder[fm];
        this.sectionItems.data.forEach(s => {
          if (s.section.type != 'list') {
            s.items.forEach(i => {
              if (s.section.type != 'approval') {
                this.toggleItem(datasetData, prop, form?.items[i.code], fm, form.id, s.section.type, this.getPrefix(fm, s.section), true)
              } else {
                if (s.tier) {
                  this.toggleItem(datasetData, prop, form?.items[i.code], s.tier?.id, form.id, s.section.type, this.getPrefix(fm, s.section), true)
                }
              }
            })
          }
        })        
      }
    })
  }

  uncheckAll(prop, datasetData){
    datasetData[prop] = [];
  }

  checkAllStatus(checked){
    this.statusFilterForm['-1'].drafted = checked;
    this.statusFilterForm['-1'].submitted = checked;
    this.formHolder['data']?.tiers?.forEach(tier=>{
      for (const action in tier.actions){
        this.statusFilterForm[tier.id][action] = checked;
      }
      this.statusFilterForm[tier.id].resubmitted = checked;
    })
  }

  statusFilterForm: any = {};
  // statusFilterData:any={};
  convertStatusToDisplay(status, form) {
    var statusFilterForm: any = {}
    // var editDatasetStatusFilterList = {};
    // convert { "121":"submitted,approved"} to {"121":{submitted:true, approved:true}}
    statusFilterForm[-1] = {};
    var draftedFilter = (status && status[-1]) ? status[-1].split(",") : [];
    draftedFilter.forEach(element => {
      statusFilterForm[-1][element] = true;
    });
    form['data'] && form['data'].tiers.forEach(t => {
      statusFilterForm[t.id] = {};
      var splittedFilter = (status && status[t.id]) ? status[t.id].split(",") : [];
      splittedFilter.forEach(element => {
        statusFilterForm[t.id][element] = true;
      });
    });
    return statusFilterForm;
  }

  convertDisplayToStatus(statusFilterList) {
    var statusFilter = {};
    var draftedArrays = [];
    for (var k in statusFilterList[-1]) {
      if (statusFilterList[-1][k] === true) {
        draftedArrays.push(k);
      }
    }
    statusFilter[-1] = draftedArrays.join(",");
    // for each tier
    Object.keys(statusFilterList).forEach(k => {
      var statusFilterArrays = [];
      // for each {approved:true, submitted:true, etc}
      for (var k2 in statusFilterList[k]) {
        if (statusFilterList[k][k2] === true) {
          statusFilterArrays.push(k2);
        }
      }
      statusFilter[k] = statusFilterArrays.join(",");
    });
    return statusFilter;
  }


  getSectionItemsNew(form, types: any[]) {
    let items = [];
    if (form) {
      form.sections.filter(s => types.indexOf(s.type) > -1)
        .forEach(element => {
          if (element.type == 'approval') {
            var tier = this.getTierFromSection(element.id, form);
            if (tier) {
              items = items.concat({ section: element, items: element.items, tier: tier });
            }
          } else {
            items = items.concat({ section: element, items: element.items, tier: null });
          }
        });
    }
    // console.log(items);
    return items;
  }

  sectionItems: any = {};


  loadOtherAppList(appId) {
    this.getFormList(appId);
  }

  getFormList(appId) {
    let params = { appId: appId }

    this.formService.getListBasic(params)
      .subscribe(res => {
        this.formList = res.content;
        this.cdr.detectChanges();
      });
  }

  // form: any = {};
  formLoading: boolean;
  loadForm(id, ds) {
    this.getForm(id, ds)
      .subscribe(res => { 
        this.getGroupableField();
      })
  }

  builtInItems = {
    $id:{label:"System ID",code:'$id',type:'number',subType:'number'},
    $code:{label:"System Code",code:'$code',type:'text',subType:'input'},
    $counter:{label:"System Counter",code:'$counter',type:'number',subType:'number'}
  }

  builtInSectionItem = [{code:'$id'},{code:'$code'},{code:'$counter'}];

  getForm(id, ds) {
    this.formLoading = true;
    return this.formService.getForm(id)
      .pipe(
        tap({
          next: (res: any) => {
            this.getLookupIdList(res.id);

            this.formHolder['data'] = res;

            this.formHolder['data'].sections = [{id:-1,type:'section', title:'Built-in properties', items:this.builtInSectionItem},...this.formHolder['data'].sections]
            this.formHolder['data'].items = deepMerge(this.builtInItems,this.formHolder['data'].items);
            
            this.formHolder['prev'] = res.prev;

            this.sectionItems['data'] = this.getSectionItemsNew(this.formHolder['data'], ['section', 'approval', 'list']);
            this.sectionItems['prev'] = this.getSectionItemsNew(this.formHolder['prev'], ['section', 'approval', 'list']);

            this.statusFilterForm = this.convertStatusToDisplay(ds.statusFilter, this.formHolder);

            this.formLoading = false;
            this.cdr.detectChanges();
          }, error: err => {
            this.formLoading = false;
            this.cdr.detectChanges();
          }
        })
      )
  }


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

  itemMap:any={}
  toggleItem(parent, list, f, root, formId, type, prefix, checkAll?) {
    var size = parent[list].filter(i => i.code == f?.code && i.root == root).length;

    // Is currently selected
    if (size > 0) {
      if (!checkAll) {
        parent[list] = parent[list].filter(i => !(i.code == f?.code && i.root == root))
        delete this.itemMap[root+'-'+f.code];
      }
    } else {
      let item = {
        code: f?.code,
        label: f?.label||f?.title,
        sortOrder: parent[list].length,
        root: root,
        type: type,
        prefix: prefix,
        formId: formId
      }
      parent[list].push(item);
      this.itemMap[root+'-'+f?.code]=item;
    }

    // this.getGroupableField();
  }

  toggleChildItem(data,sectionCode,f){
    if (data.filter(i=>i.code==sectionCode).length>0){
      let item = data.filter(i=>i.code==sectionCode)[0];
      // let splitted = item.fields?item.fields.split(","):[];
      if (!item.subs) item.subs = [];
      if (this.checkChildItem(data,sectionCode,f)){        
        item.subs = item.subs.filter(i=>i.code!=f.code);
      }else{
        item.subs.push({
          code: f.code,
          label: f.label
        })
      }
      // item.fields = splitted.join(",");
    }
  }
  checkChildItem(data,sectionCode,f){
    let filtered = data.filter(i=>i.code==sectionCode);
    if (filtered.length==0) return false;
    return filtered.filter(i=>i.code==sectionCode)[0]?.subs?.filter(i=>i.code==f.code).length > 0;
  }

  checkItem(list, f, root) {
    return list.filter(i => f.code == i.code && i.root == root).length > 0;
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

  checkNext(next, id) {
    return next && next[id];
  }

  toggleFacet(parent, facet, text) {
    if (!parent) {
      parent = {};
    }
    if (parent[facet]) {
      delete parent[facet]
    } else {
      parent[facet] = text;
    }
  }

  compareByIdFn = (a, b):boolean => (a && a.id) === (b && b.id);

  isEmptyObject = (obj: any):boolean => obj && Object.keys(obj).length == 0;

  getAsList = splitAsList;

  removeFromArray(array, item) {
    return (array ? array : []).filter(r => item.indexOf(r) == -1);
  }

  exceptCurForm = (form) => this.formList.filter(f => form['data'] && f.id != form['data'].id);

  done(data) {
    data.statusFilter = this.convertDisplayToStatus(this.statusFilterForm);
    this.editDatasetData.set(data);
    this.close()?.(data);
  }

  lookupIds = [];
  lookupKey = {};
  mod = {};

  getLookupIdList(id) {
    this.lookupService.getInForm(id)
      .subscribe(res => {
        this.lookupIds = res;
        this.lookupIds.forEach(key => {
          this.lookupKey[key.code] = {
            ds: key.dataSource,
            type: key.type
          };
          this._getLookup(key.code, key.dataSourceInit ? this.parseJson(key.dataSourceInit) : null);
        });
        this.cdr.detectChanges();
      });
  }

  parseJson(str) {
    var g = {};
    try { g = JSON.parse(str) } catch (e) { };
    return g;
  }

  _getLookup = (code, param, cb?, err?) => {
    if (code) {
      this._getLookupObs(code, param, cb, err)
      .subscribe({
        next:res=>{
          this.lookup[code] = res;
          this.cdr.detectChanges();
        }, error:err=>{
          this.cdr.detectChanges();
        }
      })
    }
  }

  lookupDataObs:any={}
  _getLookupObs(code, param, cb?, err?):Observable<any>{

      var cacheId =  'key_'+btoaUTF(this.lookupKey[code].ds + hashObject(param??{}),null);
      // masalah nya loading ialah async... so, mun simultaneous load, cache blom diset
      // bleh consider cache observable instead of result.
      // tp bila pake observable.. request dipolah on subscribe();
      // settle with share()
      if (this.lookupDataObs[cacheId]){
        return this.lookupDataObs[cacheId]
      }
      // start loading
      if (this.lookupKey[code].type == 'modelPicker') {
        param = Object.assign(param || {}, { email: this.user().email });
        this.lookupDataObs[cacheId] = this.entryService.getListByDatasetData(this.lookupKey[code].ds, param ? param : null)
          .pipe(
            tap({ next: cb, error: err }), first(), share()
          )
      } else {
        param = Object.assign(param || {}, {});
        this.lookupDataObs[cacheId] = this.lookupService.getByKey(this.lookupKey[code].ds, param ? param : null)
          .pipe(
            tap({ next: cb, error: err }), first(),
            map((res:any)=>res.content), share()
          )
      }
      return this.lookupDataObs[cacheId];
  }

  queryBuilderPlaceholder=`Q Walker composition, ie:
[
  {
    "$and": [
      { "$.age~between": null },
      { "$.gender.code": "M" }      
    ]
  },
  {
    "$or":[
      { "$.email" : "{{$user$.email}}" },
      { "$_.email" : "{{$user$.email}}" }
    ]
  }
]`;

}
