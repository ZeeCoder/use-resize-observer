# CHANGELOG

## 5.0.0

- **[BREAKING]** Removed Babel code transpiling and the ResizeObserver polyfill.
- **[BREAKING]** Returning an object instead of an array, so that the returned
  values could be omitted when not needed.
- `#18` Added missing copyright notice in the MIT license.
- New `package.json` scripts to ease development
- Improved ref handling:
  - You can now pass in your own ref
  - Ref changes are handled: TODO better explanation
  - The hook will no longer break if an invalid ref is passed in.
    (Anything other than an object with a `.current` value of an `Element` )
- TODO: Document useDefaults
- TODO: Document throttle / debounce solutions

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
