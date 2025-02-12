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
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EndpointService {
  baseApi = baseApi;

  // uploadExcel(endpointId:number,file: any) {
  //   let f = new FormData();
  //   f.append('file',file);
  //   return this.http.post<any>(`${this.baseApi}/import/endpoint/${endpointId}`,f);
  // }

  getEndpoint(endpointId: any): any {
    return this.http.get(`${this.baseApi}/endpoint/${endpointId}`);
  }
  // getEntryListFull(endpointId: any, params: HttpParams): any {
  //   return this.http.get(`${this.baseApi}/endpoint/${endpointId}/entry-full`, { params: params });
  // }
  runEndpoint(endpointId: any, params: any): any {
    return this.http.get(`${this.baseApi}/endpoint/run/${endpointId}`, { params: params });
  }
  // removeEntry(id: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/endpoint/entry/${id}/delete`, data)
  // }
  // saveEntry(endpointId: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/endpoint/${endpointId}/entry`, data);
  // }
  deleteEndpoint(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/endpoint/${id}/delete`, data)
  }
  save(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/endpoint?appId=${appId}&email=${email}`, data)
  }
  // saveOld(email: string, data: any): any {
  //   return this.http.post(`${this.baseApi}/endpoint?email=${email}`, data)
  // }
  constructor(private http: HttpClient) { }

  getByKey(key: string, params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/endpoint/${key}/entry?enabled=1&size=9999`, { params: params })
  }
  // getInForm(id: any): any {
  //   return this.http.get<any>(`${this.baseApi}/endpoint/in-form/${id}`)
  // }

  getEndpointList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/endpoint`, { params: params });
  }

  getSharedEndpointList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/endpoint/shared`, { params: params });
  }

  // getFullEndpointList(params?: any): any {
  //   return this.http.get<any>(`${this.baseApi}/endpoint/full`, { params: params });
  // }


}
