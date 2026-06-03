/** True when the user has scrolled near the bottom of a scrollable element. */
export function isNearScrollEnd(element: HTMLElement, thresholdPx = 72): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= thresholdPx;
}
