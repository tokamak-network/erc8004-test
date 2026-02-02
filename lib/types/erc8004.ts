export interface RegisterParams {
  agentURI?: string;
}

export interface SetMetadataParams {
  agentId: bigint;
  metadataKey: string;
  metadataValue: `0x${string}`;
}

export interface SetAgentURIParams {
  agentId: bigint;
  newURI: string;
}

export type AgendaActionType = "register" | "setMetadata" | "setAgentURI";

export interface AgendaAction {
  type: AgendaActionType;
  params: RegisterParams | SetMetadataParams | SetAgentURIParams;
}

export enum ProposalStatus {
  Active = 0,
  Passed = 1,
  Failed = 2,
  Executed = 3,
}

export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  description: string;
  callData: `0x${string}`;
  target: `0x${string}`;
  forVotes: bigint;
  againstVotes: bigint;
  startTime: bigint;
  endTime: bigint;
  executed: boolean;
}
