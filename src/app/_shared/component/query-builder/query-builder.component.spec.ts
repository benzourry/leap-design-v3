import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faAlignLeft, faCode, faExpand, faPlus, faSearch, faSitemap, faTrash, faUndo } from '@fortawesome/free-solid-svg-icons';
import { faMinusSquare, faPlusSquare } from '@fortawesome/free-regular-svg-icons';
import { NgCmComponent } from '../ng-cm/ng-cm.component';
import { QueryBuilderComponent } from './query-builder.component';

describe('QueryBuilderComponent', () => {
  let component: QueryBuilderComponent;
  let fixture: ComponentFixture<QueryBuilderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueryBuilderComponent]
    }).compileComponents();

    TestBed.inject(FaIconLibrary).addIcons(
      faCode, faPlus, faSitemap, faTrash, faUndo, faSearch, faPlusSquare, faMinusSquare, faAlignLeft, faExpand
    );
    fixture = TestBed.createComponent(QueryBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and round-trips nested qWalker conditions', () => {
    const query = JSON.stringify([
      {
        $and: [
          { '$.age~between': null },
          { '$.gender.code': 'M' }
        ]
      },
      {
        $or: [
          { '$_.email': '{{$user$.email}}' },
          { '$prev$.email': '{{$user$.email}}' }
        ]
      }
    ]);

    component.query.set(query);
    fixture.detectChanges();
    component.changed();

    expect(JSON.parse(component.query())).toEqual(JSON.parse(query));
  });

  it('serializes a root Match Any selection as an explicit $or group', () => {
    component.addCriterion(component.root());
    const criterion = component.root().children[0];
    if (criterion.kind !== 'criterion') {
      fail('Expected a criterion.');
      return;
    }
    criterion.field = '$_.email';
    criterion.operator = '';
    component.root().condition = '$or';
    component.changed();

    expect(JSON.parse(component.query())).toEqual([
      { $or: [{ '$_.email': '' }] }
    ]);
  });

  it('keeps null as a runtime value and template values as fixed fallbacks', () => {
    component.query.set(JSON.stringify([
      { '$.age~between': null },
      { '$_.email': '{{$user$.email}}' }
    ]));
    fixture.detectChanges();

    const runtimeCriterion = component.root().children[0];
    const templateCriterion = component.root().children[1];

    if (runtimeCriterion.kind !== 'criterion' || templateCriterion.kind !== 'criterion') {
      fail('Expected criteria.');
      return;
    }
    expect(runtimeCriterion.valueSource).toBe('runtime');
    expect(templateCriterion.valueSource).toBe('template');
  });

  it('synchronizes CodeMirror edits with the stored query and visual builder', async () => {
    const initial = '[{"$.name":"Alice"}]';
    const updated = '[{"$or":[{"$.name":"Bob"},{"$.age~from":21}]}]';
    component.query.set(initial);
    fixture.detectChanges();
    component.toggleAdvanced();
    fixture.detectChanges();
    await fixture.whenStable();

    const editor = fixture.debugElement.query(By.directive(NgCmComponent)).componentInstance as NgCmComponent;
    expect(editor.editor.state.doc.toString()).toBe(initial);
    expect(editor.editor.dom.querySelector('.cm-lineNumbers')).not.toBeNull();
    editor.editor.dispatch({ changes: { from: 0, to: editor.editor.state.doc.length, insert: updated } });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.query()).toBe(updated);
    expect(component.parseError()).toBe('');
    component.toggleAdvanced();
    fixture.detectChanges();
    expect(component.root().condition).toBe('$or');
    expect(component.root().children.length).toBe(2);
    component.addCriterion(component.root());
    const visualQuery = component.query();
    component.toggleAdvanced();
    fixture.detectChanges();
    await fixture.whenStable();
    const reopenedEditor = fixture.debugElement.query(By.directive(NgCmComponent)).componentInstance as NgCmComponent;
    expect(reopenedEditor.editor.state.doc.toString()).toBe(visualQuery);

    component.query.set(initial);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(reopenedEditor.editor.state.doc.toString()).toBe(initial);
    expect(component.root().children.length).toBe(1);
  });

  it('retains invalid JSON typed in CodeMirror and displays the validation error', async () => {
    component.toggleAdvanced();
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = fixture.debugElement.query(By.directive(NgCmComponent)).componentInstance as NgCmComponent;
    editor.editor.dispatch({ changes: { from: 0, to: editor.editor.state.doc.length, insert: '[{' } });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.query()).toBe('[{');
    expect(component.parseError()).not.toBe('');
    expect(fixture.nativeElement.querySelector('.alert-danger')).not.toBeNull();
  });
});
