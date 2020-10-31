// @see https://stackoverflow.com/a/21825207/982092
// @ts-ignore
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
export default function awaitNextFrame() {
  return new Promise((resolve) =>
    // Seems like that on IE with the RO polyfill we need to slow things down a bit
    setTimeout(resolve, 1000 / (isIE11 ? 10 : 60))
  );
}
