/**
 * Webpack loader for the React DOM client bundled with Next.js (next/dist/compiled/react-dom).
 *
 * Bug being fixed: a lost "ping" leaves a transition suspended forever. The user sees a form that
 * stays pending, or a link that does nothing, even though the server has already answered.
 *
 * How it happens:
 * - While an RSC response is still streaming, React renders the new tree. It suspends on a Flight
 *   chunk that has not arrived yet, then yields without attaching a listener.
 * - The chunk arrives during the yield and waits in "resolved_model" state.
 * - React resumes, sees a thenable that is not "fulfilled", and unwinds (throwException). It attaches
 *   its ping listener with .then(). The Flight chunk initialises and calls the ping synchronously,
 *   inside the render phase.
 * - If the render has already been marked "suspended with delay", pingSuspendedRoot does nothing
 *   (it can't restart the stack during render). It also does not record the ping, so the lanes end
 *   up in root.suspendedLanes and are never retried.
 *
 * The fix records the ping in workInProgressRootPingedLanes in that case. markRootSuspended then
 * leaves those lanes out, and React renders them again right after the current attempt finishes.
 * This is the same thing React already does for pings during render in every other state.
 *
 * If the pattern is not found (e.g. after a Next.js upgrade), the file is left unchanged and the
 * build prints a warning.
 */
const PATTERN =
  /\?\s*0 === \(executionContext & 2\) && prepareFreshStack\(root, 0\)\s*:\s*\(workInProgressRootPingedLanes \|= pingedLanes\)/;
const REPLACEMENT =
  "? (0 === (executionContext & 2) ? prepareFreshStack(root, 0) : (workInProgressRootPingedLanes |= pingedLanes)) : (workInProgressRootPingedLanes |= pingedLanes)";

module.exports = function reactPingFixLoader(source) {
  if (!PATTERN.test(source)) {
    this.emitWarning(new Error("react-ping-fix-loader: pingSuspendedRoot pattern not found — React DOM left unpatched"));
    return source;
  }
  return source.replace(PATTERN, REPLACEMENT);
};
