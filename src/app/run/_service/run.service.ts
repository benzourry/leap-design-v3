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

import { Injectable, computed, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, first, map, tap } from 'rxjs';
import { base, baseApi } from '../../_shared/constant.service';
import { RxStompService } from '../../_shared/service/rx-stomp.service';
import { atobUTF } from '../../_shared/utils';

@Injectable({
  providedIn: 'root'
})
export class RunService {

  baseApi = baseApi;

  pushSub:any;
  o:any;
  appConfig:any = {};

  appConf = signal<any>({});
  $app = signal<any>({})

  $navis = signal<any[]>([]);
  $naviPerm = signal<any>({});
  $naviData = signal<any>({});

  $preurl = signal<string>('');
  $user = signal<any>(null);
  $startTimestamp = signal<number>(0);

  private document = inject(DOCUMENT);

  // Safely using DOCUMENT location to prevent SSR/Testing crashes
  $baseUrl = computed(() => {
    const loc = this.document.location;
    return `${loc.protocol}//${loc.hostname}${loc.port ? ':' + loc.port : ''}/#${this.$preurl()}`;
  });

  constructor(private http: HttpClient, private rxStompService: RxStompService) { }

  getRunApp(appId: number, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/run/app/${appId}`, { params: httpParam })
    .pipe(map(res => ({
      ...res,
      f: atobUTF(res._f, '@'),
      x: this.safeParse(atobUTF(res._x, '@'))
    })))
  }

  getNotification(appId:number, email:string){
    return this.http.get<any>(`${this.baseApi}/app/${appId}/notification`, { params: { email } });
  }

  getNotificationByParams(appId:number, params:any){
    return this.http.get<any>(`${this.baseApi}/app/${appId}/notification`, { params: params });
  }

  markNotification(nId:number, email:string){
    return this.http.post<any>(`${this.baseApi}/app/notification-read/${nId}`, {}, { params: { email } });
  }

  getAppUserByEmail(appId: number, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/app/${appId}/user-by-email`, { params: httpParam });
  }

  getAppUserById(id: any) {
    return this.http.get<any>(`${this.baseApi}/app-user/by-userid/${id}`);
  }

  getStartBadge(id: number, email: string) {
    return this.http.get<any>(`${this.baseApi}/entry/${id}/start`, { params: { email } });
  }

  getNavis(id: any, email: string) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/navis`, { params: { email } });
  }

  getNaviData(id: any, email: string) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/navi-data`, { params: { email } });
  }

  getRunAppByPath(appPath: string, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/run/app/path/${appPath}`, { params: httpParam })
    .pipe(map(res => ({
      ...res,
      f: atobUTF(res._f, '@'),
      x: this.safeParse(atobUTF(res._x, '@'))
    })))
  }

  checkPath(value: any) {
    return this.http.get<any>(`${this.baseApi}/app/check-by-key`, { params: { appPath: value } });
  }

  // --- DRY Form Metadata Decoder ---
  private decodeFormMetadata(form: any) {
    if (!form) return form;

    if (form.items) {
      Object.values(form.items).forEach((item: any) => {
        if (item._f) item.f = atobUTF(item._f, '@');
        if (item._placeholder) item.placeholder = item._placeholder;
        if (item._post) item.post = atobUTF(item._post, '@');
        if (item._pre) item.pre = atobUTF(item._pre, '@');
      });
    }
    if (form.sections) {
      form.sections.forEach((section: any) => {
        if (section._pre) section.pre = atobUTF(section._pre, '@');
      });
    }
    if (form.tabs) {
      form.tabs.forEach((tab: any) => {
        if (tab._pre) tab.pre = atobUTF(tab._pre, '@');
      });
    }
    if (form.tiers) {
      form.tiers.forEach((tier: any) => {
        if (tier.actions) {
          Object.values(tier.actions).forEach((action: any) => {
            if (action._pre) action.pre = atobUTF(action._pre, '@');
            if (action._f) action.f = atobUTF(action._f, '@');
          });
        }
        if (tier._pre) tier.pre = atobUTF(tier._pre, '@');
        if (tier._post) tier.post = atobUTF(tier._post, '@');
      });
    }
    if (form.actions) {
      form.actions.forEach((action: any) => {
        if (action._pre) action.pre = atobUTF(action._pre, '@');
        if (action._f) action.f = atobUTF(action._f, '@');
      });
    }
    
    if (form._f) form.f = atobUTF(form._f, '@');
    if (form._onSave) form.onSave = atobUTF(form._onSave, '@');
    if (form._onSubmit) form.onSubmit = atobUTF(form._onSubmit, '@');
    if (form._onView) form.onView = atobUTF(form._onView, '@');

    return form;
  }
  // --------------------------------

  getRunForm(id: number) {
    return this.http.get<any>(`${this.baseApi}/run/form/${id}`)
      .pipe(map(res => {
        this.decodeFormMetadata(res);
        if (res.prev) this.decodeFormMetadata(res.prev);
        return res;
      }));
  }

  getRunDashboard(id: any) {
    return this.http.get<any>(`${this.baseApi}/run/dashboard/${id}`);
  }
  
  getRunDataset(id: number) {
    return this.http.get<any>(`${this.baseApi}/run/dataset/${id}`)
      .pipe(map(res => {
        this.decodeFormMetadata(res.form);
        if (res.form?.prev) this.decodeFormMetadata(res.form.prev);
        return res;
      }));
  }

  getRunScreen(id: number) {
    return this.http.get<any>(`${this.baseApi}/run/screen/${id}`)
    .pipe(map(res => ({
      ...res, 
      data: JSON.parse(atobUTF(res._data,'@'))
    })))
  }

  getMailerList(params?: any) {
    return this.http.get<any>(`${this.baseApi}/mailer/pickable`, { params: params });
  } 

  getGroup(id:number){
    return this.http.get<any>(`${this.baseApi}/group/${id}`)
  }

  getGroupRegList(params:any){
    return this.http.get<any>(`${this.baseApi}/group/reg-list`, { params: params })
  }

  getGroupAllList(params:any) {
    return this.http.get<any>(`${this.baseApi}/group/all-list`, { params: params })
  }

  getAppUserList(appId:number, params:any){
    return this.http.get<any>(`${this.baseApi}/app/${appId}/user`, { params: params })
  }

  saveAppUser(appId:number,appUserData:any){
    return this.http.post<any>(`${this.baseApi}/app/${appId}/user`,appUserData)
  }

  regAppUser(appId:number,appUserData:any){
    return this.http.post<any>(`${this.baseApi}/app/${appId}/register`,appUserData)
  }

  saveUserDetails(userId:number,user:any){
    return this.http.post<any>(`${this.baseApi}/app/user/${userId}`,user);
  }

  saveAppUserBulk(appId:number,appUserData:any){
    return this.http.post<any>(`${this.baseApi}/app/${appId}/user-bulk`,appUserData)
  }

  saveAppUserApproval(appUserId:number, status:string, payload:any){
    return this.http.post<any>(`${this.baseApi}/app-user/${appUserId}/approval`, payload, { params: { status } })
  }

  saveUserApproval(userId:number, status:string){
    return this.http.post<any>(`${this.baseApi}/app-user/user/${userId}/approval`, {}, { params: { status } })
  }

  removeAppUser(appUserId: any, userId:any, email:string) {
    return this.http.post<any>(`${this.baseApi}/app-user/delete`, {}, { 
      params: { 
        appUserId: appUserId || '', 
        userId: userId || '' 
      } 
    });
  }

  onceDone(id: number, email: any, val: boolean) {
    return this.http.post<any>(`${this.baseApi}/app/${id}/once-done`, {}, { params: { email, val } })
  }

  removeAcc(id: number, email: any) {
    return this.http.post<any>(`${this.baseApi}/app/${id}/remove-acc`, {}, { params: { email } })
  }

  removeApproval(entryId:number, tierId:number){
    return this.http.post<any>(`${this.baseApi}/entry/${entryId}/remove-approval`,{tierId:tierId});
  }

  saveUserOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/app-user/save-order`, list);
  }

  saveLookupOrder(list: any) {
    return this.http.post<any>(`${this.baseApi}/lookup/save-order`, list);
  }

  updateUser(id: any, user: any) {
    return this.http.post<any>(`${this.baseApi}/app/user/update-user/${id}`,user);
  }

  bulkChangeProvider(provider: string, userIdList: any[]){
    return this.http.post<any>(`${this.baseApi}/app/user/change-provider-bulk`,{provider:provider, userIdList: userIdList});
  }

  bulkRemoveUser(userIdList: any[]){
    return this.http.post<any>(`${this.baseApi}/app/user/remove-bulk`,userIdList);
  }

  blastUser(appId: any, userIdList: any[], data: any){
    return this.http.post<any>(`${this.baseApi}/app/${appId}/user/blast`,{userIdList:userIdList, data:data});
  }

  cognaClassify(cognaId: number, text: string, fromCogna: boolean, lookupId:number, what: string, minScore: number, multiple: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/classify`, {text: text, fromCogna: fromCogna, email:email}, {
      params: { lookupId: lookupId ?? '', what, minScore: minScore ?? 0.8, multiple: multiple ?? false }
    });
  } 

  cognaClassifyField(itemId: number, text: string, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/classify-field`, {text: text, fromCogna: fromCogna, email:email}, { params: { itemId } });
  } 

  cognaTxtGenField(itemId: number, text: string, action: string, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/txtgen-field/${action}`, {text: text, fromCogna: fromCogna, email:email}, { params: { itemId } });
  } 

  cognaImgGenField(itemId: number, text: string, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/imggen-field`, {text: text, fromCogna: fromCogna, email:email}, { params: { itemId } });
  } 

  cognaImgGen(cognaId: number, text: string, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/imggen`,{text: text, fromCogna: fromCogna, email:email});
  } 

  cognaExtract(cognaId: number, text: string, docList: string[], fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/extract`,{text: text, docList: docList, fromCogna: fromCogna, email:email});
  }

  cognaImgCls(cognaId: number, docList: string[], fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/imgcls`,{docList: docList, fromCogna: fromCogna, email:email});
  }

  cognaPrompt(cognaId: number, prompt: string, fileList: string[], param:any, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/prompt`,{prompt: prompt, fileList: fileList, param: param, fromCogna: fromCogna, email:email});
  }

  streamCognaPrompt(cognaId: number, prompt: string, fileList: string[], param:any, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/prompt-stream`,{prompt: prompt, fileList: fileList, param: param, fromCogna: fromCogna, email:email}, { responseType:'text', observe: 'events', reportProgress: true });
  }

  clearCognaMemoryByIdAndEmail(cognaId: any, email:string) {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/clear-by-email`, {}, { params: { email } });
  }

  uploadCognaFile(file: any, cognaId:number, filename:string): Observable<HttpEvent<any>> {
    let f = new FormData();
    const headers = new HttpHeaders({'ngsw-bypass':''})
    f.append('file',file, filename);
    const req = new HttpRequest('POST', `${this.baseApi}/cogna/${cognaId}/upload-file`, f, {
      reportProgress: true,
      responseType: 'json',
      headers: headers
    })
    return this.http.request(req);
  }

  getBucket(id: number) {
    return this.http.get<any>(`${this.baseApi}/bucket/${id}`)
  }

  getFileList(id:number,params: any) {
    return this.http.get<any>(`${this.baseApi}/bucket/${id}/files`,{params: params})
  }

  uploadFile(bucketId: number, appId:number, file: any, email: any) {
    let f = new FormData();
    f.append('file',file);
    return this.http.post<any>(`${this.baseApi}/entry/upload-file`, f, { params: { bucketId, appId } });
  }

  removeBucketFile(id: any, email: any) {
    return this.http.post<any>(`${this.baseApi}/bucket/delete-file/${id}`, {}, { params: { email } })
  }

  bucketStat(id: number) {
    return this.http.get<any>(`${this.baseApi}/bucket/${id}/stat`)
  }

  initZip(bucketId: number):any{
    return this.http.get(`${this.baseApi}/bucket/${bucketId}/zip`);
  }

  downloadZip(filename: string):any{
    return this.http.get(`${this.baseApi}/bucket/zip-download/${filename}`,{responseType: 'blob'});
  }

  reorganize(bucketId:number):any{
    return this.http.post(`${this.baseApi}/bucket/${bucketId}/reorganize`,{});
  }


  httpGet = (url: string, callback: any, error: any) => {
    let header = (url.indexOf(base) == -1) ? { 'clear': 'true' } : undefined;
    return this.http.get(url, { headers: header })
      .pipe(
        tap({ next: callback, error: error }), first()
      )
  }

  httpPost = (url: string, body: any, callback: any, error: any) => {
    let header = (url.indexOf(base) == -1) ? { 'clear': 'true' } : undefined;
    return this.http.post(url, body, { headers: header })
      .pipe(
        tap({ next: callback, error: error }), first()
      );
  }

  endpointGet = (code: string, appId: any, params: any, callback: any, error: any) => {
    return this.http.get(this.baseApi + `/endpoint/run/${appId}/${code}`, { params: params })
      .pipe(
        tap({ next: callback, error: error }), first()
      );
  }

  $live$ = (subs:any, finalFn: any) =>({
    watch: (ch: any[], fn: any) => {
      ch.forEach(c => {
        if (!subs[c]){
          subs[c] = this.rxStompService.watch('/app-'+ this.$app().id + '-' + c)
            .pipe(
              map((msg:any) => msg.body),
              tap(()=>finalFn())
            )
            .subscribe(fn);
        }
      })
    },
    publish: (ch: any[], msg: any) => {
      ch.forEach(c => {
        this.rxStompService.publish({
          destination: '/app-'+ this.$app().id + '-' + c,
          body: msg,
          skipContentLengthHeader: true
        })
      })
    }
  })

  
  resyncDataset(id: any) {
    return this.http.get<any>(`${this.baseApi}/entry/resync`,{params: {datasetId: id}})
  }

  avLogList(bucketId: number):any{
    return this.http.get(`${this.baseApi}/bucket/${bucketId}/av-logs`);
  }

  quarantine(eaId: number):any{
    return this.http.post(`${this.baseApi}/bucket/quarantine-file/${eaId}`,{});
  }

  scanBucket(bucketId: number): any {
    return this.http.post(`${this.baseApi}/bucket/${bucketId}/scan`, {}, { responseType:'text', observe: 'events', reportProgress: true });
  }

  bucketServerInfo(){
    return this.http.get(`${this.baseApi}/bucket/info`);
  }
  
  safeParse(str: string): any {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

}