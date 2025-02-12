import { Routes } from '@angular/router';
import { CreatorGuardService } from './_shared/service/auth-creator-guard.service';
import { DevProfileComponent } from './devprofile/devprofile.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    // { path: 'callback', component: CallbackComponent },
    { path: '', component: HomeComponent,
      children: [
        { path: '', redirectTo:'design', pathMatch:'full'},
        { path: 'devprofile', component: DevProfileComponent },
        { path: 'run',    loadChildren: () => import('./run/run.routes').then(m => m.RUN_ROUTES) },
        { path: 'repo',    loadChildren: () => import('./repo/repo.routes').then(m => m.REPO_ROUTES) },
        { path: 'design', loadChildren: () => import('./design/design.routes').then(m => m.DESIGN_ROUTES) },
  
      ],
      canActivate: [CreatorGuardService]
    }
    // { path: 'run', loadChildren: './run/run.module#RunModule' }
  ];
