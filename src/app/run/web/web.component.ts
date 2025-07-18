import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map, withLatestFrom } from 'rxjs';
import { base } from '../../_shared/constant.service';
import { SafePipe } from '../../_shared/pipe/safe.pipe';
import { RunService } from '../_service/run.service';
import { MorphHtmlDirective } from '../../_shared/directive/morph-html.directive';

@Component({
    selector: 'app-web',
    templateUrl: './web.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./web.component.scss'],
    imports: [SafePipe, MorphHtmlDirective]
})
export class WebComponent implements OnInit {

  private route = inject(ActivatedRoute)
  private http = inject(HttpClient)
  private titleService = inject(Title)
  public runService = inject(RunService)
  constructor() {

  }
  html = signal<string>("");
  path = input<string>('', { alias: 'path' });
  ngOnInit(): void {

    this.titleService.setTitle(this.path())

    this.route.queryParams.subscribe(queryParams => {
      this.http.get(`${base}/~/${this.path()}/stream`, { params: queryParams, responseType: 'text', observe: 'events', reportProgress: true })
        .pipe(
          map(res => {
            if (res['type'] == 4) {
              this.html.set(res['body']);
            } else {
              if (res['partialText']) {
                this.html.set(res['partialText']);
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
            this.html.set(res['body']);
          }else{
            if (res['partialText']){
              this.html.set(res['partialText']);
            }            
          }              
        })
      )
      .subscribe({
        next:res=>{
        },
        error:err=>{
        }
      })
    })


  }


}
