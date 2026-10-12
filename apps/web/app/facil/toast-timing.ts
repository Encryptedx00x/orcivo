export const COMMON_TOAST_DURATION_MS = 3_000;
export const ACTION_TOAST_DURATION_MS = 6_000;

export function toastDuration(hasAction: boolean): number {
  return hasAction ? ACTION_TOAST_DURATION_MS : COMMON_TOAST_DURATION_MS;
}

export function scheduleToastDismiss(
  dismiss: () => void,
  hasAction = false,
): ReturnType<typeof setTimeout> {
  return setTimeout(dismiss, toastDuration(hasAction));
}
