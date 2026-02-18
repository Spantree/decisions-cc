export const MAIN_BRANCH_ID = 'br_00000000-0000-0000-0000-000000000000';

export function eventId(): string {
  return `evt_${crypto.randomUUID()}`;
}

export function branchId(): string {
  return `br_${crypto.randomUUID()}`;
}

export function scoreId(): string {
  return `score_${crypto.randomUUID()}`;
}

export function toolId(): string {
  return `tool_${crypto.randomUUID()}`;
}

export function criterionId(): string {
  return `cri_${crypto.randomUUID()}`;
}

export function commitId(): string {
  return `commit_${crypto.randomUUID()}`;
}
