import React, { useCallback, useEffect, useRef } from "react";
import { act, render } from "@testing-library/react";
import useResolvedElement from "./useResolvedElement";
import useRenderTrigger from "../../tests/utils/useRenderTrigger";

test("should receive the element with the provided callback ref", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupMock = jest.fn();
  const Test = () => {
    renderCount++;
    const ref = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return cleanupMock;
      }, [])
    );

    return <div ref={ref} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(1);
  expect(cleanupMock).toHaveBeenCalledTimes(1);
  expect(cleanupMock).toHaveBeenCalledWith();
});

test("should be able to reuse the callback ref to get different elements", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupMock = jest.fn();

  const Test = ({ swap }: { swap?: boolean }) => {
    renderCount++;
    const ref = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return cleanupMock;
      }, [])
    );

    if (swap) {
      return <span ref={ref} />;
    }

    return <div ref={ref} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);

  act(() => {
    rerender(<Test swap={true} />);
  });
  expect(renderCount).toBe(2);
  expect(cleanupMock).toHaveBeenCalledTimes(1);
  expect(cleanupMock).toHaveBeenCalledWith();
  expect(elements.length).toBe(2);
  expect(elements[0]).not.toBe(elements[1]);

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(2);
  expect(cleanupMock).toHaveBeenCalledTimes(2);
  expect(cleanupMock).toHaveBeenCalledWith();
});

test("should be able to use a raw element", () => {
  const element = document.createElement("div");
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupMock = jest.fn();
  const Test = () => {
    renderCount++;
    useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return cleanupMock;
      }, []),
      element
    );

    return null;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0]).toBe(element);

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(1);
  expect(cleanupMock).toHaveBeenCalledTimes(1);
  expect(cleanupMock).toHaveBeenCalledWith();
});

test("should be able to use a ref object", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupMock = jest.fn();
  const Test = () => {
    renderCount++;
    const ref = useRef<HTMLDivElement>(null);
    useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return cleanupMock;
      }, []),
      ref
    );

    return <div ref={ref} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(1);
  expect(cleanupMock).toHaveBeenCalledTimes(1);
  expect(cleanupMock).toHaveBeenCalledWith();
});

test("should prioritise the ref callback over a ref object argument", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupMock = jest.fn();
  const Test = () => {
    renderCount++;
    const refObject = useRef<HTMLSpanElement>(null);
    const refCallback = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return cleanupMock;
      }, []),
      refObject
    );

    return (
      <>
        <div ref={refCallback} />
        <span ref={refObject} />
      </>
    );
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(1);
  // The reason the span is reported when the component unmounts is because on unmount the ref callback is called with a null value.
  // This means that the hook now receives nothing from the ref callback, and an element via the ref object, so it reports the latter.
  // As the switch happens, the cleanup function is called, then on unmount cleanup is called once more.
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");
  expect(cleanupMock).toHaveBeenCalledTimes(2);
  expect(cleanupMock).toHaveBeenCalledWith();
});

test("should prioritise the ref callback over an element argument", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupMock = jest.fn();
  const element = document.createElement("span");
  const Test = () => {
    renderCount++;
    const refCallback = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return cleanupMock;
      }, []),
      element
    );

    return <div ref={refCallback} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    rerender(<></>);
  });
  // The explanation for this behaviour is the same as above.
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");
  expect(cleanupMock).toHaveBeenCalledTimes(2);
  expect(cleanupMock).toHaveBeenCalledWith();
});

test("should be able to switch from a ref callback to a ref object", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  // Tracking elements for cleanups for this test to assert that the right cleanup functions are called in the right order.
  const cleanupsDone: Element[] = [];
  const Test = ({ switchToRefObject }: { switchToRefObject?: boolean }) => {
    renderCount++;
    const refObject = useRef<HTMLDivElement>(null);
    const refCallback = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
        return () => cleanupsDone.push(element);
      }, []),
      refObject
    ); // ref object is ignored until the ref callback provides a value

    useEffect(() => {
      if (switchToRefObject) {
        refCallback(null);
      }
    }, [switchToRefObject, refCallback]);

    return (
      <>
        <div ref={refCallback} />
        <span ref={refObject} />
      </>
    );
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    rerender(<Test switchToRefObject={true} />);
  });

  expect(renderCount).toBe(2);
  expect(cleanupsDone.length).toBe(1);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(cleanupsDone.length).toBe(2);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(cleanupsDone[1]).toBe(elements[1]);
});

