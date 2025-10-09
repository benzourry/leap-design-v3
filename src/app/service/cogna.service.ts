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
export class CognaService {
  baseApi = baseApi;

  uploadExcel(cognaId:number,file: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/import/cogna/${cognaId}`,f);
  }

  getCogna(cognaId: number): any {
    return this.http.get(`${this.baseApi}/cogna/${cognaId}`);
  }
  // getEntryListFull(cognaId: any, params: HttpParams): any {
  //   return this.http.get(`${this.baseApi}/cogna/${cognaId}/entry-full`, { params: params });
  // }
  // runCogna(cognaId: number, params: any): any {
  //   return this.http.get(`${this.baseApi}/cogna/${cognaId}/run`, { params: params });
  // }
  ingest(cognaId: number, params: any): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/ingest`, {});
  }

  ingestSrc(cognaSrcId: number, params: any): any {
    return this.http.post(`${this.baseApi}/cogna/ingest-src/${cognaSrcId}`, {});
  }

  clearMemoryById(cognaId: any) {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/clear`, {});
  }

  clearDb(cognaId: any) {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/clear-db`, {});
  }

  check(cognaId: number): any {
    return this.http.get(`${this.baseApi}/cogna/${cognaId}/check`);
  }
  history(cognaId: number, params:any): any {
    return this.http.get(`${this.baseApi}/cogna/${cognaId}/history`,{params:params});
  }

  searchDb(cognaId: number, searchDbData): any {
    searchDbData.minScore = searchDbData.minScore??0;
    return this.http.get(`${this.baseApi}/cogna/${cognaId}/search-db`, {params:searchDbData});
  }

  // loadChatMemory(cognaId: number, email: string): any {
  //   return this.http.get(`${this.baseApi}/cogna/${cognaId}/chat-history`,{params:{email:email}});
  // }

  reinit(cognaId: number): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/reinit`,{});
  }
  // start(cognaId: number): any {
  //   return this.http.get(`${this.baseApi}/cogna/${cognaId}/start`);
  // }
  // stop(cognaId: number): any {
  //   return this.http.get(`${this.baseApi}/cogna/${cognaId}/stop`);
  // }
  // prompt(cognaId: number, prompt: string): any {
  //   return this.http.post(`${this.baseApi}/cogna/${cognaId}/prompt`,{prompt: prompt});
  // }
  // streamPrompt(cognaId: number, prompt: string): any {
  //   return this.http.post(`${this.baseApi}/cogna/${cognaId}/prompt-stream`,{prompt: prompt}, { responseType:'text', observe: 'events', reportProgress: true });
  // }
  // streamPrompt(cognaId: number, prompt: string): any {
  //   return this.http.get(`${this.baseApi}/cogna/${cognaId}/prompt-stream`,{ params:{prompt:prompt}, responseType:'text', observe: 'events', reportProgress: true });
  // }
  // removeEntry(id: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/cogna/entry/${id}/delete`, data)
  // }
  // saveEntry(cognaId: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/cogna/${cognaId}/entry`, data);
  // }
  deleteCogna(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/cogna/${id}/delete`, data)
  }
  save(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/cogna?appId=${appId}&email=${email}`, data)
  }

  saveSrc(cId, data):any{
    return this.http.post(`${this.baseApi}/cogna/${cId}/src`, data)
  }

  saveTool(cId, data):any{
    return this.http.post(`${this.baseApi}/cogna/${cId}/tool`, data)
  }

  saveMcp(cId, data):any{
    return this.http.post(`${this.baseApi}/cogna/${cId}/mcp`, data)
  }

  saveSub(cId, data):any{
    return this.http.post(`${this.baseApi}/cogna/${cId}/sub`, data)
  }

  removeSrc(cId):any{
    return this.http.post(`${this.baseApi}/cogna/delete-src/${cId}`, {})
  }
  removeTool(cId):any{
    return this.http.post(`${this.baseApi}/cogna/delete-tool/${cId}`, {})
  }

  removeMcp(cId):any{
    return this.http.post(`${this.baseApi}/cogna/delete-mcp/${cId}`, {})
  }

  removeSub(cId):any{
    return this.http.post(`${this.baseApi}/cogna/delete-sub/${cId}`, {})
  }
  // saveOld(email: string, data: any): any {
  //   return this.http.post(`${this.baseApi}/cogna?email=${email}`, data)
  // }
  constructor(private http: HttpClient) { }

  getByKey(key: string, params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/cogna/${key}/entry?enabled=1&size=9999`, { params: params })
  }

  isCodeTaken(value: any): any {
    return this.http.get(`${this.baseApi}/cogna/check-by-code?code=${value}`);
  }

  // getInForm(id: any): any {
  //   return this.http.get<any>(`${this.baseApi}/cogna/in-form/${id}`)
  // }

  getCognaList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/cogna`, { params: params });
  }

  getSharedCognaList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/cogna/shared`, { params: params });
  }

  // getFullCognaList(params?: any): any {
  //   return this.http.get<any>(`${this.baseApi}/cogna/full`, { params: params });
  // // }
  // moreAutocompleteCogna(){
  //   return this.http.get<any>(`${base}/~/cm-autocomplete-cogna/out/cache`);
  // }

  evictCache(code,action){
    return this.http.get<any>(`${this.baseApi}/cogna/cache-evict?code=${code}&action=${action}`)
  }
  getFormatter(formId:number, asSchema:boolean=true){
    return this.http.get<any>(`${this.baseApi}/cogna/get-formatter/${formId}?asSchema=${asSchema}`)
  }

}
