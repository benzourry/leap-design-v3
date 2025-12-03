import { Routes } from '@angular/router';
import { DesignHomeComponent } from './design-home/design-home.component';
import { EditorComponent } from './editor/editor.component';

export const DESIGN_ROUTES: Routes = [
    { path: '', component: DesignHomeComponent },
    {
      path: ':appId', component: EditorComponent ,
      children: [
        { path: '', redirectTo:'ui', pathMatch:'full'},
        { path: 'ui', loadChildren: () => import('./editor/ui-editor/ui-editor.routes').then(m => m.UI_EDITOR_ROUTES)},
        // { path: 'lookup', component: LookupEditorComponent },
        { path: 'lookup', loadComponent: () => import('./editor/lookup-editor/lookup-editor.component').then(mod => mod.LookupEditorComponent) },
        // { path: 'mailer', component: MailerEditorComponent },
        { path: 'mailer', loadComponent: () => import('./editor/mailer-editor/mailer-editor.component').then(mod => mod.MailerEditorComponent) },
        // { path: 'endpoint', component: EndpointEditorComponent },
        { path: 'endpoint', loadComponent: () => import('./editor/endpoint-editor/endpoint-editor.component').then(mod => mod.EndpointEditorComponent) },
        // { path: 'lambda', component: LambdaEditorComponent },
        { path: 'lambda', loadComponent: () => import('./editor/lambda-editor/lambda-editor.component').then(mod => mod.LambdaEditorComponent) },
        // { path: 'cogna', component: CognaEditorComponent },
        { path: 'cogna', loadComponent: () => import('./editor/cogna-editor/cogna-editor.component').then(mod => mod.CognaEditorComponent) },
        // { path: 'user', component: GroupEditorComponent },
        { path: 'user', loadComponent: () => import('./editor/group-editor/group-editor.component').then(mod => mod.GroupEditorComponent) },
        // { path: 'bucket', component: BucketManagerComponent },
        { path: 'bucket', loadComponent: () => import('./editor/bucket-manager/bucket-manager.component').then(mod => mod.BucketManagerComponent) },
        { path: 'krypta', loadComponent: () => import('./editor/krypta-editor/krypta-editor.component').then(mod => mod.KryptaEditorComponent) },
        { path: 'signa', loadComponent: () => import('./editor/signa-editor/signa-editor.component').then(mod => mod.SignaEditorComponent) },
        { path: 'summary', loadComponent: () => import('../admin/app-summary/app-summary.component').then(mod => mod.AppSummaryComponent), data:{platform:false} },
      ],
      // canActivate: [AuthGuardService]
    },
    // { path: ':appId/lookup', component: LookupEditorComponent },
    // { path: ':appId/mailer', component: MailerEditorComponent },
    // { path: ':appId/user', component: MailerEditorComponent },
  ];