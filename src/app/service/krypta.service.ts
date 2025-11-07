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
export class KryptaService { 
  baseApi = baseApi;

  // uploadExcel(kryptaId:number,file: any) {
  //   let f = new FormData();
  //   f.append('file',file);
  //   return this.http.post<any>(`${this.baseApi}/import/krypta/${kryptaId}`,f);
  // }

  getWallet(kryptaId: any): any {
    return this.http.get(`${this.baseApi}/krypta/wallet/${kryptaId}`);
  }
  deleteWallet(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/krypta/wallet/${id}/delete`, data)
  }
  saveWallet(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/krypta/wallet?appId=${appId}&email=${email}`, data)
  }
  getWalletList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/krypta/wallet`, { params: params });
  }


  getContract(contractId: any): any {
    return this.http.get(`${this.baseApi}/krypta/contract/${contractId}`);
  }
  deleteContract(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/krypta/contract/${id}/delete`, data)
  }
  saveContract(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/krypta/contract?appId=${appId}&email=${email}`, data)
  }
  getContractList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/krypta/contract`, { params: params });
  }

  compileContract(contractId: any): any {
    return this.http.get(`${this.baseApi}/krypta/contract/${contractId}/compile`);
  }
  deployContract(walletId: any): any {
    return this.http.get(`${this.baseApi}/krypta/wallet/${walletId}/deploy`);
  }


  // getEntryListFull(kryptaId: any, params: HttpParams): any {
  //   return this.http.get(`${this.baseApi}/krypta/${kryptaId}/entry-full`, { params: params });
  // }
  // initContract(kryptaId: any): any {
  //   return this.http.get(`${this.baseApi}/krypta/wallet/${kryptaId}/init-contract`, {});
  // }

  // addData(kryptaId: number, certData: any): any {
  //   return this.http.post(`${this.baseApi}/krypta/tx/${kryptaId}/add`, certData);
  // }
  // getData(kryptaId: any, params: any): any {
  //   return this.http.get(`${this.baseApi}/krypta/tx/${kryptaId}/get`, { params: params });
  // }
  runFn(kryptaId: any, fnName:string, params: any): any {
    return this.http.post(`${this.baseApi}/krypta/tx/${kryptaId}/call/${fnName}`, params);
  }
  logs(kryptaId: any, eventName:string): any {
    return this.http.get(`${this.baseApi}/krypta/tx/${kryptaId}/log/${eventName}`);
  }
  verifyHash(kryptaId: any, params: any): any {
    return this.http.get(`${this.baseApi}/krypta/tx/${kryptaId}/verify-hash`, { params: params });
  }
  // removeEntry(id: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/krypta/entry/${id}/delete`, data)
  // }
  // saveEntry(kryptaId: any, data: any): any {
  //   return this.http.post(`${this.baseApi}/krypta/${kryptaId}/entry`, data);
  // }
  // saveOld(email: string, data: any): any {
  //   return this.http.post(`${this.baseApi}/krypta?email=${email}`, data)
  // }
  constructor(private http: HttpClient) { }

  // getByKey(key: string, params?: any): Observable<any> {
  //   return this.http.get<any>(`${this.baseApi}/krypta/${key}/entry?enabled=1&size=9999`, { params: params })
  // }
  // getInForm(id: any): any {
  //   return this.http.get<any>(`${this.baseApi}/krypta/in-form/${id}`)
  // }

  // getSharedKryptaList(params?: any): any {
  //   return this.http.get<any>(`${this.baseApi}/krypta/shared`, { params: params });
  // }

  // getFullKryptaList(params?: any): any {
  //   return this.http.get<any>(`${this.baseApi}/krypta/full`, { params: params });
  // }


}
