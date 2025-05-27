import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
  stat() {
    return this.http.get<any>(`${this.baseApi}/platform/summary`, {});
  }

  baseApi=baseApi;

  constructor(private http: HttpClient) { }

  removeValue(id: any) {
    return this.http.post<any>(`${this.baseApi}/platform/keyvalue/${id}/remove`, {});
  } 
  saveValue(data: any) {
    return this.http.post<any>(`${this.baseApi}/platform/keyvalue/${data.group}/${data.key}`, data);
  }
  getValue(key,group) {
    return this.http.get<any>(`${this.baseApi}/platform/keyvalue/${group}/${key}`, {});
  }
  
  valueByGroup(group) {
    return this.http.get<any>(`${this.baseApi}/platform/keyvalue/${group}`, {});
  }

  
  removeAppGroup(id: any) {
    return this.http.post<any>(`${this.baseApi}/platform/appgroup/${id}/remove`, {});
  } 
  saveAppGroup(data: any) {
    return this.http.post<any>(`${this.baseApi}/platform/appgroup`, data);
  }
  listAppGroup(params:any) {
    return this.http.get<any>(`${this.baseApi}/platform/appgroup`, {params: params});
  }

}
