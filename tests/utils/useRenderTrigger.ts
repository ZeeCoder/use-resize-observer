import { useCallback, useState } from "react";
import awaitNextFrame from "./awaitNextFrame";

export default function useRenderTrigger() {
  const [, setTrigger] = useState(false);

  return useCallback(async () => {
    setTrigger((val) => !val);
    await awaitNextFrame();
  }, []);
}
