import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { baseApi } from '../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class MetaTrailService {
  private http = inject(HttpClient);

  getMetaTrails(scope: string, params: any) {
    return this.http.get<any>(`${baseApi}/metatrail/${scope}`, { params });
  }

  getMetaTrailsByAppId(appId: number, params: any) {
    return this.http.get<any>(`${baseApi}/metatrail/app/${appId}`, { params });
  }

  revertMetaTrail(id: string) {
    return this.http.post<any>(`${baseApi}/metatrail/${id}/revert`, {});
  }
}