import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class BucketService {
  bucketStat(id: number) {
    return this.http.get<any>(`${this.baseApi}/bucket/${id}/stat`)
  }
  baseApi = baseApi;

  constructor(private http: HttpClient) { }

  uploadFile(bucketId: number, appId:number, file: any, email: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/entry/upload-file?bucketId=${bucketId}&appId=${appId}`,f);

  }

  removeBucketFile(id: any, email: any) {
    return this.http.post<any>(`${this.baseApi}/bucket/delete-file/${id}?email=${email}`,{})
  }
  saveBucketFile(group: any, id: any, email: any, name: any, arg4: boolean) {
    return this.http.post<any>(`${this.baseApi}/bucket/${id}/files`,{})
  }

  getFileList(id:number,params: any) {
    return this.http.get<any>(`${this.baseApi}/bucket/${id}/files`,{params: params})
  }

  save(appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/bucket?appId=${appId}`, data)
  }
  
  getBucketList(params:any){
    return this.http.get<any>(`${this.baseApi}/bucket`,{ params: params })
  }

  getBucket(id: number) {
    return this.http.get<any>(`${this.baseApi}/bucket/${id}`)
  }

  deleteBucket(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/bucket/${id}/delete`, data)
  }

  initZip(bucketId: number):any{
    return this.http.get(`${this.baseApi}/bucket/${bucketId}/zip`);
  }

  // avLogList(bucketId: number):any{
  //   return this.http.get(`${this.baseApi}/bucket/${bucketId}/av-logs`);
  // }
  downloadZip(filename: string):any{
    return this.http.get(`${this.baseApi}/bucket/zip-download/${filename}`,{responseType: 'blob'});
  }
  reorganize(bucketId:number):any{
    return this.http.post(`${this.baseApi}/bucket/${bucketId}/reorganize`,{});
  }

}
