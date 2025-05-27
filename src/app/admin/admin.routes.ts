import { Routes } from '@angular/router';
import { AppListComponent } from './app-list/app-list.component';
import { ConsoleComponent } from './console/console.component';
import { AdminHomeComponent } from './admin-home/admin-home.component';
import { AdminConfigComponent } from './admin-config/admin-config.component';

export const ADMIN_ROUTES: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: AdminHomeComponent },
    { path: 'config', component: AdminConfigComponent },
    { path: 'apps', component: AppListComponent },
    {
      path: 'apps/:appId', component: ConsoleComponent ,
      children: [
        { path: '', redirectTo:'summary', pathMatch:'full'},
        { path: 'summary', loadComponent: () => import('../admin/app-summary/app-summary.component').then(mod => mod.AppSummaryComponent), data:{platform:true}},
  
      ],
    },
    // {
    //   // path: ':appId/summary', loadComponent: () => import('../admin/app-summary/app-summary.component').then(mod => mod.AppSummaryComponent),
    //   // canActivate: [AuthGuardService]
    // },
  ];