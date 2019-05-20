// Type definitions for use-resize-observer
// Project: use-resize-observer

import { RefObject } from "react";

export default function useResizeObserver(
  defaultWidth?: number,
  defaultHeight?: number
): [RefObject<HTMLElement>, number, number];
