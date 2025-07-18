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

import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
// import { baseApi } from '../_shared/constant.service';
import { Observable } from 'rxjs';
import { baseApi } from '../../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class EntryService {

  linkFiles(id: any, entryFiles: any[], email:string) {
    return this.http.post(`${this.baseApi}/entry/${id}/link-files?&email=${email}`,entryFiles)
  }
  assign(id: any, tierId: any, email: any) {
    return this.http.post(`${this.baseApi}/entry/${id}/assign?tierId=${tierId}&email=${email}`,{})
  }

  baseApi = baseApi;

  getDashboardData(dashboardId: any, email: any): any {
    return this.http.get(`${this.baseApi}/entry/dashboard/${dashboardId}?email=${email}`);
    // return this.http.get(`${this.baseApi}/entry/dashboard-echarts/${dashboardId}`);
  }
  getChartData(chartId: any, params: any): any {
    return this.http.get(`${this.baseApi}/entry/chart/${chartId}`, {params:params});
    // return this.http.get(`${this.baseApi}/entry/dashboard-echarts/${dashboardId}`);
  }

  // getActionList(id: number, email: string, params: any): any {
  //   return this.http.get(`${this.baseApi}/entry/action-list`,{params: params});
  // }

  // getActionArchiveList(id: number, email: string, params: any): any {
  //   return this.http.get(`${this.baseApi}/entry/action-archive-list`,{params: params});
  // }

  delete(id: number, email: string) {
    return this.http.post<any>(`${this.baseApi}/entry/${id}/delete?email=${email}`,{})
  }
  bulkDelete(selectedEntries: number[], email: any) {
    let ids = Array.from(selectedEntries).join(",");
    return this.http.post<any>(`${this.baseApi}/entry/bulk/delete?email=${email}&ids=${ids}`,{})
  }
  // getList(type: string, formId: number, params: any): any {
  //   return this.http.get(`${this.baseApi}/entry/list/${type}?formId=${formId}`,{params:params});
  // }
  // getListData(formId: number, params: any): any {
  //   return this.http.get(`${this.baseApi}/entry/list-all?formId=${formId}`,{params:params});
  // }
  getListByDataset(datasetId: number, params: any){
    return this.http.get<any>(`${this.baseApi}/entry/list?datasetId=${datasetId}`,{params:params});
  }
  blastByDataset(datasetId: number, data: any,params: any){
    return this.http.post<any>(`${this.baseApi}/entry/list-blast?datasetId=${datasetId}`,data,{params:params});
  }
  getListByDatasetData(datasetId: number, params: any){
    return this.http.get<any>(`${this.baseApi}/entry/list-data?datasetId=${datasetId}`,{params:params});
  }
  // getAdminList(formId: number, params: any): any {
  //   return this.http.get(`${this.baseApi}/entry/admin?formId=${formId}`,{params:params});
  // }
  action(id: number, email: string, approval: any){
    return this.http.post<any>(`${this.baseApi}/entry/${id}/action?email=${email}`,approval)
  }
  bulkAction(selectedEntries: Set<number>, email: string, approval: any){
    let ids = Array.from(selectedEntries).join(",");
    return this.http.post<any>(`${this.baseApi}/entry/bulk/action?email=${email}&ids=${ids}`,approval)
  }
  saveApproval(id: number, email: string, approval: any){
    return this.http.post<any>(`${this.baseApi}/entry/${id}/save-approval?email=${email}`,approval)
  }
  cancel(id: number, email: string) {
    return this.http.post<any>(`${this.baseApi}/entry/${id}/retract?email=${email}`,{})
  }
 
  removeApproval(entryId: number, tierId: number){
    // console.log(id);
    return this.http.post<any>(`${this.baseApi}/entry/${entryId}/remove-approval?tierId=${tierId}`,{});
  }
  deleteAttachment(fileUrl?: string){
    // let f = new FormData();
    // f.append('file',file, filename);
    return this.http.post<any>(`${this.baseApi}/entry/delete-file?fileUrl=${fileUrl}`,{});
  }
  uploadAttachmentOnce(file: any, itemId: number, bucketId:number, appId:number, filename?: string): any {
    let f = new FormData();
    f.append('file',file, filename);
    return this.http.post<any>(`${this.baseApi}/entry/upload-file?itemId=${itemId||''}&bucketId=${bucketId||''}&appId=${appId}`,f);
  }
  uploadAttachment(file: any, itemId: number, bucketId:number, appId:number, filename?: string): Observable<HttpEvent<any>> {
    let f = new FormData();
    const headers = new HttpHeaders({'ngsw-bypass':''})
    f.append('file',file, filename);
    const req = new HttpRequest('POST', `${this.baseApi}/entry/upload-file?itemId=${itemId||''}&bucketId=${bucketId||''}&appId=${appId}`,f, {
      reportProgress: true,
      responseType: 'json',
      headers: headers
    })
    return this.http.request(req);
  }
  getEntry(id: number, formId: number) {
    return this.http.get<any>(`${this.baseApi}/entry/${id}?formId=${formId}`)
  }
  getEntryApprovalTrail(id: number) {
    return this.http.get<any>(`${this.baseApi}/entry/${id}/approval-trails`)
  }
  getEntryFiles(id: number) {
    return this.http.get<any>(`${this.baseApi}/entry/${id}/files`)
  }

  getFirstEntryByParam(param: any, formId:number) {
    const filtersEncoded = encodeURIComponent(JSON.stringify(param));
    return this.http.get<any>(`${this.baseApi}/entry/by-params?formId=${formId}&filters=${filtersEncoded}`)
  }

  updateField(entryId:number, value:any, appId:number){
    return this.http.post<any>(`${this.baseApi}/entry/field?entryId=${entryId}&appId=${appId}`,value); 
  }
  
  updateLookup(entryId:number, value:any, appId:number){
    return this.http.post<any>(`${this.baseApi}/lookup/entry/field?entryId=${entryId}&appId=${appId}`,value); 
  }
  
  save(formId: number, data: any, prevId:number, email: string) {  
    var params:any = {formId:formId,email:email};
    if (prevId){
      params.prevId=prevId
    }
    return this.http.post<any>(`${this.baseApi}/entry`, data,{params:params})
  }
  constructor(private http:HttpClient) { }

  submit(id: number, email: string, resubmit: boolean) {
    return this.http.post<any>(`${this.baseApi}/entry/${id}/${resubmit?'re':''}submit?email=${email}`, {})
  }
}