test("should be able to switch from a ref object to a ref callback", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  // Tracking elements for cleanups for this test to assert that the right cleanup functions are called in the right order.
  const cleanupsDone: Element[] = [];
  const Test = ({ switchToRefCallback }: { switchToRefCallback?: boolean }) => {
    renderCount++;
    const ref1 = useRef<HTMLDivElement>(null);
    const ref2 = useRef<HTMLSpanElement>(null);
    const refCallback = useResolvedElement<HTMLElement>(
      useCallback((element: Element) => {
        elements.push(element);
        return () => cleanupsDone.push(element);
      }, []),
      ref1
    );

    useEffect(() => {
      if (switchToRefCallback) {
        refCallback(ref2.current);
      }
    }, [switchToRefCallback, refCallback]);

    return (
      <>
        <div ref={ref1} />
        <span ref={ref2} />
      </>
    );
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    rerender(<Test switchToRefCallback={true} />);
  });

  expect(renderCount).toBe(2);
  expect(cleanupsDone.length).toBe(1);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(cleanupsDone.length).toBe(2);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(cleanupsDone[1]).toBe(elements[1]);
});

test("should be able to switch back and forth between a ref object and a ref callback", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  // Tracking elements for cleanups for this test to assert that the right cleanup functions are called in the right order.
  const cleanupsDone: Element[] = [];
  const Test = ({ renderSpan }: { renderSpan?: boolean }) => {
    renderCount++;
    const refObject = useRef<HTMLDivElement>(null);
    const refCallback = useResolvedElement<HTMLElement>(
      useCallback((element: Element) => {
        elements.push(element);

        return () => cleanupsDone.push(element);
      }, []),
      refObject
    );

    return (
      <>
        {renderSpan ? <span ref={refCallback} /> : null}
        <div ref={refObject} />
      </>
    );
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    rerender(<Test renderSpan={true} />);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");

  act(() => {
    rerender(<Test renderSpan={false} />);
  });
  expect(renderCount).toBe(3);
  expect(elements.length).toBe(3);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");
  expect(elements[2].tagName).toBe("DIV");

  act(() => {
    rerender(<></>);
  });

  expect(renderCount).toBe(3);
  expect(elements.length).toBe(3);
  expect(cleanupsDone.length).toBe(3);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(cleanupsDone[1]).toBe(elements[1]);
  expect(cleanupsDone[2]).toBe(elements[2]);
});

test("should not unnecessarily call the subscriber between renders", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  let triggerRender: ReturnType<typeof useRenderTrigger>;
  const Test = () => {
    renderCount++;
    const refCallback = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);
      }, [])
    );
    triggerRender = useRenderTrigger();

    return <div ref={refCallback} />;
  };

  render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    triggerRender();
  });

  expect(renderCount).toBe(2);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");
});

test("should call the subscriber function if its identity changes, even if the element didn't with ref callback", () => {
  let renderCount = 0;
  const elements1: Element[] = [];
  const elements2: Element[] = [];
  const cleanupMock1 = jest.fn();
  const cleanupMock2 = jest.fn();
  const Test = ({ switchToSubscriber2 }: { switchToSubscriber2?: boolean }) => {
    renderCount++;
    const subscriber1 = useCallback((element: Element) => {
      elements1.push(element);
      return cleanupMock1;
    }, []);
    const subscriber2 = useCallback((element: Element) => {
      elements2.push(element);
      return cleanupMock2;
    }, []);
    const refCallback = useResolvedElement(
      switchToSubscriber2 ? subscriber2 : subscriber1
    );

    return <div ref={refCallback} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements1.length).toBe(1);
  expect(elements1[0].tagName).toBe("DIV");
  expect(elements2.length).toBe(0);

  act(() => {
    rerender(<Test switchToSubscriber2={true} />);
  });

  expect(renderCount).toBe(2);
  expect(elements1.length).toBe(1);
  expect(elements2.length).toBe(1);
  expect(elements1[0].tagName).toBe("DIV");
  expect(elements2[0].tagName).toBe("DIV");
  expect(elements1[0]).toBe(elements2[0]);
});

