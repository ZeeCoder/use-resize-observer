// We're only using the first element of the size sequences, until future versions of the spec solidify on how
// exactly it'll be used for fragments in multi-column scenarios:
// From the spec:
// > The box size properties are exposed as FrozenArray in order to support elements that have multiple fragments,
// > which occur in multi-column scenarios. However the current definitions of content rect and border box do not
// > mention how those boxes are affected by multi-column layout. In this spec, there will only be a single
// > ResizeObserverSize returned in the FrozenArray, which will correspond to the dimensions of the first column.
// > A future version of this spec will extend the returned FrozenArray to contain the per-fragment size information.
// (https://drafts.csswg.org/resize-observer/#resize-observer-entry-interface)
//
// Also, testing these new box options revealed that in both Chrome and FF everything is returned in the callback,
// regardless of the "box" option.
// The spec states the following on this:
// > This does not have any impact on which box dimensions are returned to the defined callback when the event
// > is fired, it solely defines which box the author wishes to observe layout changes on.
// (https://drafts.csswg.org/resize-observer/#resize-observer-interface)
// I'm not exactly clear on what this means, especially when you consider a later section stating the following:
// > This section is non-normative. An author may desire to observe more than one CSS box.
// > In this case, author will need to use multiple ResizeObservers.
// (https://drafts.csswg.org/resize-observer/#resize-observer-interface)
// Which is clearly not how current browser implementations behave, and seems to contradict the previous quote.
// For this reason I decided to only return the requested size,
// even though it seems we have access to results for all box types.
// This also means that we get to keep the current api, being able to return a simple { width, height } pair,
// regardless of box option.
export default function extractSize(
  entry: ResizeObserverEntry,
  boxProp: "borderBoxSize" | "contentBoxSize" | "devicePixelContentBoxSize",
  sizeType: keyof ResizeObserverSize
): number | undefined {
  if (!entry[boxProp]) {
    if (boxProp === "contentBoxSize") {
      // The dimensions in `contentBoxSize` and `contentRect` are equivalent according to the spec.
      // See the 6th step in the description for the RO algorithm:
      // https://drafts.csswg.org/resize-observer/#create-and-populate-resizeobserverentry-h
      // > Set this.contentRect to logical this.contentBoxSize given target and observedBox of "content-box".
      // In real browser implementations of course these objects differ, but the width/height values should be equivalent.
      return entry.contentRect[sizeType === "inlineSize" ? "width" : "height"];
    }

    return undefined;
  }

  // A couple bytes smaller than calling Array.isArray() and just as effective here.
  return entry[boxProp][0]
    ? entry[boxProp][0][sizeType]
    : // TS complains about this, because the RO entry type follows the spec and does not reflect Firefox's current
      // behaviour of returning objects instead of arrays for `borderBoxSize` and `contentBoxSize`.
      // @ts-ignore
      entry[boxProp][sizeType];
}
