import {
  ASSISTANT_MAX_HISTORY_MESSAGES,
  ASSISTANT_MAX_HISTORY_MESSAGE_CHARS,
} from './assistant-api.contract';
import { AssistantChatMessage } from './assistant.types';

export interface AssistantHistoryWindow {
  messages: AssistantChatMessage[];
  omittedMessages: number;
  truncatedMessages: number;
}

export function buildAssistantHistoryWindow(
  history: readonly AssistantChatMessage[]
): AssistantHistoryWindow {
  let startIndex = Math.max(0, history.length - ASSISTANT_MAX_HISTORY_MESSAGES);
  if (startIndex && history[startIndex]?.role === 'assistant') startIndex++;

  let truncatedMessages = 0;
  const recent = history.slice(startIndex).map((message) => {
    if (message.content.length <= ASSISTANT_MAX_HISTORY_MESSAGE_CHARS) return message;
    truncatedMessages++;
    return {
      ...message,
      content: `${message.content.slice(0, ASSISTANT_MAX_HISTORY_MESSAGE_CHARS)}...`,
    };
  });
  const omittedMessages = startIndex;
  if (!omittedMessages && !truncatedMessages) {
    return { messages: recent, omittedMessages: 0, truncatedMessages: 0 };
  }

  const disclosure = [
    omittedMessages ? 'Earlier conversation turns were omitted' : '',
    truncatedMessages ? 'long messages were shortened' : '',
  ].filter(Boolean).join(' and ');
  return {
    messages: [
      { role: 'assistant', content: `${disclosure} to limit request size.` },
      ...recent,
    ],
    omittedMessages,
    truncatedMessages,
  };
}
