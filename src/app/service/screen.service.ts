import { Injectable } from '@angular/core';
import { baseApi } from '../_shared/constant.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ScreenService {
  removeAction(id: any) {
    return this.http.post<any>(`${this.baseApi}/screen/actions/${id}/delete`, {});
  }
  
  baseApi = baseApi;

  constructor(private http: HttpClient) { }

  getScreenList(appId: any): any {
    return this.http.get<any>(`${this.baseApi}/screen?appId=${appId}&sort=sortOrder,asc&sort=id,asc`);
  }
  removeScreen(id: any): any {
    return this.http.post<any>(`${this.baseApi}/screen/${id}/delete`, {})
  }
  
  cloneScreen(screenId: any, appId: any) {
    return this.http.post<any>(`${this.baseApi}/screen/clone?screenId=${screenId}&appId=${appId}`, {})
  }
  saveScreen(appId: number, screen: any): any {
    return this.http.post<any>(`${this.baseApi}/screen?appId=${appId}`, screen)
  }  
  saveAction(screenId: number, action: any): any {
    return this.http.post<any>(`${this.baseApi}/screen/${screenId}/actions`, action)
  }
  getScreen(id: number): any {
    return this.http.get<any>(`${this.baseApi}/screen/${id}`);
  }
  getScreenActionComps(id: number): any {
    return this.http.get<any>(`${this.baseApi}/screen/${id}/action-comps`);
  }

  saveScreenOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/screen/save-screen-order`, list);
  }
}
