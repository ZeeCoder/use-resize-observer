# use-resize-observer

<h1 align="center">
	<br>
	<img width="250" src="https://raw.githubusercontent.com/ZeeCoder/use-resize-observer/master/media/Logo.png" alt="useResizeObserver">
	<br>
    <br>
</h1>

A React hook that allows you to use a ResizeObserver to measure an element's size.

[![npm version](https://badge.fury.io/js/use-resize-observer.svg)](https://npmjs.com/package/use-resize-observer)
![build](https://github.com/ZeeCoder/use-resize-observer/workflows/Testing/badge.svg)
[![BrowserStack Status](https://automate.browserstack.com/badge.svg?badge_key=bTAyOUVpa3hENUgwMkJBTVhXcytCQjREangwcTJqT0czUGhRSEZta3ZwYz0tLVRSZ1NhVkdPZ01FMithOEh5ZGxoWHc9PQ==--49d9d8ad43d557894fb270c80fd1c24107a82f51)](https://automate.browserstack.com/public-build/bTAyOUVpa3hENUgwMkJBTVhXcytCQjREangwcTJqT0czUGhRSEZta3ZwYz0tLVRSZ1NhVkdPZ01FMithOEh5ZGxoWHc9PQ==--49d9d8ad43d557894fb270c80fd1c24107a82f51)

## Highlights

- Written in **TypeScript**.
- **Tiny**: [500B](.size-limit.json) (minified, gzipped) Monitored by [size-limit](https://github.com/ai/size-limit).
- Exposes an **onResize callback** if you need more control.
- Works with **SSR**.
- Works with **CSS-in-JS**.
- **Supports custom refs** in case you [had one already](#passing-in-your-own-ref).
- **Uses RefCallback by default** To address delayed mounts and changing ref elements.
- **Ships a polyfilled version**
- Handles many edge cases you might not even think of.
  (See this documentation and the test cases.)
- [Throttle / Debounce](#throttle--debounce)
- **Tested in real browsers** (Currently latest Chrome, Safari, Firefox and IE 11, sponsored by BrowserStack)

## In Action

[CodeSandbox Demo](https://codesandbox.io/s/nrp0w2r5z0)

## Install

```sh
yarn add use-resize-observer --dev
# or
npm install use-resize-observer --save-dev
```

## Basic Usage

Note that the default builds are not polyfilled! For instructions and alternatives,
see the [Transpilation / Polyfilling](#transpilation--polyfilling) section.

```tsx
import React from "react";
import useResizeObserver from "use-resize-observer";

const App = () => {
  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();

  return (
    <div ref={ref}>
      Size: {width}x{height}
    </div>
  );
};
```

Note that "ref" here is a `RefCallback`, not a `RefObject`, meaning you won't be
able to access "ref.current" if you need the element itself.
To get the raw element, either you use your own RefObject (see later in this doc)
or you hook in the returned ref callback, like so:

### Getting the raw element from the default `RefCallback`

```tsx
import React, { useCallback, useEffect, useRef } from "react";
import useResizeObserver from "use-resize-observer";

const useMergedCallbackRef = (...callbacks: Function[]) => {
  // Storing callbacks in a ref, so that we don't need to memoise them in
  // renders when using this hook.
  const callbacksRegistry = useRef<Function[]>(callbacks);

  useEffect(() => {
    callbacksRegistry.current = callbacks;
  }, [...callbacks]);

  return useCallback((element) => {
    callbacksRegistry.current.forEach((callback) => callback(element));
  }, []);
};

const App = () => {
  const { ref, width = 1, height = 1 } = useResizeObserver<HTMLDivElement>();

  const mergedCallbackRef = useMergedCallbackRef(
    ref,
    (element: HTMLDivElement) => {
      // Do whatever you want with the `element`.
    }
  );

  return (
    <div ref={mergedCallbackRef}>
      Size: {width}x{height}
    </div>
  );
};
```

## Passing in Your Own `ref`

You can pass in your own ref instead of using the one provided.
This can be useful if you already have a ref you want to measure.

```ts
const ref = useRef<HTMLDivElement>(null);
const { width, height } = useResizeObserver<HTMLDivElement>({ ref });
```

You can even reuse the same hook instance to measure different elements:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-reusing-refs-buftd)

## Measuring a raw element

There might be situations where you have an element already that you need to measure.
`ref` now accepts elements as well, not just refs, which means that you can do this:

```ts
const { width, height } = useResizeObserver<HTMLDivElement>({
  ref: divElement,
});
```

## Using a single hook to measure multiple refs

The hook reacts to ref changes, as it resolves it to an element to observe.
This means that you can freely change the custom `ref` option from one ref to
another and back, and the hook will start observing whatever is set in its options.

## Opting Out of (or Delaying) ResizeObserver instantiation

In certain cases you might want to delay creating a ResizeObserver instance.

You might provide a library, that only optionally provides observation features
based on props, which means that while you have the hook within your component,
you might not want to actually initialise it.

Another example is that you might want to entirely opt out of initialising, when
you run some tests, where the environment does not provide the `ResizeObserver`.

([See discussions](https://github.com/ZeeCoder/use-resize-observer/issues/40))

You can do one of the following depending on your needs:

- Use the default `ref` RefCallback, or provide a custom ref conditionally,
  only when needed. The hook will not create a ResizeObserver instance up until
  there's something there to actually observe.
- Patch the test environment, and make a polyfill available as the ResizeObserver.
  (This assumes you don't already use the polyfilled version, which would switch
  to the polyfill when no native implementation was available.)

## The "onResize" callback

By the default the hook will trigger a re-render on all changes to the target
element's width and / or height.

You can opt out of this behaviour, by providing an `onResize` callback function,
which'll simply receive the width and height of the element when it changes, so
that you can decide what to do with it:

```tsx
import React from "react";
import useResizeObserver from "use-resize-observer";

const App = () => {
  // width / height will not be returned here when the onResize callback is present
  const { ref } = useResizeObserver<HTMLDivElement>({
    onResize: ({ width, height }) => {
      // do something here.
    },
  });

  return <div ref={ref} />;
};
```

This callback also makes it possible to implement your own hooks that report only
what you need, for example:

- Reporting only width or height
- Throttle / debounce
- Wrap in `requestAnimationFrame`

## Throttle / Debounce

You might want to receive values less frequently than changes actually occur.

While this hook does not come with its own implementation of throttling / debouncing,
you can use the `onResize` callback to implement your own version:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-throttle-and-debounce-8uvsg)

## Defaults (SSR)

On initial mount the ResizeObserver will take a little time to report on the
actual size.

Until the hook receives the first measurement, it returns `undefined` for width
and height by default.

You can override this behaviour, which could be useful for SSR as well.

```ts
const { ref, width = 100, height = 50 } = useResizeObserver<HTMLDivElement>();
```

Here "width" and "height" will be 100 and 50 respectively, until the
ResizeObserver kicks in and reports the actual size.

## Without Defaults

If you only want real measurements (only values from the ResizeObserver without
any default values), then you can just leave defaults off:

```ts
const { ref, width, height } = useResizeObserver<HTMLDivElement>();
```

Here "width" and "height" will be undefined until the ResizeObserver takes its
first measurement.

## Container/Element Query with CSS-in-JS

It's possible to apply styles conditionally based on the width / height of an
element using a CSS-in-JS solution, which is the basic idea behind
container/element queries:

[CodeSandbox Demo](https://codesandbox.io/s/use-resize-observer-container-query-with-css-in-js-iitxl)

## Transpilation / Polyfilling

By default the library provides transpiled ES5 modules in CJS / ESM module formats.

Polyfilling is recommended to be done in the host app, and not within imported
libraries, as that way consumers have control over the exact polyfills being used.

That said, there's a [polyfilled](https://github.com/que-etc/resize-observer-polyfill)
CJS module that can be used for convenience (Not affecting globals):

```js
import useResizeObserver from "use-resize-observer/polyfilled";
```

## Related

- [@zeecoder/container-query](https://github.com/ZeeCoder/container-query)
- [@zeecoder/react-resize-observer](https://github.com/ZeeCoder/react-resize-observer)

## License

MIT
