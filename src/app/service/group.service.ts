import { Injectable } from '@angular/core';
import { baseApi } from '../_shared/constant.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  baseApi = baseApi;

  constructor(private http: HttpClient) { }

  save(appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/group?appId=${appId}`, data)
  }
  
  getGroupList(params:any){
    return this.http.get<any>(`${this.baseApi}/group`,{ params: params })
  }

  getGroup(id: number) {
    return this.http.get<any>(`${this.baseApi}/group/${id}`)
  }

  deleteGroup(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/group/${id}/delete`, data)
  }

}
