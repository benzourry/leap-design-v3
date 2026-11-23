import { baseApi } from '../../../_shared/constant.service';

/**
 * Contract for the standalone assistant endpoints and creator-owned provider profiles.
 */
export const ASSISTANT_API = {
  health: () => `${baseApi}/assistant/health`,
  profiles: () => `${baseApi}/assistant/profiles`,
  models: () => `${baseApi}/assistant/profiles/models`,
  profile: (id: number) => `${baseApi}/assistant/profiles/${id}`,
  selectProfile: (id: number) => `${baseApi}/assistant/profiles/${id}/select`,
  plan: (appId: number) => `${baseApi}/assistant/${appId}/plan`,
  planStream: (appId: number) => `${baseApi}/assistant/${appId}/plan-stream`,
};

/** Hard limit so a runaway plan cannot be applied in one go. */
export const ASSISTANT_MAX_ACTIONS = 60;

/** Keep requests bounded before they reach the configured model provider. */
export const ASSISTANT_MAX_PROMPT_CHARS = 4000;

/** Keep inline file uploads small enough for a single bounded assistant request. */
export const ASSISTANT_MAX_ATTACHMENTS = 4;
export const ASSISTANT_MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
export const ASSISTANT_MAX_ATTACHMENT_TOTAL_BYTES = 8 * 1024 * 1024;

/** Only the most recent messages are needed to continue an active conversation. */
export const ASSISTANT_MAX_HISTORY_MESSAGES = 10;

/** Also bound large assistant replies retained in conversation history. */
export const ASSISTANT_MAX_HISTORY_MESSAGE_CHARS = 4000;

/** Above this the drawer warns the creator before sending a prompt. */
export const ASSISTANT_CONTEXT_WARN_ENTITIES = 400;
