export interface DetectorConfig {
  promptKeywords: string[];
  buttonLabels: string[];
  scanInterval: number;
  debug: boolean;
}

export interface DetectionResult {
  dialog: HTMLElement;
  button: HTMLElement;
}