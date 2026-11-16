/**
 * THE ONE PLACE THAT KNOWS THE /assistant/* BACKEND CONTRACT.
 *
 * Server team owns the implementation; this file owns the shape the browser expects. If the shipped
 * endpoints differ, adapt this file only - nothing else in the app builds URLs by hand.
 *
 *   GET  /assistant/health
 *     -> 200 { version?: string, enabled?: boolean }
 *
 *   POST /assistant/{appId}/plan
 *   POST /assistant/{appId}/plan-stream
 *     -> 200 AssistantPlanResponse  (see assistant.types.ts)
 *     -> stream: plain text, then the marker `<!--PLAN-->`, then the JSON plan.
 *        Text before the marker is shown live; text after it is parsed as the plan.
 *
 *
 * Backend duties: call the LLM, enforce JSON output, drop unknown action kinds. It MUST NOT write
 * app data - the browser applies the approved actions.
 */
import { baseApi } from '../../../_shared/constant.service';

export const ASSISTANT_API = {
  health: () => `${baseApi}/assistant/health`,
  plan: (appId: number) => `${baseApi}/assistant/${appId}/plan`,
  planStream: (appId: number) => `${baseApi}/assistant/${appId}/plan-stream`,
};

/** Hard limit so a runaway plan cannot be applied in one go. */
export const ASSISTANT_MAX_ACTIONS = 60;

/** Above this the drawer warns the creator before sending a prompt. */
export const ASSISTANT_CONTEXT_WARN_ENTITIES = 400;
