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
import { HttpClient } from '@angular/common/http';
// import { baseApi } from '../_shared/constant.service';
import { Observable } from 'rxjs';
import { baseApi } from '../../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  baseApi = baseApi;

  uploadExcel(lookupId:number,file: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/import/lookup/${lookupId}`,f);
  }

  uploadFile(lookupId:number,file: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/lookup/${lookupId}/upload-file`,f);
  }

  getLookup(lookupId: number):any {
    return this.http.get(`${this.baseApi}/lookup/${lookupId}`);
  }
  getEntryListFull(lookupId: number, params: any):any {
    return this.http.get(`${this.baseApi}/lookup/${lookupId}/entry-full`, { params: params });
  }
  getEntryList(lookupId: number, params: any):any {
    return this.http.get(`${this.baseApi}/lookup/${lookupId}/entry`, { params: params });
  }
  removeEntry(id: number, data: any) {
    return this.http.post(`${this.baseApi}/lookup/entry/${id}/delete`, data)
  }
  saveEntry(lookupId: number, data: any) {
    return this.http.post(`${this.baseApi}/lookup/${lookupId}/entry`, data);
  }
  deleteLookup(id: number, data: any) {
    return this.http.post(`${this.baseApi}/lookup/${id}/delete`, data)
  }
  save(email: string, appId: number, data: any):any {
    return this.http.post(`${this.baseApi}/lookup?appId=${appId}&email=${email}`, data)
  }
  saveOld(email: string, data: any) {
    return this.http.post(`${this.baseApi}/lookup?email=${email}`, data)
  }
  constructor(private http: HttpClient) { }

  getByKey(key: string, params?: any): Observable<any> {
    if (params && params?.postBody){
      try{
        params.postBody = JSON.stringify(params.postBody)
      }catch(e){}      
    }
    return this.http.get<any>(`${this.baseApi}/lookup/${key}/entry?enabled=1&size=9999`,{params:params})
  }
  getInForm(id: any,sectionType?: string[]) {
    var param = {};
    if (sectionType){
      param = {sectionType:sectionType};
    }
    return this.http.get<any>(`${this.baseApi}/lookup/in-form/${id}`, {params: param})
  }

  getLookupList(params?: any) {
    return this.http.get<any>(`${this.baseApi}/lookup`, { params: params });
  }

  updateLookupData(lookupId?: number, refCol?: string) {
    return this.http.get<any>(`${this.baseApi}/lookup/update-data?lookupId=${lookupId}&refCol=${refCol}`, {});
  }

  getFullLookupList(params?: any) {
    return this.http.get<any>(`${this.baseApi}/lookup/full`, { params: params });
  }
  clearEntries(lookupId) {
    return this.http.post<any>(`${this.baseApi}/lookup/${lookupId}/clear-entries`, {});
  }


}
