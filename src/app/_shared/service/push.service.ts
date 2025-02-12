import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { baseApi } from '../../_shared/constant.service';

@Injectable({
  providedIn: 'root'
})
export class PushService {

  constructor(private http:HttpClient) { }

  baseApi = baseApi;

  getSubscription(userId: any): any {
    return this.http.get(`${this.baseApi}/push/subscription?userId=${userId}`);
  }

  subscribePush(userId:number,sub:any){
    //   console.log("p256dh:"+sub.getKey('p256dh'));
    return this.http.post(`${baseApi}/push/subscribe?userId=${userId}`,{
        userAgent: window.navigator.userAgent,
        endpoint:sub.endpoint,
        p256dh:sub.toJSON().keys.p256dh,
        auth:sub.toJSON().keys.auth
    });
  }
  
  checkPush(endpoint:string){
    return this.http.post(`${baseApi}/push/check`,{endpoint:endpoint});
  }
  
  unsubscribePush(endpoint:string){
    return this.http.post(`${baseApi}/push/unsubscribe`,{endpoint:endpoint});
  }
}
