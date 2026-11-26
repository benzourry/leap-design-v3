import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, InjectionToken, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../../_shared/service/toast-service';
import { toSnakeCase } from '../../../_shared/utils';
import { LambdaService } from '../../../service/lambda.service';

export interface EndpointEditData {
  id?: number;
  name?: string;
  code?: string;
  description?: string;
  method?: string;
  url?: string;
  auth?: boolean;
  authFlow?: string;
  clientId?: string;
  clientSecret?: string;
  tokenEndpoint?: string;
  tokenTo?: string;
  responseType?: string;
  headers?: string;
  email?: string;
  content?: string;
  enabled?: number;
}

export interface EndpointDialogData {
  appId: number;
  endpoint: EndpointEditData;
  endpoints: EndpointEditData[];
}

export const ENDPOINT_DIALOG_DATA = new InjectionToken<EndpointDialogData>('ENDPOINT_DIALOG_DATA');

@Component({
  selector: 'app-endpoint-edit-dialog',
  templateUrl: './endpoint-edit-dialog.component.html',
  styleUrls: ['../../../../assets/css/element-action.css'],
  imports: [FormsModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EndpointEditDialogComponent implements OnInit {
  private readonly data = inject(ENDPOINT_DIALOG_DATA);
  readonly editEndpointData = this.data.endpoint;
  readonly activeModal = inject(NgbActiveModal);
  readonly toSnakeCase = toSnakeCase;
  editCode = false;
  secretList: { key: string }[] = [];
  private readonly lambdaService = inject(LambdaService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit() {
    this.lambdaService.getSecretList(this.data.appId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (secrets: { key: string }[]) => { this.secretList = secrets; this.cdr.markForCheck(); },
      error: () => this.toastService.show('Unable to load secrets', { classname: 'bg-danger text-light' })
    });
  }

  itemExist(item: EndpointEditData): boolean {
    return !item.id && this.data.endpoints.some(endpoint => endpoint.code === item.code);
  }
}
