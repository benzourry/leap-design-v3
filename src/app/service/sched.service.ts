import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class SchedService {

  constructor(private http: HttpClient) { }

  baseApi = baseApi;

  getSched(schedId: any): any {
    return this.http.get(`${this.baseApi}/sched/${schedId}`);
  }

  deleteSched(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/sched/${id}/delete`, data)
  }
  save(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/sched?email=${email}&appId=${appId}`, data)
  }

  getSchedList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/sched`, { params: params });
  }

}
