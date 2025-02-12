import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  baseApi = baseApi;

  constructor(private http: HttpClient) { }

  saveChartOrder(list: any): any {
    return this.http.post<any>(`${this.baseApi}/dashboard/save-chart-order`, list);
  }
  saveChart(formId: any, chart: any): any {
    return this.http.post<any>(`${this.baseApi}/dashboard/${formId}/chart`, chart)
  }
  saveDashboard(appId: number, dashboard: any): any {
    return this.http.post<any>(`${this.baseApi}/dashboard?appId=${appId}`, dashboard)
  }
  getDashboardList(appId: number): any {
    return this.http.get<any>(`${this.baseApi}/dashboard?appId=${appId}&sort=sortOrder,asc&sort=id,asc`);
  }
  removeDashboard(dashboardId: number) {
    return this.http.post<any>(`${this.baseApi}/dashboard/${dashboardId}/delete`, {})
  }
  
  removeChart(id: number) {
    return this.http.post<any>(`${this.baseApi}/dashboard/chart/${id}/delete`, {})
  }
  getDashboard(id: any): any {
    return this.http.get<any>(`${this.baseApi}/dashboard/${id}`)
  }
  getDashboardBasic(id: any): any {
    return this.http.get<any>(`${this.baseApi}/dashboard/${id}/basic`)
  }

  saveDashboardOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/dashboard/save-dashboard-order`, list);
  }

}
