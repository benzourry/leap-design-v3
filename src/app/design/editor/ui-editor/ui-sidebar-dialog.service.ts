import { ChangeDetectionStrategy, Component, Injectable, InjectionToken, Injector, inject } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CloneDashboardComponent } from '../../../_shared/modal/clone-dashboard/clone-dashboard.component';
import { CloneDatasetComponent } from '../../../_shared/modal/clone-dataset/clone-dataset.component';
import { CloneFormComponent } from '../../../_shared/modal/clone-form/clone-form.component';
import { CloneScreenComponent } from '../../../_shared/modal/clone-screen/clone-screen.component';
import { EditDashboardComponent } from '../../../_shared/modal/edit-dashboard/edit-dashboard.component';
import { EditDatasetComponent } from '../../../_shared/modal/edit-dataset/edit-dataset.component';
import { EditFormComponent } from '../../../_shared/modal/edit-form/edit-form.component';
import { EditScreenComponent } from '../../../_shared/modal/edit-screen/edit-screen.component';

export type UiEntityKind = 'form' | 'dataset' | 'dashboard' | 'screen';

export interface UiSidebarDialogContext {
  appId: number;
  app: unknown;
  user: unknown;
  otherAppList: unknown[];
  formList: unknown[];
  datasetList: unknown[];
  walletList: unknown[];
  accessList: unknown[];
  cognaList: unknown[];
  bucketList: unknown[];
}

interface UiSidebarDialogData {
  kind: UiEntityKind;
  mode: 'clone' | 'edit';
  context: UiSidebarDialogContext;
  entity?: unknown;
}

const UI_SIDEBAR_DIALOG_DATA = new InjectionToken<UiSidebarDialogData>('UI_SIDEBAR_DIALOG_DATA');

@Component({
  imports: [CloneFormComponent, CloneDatasetComponent, CloneDashboardComponent, CloneScreenComponent,
    EditFormComponent, EditDatasetComponent, EditDashboardComponent, EditScreenComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data.mode === 'clone') {
      @switch (data.kind) {
        @case ('form') {
          <app-clone-form [dismiss]="dismiss" [close]="close" [appId]="data.context.appId"
            [appList]="data.context.otherAppList" [data]="cloneData"></app-clone-form>
        }
        @case ('dataset') {
          <app-clone-dataset [dismiss]="dismiss" [close]="close" [appId]="data.context.appId"
            [appList]="data.context.otherAppList" [data]="cloneData"></app-clone-dataset>
        }
        @case ('dashboard') {
          <app-clone-dashboard [dismiss]="dismiss" [close]="close" [appId]="data.context.appId"
            [appList]="data.context.otherAppList" [data]="cloneData"></app-clone-dashboard>
        }
        @case ('screen') {
          <app-clone-screen [dismiss]="dismiss" [close]="close" [appId]="data.context.appId"
            [appList]="data.context.otherAppList" [data]="cloneData"></app-clone-screen>
        }
      }
    } @else {
      @switch (data.kind) {
        @case ('form') {
          <app-edit-form [dismiss]="dismiss" [close]="close" [app]="data.context.app" [user]="data.context.user"
            [form]="data.entity" [formList]="data.context.formList" [walletList]="data.context.walletList"
            [accessList]="data.context.accessList"></app-edit-form>
        }
        @case ('dataset') {
          <app-edit-dataset [dismiss]="dismiss" [close]="close" [dataset]="data.entity"
            [appList]="data.context.otherAppList" [app]="data.context.app" [user]="data.context.user"
            [accessList]="data.context.accessList"></app-edit-dataset>
        }
        @case ('dashboard') {
          <app-edit-dashboard [dismiss]="dismiss" [close]="close" [dashboard]="data.entity"
            [accessList]="data.context.accessList"></app-edit-dashboard>
        }
        @case ('screen') {
          <app-edit-screen [dismiss]="dismiss" [close]="close" [screen]="data.entity" [formList]="data.context.formList"
            [datasetList]="data.context.datasetList" [cognaList]="data.context.cognaList"
            [bucketList]="data.context.bucketList" [accessList]="data.context.accessList"></app-edit-screen>
        }
      }
    }
  `
})
export class UiSidebarDialogComponent {
  readonly data = inject(UI_SIDEBAR_DIALOG_DATA);
  readonly cloneData = { appId: this.data.context.appId };
  private readonly modal = inject(NgbActiveModal);
  readonly dismiss = () => this.modal.dismiss();
  readonly close = (data: unknown) => this.modal.close(data);
}

@Injectable({ providedIn: 'root' })
export class UiSidebarDialogService {
  private readonly modal = inject(NgbModal);
  private readonly injector = inject(Injector);

  openClone(kind: UiEntityKind, context: UiSidebarDialogContext): Promise<Record<string, string | number>> {
    return this.open<Record<string, string | number>>({ kind, mode: 'clone', context });
  }

  openEdit(kind: UiEntityKind, context: UiSidebarDialogContext, entity: unknown): Promise<unknown> {
    return this.open({ kind, mode: 'edit', context, entity });
  }

  private open<T>(data: UiSidebarDialogData): Promise<T> {
    history.pushState(null, null, window.location.href);
    const injector = Injector.create({
      parent: this.injector,
      providers: [{ provide: UI_SIDEBAR_DIALOG_DATA, useValue: data }]
    });
    const size = data.mode === 'edit' && data.kind === 'form' ? 'lg' : undefined;
    return this.modal.open(UiSidebarDialogComponent, { backdrop: 'static', size, injector }).result;
  }
}
