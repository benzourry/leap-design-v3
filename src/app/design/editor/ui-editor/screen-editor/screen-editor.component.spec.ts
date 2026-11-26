import { TemplateRef, ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { NEVER } from 'rxjs';
import { SharedModule } from '../../../../_shared/shared.module';
import { CommService } from '../../../../_shared/service/comm.service';
import { ToastService } from '../../../../_shared/service/toast-service';
import { UserService } from '../../../../_shared/service/user.service';
import { EntryService } from '../../../../run/_service/entry.service';
import { LookupService } from '../../../../run/_service/lookup.service';
import { AppService } from '../../../../service/app.service';
import { BucketService } from '../../../../service/bucket.service';
import { CognaService } from '../../../../service/cogna.service';
import { DashboardService } from '../../../../service/dashboard.service';
import { DatasetService } from '../../../../service/dataset.service';
import { FormService } from '../../../../service/form.service';
import { GroupService } from '../../../../service/group.service';
import { MetaTrailService } from '../../../../service/metatrail.service';
import { ScreenService } from '../../../../service/screen.service';
import { AssistantLocalContextService } from '../../assistant/assistant-local-context.service';
import { AssistantSidePanelService } from '../../assistant/assistant-side-panel.service';
import { ScreenEditorComponent } from './screen-editor.component';

describe('ScreenEditorComponent palette', () => {
  let component: ScreenEditorComponent;
  let fixture: ComponentFixture<ScreenEditorComponent>;
  let registerPalette: jasmine.Spy;
  const form = {
    id: 11,
    items: {
      date: { code: 'date', label: 'Date', type: 'date' },
      static: { code: 'static', label: 'Static', type: 'static' },
    },
    prev: { items: { old: { code: 'old', label: 'Old', type: 'text' } } },
    sections: [{ id: 3, code: 'rows', title: 'Rows', type: 'list', items: [{ code: 'date' }] }],
  };

  beforeEach(() => {
    registerPalette = jasmine.createSpy('registerPalette');
    TestBed.configureTestingModule({
      imports: [ScreenEditorComponent],
      providers: [
        ...[ScreenService, GroupService, EntryService, NgbModal, FormService, DatasetService,
          DashboardService, CognaService, BucketService, LookupService, ActivatedRoute, AppService,
          MetaTrailService].map(provide => ({ provide, useValue: {} })),
        { provide: UserService, useValue: { getCreator: () => NEVER } },
        { provide: CommService, useValue: { changeEmitted$: NEVER } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
        { provide: AssistantLocalContextService, useValue: { createRegistration: () => ({ clear() {}, set() {} }) } },
        { provide: AssistantSidePanelService, useValue: { registerPalette, unregisterPalette() {}, collapseForPaletteDrag() {} } },
      ],
    });
    new SharedModule(TestBed.inject(FaIconLibrary));
    fixture = TestBed.createComponent(ScreenEditorComponent);
    component = fixture.componentInstance;
    component.form = form;
    component.curScreen = {
      id: 1, title: 'Screen', type: 'list', form, dataset: { id: 20, form },
      data: { content: '', pretext: '', posttext: '' },
      actions: [{ id: 5, label: 'Open' }],
    };
  });

  function snippets() {
    return component.snippetGroups.flatMap(group => group.items);
  }

  it('limits list variables and loops to content but keeps actions in pre and post', () => {
    expect(snippets().map(item => item.text)).toEqual([
      '{{$.date|date}}', '{{$prev$.old}}',
      component.getLoopCode(form.sections[0]), "{{$go['5']}}",
    ]);
    component.activeEditorTab = 'pre';
    expect(snippets().map(item => item.text)).toEqual(["{{$go['5']}}"]);
    component.activeEditorTab = 'post';
    expect(snippets().map(item => item.text)).toEqual(["{{$go['5']}}"]);
    component.activeEditorTab = 'init';
    expect(snippets()).toEqual([]);
  });

  it('offers entry variables and loops in content, pre and post', () => {
    component.curScreen.type = 'page';
    for (const tab of ['content', 'pre', 'post']) {
      component.activeEditorTab = tab;
      expect(snippets().map(item => item.group)).toEqual([
        'Variables', 'Previous variables', 'List sections', 'Actions',
      ]);
    }
  });

  it('offers dataset variables in calendar and map template editors only', () => {
    for (const type of ['calendar', 'map']) {
      component.curScreen.type = type;
      component.activeEditorTab = 'content';
      expect(snippets().some(item => item.text === '{{$.date|date}}')).toBeTrue();
      component.activeEditorTab = 'pre';
      expect(snippets().map(item => item.group)).toEqual(['Actions']);
    }
  });

  it('filters snippets and does not use sections from a different form', () => {
    component.form = { ...form, id: 99 };
    expect(snippets().some(item => item.group === 'List sections')).toBeFalse();
    component.snippetFilter = 'old';
    expect(snippets().map(item => item.text)).toEqual(['{{$prev$.old}}']);
  });

  it('keeps the Combined screen component palette registered', () => {
    component.curScreen.type = 'combine';
    component.palettes = [{ title: 'Dataset', type: 'dataset' }];
    fixture.detectChanges();
    expect(registerPalette).toHaveBeenCalled();
    expect(component.paletteItems.map(item => item.title)).toEqual(['Dataset']);
  });

  it('updates the displayed palette when switching from list content to pre', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.var-ph-picker')).toBeNull();
    const template = registerPalette.calls.mostRecent().args[1] as TemplateRef<unknown>;
    const view = fixture.componentRef.injector.get(ViewContainerRef).createEmbeddedView(template);
    view.detectChanges();
    const palette = view.rootNodes.find(node => node instanceof HTMLElement) as HTMLElement;
    expect(palette.textContent).toContain('Date');
    expect(palette.textContent).toContain('Open');
    const preTab = Array.from(fixture.nativeElement.querySelectorAll('a[ngbnavlink]') as NodeListOf<HTMLElement>)
      .find(link => link.textContent.trim() === 'Pre');
    preTab.click();
    fixture.detectChanges();
    view.detectChanges();
    expect(fixture.nativeElement.querySelector('.var-ph-picker')).toBeNull();
    expect(palette.textContent).not.toContain('Date');
    expect(palette.textContent).toContain('Open');
    const postTab = Array.from(fixture.nativeElement.querySelectorAll('a[ngbnavlink]') as NodeListOf<HTMLElement>)
      .find(link => link.textContent.trim() === 'Post');
    postTab.click();
    fixture.detectChanges();
    view.detectChanges();
    expect(fixture.nativeElement.querySelector('.var-ph-picker')).toBeNull();
    expect(palette.textContent).toContain('Open');
    view.destroy();
  });

  for (const [type, target] of [
    ['page', 'content'], ['static', 'content'], ['calendar', 'calendar'], ['map', 'map'],
  ]) {
    it(`keeps the ${type} editor without its inline picker`, () => {
      component.curScreen.type = type;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(`[data-snippet-target="${target}"]`)).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.var-ph-picker')).toBeNull();
    });
  }

  it('inserts into CodeMirror and blocks insertion during TimeWarp', async () => {
    fixture.detectChanges();
    fixture.detectChanges();
    await fixture.whenStable();
    const item = snippets()[0];
    component.insertPaletteSnippet(item);
    expect(component.codeeditor().editor.state.doc.toString()).toBe('{{$.date|date}}');
    expect(component.curScreenForm().dirty).toBeTrue();
    expect(component.curScreen.data.content).toBe('{{$.date|date}}');
    component.isTimeWarping = true;
    component.insertPaletteSnippet(item);
    expect(component.codeeditor().editor.state.doc.toString()).toBe('{{$.date|date}}');
  });

  it('drops actions into the editor and rejects list variables in pre', () => {
    fixture.detectChanges();
    fixture.detectChanges();
    const variable = snippets()[0];
    const action = snippets().find(item => item.kind === 'action');
    const transfer = new DataTransfer();
    component.startSnippetDrag(new DragEvent('dragstart', { dataTransfer: transfer }), action);
    const content = fixture.nativeElement.querySelector('[data-snippet-target="content"] .cm-content') as HTMLElement;
    const bounds = content.getBoundingClientRect();
    content.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: transfer, clientX: bounds.left + 5, clientY: bounds.top + 5,
    }));
    expect(component.codeeditor().editor.state.doc.toString()).toBe("{{$go['5']}}");

    const preTab = Array.from(fixture.nativeElement.querySelectorAll('a[ngbnavlink]') as NodeListOf<HTMLElement>)
      .find(link => link.textContent.trim() === 'Pre');
    preTab.click();
    fixture.detectChanges();
    component.startSnippetDrag(new DragEvent('dragstart', { dataTransfer: transfer }), variable);
    const pre = fixture.nativeElement.querySelector('[data-snippet-target="pre"] .cm-content') as HTMLElement;
    const preBounds = pre.getBoundingClientRect();
    pre.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: transfer, clientX: preBounds.left + 5, clientY: preBounds.top + 5,
    }));
    expect(component.codeeditorpre().editor.state.doc.toString()).toBe('');
    component.startSnippetDrag(new DragEvent('dragstart', { dataTransfer: transfer }), action);
    component.isTimeWarping = true;
    pre.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: transfer, clientX: preBounds.left + 5, clientY: preBounds.top + 5,
    }));
    expect(component.codeeditorpre().editor.state.doc.toString()).toBe('');
  });

  it('inserts into the visual editor and updates its form control', async () => {
    component.curScreen.type = 'page';
    component.curScreen.data.content = 'AB';
    component.showWysiwyg = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('[data-snippet-target="content"] .angular-editor-textarea') as HTMLElement;
    editor.focus();
    const range = document.createRange();
    range.setStart(editor.firstChild, 1);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    component.insertPaletteSnippet(snippets()[0]);
    fixture.detectChanges();
    expect(editor.textContent).toBe('A{{$.date|date}}B');
    expect(component.curScreen.data.content).toBe('A{{$.date|date}}B');
    expect(component.curScreenForm().dirty).toBeTrue();
  });

  it('drops a snippet into the visual editor', async () => {
    component.curScreen.type = 'page';
    component.showWysiwyg = true;
    component.curScreen.data.content = 'Text';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('[data-snippet-target="content"] .angular-editor-textarea') as HTMLElement;
    const bounds = editor.getBoundingClientRect();
    const transfer = new DataTransfer();
    component.startSnippetDrag(new DragEvent('dragstart', { dataTransfer: transfer }), snippets()[0]);
    editor.dispatchEvent(new DragEvent('drop', {
      bubbles: true, cancelable: true, dataTransfer: transfer, clientX: bounds.left + 12, clientY: bounds.top + 12,
    }));
    fixture.detectChanges();
    expect(editor.textContent).toContain('{{$.date|date}}');
    expect(component.curScreen.data.content).toContain('{{$.date|date}}');
    expect(component.curScreenForm().dirty).toBeTrue();
  });
});
