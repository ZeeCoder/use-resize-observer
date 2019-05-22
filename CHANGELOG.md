# CHANGELOG

## 3.2.0

- Added option to pass default width and height. This is useful when using this plugin on the SSR side.

Demo:

```js
const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 600;

const [ref, width, height] = useResizeObserver(DEFAULT_WIDTH, DEFAULT_HEIGHT);
```

## 3.1.0

- Added Typescript types

## 3.0.0

- **[BREAKING]** Requires React 16.8.0 or above, which is the first non-alpha release
  that includes hooks

## 2.0.1

- No real changes, testing travis deployment from master

## 2.0.0

- **[BREAKING]** Returning a tuple and creating a ref object automatically
- Using resize-observer-polyfill instead of resize-observer
- Fixed an issue where resize observer would trigger changes endlessly
- Added tests using Karma

## 1.0.0

- Initial release
