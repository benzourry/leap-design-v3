import { Routes } from '@angular/router';
export const DESIGN_ROUTES: Routes = [
    { path: '', loadComponent: () => import('./design-home-new/design-home.component').then(m => m.DesignHomeComponent) },
    {
      path: ':appId', loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent),
      children: [
        { path: '', redirectTo:'ui', pathMatch:'full'},
        { path: 'ui', loadChildren: () => import('./editor/ui-editor/ui-editor.routes').then(m => m.UI_EDITOR_ROUTES)},
        { path: 'lookup', loadComponent: () => import('./editor/lookup-editor/lookup-editor.component').then(mod => mod.LookupEditorComponent) },
        { path: 'mailer', loadComponent: () => import('./editor/mailer-editor/mailer-editor.component').then(mod => mod.MailerEditorComponent) },
        { path: 'endpoint', loadComponent: () => import('./editor/endpoint-editor/endpoint-editor.component').then(mod => mod.EndpointEditorComponent) },
        { path: 'lambda', loadComponent: () => import('./editor/lambda-editor/lambda-editor.component').then(mod => mod.LambdaEditorComponent) },
        { path: 'cogna', loadComponent: () => import('./editor/cogna-editor/cogna-editor.component').then(mod => mod.CognaEditorComponent) },
        { path: 'user', loadComponent: () => import('./editor/group-editor/group-editor.component').then(mod => mod.GroupEditorComponent) },
        { path: 'bucket', loadComponent: () => import('./editor/bucket-manager/bucket-manager.component').then(mod => mod.BucketManagerComponent) },
        { path: 'krypta', loadComponent: () => import('./editor/krypta-editor/krypta-editor.component').then(mod => mod.KryptaEditorComponent) },
        { path: 'signa', loadComponent: () => import('./editor/signa-editor/signa-editor.component').then(mod => mod.SignaEditorComponent) },
        { path: 'summary', loadComponent: () => import('../admin/app-summary/app-summary.component').then(mod => mod.AppSummaryComponent), data:{platform:false} },
        { path: 'uml', loadComponent: () => import('../admin/uml-diagram/uml-diagram.component').then(mod => mod.UmlDiagramComponent), data:{platform:false} },
        { path: 'log', loadComponent: () => import('./editor/app-log/app-log.component').then(mod => mod.AppLogComponent) },
      ],
    },
  ];