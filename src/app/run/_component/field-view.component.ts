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

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal, viewChild, effect } from '@angular/core';
import { baseApi } from '../../_shared/constant.service';
import { NgStyle, AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgLeafletComponent } from './ng-leaflet/ng-leaflet.component';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { SecurePipe } from '../../_shared/pipe/secure.pipe';
import { LogService } from '../../_shared/service/log.service';
import { compileTpl, nl2br } from '../../_shared/utils';
import { MorphHtmlDirective } from '../../_shared/directive/morph-html.directive';

@Component({
  selector: 'field-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, NgStyle, AsyncPipe, DatePipe, MorphHtmlDirective, SafePipe, DecimalPipe, SecurePipe, NgLeafletComponent],
  providers: [DecimalPipe],
  template: `
    @if (value() === undefined || value() === null) {
      <span>
        @if (!['static', 'file', 'btn', 'checkbox'].includes(field()?.type)) {
          <span class="text-body-tertiary">{{ lang() === 'ms' ? 'Tiada data' : 'Data not available' }}</span>
        }
        
        @if (['file'].includes(field()?.type)) {
          <span>
            @if (['image', 'imagemulti'].includes(field()?.subType)) {
              <img loading="lazy" style="background: var(--bs-tertiary-bg); max-height:250px; object-fit: contain;" src="assets/img/placeholder-128.png" width="100%" />
            }
            @if (['other', 'othermulti'].includes(field()?.subType)) {
              <span class="text-body-tertiary">{{ lang() === 'ms' ? 'Tiada data' : 'Data not available' }}</span>
            }
          </span>
        }
        
        @if (['static'].includes(field()?.type)) {
          <span>
            @if (field()?.subType === 'html') {
              <span [morphHtml]="compiledTpl() | safe:'html'"></span>
            }
            @if (field()?.subType === 'clearfix') {
              <div class="clearfix"></div>
            }
          </span>
        }
        
        @if (['checkbox'].includes(field()?.type)) {
          <div class="d-flex align-items-start gap-2">
            <fa-icon 
              [icon]="field()?.subType === 'switch' ? ['fas', 'toggle-off'] : ['far', 'square']"
              class="text-body-tertiary">
            </fa-icon>
            <div [morphHtml]="compileTpl(field()?.placeholder || field()?.label, data()) | safe:'html'"></div>
          </div>
        }

      </span>
    } @else {
      @if (['static'].includes(field()?.type)) {
        <span>
          @if (field()?.subType === 'htmlSave') {
            <span [morphHtml]="updatedValue() | safe:'html'"></span>
          }
          @if (field()?.subType === 'html') {
            <span [morphHtml]="compiledTpl() | safe:'html'"></span>
          }
          @if (field()?.subType === 'clearfix') {
            <div class="clearfix"></div>
          }
        </span>
      }

      @if (['text', 'simpleOption', 'speech'].includes(field()?.type)) {
        <div>
          <div #textContainer class="print-expand"
            style="overflow:hidden; transition: max-height 0.25s ease-in-out;" 
            [ngStyle]="{'max-height': isReadMore() ? (contentHeight() + 'px') : '150px'}"
            [class.fade-bottom]="!isReadMore() && isOverflowing()">
            
            <div>
              @if (field().x?.prefix && !field().x?.prefixPost) {
                <span class="text-muted me-05" [innerHtml]="compiledPrefix()|safe:'html'"></span>
              }
              <span [morphHtml]="nl2brSafe(value())"></span>
              @if (field().x?.suffix && !field().x?.suffixPost) {
                <span class="text-muted ms-05" [innerHtml]="compiledSuffix()|safe:'html'"></span>
              }
            </div>
          </div>

          @if (isOverflowing()) {
            <div class="text-start print-hide">
              <button type="button" class="btn btn-xs btn-outline-secondary small p-1" style="font-size:0.8rem" (click)="isReadMore.set(!isReadMore())">
                {{ 
                  lang() === 'ms' 
                    ? (isReadMore() ? 'Kurang...' : 'Lebih...') 
                    : (isReadMore() ? 'Less...' : 'More...') 
                }}
              </button>
            </div>
          }
        </div>
      }

      @if (['checkboxOption'].includes(field()?.type)) {
        <span>
          @if (isArray(value())) {
            @for (c of value(); track $index) {
              <div>
                <fa-icon [icon]="['far', 'check-square']" class="text-primary float-start"></fa-icon>
                <div class="ms-4"><span [innerHtml]="c.name"></span></div>
              </div>
            }
          } @else {
            <div>
              <fa-icon [icon]="['far', 'check-square']" class="text-primary float-start"></fa-icon>
              <div class="ms-4"><span [innerHtml]="value()?.name"></span></div>
            </div>
          }
        </span>
      }

      @if (['qr'].includes(field()?.type)) {
        <span [innerHtml]="value()"></span>
      }

      @if (['eval'].includes(field()?.type)) {
        <span>
          @if (field().subType === 'text') {
            @if (field().x?.prefix && !field().x?.prefixPost) {
              <span class="text-muted me-05" [innerHtml]="compiledPrefix()|safe:'html'"></span>
            }
            <span>
              @if(field()?.format) {
                <span [innerHtml]="value() | number:field()?.format"></span>
              } @else {
                <span [innerHtml]="value()"></span>
              }
            </span>
            @if (field().x?.suffix && !field().x?.suffixPost) {
              <span class="text-muted ms-05" [innerHtml]="compiledSuffix()|safe:'html'"></span>
            }
          }
          @if (field()?.subType === 'qr') {
            <span>
              <img loading="lazy" [src]="value() ? baseApi + '/form/qr?code=' + value() : 'assets/img/blank-qr.svg'" width="100%">
            </span>
          }
        </span>
      }

      @if (['checkbox'].includes(field()?.type)) {
        <div class="d-flex align-items-start gap-2">
          @if (field()?.subType === 'switch') {
            <fa-icon 
              [icon]="['fas', value() ? 'toggle-on' : 'toggle-off']" 
              [class.text-primary]="value()" 
              [class.text-body-tertiary]="!value()">
            </fa-icon>
          } @else {
            <!-- Switched to 'fas' for checked, and added conditional text colors -->
            <fa-icon 
              [icon]="value() ? ['fas', 'check-square'] : ['far', 'square']"
              [class.text-primary]="value()" 
              [class.text-body-tertiary]="!value()">
            </fa-icon>
          }
          <div [morphHtml]="compileTpl(field()?.placeholder || field()?.label, data()) | safe:'html'"></div>
        </div>
      }

      @if (['number', 'scaleTo5', 'scaleTo10', 'scale'].includes(field()?.type)) {
        <span>
          @if (field().x?.prefix && !field().x?.prefixPost) {
            <span class="text-muted me-05" [innerHtml]="compiledPrefix()|safe:'html'"></span>
          }
          <span>
            {{ formattedValue() }}
            @switch (field()?.type) {
              @case ('scale') { <sup>/{{ field()?.v?.max }}</sup> }
              @case ('scaleTo5') { <sup>/5</sup> }
              @case ('scaleTo10') { <sup>/10</sup> }
            }
          </span>
          @if (field().x?.suffix && !field().x?.suffixPost) {
            <span class="text-muted ms-05" [innerHtml]="compiledSuffix()|safe:'html'"></span>
          }
        </span>
      }

      @if (['date'].includes(field()?.type)) {
        <span>
          @if (validateDate(value())) {
            <span>
              @if (['datetime', 'datetime-inline', 'date', 'date-inline'].includes(field().subType)) {
                <span>{{value()|date:(field()?.format || 'dd-MMM-yyyy'):'':angularLocale()}}</span>
              }
              @if (['datetime', 'datetime-inline', 'time'].includes(field().subType) && !field()?.format) {
                <span> {{value()|date:'hh:mm' + (field().x?.seconds ? ':ss' : '') + ' a':'':angularLocale()}}</span>
              }
            </span>
          } @else {
            <span class="text-body-tertiary">{{ value() }}</span>
          }
        </span>
      }

      @if (['radio'].includes(field()?.type)) {
        <span>{{ value()?.name }}</span>
      }

      @if (['color'].includes(field()?.type)) {
        <div class="d-inline-block w-100" [ngStyle]="{'background': value()}" style="border-radius:3px; height:24px;"></div>
      }

      @if (['select'].includes(field()?.type)) {
        <span>
          @if (field().subType === 'multiple' && isArray(value())) {
            <div>
              @for (sv of value(); track $index) {
                @if (!field()?.placeholder) {
                  <div>{{ sv?.name }}</div>
                } @else {
                  <div class="card border-0 bg-transparent" [innerHtml]="compileTpl(field()?.placeholder, {'$': sv}) | safe:'html'"></div>
                }
              }
            </div>
          } @else {
            @if (!field()?.placeholder) {
              <div>{{ value()?.name }}</div>
            } @else {
              <div class="card border-0 bg-transparent" [innerHtml]="compileTpl(field()?.placeholder, {'$': value()}) | safe:'html'"></div>
            }
          }
        </span>
      }

      @if (['modelPicker'].includes(field()?.type)) {
        <span>
          @if (field().subType === 'multiple' && isArray(value())) {
            <div>
              @for (sv of value(); track $index) {
                <div class="card border-0 bg-transparent" [innerHtml]="(field()?.placeholder ? compileTpl(field()?.placeholder, {'$': sv}) : sv[field()?.bindLabel]) | safe:'html'"></div>
              }
            </div>
          } @else {
            <div class="card border-0 bg-transparent" [innerHtml]="(field()?.placeholder ? compileTpl(field()?.placeholder, {'$': value()}) : value()[field()?.bindLabel]) | safe:'html'"></div>
          }
        </span>
      }

      @if (['file'].includes(field()?.type)) {
        <span>
          @if (field().subType === 'image') {
            <a class="thumbnail" [href]="field().x?.secure ? (getUrl('/entry/file/', value()) | secure | async) : getUrl('/entry/file/inline/', value())" target="_blank">
              <img loading="lazy" [src]="field().x?.secure ? (getUrl('/entry/file/inline/', value()) | secure | async) : getUrl('/entry/file/inline/', value())" style="max-width:100%" onError="this.src='./assets/img/placeholder-128.png'">
            </a>
          } @else if (field().subType === 'imagemulti') {
            <div class="img-grid-cont">
              @for (vf of value(); track $index) {
                <a class="img-grid-item" [href]="field().x?.secure ? (getUrl('/entry/file/', vf) | secure | async) : getUrl('/entry/file/inline/', vf)" target="_blank">
                  <img loading="lazy" [src]="field().x?.secure ? (getUrl('/entry/file/inline/', vf) | secure | async) : getUrl('/entry/file/inline/', vf)" onError="this.src='./assets/img/placeholder-128.png'">
                </a>
              }
            </div>
          } @else if (field().subType === 'othermulti') {
            @for (vf of value(); track $index) {
              <div>
                <a [href]="field().x?.secure ? (getUrl('/entry/file/', vf) | secure | async) : getUrl('/entry/file/inline/', vf)" target="_blank">
                  {{ vf }}
                </a>
              </div>
            }
          } @else {
            <a [href]="field().x?.secure ? (getUrl('/entry/file/', value()) | secure | async) : getUrl('/entry/file/inline/', value())" target="_blank">
              {{ value() }}
            </a>
          }
        </span>
      }

      @if (['imagePreview'].includes(field()?.type)) {
        <span>
          <a class="thumbnail" [href]="value()" target="_blank">
            <img loading="lazy" [src]="value()" style="max-width:100%" onError="this.src='./assets/img/placeholder-128.png'">
          </a>
        </span>
      }

      @if (['map'].includes(field()?.type)) {
        @defer (prefetch on idle) {
          <app-ng-leaflet [readOnly]="true" [value]="value()"
            [useCurrentPos]="false" [baseMapServerUri]="field().x?.customMapServer" [multiple]="field()?.subType === 'multiple'">
          </app-ng-leaflet>
        } @loading {
          <div class="text-center m-5">
            <div class="spinner-grow text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        }
      }
    }
  `,
  styles: [`
    .line-clamp {
      display: -webkit-box;
      -webkit-line-clamp: 6;
      overflow: hidden;
      -webkit-box-orient: vertical;  
    }

    .img-grid-cont {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      list-style: none;
      margin: 0; 
      padding: 0;
      border-radius: var(--bs-border-radius);
      overflow: hidden;
    }

    .img-grid-item {
      height: 20vh;
      flex-grow: 1;
      overflow: hidden;
      display:flex;
      align-items: center;
    }

    .img-grid-item img {
      min-height: 100%;
      min-width: 100%;
      object-fit: cover;
      object-position: center;
      vertical-align: bottom;
      max-width:250px;
    }

    @media (max-aspect-ratio: 1/1) {
      .img-grid-item {
        height: 30vh;
      }
    }
    /* Short screens */
    @media (max-height: 480px) {
      .img-grid-item {
        height: 80vh;
      }
    }
    /* Smaller screens in portrait */
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

    .fade-bottom {
      -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
      mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    }

    @media print {
      .print-expand {
        max-height: none !important;
        overflow: visible !important;
      }
      
      .fade-bottom {
        -webkit-mask-image: none !important;
        mask-image: none !important;
      }
      
      .print-hide {
        display: none !important;
      }
    }
  `]
})
export class FieldViewComponent implements OnInit {

