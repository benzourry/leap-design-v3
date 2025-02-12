import { HttpClient } from '@angular/common/http';
import { Component, OnInit, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map, withLatestFrom } from 'rxjs';
import { base } from '../../_shared/constant.service';
// import { RunService } from '../../service/run.service';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { RunService } from '../_service/run.service';

@Component({
    selector: 'app-web',
    templateUrl: './web.component.html',
    styleUrls: ['./web.component.scss'],
    imports: [SafePipe]
})
export class WebComponent implements OnInit {

  constructor(private route: ActivatedRoute, private http: HttpClient, private titleService: Title, public runService: RunService) {

  }
  html: string = "";
  path = input<string>('', { alias: 'path' });
  ngOnInit(): void {

    this.titleService.setTitle(this.path())

    this.route.queryParams.subscribe(queryParams => {
      this.http.get(`${base}/~/${this.path()}/stream`, { params: queryParams, responseType: 'text', observe: 'events', reportProgress: true })
        .pipe(
          map(res => {
            if (res['type'] == 4) {
              this.html = res['body'];
            } else {
              if (res['partialText']) {
                this.html = res['partialText'];
              }
            }
          })
        )
        .subscribe({
          next: res => {
            
          },
          error: err => {

          }
        })
    })


    this.route.url.pipe(
      withLatestFrom(this.route.params, this.route.queryParams)
    ).subscribe(([url, params, queryParams]) => {

      this.http.get(`${base}/~/${params.path}/info`)
      .subscribe((res:any)=>{
        this.titleService.setTitle(res.name)
      })
      this.http.get(`${base}/~/${params.path}/stream`,{ params: queryParams, responseType:'text', observe: 'events', reportProgress: true })
      .pipe(
        map(res => {
          if (res['type']==4){
            this.html = res['body'];
          }else{
            if (res['partialText']){
              this.html = res['partialText'];
            }            
          }              
        })
      )
      .subscribe({
        next:res=>{
          // if (!res){
            // this.html = res['body'];
          // }
        },
        error:err=>{

        }
      })
    })


  }


}
