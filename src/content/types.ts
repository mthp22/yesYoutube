export interface DetectorConfig {
  dialogSelectors: string[];
  buttonSelectors: string[];
  promptPatterns: RegExp[];

  // Exact, normalised labels that are allowed on the confirmation button.
  buttonLabels: string[];
  maxPromptTextLength: number;
  scanInterval: number;
  debounceMs: number;
  debug: boolean;
}

export interface DetectionResult {
  dialog: HTMLElement;
  button: HTMLElement;
}