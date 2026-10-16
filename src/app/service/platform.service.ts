import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  baseApi = baseApi;

  constructor(private http: HttpClient) { }

  stat() {
    return this.http.get<any>(`${this.baseApi}/platform/summary`, {});
  }

  // ==========================================
  // Platform Properties
  // ==========================================
  removeValue(id: any) {
    return this.http.post<any>(`${this.baseApi}/platform/keyvalue/${id}/remove`, {});
  } 
  saveValue(data: any) {
    return this.http.post<any>(`${this.baseApi}/platform/keyvalue/${data.group}/${data.key}`, data);
  }
  getValue(key: any, group: any) {
    return this.http.get<any>(`${this.baseApi}/platform/keyvalue/${group}/${key}`, {});
  }
  valueByGroup(group: any) {
    return this.http.get<any>(`${this.baseApi}/platform/keyvalue/${group}`, {});
  }

  // ==========================================
  // App Groups
  // ==========================================
  removeAppGroup(id: any) {
    return this.http.post<any>(`${this.baseApi}/platform/appgroup/${id}/remove`, {});
  } 
  saveAppGroup(data: any) {
    return this.http.post<any>(`${this.baseApi}/platform/appgroup`, data);
  }
  listAppGroup(params: any) {
    return this.http.get<any>(`${this.baseApi}/platform/appgroup`, {params: params});
  }

  // ==========================================
  // MetaTrail Management
  // ==========================================
  initMetaTrail(appId?: number | null, scope?: string | null) {
    let params: any = {};
    if (appId) params.appId = appId;
    if (scope) params.scope = scope;
    return this.http.get<any>(`${this.baseApi}/metatrail/init`, { params });
  }

  clearMetaTrail(appId?: number | null, scope?: string | null) {
    let params: any = {};
    if (appId) params.appId = appId;
    if (scope) params.scope = scope;
    return this.http.delete<any>(`${this.baseApi}/metatrail/clear`, { params });
  }
}