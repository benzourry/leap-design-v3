import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class DatasetService {

  baseApi = baseApi;
  

  constructor(private http: HttpClient) { }

  saveDataset(appId: number, dataset: any) {
    return this.http.post<any>(`${this.baseApi}/dataset?appId=${appId}`, dataset)
  }

  cloneDataset(datasetId: any, appId: any) {
    return this.http.post<any>(`${this.baseApi}/dataset/clone?datasetId=${datasetId}&appId=${appId}`, {})
  }

  getDataset(id: number) {
    return this.http.get<any>(`${this.baseApi}/dataset/${id}`)
  }

  getDatasetList(appId:number){
    return this.http.get<any>(`${this.baseApi}/dataset?appId=${appId}&sort=sortOrder,asc&sort=id,asc`)
  }

  removeDataset(datasetId: number) {
    return this.http.post<any>(`${this.baseApi}/dataset/${datasetId}/delete`, {})
  }

  removeDatasetItem(diId: number, key: string) {
    return this.http.post<any>(`${this.baseApi}/dataset/item/${diId}/delete`, {})
  }

  updateDatasetItem(dsId:number, di:any){
    return this.http.post<any>(`${this.baseApi}/dataset/${dsId}/item`, di);
  }

  // getFormByDatasetId(id: number) {
  //   return this.http.get<any>(`${this.baseApi}/by-dataset/${id}`)
  // }

  saveDsOrder(list: any): any {
    return this.http.post<any>(`${this.baseApi}/dataset/save-ds-order`, list);
  }

  clearData(dsId:number, email:string){
    return this.http.post<any>(`${this.baseApi}/dataset/${dsId}/clear-entry?email=${email}`, {});
  }

  saveAction(dsId: number, action: any): any {
    return this.http.post<any>(`${this.baseApi}/dataset/${dsId}/actions`, action)
  }

  removeAction(daId: number): any {
    return this.http.post<any>(`${this.baseApi}/dataset/actions/${daId}/delete`, {})
  }

  saveDatasetOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/dataset/save-dataset-order`, list);
  }

}
