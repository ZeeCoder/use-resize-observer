// Type definitions for use-resize-observer
// Project: use-resize-observer

import { RefObject, MutableRefObject } from 'react';

function useResizeObserver(): [RefObject<HTMLElement>, number, number];
function useResizeObserver(ref: MutableRefObject<HTMLElement>): [number, number, RefObject<HTMLElement>];
export default useResizeObserver;
