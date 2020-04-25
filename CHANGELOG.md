# CHANGELOG

## 6.1.0-alpha3

- Fixed SSR rendering, and added a test to cover it.

## 6.1.0-alpha2

- ResizeObserver instances are no longer created unnecessarily when the onResize
  callback changes. (Fixes #32)
- Written new tests in [react testing library](https://github.com/testing-library/react-testing-library).

## 6.1.0-alpha1

- Rewrote the source in TypeScript. (Feedback is welcome.)
- Rewrote tests in TypeScript as well. (Ensures the types make sense.)
- Added checks to ensure reasonable bundle size.

## 6.0.0

- **[BREAKING]** Default width and height can now be set by declaring defaults
  for object destructuring, instead of having custom options for them.
  This means the following options were removed: `defaultWidth`, `defaultHeight`,
  `useDefaults`.
- **[BREAKING]** Due to the above, the default width and height will be
  `undefined` instead of `1`.
- Docs were updated to reflect the above changes.
- Added an `onResize` handler that can report size changes instead of the default
  object return. (This also helps implementing a more performant throttle /
  debounce solution.)

## 5.0.0

- **[BREAKING]** `#14` Removed the polyfill from the default builds, and shipping
  it instead as as separate module.
- **[BREAKING]** `#21` Returning an object instead of an array, so that values not
  needed could be omitted.
- `#18` Added missing copyright notice in the MIT license.
- Improved ref handling:
  - `#16` You can now pass in your own ref
  - The same hook instance can now be reused with different refs
  - The hook will no longer break if the ref is not immediately filled.
    (Anything other than an object with a `.current` value of an `Element` will
    be ignored.)
- Made defaults optional with the `useDefaults` option.
- New `package.json` scripts to ease development
- Added throttle and debounce guides to the readme
- More tests

## 4.0.0

- Added option to pass default width and height. Useful when using the lib with
  SSR. (Thanks [Simon Boudrias](https://github.com/SBoudrias) and
  [Fokke Zandbergen](https://github.com/FokkeZB))
- Dep upgrades
- **[BREAKING]** Removed TS types. See:
  - https://github.com/ZeeCoder/use-resize-observer/issues/12
  - https://github.com/ZeeCoder/use-resize-observer/pull/13
  - https://github.com/ZeeCoder/use-resize-observer/pull/8

## 3.1.0

- Added Typescript types

## 3.0.0

- **[BREAKING]** Requires React 16.8.0 or above, which is the first non-alpha
  release that includes hooks

## 2.0.1

- No real changes, testing travis deployment from master

## 2.0.0

- **[BREAKING]** Returning a tuple and creating a ref object automatically
- Using resize-observer-polyfill instead of resize-observer
- Fixed an issue where resize observer would trigger changes endlessly
- Added tests using Karma

## 1.0.0

- Initial release
