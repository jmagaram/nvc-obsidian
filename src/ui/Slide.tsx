import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Arriving } from "./arrival";

/** Keep in step with the animation length in index.css. */
const DURATION = 260;

type Snapshot = { key: string; node: ReactNode; scrollTop: number };

function Layer({
  className,
  scrollTop,
  onScrollTop,
  children,
}: {
  className: string;
  scrollTop?: number;
  onScrollTop?: (value: number) => void;
  children: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);

  // The outgoing layer is a fresh DOM node, so it would otherwise slide away
  // scrolled to the top. Put it back where the user left it.
  useLayoutEffect(() => {
    if (scrollTop === undefined) return;
    const body = el.current?.querySelector(".dialog-body");
    if (body) body.scrollTop = scrollTop;
  }, [scrollTop]);

  // `scroll` does not bubble, so listen in the capture phase.
  useEffect(() => {
    const node = el.current;
    if (!node || !onScrollTop) return;
    const handle = (e: Event) =>
      onScrollTop((e.target as HTMLElement).scrollTop);
    node.addEventListener("scroll", handle, true);
    return () => node.removeEventListener("scroll", handle, true);
  }, [onScrollTop]);

  return (
    <div className={className} ref={el}>
      {children}
    </div>
  );
}

/**
 * Slides one view out and the next one in. `rank` orders the screens, so the
 * direction falls out of the comparison rather than being passed around: a
 * higher rank pushes forward, a lower one pops back.
 */
export function Slide({
  screenKey,
  rank,
  restoreScroll = true,
  trackScroll = true,
  children,
}: {
  screenKey: string;
  rank: number;
  /** Off when the incoming view positions itself, e.g. a list revealing a row. */
  restoreScroll?: boolean;
  /** Off for a nested slide, which moves content inside somebody else's
      scrolling body and must not touch it. */
  trackScroll?: boolean;
  children: ReactNode;
}) {
  const [leaving, setLeaving] = useState<Snapshot | null>(null);
  const [forward, setForward] = useState(true);
  const [restore, setRestore] = useState<number | undefined>(undefined);
  const last = useRef({ key: screenKey, node: children, rank });
  const scrollTop = useRef(0);
  const positions = useRef(new Map<string, number>());
  const record = useCallback((value: number) => {
    scrollTop.current = value;
  }, []);

  // Runs before paint, so the incoming layer is never seen at rest first.
  useLayoutEffect(() => {
    if (last.current.key === screenKey) {
      last.current.node = children;
      return;
    }
    positions.current.set(last.current.key, scrollTop.current);
    setForward(rank > last.current.rank);
    setLeaving({
      key: last.current.key,
      node: last.current.node,
      scrollTop: scrollTop.current,
    });
    const remembered = restoreScroll
      ? positions.current.get(screenKey)
      : undefined;
    setRestore(remembered);
    last.current = { key: screenKey, node: children, rank };
    scrollTop.current = remembered ?? 0;
  }, [screenKey, rank, children, restoreScroll]);

  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(null), DURATION);
    return () => clearTimeout(id);
  }, [leaving]);

  const dir = forward ? "fwd" : "back";

  return (
    <div className="stage">
      {leaving ? (
        <Layer
          key={leaving.key}
          className={`layer leave-${dir}`}
          scrollTop={trackScroll ? leaving.scrollTop : undefined}
        >
          {/* This copy is a fresh mount of a screen that is on its way out —
              which is why its scroll position has to be put back above, and why
              anything it does on arrival would be wrong. See `Arriving`. */}
          <Arriving value={false}>{leaving.node}</Arriving>
        </Layer>
      ) : null}
      <Layer
        key={screenKey}
        className={leaving ? `layer enter-${dir}` : "layer"}
        scrollTop={trackScroll ? restore : undefined}
        onScrollTop={trackScroll ? record : undefined}
      >
        {children}
      </Layer>
    </div>
  );
}
