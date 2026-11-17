import { baseApi } from '../../../_shared/constant.service';

/**
 * Contract for the standalone assistant endpoints. Provider configuration is supplied per creator
 * in each request; the backend does not depend on a deployment-wide Cogna entry.
 */
export const ASSISTANT_API = {
  health: () => `${baseApi}/assistant/health`,
  plan: (appId: number) => `${baseApi}/assistant/${appId}/plan`,
  planStream: (appId: number) => `${baseApi}/assistant/${appId}/plan-stream`,
};

/** Hard limit so a runaway plan cannot be applied in one go. */
export const ASSISTANT_MAX_ACTIONS = 60;

/** Keep requests bounded before they reach the configured model provider. */
export const ASSISTANT_MAX_PROMPT_CHARS = 4000;

/** Only the most recent messages are needed to continue an active conversation. */
export const ASSISTANT_MAX_HISTORY_MESSAGES = 10;

/** Also bound large assistant replies retained in conversation history. */
export const ASSISTANT_MAX_HISTORY_MESSAGE_CHARS = 4000;

/** Above this the drawer warns the creator before sending a prompt. */
export const ASSISTANT_CONTEXT_WARN_ENTITIES = 400;
