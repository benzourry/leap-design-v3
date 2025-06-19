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

import { Component, OnInit, computed, input } from '@angular/core';
import { baseApi } from '../../_shared/constant.service';
// import { LogService } from '../service/log.service';
// import { UserService } from '../service/user.service';
// import { compileTpl, nl2br } from '../utils';
// import { SecurePipe } from '../pipe/secure.pipe';
// import { SafePipe } from '../pipe/safe.pipe';
import { NgStyle, AsyncPipe, DatePipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgLeafletComponent } from './ng-leaflet/ng-leaflet.component';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { SecurePipe } from '../../_shared/pipe/secure.pipe';
import { LogService } from '../../_shared/service/log.service';
import { UserService } from '../../_shared/service/user.service';
import { compileTpl, nl2br } from '../../_shared/utils';

@Component({
    selector: 'field-view',
    template: `
@if (value()===undefined || value()===null) {
  <span>
    @if (['static','file','btn','checkbox'].indexOf(field()?.type)==-1) {
      <span style="color:#aaa">Data not available</span>
    }
    @if (['file'].indexOf(field()?.type)>-1) {
      <span>
        @if (['image','imagemulti'].indexOf(field()?.subType)>-1) {
          <img loading="lazy" style="background: #aaa;max-height:250px;object-fit: contain;" src="assets/img/placeholder-128.png" width="100%" />
        }
        @if (['other','othermulti'].indexOf(field()?.subType)>-1) {
          <span style="color:#aaa">Data not available</span>
        }
      </span>
    }
    @if (['static'].indexOf(field()?.type)>-1) {
      <span>
        @if (field()?.subType=='html') {
          <!-- <span [innerHtml]="compileTpl(field()?.placeholder,data())|safe:'html'"></span> -->
          <span [innerHtml]="compiledTpl()|safe:'html'"></span>
        }
        @if (field()?.subType=='clearfix') {
          <div class="clearfix"></div>
        }
      </span>
    }
    @if (['checkbox'].indexOf(field()?.type)>-1) {
      <span>
        <fa-icon [icon]="['far','square']"></fa-icon>
        &nbsp;<span [innerHtml]="compileTpl(field()?.placeholder||field()?.label,data())|safe:'html'"> {{field()?.placeholder}}</span>
        <!-- &nbsp;<span [innerHtml]="compiledTpl()|safe:'html'"> {{field()?.placeholder}}</span> -->
      </span>
    }
  </span>
} @else {
  @if (['static'].indexOf(field()?.type)>-1) {
    <span>
      @if (field()?.subType=='htmlSave') {
        <span [innerHtml]="value()|safe:'html'"></span>
      }
    </span>
  }
  @if (['text','simpleOption','speech'].indexOf(field()?.type)>-1) {
    <div>
      <div style="overflow:hidden; position:relative;" [ngStyle]="{'max-height': (isReadMore?'unset':'236px')}" >
        <div  [innerHtml]="nl2br(value())" [class.pb-5]="isReadMore" ></div>
        <div class="p-1" style="position:absolute; background:rgba(255,255,255,.8); border-radius:3px;" [ngStyle]="{'top':isReadMore?'calc(100% - 35px)':'205px'}" >
          <button type="button" class="btn btn-xs btn-secondary small p-1" style="font-size:0.8rem" (click)="isReadMore=!isReadMore">
            {{isReadMore?'Less...':'More...'}}
          </button>
        </div>
      </div>
    </div>
  }
  @if (['checkboxOption'].indexOf(field()?.type)>-1) {
    <span>
      @if (isArray(value())){
        @for (c of value(); track $index) {
          <div>
            <fa-icon [icon]="['far', 'check-square']" class="text-muted float-start"></fa-icon>
            <div class="ms-4"><span [innerHtml]="c.name">{{c.name}}</span></div>
          </div>
        }
      }@else {
        <fa-icon [icon]="['far', 'check-square']" class="text-muted float-start"></fa-icon>
        <div class="ms-4"><span [innerHtml]="value().name">{{value().name}}</span></div>
      }
    </span>
  }
  @if (['qr'].indexOf(field()?.type)>-1) {
    <span [innerHtml]="value()"></span>
  }
  @if (['eval'].indexOf(field()?.type)>-1) {
    <span>
      @if (field().subType=='text') {
        <span>
          @if (field().placeholder) {
            <span>{{field().placeholder}} </span>
          }
          <span [innerHtml]="value()"></span>
        </span>
      }
      @if (field()?.subType=='qr') {
        <span>
          <img loading="lazy" [src]="value()?baseApi+'/form/qr?code='+value():'assets/img/blank-qr.svg'" width="100%">
          </span>
        }
      </span>
    }
    @if (['checkbox'].indexOf(field()?.type)>-1) {
      <span>
        <fa-icon [icon]="['far', value()?'check-square':'square']"></fa-icon>
        &nbsp;<span [innerHtml]="compileTpl(field()?.placeholder||field()?.label,data())|safe:'html'"> {{field()?.placeholder}}</span>
        <!-- &nbsp;<span [innerHtml]="compiledTpl()|safe:'html'"> {{field()?.placeholder}}</span> -->
      </span>
    }
    @if (['number','scaleTo5','scaleTo10','scale'].indexOf(field()?.type)>-1) {
      <span>{{value()}}
        @if (field()?.type=='scale') {
          <sup>/{{field()?.v?.max}}</sup>
        }
        @if (field()?.type=='scaleTo5') {
          <sup>/5</sup>
        }
        @if (field()?.type=='scaleTo10') {
          <sup>/10</sup>
        }
      </span>
    }
    @if (['date'].indexOf(field()?.type)>-1) {
      <span>
        @if (validateDate(value())) {
          <span>
            @if (['datetime','datetime-inline','date','date-inline'].indexOf(field().subType)>-1){
              <span>{{value()|date:field()?.format||'dd-MMM-yyyy'}}</span>
            }
            @if (['datetime','datetime-inline','time'].indexOf(field().subType)>-1 && !field()?.format) {
              <span> {{value()|date:'hh:mm'+(field().x?.seconds?':ss':'')+' a'}}</span>
            }
          </span>
        } @else {
          @if (!validateDate(value())) {
            <span style="color:#aaa">{{value()}}</span>
          }
        }
      </span>
    }
    @if (['radio'].indexOf(field()?.type)>-1) {
      <span>{{value()?.name}}</span>
    }
    @if (['color'].indexOf(field()?.type)>-1) {
      <div class="d-inline-block w-100" style="border-radius:3px; background:{{value()}}; height:24px;"></div>
    }
    @if (['select'].indexOf(field()?.type)>-1) {
      <span>
        @if (field().subType=='multiple' && isArray(value())) {
          <div>
            @for (sv of value(); track $index) {
              @if (!field()?.placeholder) {
                <div>{{sv?.name}}</div>
              }@else{
                <div class="card border-0 bg-transparent" [innerHtml]="compileTpl(field()?.placeholder, {'$':sv})|safe:'html'"></div>
              }
            }
          </div>
        } @else {
          @if (!field()?.placeholder) {
            <div>{{value()?.name}}</div>
          }@else{
            <div class="card border-0 bg-transparent" [innerHtml]="compileTpl(field()?.placeholder, {'$':value()})|safe:'html'"></div>
          }
        }
      </span>
    }
    @if (['modelPicker'].indexOf(field()?.type)>-1) {
      <span>
        @if (field().subType=='multiple' && isArray(value())) {
          <div>
            @for (sv of value(); track $index) {
              <div class="card border-0 bg-transparent" [innerHtml]="(field()?.placeholder?compileTpl(field()?.placeholder, {'$':sv}):sv[field()?.bindLabel])|safe:'html'"></div>
            }
          </div>
        } @else {
          <div class="card border-0 bg-transparent" [innerHtml]="(field()?.placeholder?compileTpl(field()?.placeholder, {'$':value()}):value()[field()?.bindLabel])|safe:'html'"></div>
        }
      </span>
    }
    @if (['file'].indexOf(field()?.type)>-1) {
      <span>
        @if (field().subType=='image') {
          <a class="thumbnail" [href]="getUrl('/entry/file/',value())|secure|async" target="_blank">
            <img loading="lazy" [src]="getUrl('/entry/file/inline/',value())|secure|async" style="max-width:100%" onError="this.src='./assets/img/placeholder-128.png'">
          </a>
        }
        @if (field().subType=='imagemulti') {
          <div class="img-grid-cont">
            @for (vf of value(); track $index) {
              <a class="img-grid-item" [href]="getUrl('/entry/file/',vf)|secure|async" target="_blank">
                <img loading="lazy" [src]="getUrl('/entry/file/inline/',vf)|secure|async" onError="this.src='./assets/img/placeholder-128.png'">
              </a>
            }
          </div>
        }
        @if (field().subType=='other'||!field().subType) {
          <a [href]="getUrl('/entry/file/',value())|secure|async" target="_blank">
            {{value()}}
          </a>
        }
        @if (field().subType=='othermulti') {
          @for (vf of value(); track $index) {
            <div>
              <a [href]="getUrl('/entry/file/',vf)|secure|async" target="_blank">
                {{vf}}
              </a>
            </div>
          }
        }
      </span>
    }
    @if (['imagePreview'].indexOf(field()?.type)>-1) {
      <span>
        <a class="thumbnail" href="{{value()}}" target="_blank">
          <img loading="lazy" src="{{value()}}" style="max-width:100%" onError="this.src='./assets/img/placeholder-128.png'">
        </a>
      </span>
    }
    @if (['static'].indexOf(field()?.type)>-1) {
      <span>
        @if (field()?.subType=='html') {
          <!-- <span [innerHtml]="compileTpl(field()?.placeholder,data())|safe:'html'"></span> -->
          <span [innerHtml]="compiledTpl()|safe:'html'"></span>
        }
        @if (field()?.subType=='clearfix') {
          <div class="clearfix"></div>
        }
      </span>
    }
    @if (['map'].indexOf(field()?.type)>-1) {
      @defer(prefetch on idle){
        <app-ng-leaflet [readOnly]="true" [value]="value()"
          [useCurrentPos]="false"  [baseMapServerUri]="field().x?.customMapServer" [multiple]="field()?.subType=='multiple'">
        </app-ng-leaflet>
      }@loading {
        <div class="text-center m-5">
          <div class="spinner-grow text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    }
  }
        `,
    styles: [`.line-clamp {
      display: -webkit-box;
      -webkit-line-clamp: 6;
      overflow: hidden;
      -webkit-box-orient: vertical;  
    }
    .img-grid-cont {
      display: flex;
      flex-wrap: wrap;
      gap:3px;
      list-style: none;
      margin:0px; padding:0px;
    }

    .img-grid-item {
      height: 20vh;
      flex-grow: 1;
    }

    .img-grid-item img {
      max-height: 100%;
      min-width: 100%;
      object-fit: cover;
      vertical-align: bottom;
    }

    @media (max-aspect-ratio: 1/1) {
      .img-grid-item {
        height: 30vh;
      }
    }
    // Short screens
    @media (max-height: 480px) {
      .img-grid-item {
        height: 80vh;
      }
    }
    // Smaller screens in portrait
    @media (max-aspect-ratio: 1/1) and (max-width: 480px) {
      .img-grid-cont {
        flex-direction: row;
      }
      .img-grid-item {
        height: auto;
        width: 100%;
      }
      .img-grid-item img {
        width: 100%;
        max-height: 75vh;
        min-width: 0;
      }
    }
  
  `],
    imports: [FaIconComponent, NgStyle, AsyncPipe, DatePipe, SafePipe, SecurePipe, NgLeafletComponent]
})
export class FieldViewComponent implements OnInit {

