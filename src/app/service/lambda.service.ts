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
import { base, baseApi } from '../_shared/constant.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LambdaService {
  baseApi = baseApi;

  uploadExcel(lambdaId:number,file: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/import/lambda/${lambdaId}`,f);
  }

  getLambda(lambdaId: number): any {
    return this.http.get(`${this.baseApi}/lambda/${lambdaId}`);
  }
  // getEntryListFull(lambdaId: any, params: HttpParams): any {
  //   return this.http.get(`${this.baseApi}/lambda/${lambdaId}/entry-full`, { params: params });
  // }
  runLambda(lambdaId: number, params: any): any {
    return this.http.get(`${this.baseApi}/lambda/${lambdaId}/run`, { params: params });
  }
  streamLambda(lambdaId: number, params: any): any {
    return this.http.get(`${this.baseApi}/lambda/${lambdaId}/stream`, { params: params, responseType:'text', observe: 'events', reportProgress: true });
  }
  // removeEntry(id: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/lambda/entry/${id}/delete`, data)
  // }
  // saveEntry(lambdaId: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/lambda/${lambdaId}/entry`, data);
  // }
  deleteLambda(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/lambda/${id}/delete`, data)
  }
  save(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/lambda?appId=${appId}&email=${email}`, data)
  }
  // saveOld(email: string, data: any): any {
  //   return this.http.post(`${this.baseApi}/lambda?email=${email}`, data)
  // }
  constructor(private http: HttpClient) { }

  getByKey(key: string, params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/lambda/${key}/entry?enabled=1&size=9999`, { params: params })
  }

  isCodeTaken(value: any): any {
    return this.http.get(`${this.baseApi}/lambda/check-by-code?code=${value}`);
  }

  // getInForm(id: any): any {
  //   return this.http.get<any>(`${this.baseApi}/lambda/in-form/${id}`)
  // }

  getLambdaList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/lambda`, { params: params });
  }

  getSharedLambdaList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/lambda/shared`, { params: params });
  }

  // getFullLambdaList(params?: any): any {
  //   return this.http.get<any>(`${this.baseApi}/lambda/full`, { params: params });
  // }
  moreAutocompleteLambda(){
    return this.http.get<any>(`${base}/~/cm-autocomplete-lambda/out/cache`);
  }

  evictCache(code,action){
    return this.http.get<any>(`${this.baseApi}/lambda/cache-evict?code=${code}&action=${action}`)
  }

  getSecretList(appId:number): any {
    return this.http.get<any>(`${this.baseApi}/app/${appId}/secrets`)
  }
  
  saveSecret(appId:number, secret:any): any {
    return this.http.post<any>(`${this.baseApi}/app/${appId}/secret`,secret)
  }

  deleteSecret(secretId:number): any {
    return this.http.post<any>(`${this.baseApi}/app/delete-secret/${secretId}`,{})
  }

}
