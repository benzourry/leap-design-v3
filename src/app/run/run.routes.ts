import { Routes } from "@angular/router";
import { AuthGuardService } from "../_shared/service/auth-guard.service";
import { CanDeactivateGuard } from "../_shared/service/can-deactivate-guard.service";
import { HeadlessComponent } from "./headless/headless.component";
import { RegisterComponent } from "./register/register.component";
import { StartComponent } from "./start/start.component";
import { TilesComponent } from "./tiles/tiles.component";
import { WebComponent } from "./web/web.component";


export const RUN_ROUTES: Routes = [
    // { path: '', component: RunHomeComponent },
    
    { path: ':appId/register', component: RegisterComponent },
    {
      path: ':appId', component: StartComponent,
      children: [
        { path: 'form/:formId/view', loadComponent: () => import('./view/view-web.component').then(mod => mod.ViewWebComponent) },
        { path: 'form/:formId/view-single', loadComponent: () => import('./view/view-web.component').then(mod => mod.ViewWebComponent) },// Normally, used /view above. But buildGo use /view-single
        { path: 'form/:formId/:action', loadComponent: () => import('./form/form-web.component').then(mod => mod.FormWebComponent), canDeactivate: [CanDeactivateGuard] },
        { path: 'dataset/:datasetId', loadComponent: () => import('./list/list-web.component').then(mod => mod.ListWebComponent) },
        { path: 'dataset/:datasetId/:page', loadComponent: () => import('./list/list-web.component').then(mod => mod.ListWebComponent) },
        { path: 'dashboard/:dashboardId', loadComponent: () => import('./dashboard/dashboard-web.component').then(mod => mod.DashboardWebComponent) },
        { path: 'screen/:screenId', loadComponent: () => import('./screen/screen-web.component').then(mod => mod.ScreenWebComponent) },
        { path: 'lookup/:lookupId', loadComponent: () => import('./lookup/lookup.component').then(mod => mod.LookupComponent) },
        { path: 'user', loadComponent: () => import('./user/user.component').then(mod => mod.UserComponent) },
        { path: 'user/:groupId', loadComponent: () => import('./user/user.component').then(mod => mod.UserComponent) },
        { path: 'profile', loadComponent: () => import('./profile/profile.component').then(mod => mod.ProfileComponent)},
        { path: 'start', loadComponent: () => import('./tiles/tiles.component').then(mod => mod.TilesComponent)},
        { path: 'path/:encodedUrl', redirectTo: ({params})=>{
          // const router: Router = inject(Router);
            // console.log(urlInfo);
            let decodedUrl = atob(decodeURIComponent(params.encodedUrl));
            // console.log(decodedUrl);
            // var urlTree = router.parseUrl(decodedUrl)
            // console.log(urlTree)
            // router.parseUrl(decodedUrl)
            // return decodedUrl;
            // router.navigate(urlTree)
            return decodedUrl;
            // return 'start';// {fragment:'form/2956/prev', queryParams:{entryId:'107240'}}; 
          }
        },
  
      ],
      canActivate: [AuthGuardService]
    },{      
      path: ':appId/embed', component: HeadlessComponent,
      children: [
        { path: '', component: TilesComponent },
        { path: 'form/:formId/view', loadComponent: () => import('./view/view-web.component').then(mod => mod.ViewWebComponent) },
        { path: 'form/:formId/view-single', loadComponent: () => import('./view/view-web.component').then(mod => mod.ViewWebComponent) },// Normally, used /view above. But buildGo use /view-single
        { path: 'form/:formId/:action', loadComponent: () => import('./form/form-web.component').then(mod => mod.FormWebComponent), canDeactivate: [CanDeactivateGuard] },
        { path: 'dataset/:datasetId', loadComponent: () => import('./list/list-web.component').then(mod => mod.ListWebComponent) },
        { path: 'dataset/:datasetId/:page', loadComponent: () => import('./list/list-web.component').then(mod => mod.ListWebComponent) },
        { path: 'dashboard/:dashboardId', loadComponent: () => import('./dashboard/dashboard-web.component').then(mod => mod.DashboardWebComponent) },
        { path: 'screen/:screenId', loadComponent: () => import('./screen/screen-web.component').then(mod => mod.ScreenWebComponent) },
        { path: 'lookup/:lookupId', loadComponent: () => import('./lookup/lookup.component').then(mod => mod.LookupComponent) },
        { path: 'user', loadComponent: () => import('./user/user.component').then(mod => mod.UserComponent) },
        { path: 'user/:groupId', loadComponent: () => import('./user/user.component').then(mod => mod.UserComponent) },
        { path: 'profile', loadComponent: () => import('./profile/profile.component').then(mod => mod.ProfileComponent)},
        { path: 'start', component: TilesComponent}
  
      ],
      canActivate: [AuthGuardService]
    },{
      path: ':appId/web/:path', component: WebComponent
    }
  
  ];