  constructor(private logService: LogService, private userService: UserService) { }

  // @Input() value: any;
  value = input<any>();
  // @Input() field: any;
  field = input<any>();
  // @Input() data: any;
  data = input<any>();

  timestamp = input<number>();

  isReadMore: boolean;

  baseApi: string = baseApi;

  // compiledTpl = computed(()=>{
  //   this.timestamp();
  //   console.log("data",this.data())
  //   return this.compileTpl(this.field()?.placeholder ?? this.field()?.label,this.data())
  // })

  compiledTpl = () => this.compileTpl(this.field()?.placeholder ?? (this.field().type!='static'?this.field()?.label:''),this.data())

  ngOnInit() {
    // console.log(this.value);
    
    // this.compileTpl(this.field()?.placeholder ?? this.field()?.label,this.data())
  }

  validateDate = (date) => Number.isInteger(date);

  // compileTpl = compileTpl;
  compileTpl=(html, data)=>{
    var f = "";
    try {
      f = compileTpl(html, data);
    } catch (e) {
      this.logService.log(`{fieldview-${this.field().code}-compiletpl}-${e}`)
    }
    return f;
  }

  getUrl(pre, path) {
    return this.baseApi + pre + encodeURIComponent(path);
  }

  isArray = (value) => Array.isArray(value)

  nl2br = nl2br
  // (text) => text ? String(text).replace(/\n/g, "<br/>") : text;
}
