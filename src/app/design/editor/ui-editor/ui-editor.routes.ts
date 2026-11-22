import { Routes } from "@angular/router";
import { CreatorGuardService } from "../../../_shared/service/auth-creator-guard.service";
export const UI_EDITOR_ROUTES: Routes = [
    {
      path: '', loadComponent: () => import('./ui-editor.component').then(m => m.UiEditorComponent),
      children: [
        { path: '', redirectTo:'form', pathMatch:'full'},
        { path: 'form', loadComponent: () => import('./form-editor/form-editor.component').then(m => m.FormEditorComponent) },
        { path: 'dataset', loadComponent: () => import('./dataset-editor/dataset-editor.component').then(mod => mod.DatasetEditorComponent) },
        { path: 'dashboard', loadComponent: () => import('./dashboard-editor/dashboard-editor.component').then(mod => mod.DashboardEditorComponent) },
        { path: 'navi', loadComponent: () => import('./navi/navi.component').then(mod => mod.NaviComponent) },
        { path: 'screen', loadComponent: () => import('./screen-editor/screen-editor.component').then(mod => mod.ScreenEditorComponent)},
        { path: 'restore', loadComponent: () => import('./restore-manager/restore-manager.component').then(mod => mod.RestoreManagerComponent) },
        { path: 'key', loadComponent: () => import('./key-manager/key-manager.component').then(mod => mod.KeyManagerComponent) },
        
        { path: 'signin', loadComponent: () => import('./custom-signin-manager/custom-signin-manager.component').then(mod => mod.CustomSigninManagerComponent) },
  
      ],
      canActivate: [CreatorGuardService]
    }
  ];