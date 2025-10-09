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

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { base, baseApi } from '../_shared/constant.service';
// import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class FormService {




  baseApi = baseApi;

  constructor(private http: HttpClient) { }


  uploadExcel(lookupId: number, file: any, email: string, createField: boolean, createDataset: boolean, createDashboard: boolean, importToLive: boolean) {
    let f = new FormData();
    f.append('file', file);
    return this.http.post<any>(`${this.baseApi}/import/entry/${lookupId}?email=${email}&create-field=${createField || false}&create-dataset=${createDataset || false}&create-dashboard=${createDashboard || false}&import-live=${importToLive || false}`, f);
  }

  saveElement(formId: any, sectionId: any, rElement: any, sortOrder: any): any {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/elements?parentId=${sectionId || ''}&sortOrder=${sortOrder}`, rElement);
  }
  // getFormColumns(formId: number): any {
  //   return this.http.get<any>(`${this.baseApi}/form/${formId}/columns`)
  // }

  saveSection(formId: number, section: any): any {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/section`, section)
  }

  saveTab(formId: number, tab: any): any {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/tab`, tab)
  }
  cloneForm(formId: any, appId: any) {
    return this.http.post<any>(`${this.baseApi}/form/clone?formId=${formId}&appId=${appId}`, {})
  }
  unlinkPrevForm(formId: number): any {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/unlink-prev`, {})
  }
  removeForm(data:any): any {
    return this.http.post<any>(`${this.baseApi}/form/${data.id}/delete`, {})
  }
  getItemList(id: number, params: any): any {
    return this.http.get<any>(`${this.baseApi}/form/${id}/item`, { params: params });
  }
  getItemMap(id: number, params: any): any {
    return this.http.get<any>(`${this.baseApi}/form/${id}/item-map`, { params: params });
  }
  getRelatedComps(id: number): any {
    return this.http.get<any>(`${this.baseApi}/form/${id}/related-comps`, {});
  }
  
  moveToApp(formId:number, data:any): any {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/move-to-app`, data)
  }
  getForm(id: number): any {
    return this.http.get<any>(`${this.baseApi}/form/` + id);
  }

  getListBasic(params: any): any {
    return this.http.get<any>(`${this.baseApi}/form/basic`, { params: params });
  }
  // getList(params: any): any {
  //   return this.http.get<any>(`${this.baseApi}/form`, { params: params });
  // }

  backendEf(formId: number, field: string, section:string, force: boolean) {
    return this.http.get<any>(`${this.baseApi}/entry/ef-exec?formId=${formId}&field=${field}&section=${section||''}&force=${force}`);
  }

  backendApf(formId: any, tierId: any, force: boolean) {
    return this.http.post<any>(`${this.baseApi}/entry/update-approver?formId=${formId}&tierId=${tierId}&all=${force}`, {});
  }

  reconApprover(formId: any) {
    return this.http.post<any>(`${this.baseApi}/entry/update-approver-alltier?formId=${formId}`, {});
  }

  saveForm(appId: number, data: any) {
    return this.http.post<any>(`${this.baseApi}/form?appId=${appId}`, data);
  }

  clearData(formId:number) {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/clear-entry`, {});
  }

  saveItem(formId: number, sectionId: number, data: any, sortOrder: number) {
    // console.log(data);
    return this.http.post<any>(`${this.baseApi}/form/${formId}/items?sectionId=${sectionId}&sortOrder=${sortOrder}`, data);
  }

  saveItemOnly(formId:number,item: any) {
    // console.log(data);
    return this.http.post<any>(`${this.baseApi}/form/${formId}/items-obj`, item);
  }

  // updateItem(formId: number, data: any) {
  //   // console.log(data);
  //   return this.http.post<any>(`${this.baseApi}/form/${formId}/items`, data);
  // }

  moveItem(formId: number, siId: number, newSectionId: number, sortOrder: number) {
    // console.log(data);
    return this.http.post<any>(`${this.baseApi}/form/${formId}/move-item?sectionItemId=${siId}&newSectionId=${newSectionId}&sortOrder=${sortOrder}`, {});
  }

  getSectionList(formId: number, pageNumber: number) {
    return this.http.get<any>(`${this.baseApi}/form/${formId}/section`);
  }

  getTabList(formId: number, pageNumber: number) {
    return this.http.get<any>(`${this.baseApi}/form/${formId}/tab?sort=sortOrder,asc`);
  }

  removeItem(formId: number, id: number) {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/items/${id}/delete`, {})
  }

  removeItemSource(formId: number, id: number) {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/items-source/${id}/delete`, {})
  }

  removeSection(id: number) {
    return this.http.post<any>(`${this.baseApi}/form/section/${id}/delete`, {})
  }

  removeTab(id: number) {
    return this.http.post<any>(`${this.baseApi}/form/tab/${id}/delete`, {})
  }


  removeTier(id: number) {
    return this.http.post<any>(`${this.baseApi}/form/tier/${id}/delete`, {})
  }

  saveItemOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/form/save-item-order`, list);
  }

  saveSectionOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/form/save-section-order`, list);
  }

  saveTabOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/form/save-tab-order`, list);
  }

  saveTierOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/form/save-tier-order`, list);
  }

  saveTierActionOrder(tierId: number, list: any) {
    return this.http.post<any>(`${this.baseApi}/form/save-tier-action-order?tierId=${tierId}`, list);
  }

  saveTier(formId: number, tier: any) {
    return this.http.post<any>(`${this.baseApi}/form/${formId}/tier`, tier)
  }

  saveTierAction(tierId: any, tierAction: any) {
    return this.http.post<any>(`${this.baseApi}/form/tier/${tierId}/action`, tierAction)
  }

  removeTierAction(id: number) {
    return this.http.post<any>(`${this.baseApi}/form/tier/action/${id}/delete`, {})
  }

  moreAutocompleteJs() {
    return this.http.get<any>(`${base}/~/cm-autocomplete-js/out/cache`);
  }

  moreAutocompleteHtml() {
    return this.http.get<any>(`${base}/~/cm-autocomplete-html/out/cache`);
  }
  getEntryTrailByFormId(id: number, params: any) {
    return this.http.get<any>(`${this.baseApi}/form/${id}/trails`, { params: params })
  }

  /** For designer only */
  undeleteEntry(id: number, trailId: number) {
    return this.http.post<any>(`${this.baseApi}/entry/${id}/undelete?trailId=${trailId}`, {})
  }
  undoEntry(id: number, trailId: number) {
    return this.http.post<any>(`${this.baseApi}/entry/${id}/undo?trailId=${trailId}`, {})
  }
  genView(id: number) {
    return this.http.post<any>(`${this.baseApi}/form/${id}/gen-view`, {})
  }

  saveFormOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/form/save-form-order`, list);
  }


}
