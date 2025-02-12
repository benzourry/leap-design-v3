import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, RouterOutlet } from '@angular/router';
import { base, baseApi, domainBase, domainRegex } from '../../_shared/constant.service';
import { UserService } from '../../_shared/service/user.service';
import { RunService } from '../_service/run.service';
import { JsonPipe } from '@angular/common';

@Component({
    selector: 'app-headless',
    templateUrl: './headless.component.html',
    styleUrls: ['./headless.component.scss'],
    imports: [RouterOutlet, JsonPipe]
})
export class HeadlessComponent implements OnInit {

  appLoading: boolean;
  validPath: boolean;
  baseApi = baseApi;
  base = base;

  constructor(private userService: UserService, 
    public runService: RunService, private route: ActivatedRoute) { }

  user: any;
  app: any;

  preurl: string = '';
  appId: number;

  ngOnInit() {

    // this.accessToken = this.userService.getToken();

    this.userService.getUser()
      .subscribe((user) => {
        this.user = user;
        this.runService.$user.set(this.user);

        this.route.params
          .subscribe((params: Params) => {
            // this.$param$ = params;
            this.appId = params['appId'];
            if (this.appId) {
              this.preurl = `/run/${this.appId}`;
              this.runService.$preurl.set(this.preurl);
              this.getApp(this.appId);

            } else {
              this.getAppByPath(this.getPath());
            }
            this.baseUrl = (location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '')) + '/#' + this.preurl;
          });
      })

  }

  getPath() {
    if (window.location.host.indexOf(domainBase) > -1) {
      return 'path:' + window.location.host.match(domainRegex)[1];
    } else {
      return 'domain:' + window.location.hostname;
    }
  }

  getAppByPath(path) {
    this.appLoading = true;
    this.runService.getAppByPath(path, { email: this.user.email })
      .subscribe({
        next: (res) => {
          if (res) {
            this.validPath = true;
            this.app = res;
            this.runService.$app.set(this.app);
            this.appLoading = false;
          } else {
            this.validPath = false;
          }
        },
        error: () => {
          this.validPath = false;
          this.appLoading = false;
        }
      });
  }

  getApp(id) {
    this.appLoading = true;
    this.runService.getApp(id, { email: this.user.email })
      .subscribe({
        next: (res) => {
          this.app = res;
          this.runService.$app.set(this.app);   
          this.appLoading = false;
        },
        error: () => this.appLoading = false
      })
  }

  baseUrl: string = '';

}