test("should call the subscriber function if its identity changes, even if the element didn't with ref object", () => {
  let renderCount = 0;
  const elements1: Element[] = [];
  const elements2: Element[] = [];
  const cleanupMock1 = jest.fn();
  const cleanupMock2 = jest.fn();
  const Test = ({ switchToSubscriber2 }: { switchToSubscriber2?: boolean }) => {
    renderCount++;
    const refObject = useRef<HTMLDivElement>(null);
    const subscriber1 = useCallback((element: Element) => {
      elements1.push(element);
      return cleanupMock1;
    }, []);
    const subscriber2 = useCallback((element: Element) => {
      elements2.push(element);
      return cleanupMock2;
    }, []);
    useResolvedElement(
      switchToSubscriber2 ? subscriber2 : subscriber1,
      refObject
    );

    return <div ref={refObject} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements1.length).toBe(1);
  expect(elements1[0].tagName).toBe("DIV");
  expect(elements2.length).toBe(0);

  act(() => {
    rerender(<Test switchToSubscriber2={true} />);
  });

  expect(renderCount).toBe(2);
  expect(elements1.length).toBe(1);
  expect(elements2.length).toBe(1);
  expect(elements1[0].tagName).toBe("DIV");
  expect(elements2[0].tagName).toBe("DIV");
  expect(elements1[0]).toBe(elements2[0]);
});

test("should call the subscriber function if its identity changes, even if the element didn't with raw element", () => {
  let renderCount = 0;
  const elements1: Element[] = [];
  const elements2: Element[] = [];
  const cleanupMock1 = jest.fn();
  const cleanupMock2 = jest.fn();
  const element = document.createElement("div");
  const Test = ({ switchToSubscriber2 }: { switchToSubscriber2?: boolean }) => {
    renderCount++;
    const subscriber1 = useCallback((element: Element) => {
      elements1.push(element);
      return cleanupMock1;
    }, []);
    const subscriber2 = useCallback((element: Element) => {
      elements2.push(element);
      return cleanupMock2;
    }, []);
    useResolvedElement(
      switchToSubscriber2 ? subscriber2 : subscriber1,
      element
    );

    return null;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements1.length).toBe(1);
  expect(elements1[0]).toBe(element);
  expect(elements2.length).toBe(0);

  act(() => {
    rerender(<Test switchToSubscriber2={true} />);
  });

  expect(renderCount).toBe(2);
  expect(elements1.length).toBe(1);
  expect(elements2.length).toBe(1);
  expect(elements1[0]).toBe(element);
  expect(elements2[0]).toBe(element);
  expect(elements1[0]).toBe(elements2[0]);
});

test("should be able to reuse a ref callback to get a different element", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupsDone: Element[] = [];
  const Test = ({ getOtherElement }: { getOtherElement?: boolean }) => {
    renderCount++;
    const ref = useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);

        return () => cleanupsDone.push(element);
      }, [])
    );

    if (getOtherElement) {
      return <span ref={ref} />;
    }

    return <div ref={ref} />;
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  act(() => {
    rerender(<Test getOtherElement={true} />);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("SPAN");
  expect(cleanupsDone.length).toBe(1);
  expect(cleanupsDone[0]).toBe(elements[0]);

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(cleanupsDone.length).toBe(2);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(cleanupsDone[1]).toBe(elements[1]);
});

test("should be able to reuse a ref object to get a different element", () => {
  let renderCount = 0;
  const elements: Element[] = [];
  const cleanupsDone: Element[] = [];
  const Test = ({ getOtherElement }: { getOtherElement?: boolean }) => {
    renderCount++;
    const ref = useRef<HTMLDivElement>(null);
    useResolvedElement(
      useCallback((element: Element) => {
        elements.push(element);

        return () => cleanupsDone.push(element);
      }, []),
      ref
    );

    return (
      <>
        <div ref={!getOtherElement ? ref : undefined} />
        <div ref={getOtherElement ? ref : undefined} />
      </>
    );
  };

  const { rerender } = render(<Test />);
  expect(renderCount).toBe(1);
  expect(elements.length).toBe(1);
  expect(elements[0].tagName).toBe("DIV");

  // We remove the currently rendered div, so that we get a different element on the second subscriber call.
  act(() => {
    rerender(<Test getOtherElement={true} />);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(elements[0].tagName).toBe("DIV");
  expect(elements[1].tagName).toBe("DIV");
  expect(elements[0]).not.toBe(elements[1]);
  expect(cleanupsDone.length).toBe(1);
  expect(cleanupsDone[0]).toBe(elements[0]);

  act(() => {
    rerender(<></>);
  });
  expect(renderCount).toBe(2);
  expect(elements.length).toBe(2);
  expect(cleanupsDone.length).toBe(2);
  expect(cleanupsDone[0]).toBe(elements[0]);
  expect(cleanupsDone[1]).toBe(elements[1]);
});
