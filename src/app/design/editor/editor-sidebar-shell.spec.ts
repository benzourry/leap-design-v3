import { provideHttpClient } from '@angular/common/http';
import { CdkDragMove } from '@angular/cdk/drag-drop';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NEVER, of } from 'rxjs';
import { SharedModule } from '../../_shared/shared.module';
import { SplitPaneComponent } from '../../_shared/component/split-pane/split-pane.component';
import { LoadingService } from '../../_shared/service/loading.service';
import { UserService } from '../../_shared/service/user.service';
import { UtilityService } from '../../_shared/service/utility.service';
import { LookupService } from '../../run/_service/lookup.service';
import { AppService } from '../../service/app.service';
import { CognaService } from '../../service/cogna.service';
import { GroupService } from '../../service/group.service';
import { LambdaService } from '../../service/lambda.service';
import { AssistantStatusService } from './assistant/assistant-status.service';
import { EditorSearchService } from './editor-search.service';
import { EditorComponent } from './editor.component';
import { UiEditorComponent } from './ui-editor/ui-editor.component';
import { UiSidebarComponent } from './ui-editor/ui-sidebar.component';
import { LambdaSidebarComponent } from './lambda-editor/lambda-sidebar.component';
import { CognaSidebarComponent } from './cogna-editor/cogna-sidebar.component';

@Component({ template: '<input aria-label="Draft" [value]="draft" (input)="draft = $any($event.target).value">' })
class LambdaWorkspaceStub {
  draft = 'unsaved';
  readonly timeWarp = signal(false);
  get isTimeWarping() { return this.timeWarp(); }
}

@Component({ template: '' })
class CognaWorkspaceStub {
  readonly timeWarp = signal(false);
  get isTimeWarpingCogna() { return this.timeWarp(); }
}

@Component({ template: '' })
class WorkspaceStub {}