  private logService = inject(LogService);
  private decimalPipe = inject(DecimalPipe);

  value = input<any>();
  field = input<any>();
  data = input<any>();
  scopeId = input<any>();
  lang = input<string>('en');
  angularLocale = computed(() => this.lang() === 'ms' ? 'ms-MY' : 'en-US');
  timestamp = input<number>();

  isReadMore = signal<boolean>(false);
  baseApi: string = baseApi;

  isOverflowing = signal<boolean>(false);
  contentHeight = signal<number>(2000);

  textContainer = viewChild<ElementRef<HTMLElement>>('textContainer');

  constructor() {
    effect((onCleanup) => {
      const el = this.textContainer()?.nativeElement;

      if (el) {
        const observer = new ResizeObserver(() => {
          const exactHeight = el.scrollHeight;
          this.isOverflowing.set(exactHeight > 150);
          this.contentHeight.set(exactHeight);
        });

        observer.observe(el);

        onCleanup(() => {
          observer.disconnect();
        });
      }
    });
  }

  compiledTpl = computed(() => {
    this.timestamp();
    const fData = this.field();
    const labelTpl = fData?.placeholder ?? (fData?.type !== 'static' ? fData?.label : '');
    return this.compileTpl(labelTpl, this.data());
  });

  compiledPrefix = computed(() => {
    const fData = this.field();
    return this.compileTpl(fData.x?.prefix, this.data());
  });

