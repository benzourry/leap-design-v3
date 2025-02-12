import { Routes } from "@angular/router";
import { CreatorGuardService } from "../../../_shared/service/auth-creator-guard.service";
// import { DashboardEditorComponent } from "./dashboard-editor/dashboard-editor.component";
// import { DatasetEditorComponent } from "./dataset-editor/dataset-editor.component";
import { FormEditorComponent } from "./form-editor/form-editor.component";
// import { NaviComponent } from "./navi/navi.component";
// import { RestoreManagerComponent } from "./restore-manager/restore-manager.component";
// import { ScreenEditorComponent } from "./screen-editor/screen-editor.component";
import { UiEditorComponent } from "./ui-editor.component";

export const UI_EDITOR_ROUTES: Routes = [
    {
      path: '', component: UiEditorComponent,
      children: [
        { path: '', redirectTo:'form', pathMatch:'full'},
        { path: 'form', component: FormEditorComponent },
        // { path: 'dataset', component: DatasetEditorComponent },
        { path: 'dataset', loadComponent: () => import('./dataset-editor/dataset-editor.component').then(mod => mod.DatasetEditorComponent) },
        // { path: 'dashboard', component: DashboardEditorComponent },
        { path: 'dashboard', loadComponent: () => import('./dashboard-editor/dashboard-editor.component').then(mod => mod.DashboardEditorComponent) },
        // { path: 'navi', component: NaviComponent },
        { path: 'navi', loadComponent: () => import('./navi/navi.component').then(mod => mod.NaviComponent) },
        // { path: 'screen', component: ScreenEditorComponent },
        { path: 'screen', loadComponent: () => import('./screen-editor/screen-editor.component').then(mod => mod.ScreenEditorComponent)},
        // { path: 'restore', component: RestoreManagerComponent },
        { path: 'restore', loadComponent: () => import('./restore-manager/restore-manager.component').then(mod => mod.RestoreManagerComponent) },
        // { path: 'restore', component: RestoreManagerComponent },
        { path: 'key', loadComponent: () => import('./key-manager/key-manager.component').then(mod => mod.KeyManagerComponent) },
  
      ],
      canActivate: [CreatorGuardService]
    }
  ];