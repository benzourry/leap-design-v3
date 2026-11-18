import { AssistantAction } from './assistant.types';
import {
  analyzeAssistantActionDependencies,
  getAssistantActionBlockReason,
  getAssistantActionDescendants,
  getDefaultAssistantActionSelection,
} from './assistant-dependencies';

describe('assistant action dependencies', () => {
  it('blocks steps that refer to a missing earlier action and their dependents', () => {
    const actions: AssistantAction[] = [
      {
        id: 'add_section',
        kind: 'add_section',
        payload: { formRef: '$create_form', title: 'Details' },
      },
      {
        id: 'add_field',
        kind: 'add_section_item',
        payload: { formRef: '$create_form', sectionRef: '$add_section', label: 'Name', type: 'text' },
      },
    ];

    const dependencies = analyzeAssistantActionDependencies(actions);

    expect(dependencies.blockedReasons.has('add_section')).toBeTrue();
    expect(dependencies.blockedReasons.has('add_field')).toBeTrue();
    expect(getDefaultAssistantActionSelection(actions)).toEqual([]);
    expect(getAssistantActionBlockReason('add_section', actions, [])).toContain('Ask the assistant to complete');
  });

  it('requires selected prerequisites before enabling dependent actions', () => {
    const actions: AssistantAction[] = [
      { id: 'create_form', kind: 'create_form', payload: { title: 'Stock form' } },
      { id: 'add_section', kind: 'add_section', payload: { formRef: '$create_form', title: 'Details' } },
    ];

    expect(getDefaultAssistantActionSelection(actions)).toEqual(['create_form', 'add_section']);
    expect(getAssistantActionBlockReason('add_section', actions, [])).toBe('Select "Stock form" first to enable this step.');
    expect(getAssistantActionBlockReason('add_section', actions, ['create_form'])).toBeUndefined();
    expect([...getAssistantActionDescendants('create_form', actions)]).toEqual(['create_form', 'add_section']);
  });

  it('blocks forward references even when the referenced action exists', () => {
    const actions: AssistantAction[] = [
      { id: 'add_section', kind: 'add_section', payload: { formRef: '$create_form', title: 'Details' } },
      { id: 'create_form', kind: 'create_form', payload: { title: 'Stock form' } },
    ];

    expect(analyzeAssistantActionDependencies(actions).blockedReasons.has('add_section')).toBeTrue();
    expect(getDefaultAssistantActionSelection(actions)).toEqual(['create_form']);
  });
});