  compiledSuffix = computed(() => {
    const fData = this.field();
    return this.compileTpl(fData.x?.suffix, this.data());
  });

  updatedValue = computed(() => {
    const fData = this.field();
    const labelTpl = fData?.placeholder ?? (fData?.type !== 'static' ? fData?.label : '');
    const compiled = this.compileTpl(labelTpl, this.data());
    
    return this.value() !== compiled ? compiled : this.value();
  });

  formattedValue = computed(() => {
    const val = this.value();
    const format = this.field()?.format;

    if (!format) return val;

    try {
      return this.decimalPipe.transform(val, format) ?? val;
    } catch (e) {
      this.logService.log(`{fieldview-${this.field()?.code}-format} Invalid format '${format}' for value '${val}'.`);
      return val;
    }
  });

  ngOnInit() {}

  validateDate = (date: any) => Number.isInteger(date);

  compileTpl = (html: string, data: any) => {
    let f = "";
    try {
      f = compileTpl(html, data, this.scopeId());
    } catch (e) {
      this.logService.log(`{fieldview-${this.field()?.code}-compiletpl}-${e}`);
    }
    return f;
  }

  getUrl(pre: string, path: string) {
    return this.baseApi + pre + encodeURIComponent(path);
  }

  isArray = (value: any) => Array.isArray(value);

  nl2brSafe = (val: any) => nl2br(val ?? '');
}