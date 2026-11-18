import { AssistantAction } from './assistant.types';

export interface AssistantActionDependencies {
  prerequisites: ReadonlyMap<string, string[]>;
  blockedReasons: ReadonlyMap<string, string>;
}

export function analyzeAssistantActionDependencies(
  actions: readonly AssistantAction[]
): AssistantActionDependencies {
  const positions = new Map(actions.map((action, index) => [action.id, index]));
  const prerequisites = new Map<string, string[]>();
  const blockedReasons = new Map<string, string>();

  actions.forEach((action, index) => {
    const references = collectActionReferences(action.payload);
    prerequisites.set(action.id, references);

    if (references.some((ref) => {
      const position = positions.get(ref);
      return position === undefined || position >= index;
    })) {
      blockedReasons.set(action.id, 'This step needs another step first, but it is missing or out of order.');
      return;
    }

    if (references.some((ref) => blockedReasons.has(ref))) {
      blockedReasons.set(action.id, 'This step depends on another step that is not available yet.');
    }
  });

  return { prerequisites, blockedReasons };
}

export function getAssistantActionBlockReason(
  actionId: string,
  actions: readonly AssistantAction[],
  includedIds: readonly string[]
): string | undefined {
  const dependencies = analyzeAssistantActionDependencies(actions);
  const staticReason = dependencies.blockedReasons.get(actionId);
  if (staticReason) return `${staticReason} Ask the assistant to complete the plan first.`;

  const missingSelection = dependencies.prerequisites.get(actionId)
    ?.find((prerequisiteId) => !includedIds.includes(prerequisiteId));
  if (!missingSelection) return undefined;

  const prerequisite = actions.find((action) => action.id === missingSelection);
  const title = prerequisite ? getActionTitle(prerequisite) : '';
  return `Select "${title || 'the prerequisite step'}" first to enable this step.`;
}

export function getDefaultAssistantActionSelection(
  actions: readonly AssistantAction[]
): string[] {
  const dependencies = analyzeAssistantActionDependencies(actions);
  const selected: string[] = [];

  for (const action of actions) {
    if (isDestructiveAssistantAction(action) || dependencies.blockedReasons.has(action.id)) continue;
    const prerequisites = dependencies.prerequisites.get(action.id) ?? [];
    if (prerequisites.every((id) => selected.includes(id))) selected.push(action.id);
  }

  return selected;
}

export function getAssistantActionDescendants(
  actionId: string,
  actions: readonly AssistantAction[]
): Set<string> {
  const dependencies = analyzeAssistantActionDependencies(actions);
  const removed = new Set([actionId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const [candidateId, prerequisites] of dependencies.prerequisites) {
      if (!removed.has(candidateId) && prerequisites.some((id) => removed.has(id))) {
        removed.add(candidateId);
        changed = true;
      }
    }
  }

  return removed;
}

export function isDestructiveAssistantAction(action: AssistantAction): boolean {
  return action.destructive === true || action.kind.startsWith('remove_');
}

function getActionTitle(action: AssistantAction): string {
  if (action.title?.trim()) return action.title.trim();
  const payload = action.payload;
  for (const key of ['title', 'label', 'name'] as const) {
    if (key in payload && typeof payload[key] === 'string') return payload[key].trim();
  }
  return '';
}

function collectActionReferences(payload: unknown): string[] {
  const references = new Set<string>();

  const visit = (value: unknown, key?: string): void => {
    if (typeof value === 'string') {
      if (key && (key.endsWith('Ref') || key === 'parent') && value.startsWith('$') && value.length > 1) {
        references.add(value.slice(1));
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, key));
      return;
    }

    if (value !== null && typeof value === 'object') {
      for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
        visit(child, childKey);
      }
    }
  };

  visit(payload);
  return [...references];
}
