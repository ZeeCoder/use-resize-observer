// @see https://stackoverflow.com/a/21825207/982092
// @ts-ignore
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
// TODO instead of hardcoded values, we should wait with a timeout for sizes to
//      be reported whenever they're available. (rAF in a loop maybe)
export default function awaitNextFrame() {
  return new Promise((resolve) =>
    // Seems like that on IE with the RO polyfill we need to slow things down a bit
    // Also, 1000 / 60 did not seem to not be enough of a wait sometimes on modern browsers either.
    // todo replace with `browser` from utils
    setTimeout(resolve, 1000 / (isIE11 ? 5 : 30))
  );
}
