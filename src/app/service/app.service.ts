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
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class AppService {
  createRestorePoint(appId: number, editRestorePointData: any, email: any) {
    return this.http.post(`${this.baseApi}/restore-point/create?appId=${appId}&email=${email}`, editRestorePointData);
  }
  
  goRestorePoint(rpId:number, clear:boolean) {
    return this.http.post(`${this.baseApi}/restore-point/${rpId}/restore?clear=${clear}`,{});
  }

  removeRestorePoint(rpId:number) {
    return this.http.post(`${this.baseApi}/restore-point/${rpId}/delete`,{});
  }
  
  getRestorePointList(appId: number, email: any) {
    return this.http.get<any>(`${this.baseApi}/restore-point?appId=${appId}&email=${email}`);
  }
    
  uploadExcel(appId:number,file: any, email: string, createDataset:boolean, createDashboard:boolean, importToLive:boolean) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/import/app/${appId}?email=${email}&create-dataset=${createDataset||false}&create-dashboard=${createDashboard||false}&import-live=${importToLive||false}`,f);
  }

  getPages(id: any) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/pages`);
  }

  getNavisAll(id: any) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/navis-all`);
  }
  getNaviData(id: any,email:string) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/navi-data?email=${email}`);
  }
  getCount(id: any) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/counts`);
  }
  activateCp(id: any, action: string) {
    return this.http.post<any>(`${this.baseApi}/app/request/${id}/${action}`, {})
  }
  getCopyRequestList(id: any) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/request`)
  }
  checkActivate(id: number, email: string) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/activation-check?email=${email}`)

  }
  activate(id: number, result: string) {
    return this.http.post<any>(`${this.baseApi}/app/${id}/activate?code=${result}`, {})
  }
  requestCopy(id: number, email: string) {
    return this.http.post<any>(`${this.baseApi}/app/${id}/request?email=${email}`, {})
  }
  getTopList(): any {
    return this.http.get<any>(`${this.baseApi}/app/top`, {})
  }
  isPathTaken(value: any) {
    return this.http.get<any>(`${this.baseApi}/app/check-by-key?appPath=${value}`);
  }

  baseApi = baseApi;

  getStartBadge(id: number, email: string) {
    return this.http.get<any>(`${this.baseApi}/entry/${id}/start?email=${email}`);
  }
  constructor(private http: HttpClient) { }

  remove(app: any,email:string) {
    return this.http.post<any>(`${this.baseApi}/app/${app.id}/delete?email=${email}`, app)
  }
  save(data: any, email: string) {
    return this.http.post<any>(`${this.baseApi}/app?email=${email}`, data);
  }
  // setLive(appId:number,live:boolean){
  //   return this.http.post<any>(`${this.baseApi}/app/${appId}/live?status=${live}`, {});
  // }
  saveNaviF(data: any, appId: number, email: string) {
    return this.http.post<any>(`${this.baseApi}/app/${appId}/navi-f?email=${email}`, data);
  }
  clone(data: any, email: string) {
    return this.http.post<any>(`${this.baseApi}/app/clone?email=${email}`, data);
  }
  getAppMyList(httpParam: any) {
    return this.http.get<any>(`${this.baseApi}/app/my`, { params: httpParam });
  }
  getAppSharedList(httpParam: any) {
    return this.http.get<any>(`${this.baseApi}/app/shared`, { params: httpParam });
  }
  getAppByStatusList(httpParam: any) {
    return this.http.get<any>(`${this.baseApi}/app/status`, { params: httpParam });
  }
  getAppList(httpParam: any) {
    return this.http.get<any>(`${this.baseApi}/app`, { params: httpParam })
  }
  getApp(appId: number, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/app/${appId}`, { params: httpParam })
  }
  getAppByPath(appPath: string, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/app/path/${appPath}`, { params: httpParam })
  }
  uploadLogo(file: any, appId:number) {
    let f = new FormData();
    f.append('file', file);
    let param = appId?`?appId=${appId}`:''
    return this.http.post<any>(`${this.baseApi}/app/logo${param}`, f);
  }
  // saveNavi(appId: number, data: any) {
  //   return this.http.post<any>(`${this.baseApi}/app/${appId}/navi`, data);
  // }

  addNaviGroup(id: number, group:any) {
    return this.http.post<any>(`${this.baseApi}/app/navi/add-group/${id}`, group);
  }

  addNaviItem(id: number, item:any) {
    return this.http.post<any>(`${this.baseApi}/app/navi/add-item/${id}`, item);
  }

  removeNaviGroup(id: number) {
    return this.http.post<any>(`${this.baseApi}/app/navi/delete-group/${id}`, {});
  }

  removeNaviItem(id: number) {
    return this.http.post<any>(`${this.baseApi}/app/navi/delete-item/${id}`, {});
  }

  saveNaviItemOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/app/navi/save-item-order`, list);
  }

  saveNaviGroupOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/app/navi/save-group-order`, list);
  }

  moveItem(siId: number, newSectionId: number, sortOrder: number) {
    // console.log(data);
    return this.http.post<any>(`${this.baseApi}/app/navi/move-item?itemId=${siId}&newGroupId=${newSectionId}&sortOrder=${sortOrder}`, {});
  }

  getApiKeyList(appId:number) {
    return this.http.get<any>(`${this.baseApi}/app/${appId}/api-keys`, {});
  }

  generateApiKey(appId: number) {
    // console.log(data);
    return this.http.post<any>(`${this.baseApi}/app/${appId}/generate-key`, {});
  }

  removeApiKey(apiKeyId: number) {
    // console.log(data);
    return this.http.post<any>(`${this.baseApi}/app/delete-api-key/${apiKeyId}`, {});
  }

  searchInApp = new Map();

}
