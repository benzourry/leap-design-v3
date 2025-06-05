import { Injectable, computed, signal } from '@angular/core';
// import { base, baseApi } from '../_shared/constant.service';
import { HttpClient, HttpEvent, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, first, lastValueFrom, map, tap } from 'rxjs';
import { base, baseApi } from '../../_shared/constant.service';
import { RxStompService } from '../../_shared/service/rx-stomp.service';
// import { RxStompService } from '../_shared/service/rx-stomp.service';

@Injectable({
  providedIn: 'root'
})
export class RunService {

  baseApi = baseApi;

  // appId:number;

  // app:any;
  pushSub:any;

  o:any;

  appConfig:any = {};

  $app = signal<any>({})
  // $appId = signal<number>(-1)

  $navis = signal<any[]>([]);

  $naviPerm = signal<any>({});
  // $navis = computed(this.#navis);
  $naviData = signal<any>({});

  $preurl = signal<string>('');

  $user = signal<any>({});

  $startTimestamp=signal<number>(0);

  // xpat pake tok sbb path da /run x sesuai utk actual reka-run
  $baseUrl = computed(()=>(location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.$preurl())



  constructor(private http: HttpClient, private rxStompService: RxStompService) { }

  getApp(appId: number, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/app/${appId}`, { params: httpParam })
  }
  getNotification(appId:number,email:string){
    return this.http.get<any>(`${this.baseApi}/app/${appId}/notification?email=${email}`);
  }
  getNotificationByParams(appId:number,params:any){
    return this.http.get<any>(`${this.baseApi}/app/${appId}/notification`,{params: params});
  }
  markNotification(nId:number, email:string){
    return this.http.post<any>(`${this.baseApi}/app/notification-read/${nId}?email=${email}`,{});
  }
  getAppUserByEmail(appId: number, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/app/${appId}/user-by-email`, { params: httpParam });
  }
  getAppUserById(id: any) {
    return this.http.get<any>(`${this.baseApi}/app-user/by-userid/${id}`);
  }
  getStartBadge(id: number, email: string) {
    return this.http.get<any>(`${this.baseApi}/entry/${id}/start?email=${email}`);
  }
  getNavis(id: any, email: string) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/navis?email=${email}`);
  }
  getNaviData(id: any,email: string) {
    return this.http.get<any>(`${this.baseApi}/app/${id}/navi-data?email=${email}`);
  }
  getAppByPath(appPath: string, httpParam?: any) {
    return this.http.get<any>(`${this.baseApi}/app/path/${appPath}`, { params: httpParam })
  }
  // getAppByKey(appPath: string, httpParam?: any) {
  //   return this.http.get<any>(`${this.baseApi}/app/key/${appPath}`, { params: httpParam })
  // }
  checkPath(value: any) {
    return this.http.get<any>(`${this.baseApi}/app/check-by-key?appPath=${value}`,{headers:{}});
  }
  getForm(id: number) {
    return this.http.get<any>(`${this.baseApi}/form/` + id);
  }
  getDashboard(id: any) {
    return this.http.get<any>(`${this.baseApi}/dashboard/${id}`)
  }
  getDashboardBasic(id: any) {
    return this.http.get<any>(`${this.baseApi}/dashboard/${id}/basic`)
  }
  getDataset(id: number) {
    return this.http.get<any>(`${this.baseApi}/dataset/${id}`)
  }
  getScreen(id: number) {
    return this.http.get<any>(`${this.baseApi}/screen/${id}`);
  }
  getMailerList(params?: any) {
    return this.http.get<any>(`${this.baseApi}/mailer/pickable`, { params: params });
  } 
  getGroup(id:number){
    return this.http.get<any>(`${this.baseApi}/group/${id}`)
  }
  getGroupRegList(params:any){
    return this.http.get<any>(`${this.baseApi}/group/reg-list`,{ params: params })
  }
  getGroupAllList(params:any) {
    return this.http.get<any>(`${this.baseApi}/group/all-list`,{ params: params })
  }
  getAppUserList(appId:number, params:any){
    return this.http.get<any>(`${this.baseApi}/app/${appId}/user`,{ params: params })
  }
  // getAppUserList(groupId:number, params:any){
  //   return this.http.get<any>(`${this.baseApi}/group/${groupId}/user`,{ params: params })
  // }

  // saveAppUser(selectedRoles:any,appId:number,email:string,name:string,autoReg?:boolean){
  //   return this.http.post<any>(`${this.baseApi}/app/${appId}/user?email=${email}&name=${name}&autoReg=${autoReg}`,selectedRoles)
  // }
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
    // var payload = {userGroups:selectedRoles,emails:email}
    return this.http.post<any>(`${this.baseApi}/app/${appId}/user-bulk?`,appUserData)
  }
  saveAppUserApproval(appUserId:number, status:string, payload:any){
    return this.http.post<any>(`${this.baseApi}/app-user/${appUserId}/approval?status=${status}`,payload)
  }
  // if no group
  saveUserApproval(userId:number, status:string){
    return this.http.post<any>(`${this.baseApi}/app-user/user/${userId}/approval?status=${status}`,{})
  }
  removeAppUser(appUserId: any, userId:any, email:string) {
    return this.http.post<any>(`${this.baseApi}/app-user/delete?appUserId=${appUserId||''}&userId=${userId||''}`,{})
  }
  onceDone(id: number, email: any, val: boolean) {
    return this.http.post<any>(`${this.baseApi}/app/${id}/once-done?email=${email}&val=${val}`,{})
  }
  removeAcc(id: number, email: any) {
    return this.http.post<any>(`${this.baseApi}/app/${id}/remove-acc?email=${email}`,{})
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
  bulkChangeProvider(provider: string, userIdList){
    return this.http.post<any>(`${this.baseApi}/app/user/change-provider-bulk`,{provider:provider, userIdList: userIdList});
  }
  bulkRemoveUser(userIdList){
    return this.http.post<any>(`${this.baseApi}/app/user/remove-bulk`,userIdList);
  }
  blastUser(appId,userIdList, data){
    return this.http.post<any>(`${this.baseApi}/app/${appId}/user/blast`,{userIdList:userIdList, data:data});
  }
  cognaClassify(cognaId: number, text: string, fromCogna: boolean, email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/classify`,{text: text, fromCogna: fromCogna, email:email});
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
  cognaPrompt(cognaId: number, prompt: string, fileList: string[], email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/prompt`,{prompt: prompt, fileList: fileList, email:email});
  }
  streamCognaPrompt(cognaId: number, prompt: string, fileList: string[], email: string): any {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/prompt-stream`,{prompt: prompt, fileList: fileList, email:email}, { responseType:'text', observe: 'events', reportProgress: true });
  }
  clearCognaMemoryByIdAndEmail(cognaId: any, email:string) {
    return this.http.post(`${this.baseApi}/cogna/${cognaId}/clear-by-email?email=${email}`, {});
  }

  uploadCognaFile(file: any, cognaId:number, filename:string): Observable<HttpEvent<any>> {
    let f = new FormData();
    const headers = new HttpHeaders({'ngsw-bypass':''})
    f.append('file',file, filename);
    const req = new HttpRequest('POST', `${this.baseApi}/cogna/${cognaId}/upload-file`,f, {
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
    return this.http.post<any>(`${this.baseApi}/entry/upload-file?bucketId=${bucketId}&appId=${appId}`,f);
  }
  removeBucketFile(id: any, email: any) {
    return this.http.post<any>(`${this.baseApi}/bucket/delete-file/${id}?email=${email}`,{})
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


  httpGet = (url, callback, error) => {
    let header = (url.indexOf(base) == -1) ? { 'clear': 'true' } : undefined;
    return this.http.get(url, { headers: header })
      .pipe(
        tap({ next: callback, error: error }), first()
      )
  }

  httpPost = (url, body, callback, error) => {
    let header = (url.indexOf(base) == -1) ? { 'clear': 'true' } : undefined;
    return this.http.post(url, body, { headers: header })
      .pipe(
        tap({ next: callback, error: error }), first()
      );
  }

  endpointGet = (code, appId, params, callback, error) => {
    return this.http.get(this.baseApi + `/endpoint/run/${appId}/${code}`, { params: params })
      .pipe(
        tap({ next: callback, error: error }), first()
      );
  }

  // liveSubscription: any[] = [];
  $live$ = (subs:any[], finalFn) =>({
    watch: (ch: any[], fn) => {
      ch.forEach(c => {
        subs.push(this.rxStompService.watch('/' + c)
          .pipe(
            map((msg:any) => msg.body),
            tap(()=>finalFn())
          )
          .subscribe(fn));
      })
    },
    publish: (ch: any[], msg) => {
      ch.forEach(c => {
        this.rxStompService.publish({
          destination: '/' + c,
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
    return this.http.post(`${this.baseApi}/bucket/${bucketId}/scan`, {},{ responseType:'text', observe: 'events', reportProgress: true });
  }

  bucketServerInfo(){
    return this.http.get(`${this.baseApi}/bucket/info`);
  }

}