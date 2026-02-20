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

import { ChangeDetectionStrategy, Component, OnInit, computed, effect, forwardRef, input, model, signal } from '@angular/core';
import { ScreenComponent } from '../../run/screen/screen.component';
import { ListComponent } from '../../run/list/list.component';
import { FieldViewComponent } from './field-view.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgTemplateOutlet, NgStyle, NgClass } from '@angular/common';
import { NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton, 
  NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgbNav, NgbNavItem, NgbNavItemRole, 
  NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet } from '@ng-bootstrap/ng-bootstrap';
import { baseApi, base } from '../../_shared/constant.service';
import { LogService } from '../../_shared/service/log.service';
import { RunService } from '../_service/run.service';
import { GroupByPipe } from '../../_shared/pipe/group-by.pipe';
import { IconSplitPipe } from '../../_shared/pipe/icon-split.pipe';
// import { deepMerge, ServerDate } from '../../_shared/utils';
// import { first, lastValueFrom, tap } from 'rxjs';
// import { EntryService } from '../_service/entry.service';
// import { ToastService } from '../../_shared/service/toast-service';

@Component({
    selector: 'form-view',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
@if (form().nav == 'accordions') {
  @if (sectionMap[-1]?.length>0){
    @let tabPre = {id:-1,sortOrder:-1,title:"(head)"};
    <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:tabPre}"></ng-container>
  }
  <div ngbAccordion class="pb-3" [destroyOnHide]="false" [closeOthers]="true" #nav>
    @for (tab of formTab(); track tab.id) {
      <div class="acc-card" ngbAccordionItem="acc-{{$index}}" [collapsed]="$index != navIndex()"
        [disabled]="!disabledTabs()[tab.id]"
        #accitem="ngbAccordionItem">
        <div ngbAccordionHeader>
          <div class="acc-btn-wrap centered" [class.limit-width]="!form()?.x?.wide" [class.border-bottom]="accitem.collapsed && !$last">
            <button ngbAccordionButton class="acc-btn border-0 p-0" style="box-shadow: none;">
              @if (form().showIndex) {
                <div style="float:left;height:25px; width:25px;background:#666; color:white;
                  padding:0px;margin-left:3px;line-height: 25px; text-align: center; margin-right:0.8em;
                border-radius:20px;">{{$index+1}}</div>
              }
              <h5 class="m-0">
                {{tab.title}}
              </h5>
            </button>
          </div>
        </div>
        <div ngbAccordionCollapse>
          <div ngbAccordionBody>
            <ng-template>
              <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:tab}"></ng-container>
            </ng-template>
          </div>
        </div>
      </div>
    }
  </div>
  @if (sectionMap[-999]?.length>0){
    @let tabPost = {id:-999,sortOrder:999,title:"(bottom)"};
    <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:tabPost}"></ng-container>
  }
}
@if (['tabs','pills','underline'].indexOf(form().nav)>-1) {
  @if (sectionMap[-1]?.length>0){
    @let tabPre = {id:-1,sortOrder:-1,title:"(head)"};
    <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:tabPre}"></ng-container>
  }
  <div class="tab-simple">
    <ul ngbNav #nav="ngbNav" [destroyOnHide]="false" [activeId]="'view' + navIndex()"
      [class.limit-width]="!form()?.x?.wide"
      class="nav-{{form().nav}} justify-content-center  d-print-none centered">
      @for (tab of formTab(); track tab.id) {
        <li [ngbNavItem]="'view' + $index"
         [disabled]="!disabledTabs()[tab.id]">
          <a ngbNavLink>
            @if (form().showIndex) {
              <div style="float:left;height:20px; width:20px;background:#666; color:white; font-size: .8em;
                padding:0px;margin-left:-5px;margin-top:1px;line-height: 20px; text-align: center; margin-right:0.3em;
              border-radius:20px;">{{$index+1}}</div>
            }
            @if (tab.x?.icon){
              <fa-icon [icon]="tab.x?.icon|iconSplit" [fixedWidth]="true"></fa-icon>
            }
            {{tab.title}}
          </a>
          <ng-template ngbNavContent>
            <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:tab}"></ng-container>
          </ng-template>
        </li>
      }
    </ul>
    <div [ngbNavOutlet]="nav"></div>
  </div>
  @if (sectionMap[-999]?.length>0){
    @let tabPost = {id:-999,sortOrder:999,title:"(bottom)"};
    <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:tabPost}"></ng-container>
  }
}
@if (form().nav=='simple') {
  <div>
    <ng-container *ngTemplateOutlet="sectionGroup;context:{tab:{}}"></ng-container>
  </div>
}
<!--</ng-container>-->
<ng-template  #sectionGroup let-tab="tab">
  <div class="single-pane pb-0">
    <div class="fix-gutter centered" [class.limit-width]="!form()?.x?.wide">
      <div class="row" [ngStyle]="{'justify-content':form()?.align}">
        @for (e of this.sectionMap[tab?.id]; track e.id) {
          @if (preSection()[e.id] && !(e.x?.facet?.['view']=='none')) {
            @if (e.type=='section') {
              <div [ngClass]="e.size||'col-sm-12'"
                [hidden]="e.hidden || (e.x?.facet?.['view']=='hidden')">
                <div id="section_{{e.code}}" [class.card-blank-style]="e.x?.blankStyle" [class.card]="!e.x?.blankStyle" [class.card-clean]="!e.x?.blankStyle" class="mb-3" [ngClass]="e.style">
                  @if (!e.hideHeader) {
                    <div class="card-header p-3 light-015">
                      <h6 class="card-title m-0">@if (e.icon) {
                        <fa-icon [icon]="e.icon|iconSplit" [fixedWidth]="true"></fa-icon>
                      } {{e.title}}</h6>
                      @if (e.description) {
                        <div class="card-subtitle mt-1 small" [innerHtml]="e.description"></div>
                      }
                    </div>
                  }
                  <div class="card-body p-3">
                    <div class="row g-4"  [ngStyle]="{'justify-content':e.align}">
                      @for (f of e.items; track f.id) {
                        @let field = form()?.items[f.code];
                        @if (field && preItem()[f.code]  && !((field?.x?.facet?.['view']||e.x?.facet?.['view'])=='none')) {
                          <div [ngClass]="field?.size"
                            [class.mt-0]="field?.subType=='clearfix'"
                            [hidden]="field?.hidden || (field?.x?.facet?.['view']||e.x?.facet?.['view'])=='hidden'">
                            @if (field?.type!='btn' && field?.subType!='clearfix' && !field?.hideLabel) {
                              <label class="form-label label-span">{{field?.label}}</label>
                            }
                            @if (!['dataset','screen'].includes(field.type)) {
                              @if (field.type!='static') {
                                <div class="form-group" [ngClass]="field?.altClass">
                                  <p class="form-control-static mb-0">
                                    @if (data()) {
                                      <field-view [timestamp]="timestamp()" [field]="field" [value]="getVal(field,data())"
                                      [scopeId]="scopeId()" [lang]="lang()"
                                      [data]="evalContextFn()(entry(),data(), {}, form())"></field-view>
                                      <!-- [data]="{$user$:user(),$conf$:appConfig,$:data(),$_:entry(),$prev$:entry()?.prev,
                                        $baseUrl$:$baseUrl$(),$baseApi$:baseApi, $base$:base, $this$:$this$(),
                                        $param$:$param$(),$token$:$token$(), $action$:$action$(), $file$:$file$()}" -->
                                    }
                                  </p>
                                </div>
                              } @else {
                                <div>
                                  @if (data()) {
                                    <field-view [timestamp]="timestamp()" [field]="field" [value]="getVal(field,data())"
                                    [scopeId]="scopeId()" [lang]="lang()"
                                    [data]="evalContextFn()(entry(),data(), {}, form())"></field-view>
                                    <!-- [data]="{$user$:user(),$conf$:appConfig,$:data(),$_:entry(),$prev$:entry()?.prev,
                                      $baseUrl$:$baseUrl$(),$baseApi$:baseApi, $base$:base, $this$:$this$(),
                                      $param$:$param$(),$token$:$token$(), $action$:$action$(), $file$:$file$()}" -->
                                  }
                                </div>
                              }
                            } @else {
                              <div class="form-group" [ngClass]="field?.altClass">
                                @if (field?.type=='dataset') {
                                  @defer(prefetch on idle){
                                    <app-list [asComp]="true" (changed)="dsChanged($event,f.code)"
                                      [datasetId]="field?.dataSource"
                                      [param]="preCompFilter()[f.code]"></app-list>
                                  }@loading {
                                    <div class="text-center m-5">
                                      <div class="spinner-grow text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                      </div>
                                    </div>
                                  }
                                } @else if (field?.type=='screen') {
                                  @defer(prefetch on idle){
                                    <app-screen [asComp]="true" [screenId]="field.dataSource"
                                      [param]="preCompFilter()[f.code]"></app-screen>
                                  }@loading {
                                    <div class="text-center m-5">
                                      <div class="spinner-grow text-primary" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                      </div>
                                    </div>
                                  }
                                }
                              </div>
                            }
                          </div>
                        }
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
            @if (e.type=='list') {
              <div [ngClass]="e.size||'col-sm-12'"
                [hidden]="e.hidden || (e.x?.facet?.['view']=='hidden')">
                <div  id="section_{{e.code}}" [class.card-blank-style]="e.x?.blankStyle" [class.card]="!e.x?.blankStyle" [class.card-clean]="!e.x?.blankStyle" class="mb-3" [ngClass]="e.style">
                  @if (!e.hideHeader) {
                    <div class="card-header p-3 bordered light-015" >
                      <h6 class="card-title m-0">@if (e.icon) {
                        <fa-icon [icon]="e.icon|iconSplit" [fixedWidth]="true"></fa-icon>
                        } {{e.title}}
                        <span class="badge badge-pill bg-dark float-end">{{data() && data()[e.code]?.length}}</span>
                      </h6>
                      @if (e.description) {
                        <div class="card-subtitle small mt-1" [innerHtml]="e.description"></div>
                      }
                    </div>
                  }
                  @if (data() && data()[e.code]?.length>0) {
                    @if (e.x?.tableStyle){
                      <div class="table-responsive mx-3">
                        <table class="table table-print mb-0 table-striped bg-white mb-3">
                          <thead>
                            <tr>
                              @for (f of e.x?.tableFields; track $index) {
                                @let field = form()?.items[f];
                                @if (field && field.subType!='clearfix'){
                                  <th>{{field.label}}</th>
                                }
                              }
                            </tr>
                          </thead>
                          <!-- @for(listKv of data()[e.code]|groupBy:e.x?.defGroupField; track $index){ -->
                          @for(listKv of groupedChildList[e.code]; track $index){
                            <tbody>
                              @if (e.x?.defGroupField){
                                <tr class="ds-group-header">
                                  <td [attr.colspan]="e.x?.tableFields?.length" style="padding:0">
                                    <button class="w-100 border-0 p-2 text-start d-flex flex-row fw-bold" (click)="hideGroup[e.code+listKv?.key]=!hideGroup[e.code+listKv?.key]">
                                    <!-- <div class="w-100 border-0 p-2 text-start d-flex flex-row fw-bold"> -->
                                      @if(!hideGroup[e.code+listKv?.key]){
                                        <fa-icon [icon]="['fas','angle-up']" [fixedWidth]="true"></fa-icon>
                                      }@else {
                                        <fa-icon [icon]="['fas','angle-down']" [fixedWidth]="true"></fa-icon>
                                      }  
                                      <div class="ms-2">
                                        @if (listKv?.key=='undefined'){
                                          <span class="text-muted fst-italic"> {{lang()=='ms'?'Tiada data':'Data not available'}}</span>
                                        }@else {
                                          {{listKv?.key}}
                                        }
                                      </div>
                                      <div class="bg-secondary px-1 text-white ms-2" style="font-size: 11px; border-radius:3px; line-height:13px">{{listKv?.value?.length}}</div>
                                    <!-- </div> -->
                                    </button>
                                  </td>
                                </tr>
                              }

                                <!-- @for (child of data()[e.code]; track $index; let $index_child = $index) { -->
                              @if(!hideGroup[e.code+listKv?.key]){
                                @for (child of listKv.value; track $index; let $index_c = $index) {
                                  <!-- @let $index_child = $index_g +'-'+ $index_c; -->
                                  <tr>
                                    @for (f of e.x?.tableFields; track $index; let $index_f = $index) {                                      
                                      @let field = form()?.items[f];
                                      @if (field && field.subType!='clearfix'){
                                        <td>
                                            @if (field.type!='static') {
                                              <field-view [timestamp]="timestamp()" [field]="field" [value]="getVal(field,child)" [scopeId]="scopeId()" [lang]="lang()"></field-view>
                                            }
                                            @if (field.type=='static') {
                                              <field-view [timestamp]="timestamp()" [field]="field" [value]="getVal(field,child)" [scopeId]="scopeId()" [lang]="lang()" 
                                                [data]="evalContextFn()(entry(), child, {}, form())"></field-view>
                                            }                                      
                                        </td>
                                      }
                                    }
                                  </tr>
                                }
                              }
                            </tbody>
                          }
                        </table>
                      </div>
                    }@else{
                      <!-- @for(listKv of data()[e.code]|groupBy:e.x?.defGroupField; track $index; let $index_g = $index){ -->
                      @for(listKv of groupedChildList[e.code]; track $index; let $index_g = $index){

                        @if (e.x?.defGroupField){
                          <button class="w-100 border-0 p-3 text-start d-flex flex-row position-relative bg-light fw-bold" (click)="hideGroup[e.code+listKv?.key]=!hideGroup[e.code+listKv?.key]">
                            @if(!hideGroup[e.code+listKv?.key]){
                              <fa-icon [icon]="['fas','angle-up']" [fixedWidth]="true"></fa-icon>
                            }@else {
                              <fa-icon [icon]="['fas','angle-down']" [fixedWidth]="true"></fa-icon>
                            }  
                          <!-- <div class="position-relative p-3 bg-light fw-bold" (click)="hideGroup[e.code+listKv?.key]=!hideGroup[e.code+listKv?.key]"> -->
                            <div class="ms-2">
                              @if (listKv?.key=='undefined'){
                                <span class="text-muted fst-italic"> {{lang()=='ms'?'Tiada data':'Data not available'}}</span>
                              }@else {
                                {{listKv?.key}}
                              }
                            </div>
                          <!-- </div> -->
                          <div class="bg-secondary px-1 text-white ms-2" style="font-size: 11px; border-radius:3px; line-height:13px">{{listKv?.value?.length}}</div>
                          </button>
                        }
                        @if(!hideGroup[e.code+listKv?.key]){

                          <div class="list-group list-group-flush list-child pt-1 px-3 pb-3" >
                            @for (child of listKv.value; track $index; let $index_c = $index) {
                              @let $index_child = $index_g +'-'+ $index_c;
                              <div class="list-group-item px-0 py-3">
                                <div class="row g-4">
                                  @for (f of e.items; track f.id) {
                                    @let field = form()?.items[f.code];
                                    @if (field && preItem()[e.code][$index_child][f.code]  && !((field?.x?.facet?.['view']||e.x?.facet?.['view'])=='none')) {
                                      <div [ngClass]="field?.size"
                                        [class.mt-0]="field?.subType=='clearfix'"
                                        [hidden]="field?.hidden || (field?.x?.facet?.['view']||e.x?.facet?.['view'])=='hidden'"
                                        >
                                        @if (field.type!='static') {
                                          <div class="form-group" [ngClass]="field?.altClass">
                                            @if (field?.subType!='clearfix' && !field?.hideLabel) {
                                              <label class="label-span form-label">{{field?.label}}</label>
                                            }
                                            <p class="form-control-static mb-0">
                                              <field-view [timestamp]="timestamp()" [field]="field" [value]="child[f.code]" [scopeId]="scopeId()" [lang]="lang()"></field-view>
                                            </p>
                                          </div>
                                        }
                                        @if (field.type=='static') {
                                          @if (field?.subType!='clearfix' && !field?.hideLabel) {
                                            <label class="label-span form-label">{{field?.label}}</label>
                                          }
                                          <field-view [timestamp]="timestamp()" [field]="field" [value]="child[f.code]" [scopeId]="scopeId()"  [lang]="lang()"
                                            [data]="evalContextFn()(entry(),child, {}, this.form())"></field-view>
                                          <!-- [data]="{$user$:user(),$conf$:appConfig,$:child,$_:entry(),$prev$:entry()?.prev,$baseUrl$:$baseUrl$(),$this$:$this$(),$param$:$param$(),$token$:$token$(), $action$:$action$(), $file$:$file$(), $index: child.$index}"></field-view> -->
                                        }
                                      </div>
                                    }
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        }

                      }
                    }
                  } @else {
                  <!-- @if ((data && !data[e.code]) || data[e.code]?.length==0) { -->
                    <div class="card-body p-3">
                    <!--<h4>No record</h4>-->
                      <p>{{lang()=='ms'?'Tiada data tersedia untuk':'No data available for'}} {{e.title}}</p>
                    </div>
                  }
                </div>
              </div>
            }
          }
        }
      </div>
    </div>
  </div>
</ng-template>
`,
    styles: [
      `.form-group>label,.custom-checkbox>label{ font-size:14px;font-weight:600;}`,
      `.label-span { opacity: 0.7; font-size: 0.95em; margin-bottom: 0.3rem;}`
    ],
    imports: [NgbAccordionDirective, NgbAccordionItem, NgbAccordionHeader, NgbAccordionToggle, NgbAccordionButton,
    NgbCollapse, NgbAccordionCollapse, NgbAccordionBody, NgTemplateOutlet, NgbNav, IconSplitPipe,
    NgbNavItem, NgbNavItemRole, NgbNavLink, NgbNavLinkBase, NgbNavContent, NgbNavOutlet,
    NgStyle, NgClass, FaIconComponent, FieldViewComponent, forwardRef(() => ListComponent), ScreenComponent]
})
export class FormViewComponent implements OnInit {

  constructor(private runService: RunService, private logService: LogService) {
    effect(()=>{
      this.filterTabs();
      this.filterItems();
      this.timestamp(); // utk force update if ada update
    })

    effect(()=>{
      if (this.data()){
        this.filterItems();
        // console.log("data", this.data());
      }
    })
    
   }

  timestamp = input<number>();
  form = input<any>();
  data = input<any>();
  entry = model<any>();
  user = computed<any>(() => this.runService.$user());
  $this$ = model<any>();
  // _this = signal<any>({}); // for internal use only, not to be used in template
  navIndex = input<number>(0);
  // $baseUrl$ = computed(()=>this.runService.$baseUrl());
  // $param$ = input<any>(); // no need, get in evalContextFn
  // $token$ = input<any>(); // no need, get in evalContextFn
  // $file$ = input<any>(); // no need, get in evalContextFn
  // http = inject(HttpClient);
  // cdr = inject(ChangeDetectorRef);
  evalContextFn = input<any>(); //function to get eval context passed from parent
  
  // private entryService = inject(EntryService);
  // private toastService = inject(ToastService);

  
  // approved = output<any>()
  // closed = output<any>();
  // submitted = output<any>();

  $action$ = input<string>();

  lang = input<string>('en');
 

  defaultParam: string = "{'$prev$.$id':$.$id}";

  baseApi: string = baseApi;

  base: string = base;

  sectionMap: any = {};

  filterSection = (sectionList, type, tab) => sectionList && sectionList.filter(s => type.indexOf(s.type) > -1 && (!tab || s.parent == tab));

  hideGroup:any={}

  appConfig: any = this.runService.appConfig;

  // scopeId = computed<string>(() => "form_"+this.form()?.id+'_'+this.$action$());
  scopeId = computed<string>(() => {
    const action = this.$action$() || '';
    const sanitizedAction = action
      .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace non-alphanumeric with underscore
      .replace(/^[0-9]/, '_$&')        // Prefix numbers with underscore
      .replace(/_+/g, '_')             // Replace multiple underscores with single
      .replace(/^_|_$/g, '');          // Remove leading/trailing underscores
    
    return `form_${this.form()?.id}_${sanitizedAction}`;
  });


  dsChanged(ev, fieldCode) {
    /** WEIRD? NO, JUST STUPID */
    // Penyebab $this$ pande ilang mn bukak view bukan dari modal!! weird!!!
    // this.$this$()[fieldCode] = ev;
    this.$this$.update(curr=>({...curr,[fieldCode]: ev}));
    this.fieldChange(ev, this.entry()?.data, this.form().items[fieldCode], false)
  }

  fieldChange($event, data, field, section) {
    if (field.post) {
      try {
        this._eval(data, field.post, true);
      } catch (e) { }
    }
  }

  // appConst:any;
  ngOnInit() {
    // NEED TO REALLY CHECK EITHER DATA INPUT IS REQUIRED SINCE WE HAVE ENTRY HERE
    this.filterTabs();
    this.filterItems();

    this.appConfig = this.runService.appConfig;

  }

  formTab = computed(()=>this.form().nav != 'simple' ? this.form().tabs?.filter(tab => this.preCheckStr(tab.pre)) : [{}])
  disabledTabs = signal<any>({});
  filterTabs(){
    // this.formTab = this.form().nav != 'simple' ? this.form().tabs?.filter(tab => this.preCheckStr(tab.pre)) : [{}]

    // TAMBAHAN UNTUK FEATURE HEAD & BOTTOM SECTION UNTUK TABBED NAV
    if (this.form().nav != 'simple'){
      this.sectionMap[-1] = this.filterSection(this.form().sections, ['section', 'list'], -1)
      this.sectionMap[-999] = this.filterSection(this.form().sections, ['section', 'list'], -999)
    }

    let disabledTabs = {};
    this.formTab()
      .forEach(tab => {
        this.sectionMap[tab?.id] = this.filterSection(this.form().sections, ['section', 'list', 'dataset'], tab?.id);
        disabledTabs[tab?.id] = this.preCheckStr(tab.x?.enableCond, false)
      });

    this.disabledTabs.set(disabledTabs);
  }

  getPathForGrouping(code: string): string {
    let fieldPath = code;
    const field = this.form().items[code];
    if (field) {
      if (['select', 'radio'].includes(field.type)) {
        fieldPath += '.name';
      } else if (field.type === 'modelPicker') {
        fieldPath += `.${field.bindLabel}`;
      } else if (field.type === 'date') {
        fieldPath += `|date:${field.format || 'yyyy-MM-dd'}`;
      }
    }
    return fieldPath;
  }

  // isArray = (obj) => Array.isArray(obj);
  groupByPipe = new GroupByPipe();

  groupedChildList:any = {}
  
  preItem = signal<any>({})
  preSection = signal<any>({})
  preCompFilter = signal<any>({})
  filterItems() {
    let preItem = {};
    let preSection = {};
    let preCompFilter = {};
    // only evaluate visible tabs
    [{id:-1},...this.formTab(),{id:-999}].forEach(tab => {
      this.sectionMap[tab.id]?.forEach(s => {
        preSection[s.id] = this.preCheckStr(s.pre);
        if (preSection[s.id]) {
          // only evaluate items pre when section is available. If not, no need.
          if (s.type != 'list') {
            // normal field is quite straightforward
            s.items.forEach(i => {
              preItem[i.code] = this.preCheckStr(this.form().items[i.code].pre)
              if (['dataset', 'screen'].indexOf(this.form().items[i.code].type) > -1) {
                try{
                  preCompFilter[i.code] = this._eval(this.entry()?.data, (this.form().items[i.code].dataSourceInit || this.defaultParam), false)
                }catch(e){}
              }
            })
          } else {
            // for child section it is quite tricky. Need to evaluate for each child of section data.
            preItem[s.code] = [];
            // console.log("scode",s.code,this.entry().data[s.code]);

            if (this.entry().data && Array.isArray(this.entry().data[s.code])){

              this.groupedChildList[s.code] = this.groupByPipe.transform(this.entry().data[s.code], this.getPathForGrouping(s.x?.defGroupField));

              var idx = 0;
              this.groupedChildList[s.code].forEach((ge, index_g)=>{
                ge.value.forEach((child, index_c)=>{
                  child.$index = idx++; // re-assign index
                  var index = index_g+'-'+index_c; 

                  preItem[s.code][index] = {}
                  s.items.forEach(i => {
                    preItem[s.code][index][i.code] = this.preCheckStr(this.form().items[i.code].pre, child);
                    if (['dataset', 'screen'].indexOf(this.form().items[i.code].type) > -1) {
                      try{
                        preCompFilter[i.code] = this._eval(this.entry()?.data, (this.form().items[i.code].dataSourceInit || this.defaultParam), false)
                      }catch(e){}
                    }
                  })
                })
              })
            }
          }
        }
      })
    })
    this.preItem.set(preItem);
    this.preSection.set(preSection);
    this.preCompFilter.set(preCompFilter);
  }

  getVal(field, data) {
    var value = data[field.code];
    if (field.type == 'eval' && value == null) {
      if (field.f) {
        try {
          value = this._eval(data, field.f, false);
        } catch (e) { }
      }
    }
    return value;
  }

  preCheckStr(code, dataV?: any) {
    let res = undefined;
    try {
      if (!dataV) {
        dataV = this.entry().data;
      }
      res = this._eval(dataV, code, false);//new Function('$', '$prev$', '$user$', 'return ' + f.pre)(this.entry.data, this.entry && this.entry.prev, this.user);
    } catch (e) { this.logService.log(`{formview-precheck}-:${code}:${e}`) }
    return !code || res;
  }


  // // _eval = (data, v) => new Function('$_', '$', '$prev$', '$user$', '$conf$', '$param$', '$this$', '$base$', '$baseUrl$', '$baseApi$', '$token$', '$action$', '$file$', `return ${v}`)
  // //   (this.entry(), data, this.entry() && this.entry().prev, this.user(), this.runService?.appConfig, this.$param$(), this.$this$(), this.base, this.$baseUrl$(), this.baseApi, this.$token$(), this.$action$(), this.$file$());
  // liveSubscription: any = {};

  // $digest$ = () => {
  //   this.cdr.detectChanges()
  // }

  // ServerDate = ServerDate;

  // // _eval = (data:any, v:string) => new Function('$_', '$', '$prev$', '$user$', '$conf$', '$http$', '$post$','$endpoint$', '$el$', '$form$', '$this$', '$param$', '$toast$', '$update$', '$token$', '$action$', '$file$',                      '$base$', '$baseUrl$', '$baseApi$', 'ServerDate', '$live$', '$token$', '$merge$','$web$',
  // //   `return ${v}`)(this.entry(), data, this.entry()?.prev, this.user(), this.appConfig, this.httpGet, this.httpPost, this.endpointGet, this.form()?.items||this.form()?.items, this.form()||this.form(), this.$this$(), this.$param$(), this.$toast$, this.updateField, this.$token$(), this.$action$(), this.$file$(), this.base, this.$baseUrl$(), this.baseApi, ServerDate, this.runService?.$live$(this.liveSubscription, this.$digest$), this.$token$(), deepMerge, this.http);
  

  _eval = (data:any, v:string, includeActive:boolean) => { 
    const bindings = this.evalContextFn()(this.entry(),data, {}, this.form(), includeActive);
    bindings.$ = data;
    bindings.$this$ = this.$this$();
    bindings.$conf$ = this.appConfig; // only binding that allow write
    const argNames  = Object.keys(bindings);
    const argValues = Object.values(bindings);
    return new Function(...argNames,
    `return ${v}`)(...argValues);
  }
    
    
  // $toast$ = (content, opt) => this.toastService.show(content, opt);

  // // httpGet = this.runService.httpGet;
  // // httpPost = this.runService.httpPost;
  // // endpointGet = (code, params, callback, error) => this.runService.endpointGet(code, this.form().appId, params, callback, error)
  // // must run digest/filterItems to ensure rerun pre..
  // httpGet = (url, callback, error) => lastValueFrom(this.runService.httpGet(url, callback, error).pipe(tap(()=>this.$digest$())));
  // httpPost = (url, body, callback, error) => lastValueFrom(this.runService.httpPost(url, body, callback, error).pipe(tap(()=>this.$digest$())));
  // endpointGet = (code, params, callback, error) => lastValueFrom(this.runService.endpointGet(code, this.form().appId, params, callback, error).pipe(tap(()=>this.$digest$())))
  
  // uploadFile = (obj, callback, error)=> lastValueFrom(this.entryService.uploadAttachmentOnce(obj.file, obj.itemId, obj.bucketId, this.app()?.id, obj.file.name)
  //   .pipe( tap({ next: callback, error: error }), first() ));



  // loadScript = loadScript;

  // $digest$ = () => {
  //   this.cdr.detectChanges()
  //   this.timestamp.set(Date.now()); // setting new value for timestamp will force effect in field-view
  // }

  // readonly navOutlet = viewChild<NgbNav | NgbAccordionDirective>('nav');
  // setActive = (index) => {
  //   this._navIndex.set(index);
  //   const navOutlet = this.navOutlet();
  //   if (navOutlet instanceof NgbNav) {
  //     navOutlet.select('view' + index);
  //   } else if (navOutlet instanceof NgbAccordionDirective) {
  //     navOutlet.expand('view' + index);
  //   }
  // }

  // updateField = (entryId, value, callback, error) => {
  //   console.log("## UPDATE FIELD", entryId, value);
  //   return lastValueFrom(this.entryService.updateField(entryId, value, this.form().appId)
  //     .pipe(
  //       tap({ next: callback, error: error }),
  //       tap({
  //         next: (res: any) => {
  //           if (res?.id == this.entry()?.id) {
  //             this.entry.set(deepMerge(this.entry(), res));
  //           }
  //           if (callback) {
  //             callback();
  //           }
  //         }, error: error
  //       }),
  //       first()
  //     ));
  // }
  // _save = (entry,form) => {
  //   let userKey = this.user().email;
  //   if (form?.x?.userKey) {
  //     userKey = this.compileTpl(form?.x?.userKey, 
  //       { $: entry?.data, $_: entry, $prev$: entry?.prev })
  //   }
  //   return this.entryService.save(form.id, entry, entry?.prev?.id, userKey)
  //     .pipe(
  //       tap({
  //         next: (e) => {
  //           entry = deepMerge(entry,e);
  //           // this.linkFiles(e);
  //           // this.entryForm.form().markAsPristine();
  //         }
  //       }), first()
  //     )
  // }

  // submit = (resubmit: boolean, entry, form) => {
  //   this.entryService.submit(entry.id, this.user().email, resubmit)
  //     .subscribe({
  //       next: res => {
  //         if (form.onSubmit) {
  //           try {
  //             this._eval(entry, entry.data, form.onSubmit, form);
  //           } catch (e) { this.logService.log(`{form-${form.title}-onSubmit}-${e}`) }
  //         }
  //         this.toastService.show("Entry submitted successfully", { classname: 'bg-success text-light' });
  //         if (this.asComp()) {
  //           this.submitted.emit(res);
  //         }
  //         this.entry.set(deepMerge(entry, res));
  //         this.$digest$();
  //       }, error: err => {
  //         this.toastService.show("Entry submission failed", { classname: 'bg-danger text-light' });
  //       }
  //     })
  // }

  // compileTpl = (code, additionalData) => {
  //   let obj = Object.assign( additionalData, { $user$: this.user(), $: this.entry()?.data, $_: this.entry(), $prev$: this.entry()?.prev, $base$: this.base, $baseUrl$: this.baseUrl(), $baseApi$: this.baseApi, $this$: this._this, $param$: this.param() })
  //   return compileTpl(code, obj, this.scopeId())
  // }


  // getIcon = (str) => str ? str.split(":") : ['far', 'file'];


}
