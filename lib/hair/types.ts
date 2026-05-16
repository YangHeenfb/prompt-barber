export type Parting = "none" | "middle" | "left" | "right";
export type Neckline = "natural" | "clean" | "tapered";

export type HairState = {
  topLength: number;
  sideLength: number;
  bangsLength: number;
  fadeHeight: number;
  volume: number;
  texture: number;
  sideburns: number;
  parting: Parting;
  neckline: Neckline;
};

export type NumericHairField =
  | "topLength"
  | "sideLength"
  | "bangsLength"
  | "fadeHeight"
  | "volume"
  | "texture"
  | "sideburns";

export type CategoricalHairField = "parting" | "neckline";
export type HairField = keyof HairState;

export type HairOperation = {
  field: HairField;
  operation: "set" | "increment" | "decrement";
  value: number | string;
  reason: string;
};

export type HairIntent = {
  operations: HairOperation[];
  confidence: number;
  ambiguities: string[];
  warnings: string[];
  interpretationNote: string;
  countsAsOperationStep: boolean;
};

export type ForbiddenRule = {
  id: string;
  label: string;
  evaluate: (state: HairState) => boolean;
};

export type LevelConfig = {
  id: string;
  name: string;
  goal: string;
  target: HairState;
  passAccuracyThreshold: number;
  idealOperationSteps: number;
  timeTargetSeconds: number;
  forbiddenRules: ForbiddenRule[];
  hints: string[];
};

export type FieldScoreDetail = {
  field: HairField;
  label: string;
  weight: number;
  currentValue: number | string;
  targetValue: number | string;
  scorePercent: number;
  rawScore: number;
  message: string;
};

export type ScoreBreakdown = {
  accuracyScore: number;
  stepScore: number;
  timeScore: number;
  constraintScore: number;
  finalScore: number;
  rank: "S" | "A" | "B" | "C" | "Fail";
  passed: boolean;
  elapsedSeconds: number;
  operationSteps: number;
  violations: string[];
  fieldScores: FieldScoreDetail[];
};

export type AppliedOperation = {
  operation: HairOperation;
  before: number | string;
  after: number | string;
  applied: boolean;
  message: string;
};

export type PromptHistoryItem = {
  id: string;
  prompt: string;
  parserLabel: string;
  intent: HairIntent;
  appliedOperations: AppliedOperation[];
  beforeState: HairState;
  afterState: HairState;
  warnings: string[];
  ambiguities: string[];
  scores: ScoreBreakdown;
  createdAt: number;
};

export type ParserMode = "auto" | "local" | "codex" | "ai";
