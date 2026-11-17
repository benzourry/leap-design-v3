import { AssistantChatMessage } from './assistant.types';
import { buildAssistantHistoryWindow } from './assistant-history';

describe('buildAssistantHistoryWindow', () => {
  it('keeps the complete history when it fits within the limit', () => {
    const history: AssistantChatMessage[] = [
      { role: 'user', content: 'Add a form.' },
      { role: 'assistant', content: 'I can help with that.' },
    ];

    expect(buildAssistantHistoryWindow(history)).toEqual({
      messages: history,
      omittedMessages: 0,
      truncatedMessages: 0,
    });
  });

  it('keeps recent complete turns and tells the assistant when older messages were omitted', () => {
    const history: AssistantChatMessage[] = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index}`,
    }));

    const result = buildAssistantHistoryWindow(history);

    expect(result.omittedMessages).toBe(2);
    expect(result.truncatedMessages).toBe(0);
    expect(result.messages[0]).toEqual(jasmine.objectContaining({
      role: 'assistant',
      content: jasmine.stringMatching(/omitted/i),
    }));
    expect(result.messages.slice(1)).toEqual(history.slice(-10));
  });

  it('avoids starting the retained history with an orphaned assistant reply', () => {
    const history: AssistantChatMessage[] = Array.from({ length: 13 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index}`,
    }));

    const result = buildAssistantHistoryWindow(history);

    expect(result.omittedMessages).toBe(4);
    expect(result.truncatedMessages).toBe(0);
    expect(result.messages[1].role).toBe('user');
  });

  it('shortens oversized retained messages and adds a disclosure', () => {
    const history: AssistantChatMessage[] = [
      { role: 'user', content: 'x'.repeat(5000) },
    ];

    const result = buildAssistantHistoryWindow(history);

    expect(result.omittedMessages).toBe(0);
    expect(result.truncatedMessages).toBe(1);
    expect(result.messages[0].content).toContain('long messages were shortened');
    expect(result.messages[1].content.length).toBe(4003);
  });
});
