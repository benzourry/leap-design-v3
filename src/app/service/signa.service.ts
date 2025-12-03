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
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class SignaService { 
  baseApi = baseApi;

  uploadImg(signaId:number,file: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/signa/${signaId}/upload-img`,f);
  }

  uploadKey(signaId:number,file: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/signa/${signaId}/upload-key`,f);
  }

  getSigna(signaId: any): any {
    return this.http.get(`${this.baseApi}/signa/${signaId}`);
  }
  deleteSigna(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/signa/${id}/delete`, data)
  }
  saveSigna(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/signa?appId=${appId}&email=${email}`, data)
  }
  getSignaList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/signa`, { params: params });
  }

  
  constructor(private http: HttpClient) { }


}
