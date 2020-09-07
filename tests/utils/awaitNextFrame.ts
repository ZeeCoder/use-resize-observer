export default function awaitNextFrame() {
  return new Promise((resolve) => setTimeout(resolve, 1000 / 60));
}
