# [7.0.0-alpha.2](https://github.com/ZeeCoder/use-resize-observer/compare/v7.0.0-alpha.1...v7.0.0-alpha.2) (2020-11-11)

- Added Semantic Release ([54a83ce](https://github.com/ZeeCoder/use-resize-observer/commit/54a83cede6fcb8dbfa9e0f9a0ea2f1f4557b606f))

### BREAKING CHANGES

- The returned ref is now a RefCallback, not a ref object

- The returned ref will always be the same RefCallback.
  Previously when a custom ref object was passed, it was returned as well from
  the hook as "ref".
- Compared to 6.2.0-alpha.1 There's no `callbackRef` return value
  anymore.
