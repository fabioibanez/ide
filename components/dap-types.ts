/** DAP shapes the IDE actually uses (not a full protocol model). */

export type DapResponse<T = unknown> = {
  type: 'response';
  seq: number;
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: T;
};

export type StackFrame = {
  id: number;
  name: string;
  line: number;
  column: number;
  source?: { path?: string };
};

export type Scope = {
  name: string;
  variablesReference: number;
  expensive: boolean;
};

export type DapVariable = {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
};

export type ScopeView = {
  name: string;
  variables: DapVariable[];
};

/** Callback passed into VariableRow (sync DAP request from main thread runtime). */
export type DapSendFn = <T>(command: string, args: Record<string, unknown>) => DapResponse<T> | null;
