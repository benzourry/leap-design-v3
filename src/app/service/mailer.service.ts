import { Injectable } from '@angular/core';

import { baseApi } from '../_shared/constant.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MailerService {

  constructor(private http: HttpClient) { }

  baseApi = baseApi;

  getMailer(mailerId: any): any {
    return this.http.get(`${this.baseApi}/mailer/${mailerId}`);
  }

  deleteMailer(id: any, data: any): any {
    return this.http.post(`${this.baseApi}/mailer/${id}/delete`, data)
  }
  save(email: string, appId: number, data: any): any {
    return this.http.post(`${this.baseApi}/mailer?email=${email}&appId=${appId}`, data)
  }
  
  // saveOld(email: string, data: any): any {
  //   return this.http.post(`${this.baseApi}/mailer?email=${email}`, data)
  // }

  getByKey(key: string, params?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/mailer/${key}/entry?enabled=1&size=9999`, { params: params })
  }
  getInForm(id: any): any {
    return this.http.get<any>(`${this.baseApi}/mailer/in-form/${id}`)
  }

  getMailerList(params?: any): any {
    return this.http.get<any>(`${this.baseApi}/mailer`, { params: params });
  }

}
