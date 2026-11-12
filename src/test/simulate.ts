export type PromptVariant = "aria" | "web" | "music";

export interface PromptFixtureOptions {  
  variant?: PromptVariant;
  message?: string;
  confirmLabel?: string | null;
  cancelLabel?: string | null;
  confirmDisabled?: boolean;
  hidden?: boolean;
  container?: Element;
}

export interface PromptFixture {
  /** The outer element the matcher is expected to identify as the dialog. */
  dialog: HTMLElement;
  confirmButton: HTMLElement | null;
  cancelButton: HTMLElement | null;
}

export function clearFixtures(): void {
  document
    .querySelectorAll("[data-yesyoutube-fixture]")
    .forEach(node => node.remove());
}

function applyHidden(dialog: HTMLElement, hidden: boolean): void {
  if (hidden) {
    dialog.style.display = "none";
  }
}

/**
 * Builds a fixture that imitates YouTube's "Video paused. Continue watching?"
 * inactivity prompt and appends it to the document.
 */
export function createContinueWatchingPrompt(
  options: PromptFixtureOptions = {}
): PromptFixture {
  const {
    variant = "aria",
    message = "Video paused. Continue watching?",
    confirmLabel = "Yes",
    cancelLabel = variant === "music" ? null : "No",
    confirmDisabled = false,
    hidden = false,
    container = document.body
  } = options;

  if (variant === "music") {
    return createMusicPrompt({
      message,
      confirmLabel,
      cancelLabel,
      confirmDisabled,
      hidden,
      container
    });
  }

  let dialog: HTMLElement;
  if (variant === "web") {
    dialog = document.createElement("yt-confirm-dialog-renderer");
    dialog.className = "style-scope ytd-popup-container";
  } else {
    dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", "Video paused");
  }

  dialog.setAttribute("data-yesyoutube-fixture", "prompt");
  applyHidden(dialog, hidden);

  const text = document.createElement("div");
  if (variant === "web") {
    text.className = "line-text style-scope yt-confirm-dialog-renderer";
  }
  text.textContent = message;
  dialog.appendChild(text);

  let confirmButton: HTMLElement | null = null;
  if (confirmLabel !== null) {
    const button = document.createElement("button");
    if (variant === "web") {
      button.id = "confirm-button";
    }
    button.textContent = confirmLabel;

    if (confirmDisabled) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
    }

    dialog.appendChild(button);
    confirmButton = button;
  }

  let cancelButton: HTMLElement | null = null;
  if (cancelLabel !== null) {
    cancelButton = document.createElement("button");
    cancelButton.textContent = cancelLabel;
    dialog.appendChild(cancelButton);
  }

  container.appendChild(dialog);

  return { dialog, confirmButton, cancelButton };
}

interface MusicPromptOptions {
  message: string;
  confirmLabel: string | null;
  cancelLabel: string | null;
  confirmDisabled: boolean;
  hidden: boolean;
  container: Element;
}

/** Reproduces the structure observed on music.youtube.com: */
function createMusicPrompt(options: MusicPromptOptions): PromptFixture {
  const { message, confirmLabel, cancelLabel, confirmDisabled, hidden, container } =
    options;

  const dialog = document.createElement("tp-yt-paper-dialog");
  dialog.setAttribute("data-yesyoutube-fixture", "prompt");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("tabindex", "-1");
  dialog.className = "style-scope ytmusic-popup-container";
  dialog.setAttribute("prevent-autonav", "true");
  dialog.setAttribute("modern", "");
  dialog.style.cssText =
    "outline: none; z-index: 103; position: fixed; top: 333.5px; " +
    "left: 204.379px; box-sizing: border-box; max-height: 783px; max-width: 752px;";
  applyHidden(dialog, hidden);

  const renderer = document.createElement("ytmusic-you-there-renderer");
  renderer.setAttribute("dialog", "true");
  renderer.setAttribute("tabindex", "-1");
  renderer.className = "style-scope ytmusic-popup-container";

  const text = document.createElement("yt-formatted-string");
  text.className = "text style-scope ytmusic-you-there-renderer";
  text.textContent = message;
  renderer.appendChild(text);

  let confirmButton: HTMLElement | null = null;
  if (confirmLabel !== null) {
    const button = document.createElement("button");
    button.className =
      "ytSpecButtonShapeNextHost ytSpecButtonShapeNextText " +
      "ytSpecButtonShapeNextCallToAction ytSpecButtonShapeNextSizeM";
    button.setAttribute("title", "");
    button.setAttribute("aria-label", confirmLabel);
    button.setAttribute("aria-disabled", confirmDisabled ? "true" : "false");
    if (confirmDisabled) {
      button.disabled = true;
    }

    const labelContent = document.createElement("div");
    labelContent.className = "ytSpecButtonShapeNextButtonTextContent";
    const label = document.createElement("span");
    label.setAttribute("role", "text");
    label.textContent = confirmLabel;
    labelContent.appendChild(label);
    button.appendChild(labelContent);

    const touchFeedback = document.createElement("yt-touch-feedback-shape");
    touchFeedback.setAttribute("aria-hidden", "true");
    button.appendChild(touchFeedback);

    const shape = document.createElement("yt-button-shape");
    shape.appendChild(button);

    const buttonRenderer = document.createElement("yt-button-renderer");
    buttonRenderer.setAttribute("dialog-confirm", "");
    buttonRenderer.appendChild(shape);
    buttonRenderer.appendChild(document.createElement("tp-yt-paper-tooltip"));

    const actions = document.createElement("div");
    actions.className = "actions style-scope ytmusic-you-there-renderer";
    actions.appendChild(buttonRenderer);
    renderer.appendChild(actions);

    confirmButton = button;
  }

  let cancelButton: HTMLElement | null = null;
  if (cancelLabel !== null) {
    cancelButton = document.createElement("button");
    cancelButton.textContent = cancelLabel;
    renderer.appendChild(cancelButton);
  }

  dialog.appendChild(renderer);
  container.appendChild(dialog);

  return { dialog, confirmButton, cancelButton };
}

export interface UnrelatedDialogOptions {
  message: string;
  buttonLabels?: string[];
  container?: Element;
}

/**
 * Builds a dialog that must never be clicked: it may contain a "Yes" button,
 * but it does not carry the inactivity prompt wording.
 */
export function createUnrelatedDialog(
  options: UnrelatedDialogOptions
): { dialog: HTMLElement; buttons: HTMLElement[] } {
  const {
    message,
    buttonLabels = ["Yes", "No"],
    container = document.body
  } = options;

  const dialog = document.createElement("div");
  dialog.setAttribute("data-yesyoutube-fixture", "unrelated");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", message);

  const text = document.createElement("p");
  text.textContent = message;
  dialog.appendChild(text);

  const buttons = buttonLabels.map(label => {
    const button = document.createElement("button");
    button.textContent = label;
    dialog.appendChild(button);
    return button;
  });

  container.appendChild(dialog);

  return { dialog, buttons };
}