describe('Editor sidebar shell', () => {
  beforeEach(async () => {
    const user = { email: 'creator@example.test', manager: true };
    const creators = jasmine.createSpy('getCreator').and.returnValues(of(user), NEVER);
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{
          path: 'design/:appId', component: EditorComponent,
          children: [
            { path: '', redirectTo: 'ui/form', pathMatch: 'full' },
            { path: 'lambda', component: LambdaWorkspaceStub },
            { path: 'cogna', component: CognaWorkspaceStub },
            { path: 'lookup', component: WorkspaceStub },
            {
              path: 'ui', component: UiEditorComponent,
              children: [
                { path: 'form', component: WorkspaceStub },
                { path: 'dataset', component: WorkspaceStub }
              ]
            },
            { path: 'summary', component: WorkspaceStub },
            { path: 'uml', component: WorkspaceStub },
            { path: 'log', component: WorkspaceStub }
          ]
        }]),
        { provide: UserService, useValue: { getCreator: creators } },
        { provide: AppService, useValue: {
          getApp: () => of({ id: 1, title: 'App', email: [user.email] }),
          getCopyRequestList: () => of({ content: [] })
        } },
        { provide: UtilityService, useValue: { testOnline$: () => of(true) } },
        { provide: LoadingService, useValue: { isLoadingSignal: signal(false) } },
        { provide: AssistantStatusService, useValue: { available: signal(false), check: () => {} } },
        { provide: LookupService, useValue: { getLookupList: () => of({ content: [], page: { totalElements: 0 } }) } },
        { provide: LambdaService, useValue: { getLambdaList: () => of({ content: [], page: { totalElements: 0 } }) } },
        { provide: CognaService, useValue: { getCognaList: () => of({ content: [], page: { totalElements: 0 } }) } },
        { provide: GroupService, useValue: { getGroupList: () => of({ content: [] }) } }
      ]
    }).overrideComponent(EditorComponent, {
      set: { providers: [{ provide: EditorSearchService, useValue: { items: signal([]), load: () => {} } }] }
    }).compileComponents();
    new SharedModule(TestBed.inject(FaIconLibrary));
  });

  it('keeps the Lambda instance and draft while browsing, then navigates on dataset selection', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/lambda?id=4', EditorComponent);
    const lambda = harness.routeDebugElement!.query(By.directive(LambdaWorkspaceStub)).componentInstance as LambdaWorkspaceStub;
    const host = harness.routeNativeElement as HTMLElement;
    const outlet = host.querySelector('router-outlet');
    const button = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    lambda.draft = 'unsaved edits';
    button('Lookup').click();
    harness.detectChanges();
    button('UI').click();
    harness.detectChanges();
    const sidebar = harness.routeDebugElement!.query(By.directive(UiSidebarComponent)).componentInstance as UiSidebarComponent;
    sidebar.app = { id: 1 };
    sidebar.user = { email: 'creator@example.test' };
    sidebar.editableDatasets = [{ id: 42, title: 'Dataset' }];
    harness.detectChanges();
    host.querySelector<HTMLButtonElement>('#ui-dataset .accordion-button')!.click();
    harness.detectChanges();
    expect(editor.selectedSidebar()).toBe('ui');
    expect(TestBed.inject(Router).url).toBe('/design/1/lambda?id=4');
    expect(harness.routeDebugElement!.query(By.directive(LambdaWorkspaceStub)).componentInstance).toBe(lambda);
    expect(lambda.draft).toBe('unsaved edits');
    expect(host.querySelector('router-outlet')).toBe(outlet);
    host.querySelector<HTMLAnchorElement>('#ui-dataset a[title="Dataset - 42"]')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/design/1/ui/dataset?id=42');
    expect(editor.selectedSidebar()).toBe('ui');
  });

  it('synchronizes route changes and shows full-width pages until a rail button is clicked', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/summary', EditorComponent);
    const host = harness.routeNativeElement as HTMLElement;
    const outlet = host.querySelector('router-outlet');
    const sidebar = host.querySelector<HTMLElement>('[sidebar]')!;
    expect(editor.selectedSidebar()).toBeNull();
    expect(sidebar.hidden).toBeTrue();
    expect(host.querySelector('.resize-handle')).toBeNull();
    host.querySelector<HTMLButtonElement>('button[aria-label="Lookup"]')!.click();
    harness.detectChanges();
    expect(editor.selectedSidebar()).toBe('lookup');
    expect(sidebar.hidden).toBeFalse();
    expect(host.querySelector('router-outlet')).toBe(outlet);
    expect(TestBed.inject(Router).url).toBe('/design/1/summary');
    await TestBed.inject(Router).navigateByUrl('/design/1/uml');
    harness.detectChanges();
    expect(editor.selectedSidebar()).toBeNull();
    await TestBed.inject(Router).navigateByUrl('/design/1/lookup?id=3');
    harness.detectChanges();
    expect(editor.selectedSidebar()).toBe('lookup');
    await TestBed.inject(Router).navigateByUrl('/design/1/log');
    harness.detectChanges();
    expect(editor.selectedSidebar()).toBeNull();
  });

  it('retains the resized sidebar and single handle across sidebar switches and full-width routes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/design/1/lambda?id=4', EditorComponent);
    harness.detectChanges();
    const host = harness.routeNativeElement as HTMLElement;
    const sidebar = host.querySelector<HTMLElement>('[sidebar]')!;
    const splitPane = harness.routeDebugElement!.query(By.directive(SplitPaneComponent)).componentInstance as SplitPaneComponent;
    expect(splitPane.sidebar()?.nativeElement).toBe(sidebar);
    splitPane.sidebarResize({ pointerPosition: { x: 146, y: 0 } } as CdkDragMove);
    expect(sidebar.style.maxWidth).toBe('100px');
    host.querySelector<HTMLButtonElement>('button[aria-label="Lookup"]')!.click();
    harness.detectChanges();
    expect(sidebar.style.maxWidth).toBe('100px');
    expect(host.querySelectorAll('.resize-handle').length).toBe(1);
    await TestBed.inject(Router).navigateByUrl('/design/1/summary');
    harness.detectChanges();
    expect(host.querySelectorAll('.resize-handle').length).toBe(0);
    host.querySelector<HTMLButtonElement>('button[aria-label="Lookup"]')!.click();
    harness.detectChanges();
    expect(sidebar.style.maxWidth).toBe('100px');
    expect(host.querySelectorAll('.resize-handle').length).toBe(1);
  });

  it('updates TimeWarp creation guards after asynchronous workspace changes and sidebar switches', async () => {
    const harness = await RouterTestingHarness.create();
    const editor = await harness.navigateByUrl('/design/1/lambda?id=4', EditorComponent);
    harness.detectChanges();
    const host = harness.routeNativeElement as HTMLElement;
    const lambda = harness.routeDebugElement!.query(By.directive(LambdaWorkspaceStub)).componentInstance as LambdaWorkspaceStub;
    expect(editor.selectedSidebar()).toBe('lambda');
    await Promise.resolve().then(() => lambda.timeWarp.set(true));
    await harness.fixture.whenStable();
    expect((harness.routeDebugElement!.query(By.directive(LambdaSidebarComponent)).componentInstance as LambdaSidebarComponent).timeWarping()).toBeTrue();
    host.querySelector<HTMLButtonElement>('button[aria-label="Lookup"]')!.click();
    harness.detectChanges();
    host.querySelector<HTMLButtonElement>('button[aria-label="Lambda"]')!.click();
    harness.detectChanges();
    expect((harness.routeDebugElement!.query(By.directive(LambdaSidebarComponent)).componentInstance as LambdaSidebarComponent).timeWarping()).toBeTrue();
    lambda.timeWarp.set(false);
    await harness.fixture.whenStable();
    expect((harness.routeDebugElement!.query(By.directive(LambdaSidebarComponent)).componentInstance as LambdaSidebarComponent).timeWarping()).toBeFalse();

    await TestBed.inject(Router).navigateByUrl('/design/1/cogna?id=2');
    harness.detectChanges();
    const cogna = harness.routeDebugElement!.query(By.directive(CognaWorkspaceStub)).componentInstance as CognaWorkspaceStub;
    await Promise.resolve().then(() => cogna.timeWarp.set(true));
    await harness.fixture.whenStable();
    expect((harness.routeDebugElement!.query(By.directive(CognaSidebarComponent)).componentInstance as CognaSidebarComponent).timeWarping()).toBeTrue();
    cogna.timeWarp.set(false);
    await harness.fixture.whenStable();
    expect((harness.routeDebugElement!.query(By.directive(CognaSidebarComponent)).componentInstance as CognaSidebarComponent).timeWarping()).toBeFalse();
  });
});
