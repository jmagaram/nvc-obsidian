import { useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { FocusScreen } from '../model/screen'
import {
  COMMIT_EASING,
  PAGE_EASING,
  PAGE_MS,
  SLOP,
  SNAP_EASING,
  frame,
  progressOf,
  settleMs,
  shouldCommit,
  velocityFrom,
  wallFrame,
  type Direction,
  type Progress,
  type Sample,
} from './motion'

/**
 * The deck's two layers, the one movement that carries a card off and the next
 * one on, and the thumb that can drive it.
 *
 * `Slide` does this for whole screens and cannot do it here, for a reason that
 * is about data rather than animation: it snapshots the screen you have already
 * left, so the only other card it can ever hold is the one behind you. A drag
 * has to draw the card you are pulling *toward*, before any state has changed
 * and while you are still free to change your mind. So the deck gets its own,
 * and `Slide` is left alone for the screens above it.
 *
 * What moves is not a new design. src/dialog.css draws a push — the arriving
 * card comes a whole stage width, the leaving one gives up 28% of it and half
 * its opacity — and this reads that same curve at a point instead of over
 * 260ms. A button, an arrow key and a thumb all move the same `p` from 0 to 1;
 * only what supplies it differs, and all three settle down one path. See
 * src/ui/motion.ts, which holds the curve and nothing else.
 *
 * The two slots are fixed and the cards move through them: slot 0 is the card
 * being left, slot 1 the card being arrived at. That order is what lets the
 * arriving card paint over the leaving one without a z-index, and it is why
 * nothing remounts at the moment a drag commits — the card under the finger
 * keeps the slot and the key it was already in, and the card being dragged
 * toward stops being a neighbour and starts being the screen, in the same slot
 * under the same key. There is nothing for React to change, so nothing blinks.
 */

const keyOf = (s: FocusScreen) =>
  s.kind === 'focusEnd' ? 'end' : `card:${s.position}`

/* Forward is a higher rank, which is the comparison `Slide` makes too. The
   closing card ranks past the last of them because that is where it stands. */
const rankOf = (s: FocusScreen) =>
  s.kind === 'focusEnd' ? s.total + 1 : s.position

type Snapshot = { key: string; node: ReactNode }

type Motion = {
  dir: Direction
  /** The card being left. Read only once committed; live before that. */
  from: Snapshot
  /** Null at a wall, where there is no card that way and nothing to draw. */
  toKey: string | null
  /** Read only once committed; before that slot 1 draws the live neighbour. */
  toNode: ReactNode
  /** False while a thumb is still on it and the state has not moved yet. */
  committed: boolean
  /** Where the settle starts: 0 for a keypress, wherever the finger left off. */
  startP: Progress
  /** Where it ends. 1 arrived; 0 refused — a snap-back and a wall both end there. */
  target: Progress
  ms: number
  easing: string
}

/** What the pointer keeps for itself between one event and the next. */
type Drag = {
  id: number
  x0: number
  y0: number
  /** Where the drag armed. Progress is measured from here rather than from the
      press, so the card does not jump the slop's worth of pixels as it takes. */
  armX: number
  armed: boolean
  /** Locked to the vertical: this pointer scrolls, and can never arm. */
  dead: boolean
  dir: Direction
  p: Progress
  samples: Sample[]
  width: number
  detach: () => void
}

const reduced = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

export function Deck({
  screen,
  prev,
  next,
  onPage,
  children,
}: {
  screen: FocusScreen
  /** The card either side, or null at the ends of the deck. */
  prev: FocusScreen | null
  next: FocusScreen | null
  onPage: (delta: Direction) => void
  children: (screen: FocusScreen) => ReactNode
}) {
  const rendered = children(screen)
  const key = keyOf(screen)
  const rank = rankOf(screen)

  const [motion, setMotion] = useState<Motion | null>(null)
  const last = useRef({ key, rank, node: rendered })
  const stageEl = useRef<HTMLDivElement>(null)
  const fromEl = useRef<HTMLDivElement>(null)
  const toEl = useRef<HTMLDivElement>(null)
  const running = useRef<Animation[]>([])
  const drag = useRef<Drag | null>(null)
  /* Whether the press that is ending moved far enough to be a drag. Read by the
     click swallower at the bottom, and by nothing else. */
  const moved = useRef(false)

  /* The motion as the pointer handlers see it. They run between renders and
     cannot read the state, and the place that matters is arming: the move that
     arms a drag and the move after it are often in the same frame. */
  const live = useRef<Motion | null>(null)
  const begin = (m: Motion | null) => {
    live.current = m
    setMotion(m)
  }

  /* Everything the pointer handlers need from the render, kept fresh in the
     shape src/ui/arrival.ts uses: the effect depends on nothing and says so.
     A gesture outlives many renders — arming causes one, and a card toggled
     under the thumb causes another — and every one of them can change what the
     release should do. Reading them off a closure taken at `pointerdown` would
     answer with whatever was true when the finger landed. */
  const now = useRef({ prev, next, onPage, key, rank, rendered, children })
  useLayoutEffect(() => {
    now.current = { prev, next, onPage, key, rank, rendered, children }
  })

  const at = (p: Progress, m: Motion) =>
    m.toKey === null ? wallFrame(p, m.dir) : frame(p, m.dir)

  /* Written straight onto the elements rather than rendered as a `style` prop.
     A card can be toggled while it is moving — Space answers the deck wherever
     focus is — and a render carrying `style` would put the layer back wherever
     React last thought it was, mid-gesture. Nothing here renders `style`, so
     nothing can. */
  const applyFrame = (p: Progress, m: Motion) => {
    const f = at(p, m)
    const a = fromEl.current
    if (a) {
      a.style.transform = f.from.x
      a.style.opacity = f.from.o
      /* Going back, the card you are leaving travels the long way and has to be
         seen doing it — the same reason `.leave-back` carries a z-index. */
      a.style.zIndex = m.dir === -1 ? '2' : ''
    }
    const b = toEl.current
    if (b && f.to) {
      b.style.transform = f.to.x
      b.style.opacity = f.to.o
    }
  }

  /** How long the cursor under the card should take, for one settle. */
  const setDeckMs = (ms: number | null) => {
    const body = stageEl.current?.closest('.focus-body')
    if (!(body instanceof HTMLElement)) return
    if (ms === null) body.style.removeProperty('--nvc-deck-ms')
    else body.style.setProperty('--nvc-deck-ms', Math.round(ms) + 'ms')
  }

  /**
   * A button or an arrow key moved the deck: begin the standing 260ms push.
   *
   * Runs before paint, so the arriving card is never seen at rest first; the
   * same guarantee `Slide` takes.
   *
   * A released drag never reaches here, and must not. It arrives with its
   * layers already on screen and already keyed, so it settles them itself and
   * moves `last` on before dispatching — see `finish`. Left to this effect the
   * commit would take one render in between, holding a motion that still
   * described the old screen while `screen` had already moved to the new one,
   * and in that render both layers would name the same card. Two children of
   * one parent under one key is not something React will draw twice and then
   * put right: it leaves a layer behind that no later render can reach.
   */
  useLayoutEffect(() => {
    if (last.current.key === key) {
      last.current.node = rendered
      last.current.rank = rank
      return
    }
    begin({
      dir: rank > last.current.rank ? 1 : -1,
      from: { key: last.current.key, node: last.current.node },
      toKey: key,
      toNode: rendered,
      committed: true,
      startP: 0,
      target: 1,
      ms: PAGE_MS,
      easing: PAGE_EASING,
    })
    last.current = { key, rank, node: rendered }
  }, [key, rank, rendered])

  /** Put the layers where the motion says, then finish the movement off. */
  useLayoutEffect(() => {
    const leaving = fromEl.current
    /* Slot 0 is rendered whether or not there is a motion, and a layout effect
       runs after the commit that rendered it, so the element is always there by
       now. The test is for the type, not for a case. */
    if (!motion || !leaving) return

    /* Under a reduced-motion setting the card is simply *there*, which is what
       this screen already did — `.layer { animation: none }` in the media query
       in src/dialog.css used to say it, and cannot any more, because that rule
       reaches CSS animations and what runs below is not one. Said here instead,
       as a duration of nothing rather than as a second path, so there stays one
       way a page change finishes.

       Only the part that happens on its own is dropped. A drag still tracks the
       finger, because a card that will not follow a thumb is broken rather than
       calm. */
    const instant = reduced()
    const startP = instant ? motion.target : motion.startP
    applyFrame(startP, motion)

    /* A drag still under a thumb has positioned itself and stops here; the
       pointer handler drives it from now on. */
    if (!motion.committed) return

    const start = at(startP, motion)
    const end = at(motion.target, motion)
    const ms = instant ? 0 : motion.ms
    const options = {
      duration: ms,
      easing: motion.easing,
      fill: 'forwards' as const,
    }
    const pair = (a: { x: string; o: string }, b: { x: string; o: string }) => [
      { transform: a.x, opacity: a.o },
      { transform: b.x, opacity: b.o },
    ]

    const anims: Animation[] = []
    if (ms > 0) {
      anims.push(leaving.animate(pair(start.from, end.from), options))
      const arriving = toEl.current
      if (arriving && start.to && end.to)
        anims.push(arriving.animate(pair(start.to, end.to), options))
    }
    running.current = anims

    /* The clock ends the movement and the animation only draws it — which is
       the arrangement `Slide` already has, and worth keeping for two reasons
       beyond consistency.

       An animation's `finish` event is delivered by the rendering loop, so it
       is owed to nothing: a tab in the background, or a compositor that has
       stopped, would leave the card halfway and the deck holding two layers
       with no way back. A timer is not on that loop and cannot be stranded by
       it.

       And it is what makes this checkable at all. Headless Chrome, which is how
       this project verifies what it draws, runs no rendering loop under
       `--dump-dom`: animations never advance there, and even `finish()` leaves
       the event undelivered. Timers do run. So the end state is reachable in
       the harness for the same reason it is reachable in a background tab.

       The end state is written as inline styles before the fill is dropped, so
       there is no frame between the animation letting go and the layer being
       told where it ended up. The leaving layer is deliberately *not* put back
       — after a commit it is about to be unmounted, and a layer told to return
       to the middle of the stage while still on screen is exactly the flash
       this avoids. Going back it also carries a z-index, so it would flash over
       the card that just arrived rather than behind it. */
    const done = setTimeout(() => {
      applyFrame(motion.target, motion)
      for (const a of anims) a.cancel()
      running.current = []
      setDeckMs(null)
      begin(null)
    }, ms)

    return () => {
      clearTimeout(done)
      for (const a of anims) a.cancel()
      running.current = []
    }
  }, [motion])

  /**
   * Nothing on screen carries a leftover.
   *
   * After the render that drops the motion rather than inside it: at that point
   * whatever survived is where it belongs, so clearing is invisible, and the
   * layer that did not survive has already gone. It matters most for a drag
   * that was refused, where the card under the finger keeps its key and so
   * keeps its element — React does not clean up styles it did not write, and a
   * layer left holding `translateX(0%)` is a containing block that nothing
   * afterwards accounts for.
   */
  useLayoutEffect(() => {
    if (motion) return
    const a = fromEl.current
    if (!a) return
    a.style.transform = ''
    a.style.opacity = ''
    a.style.zIndex = ''
  }, [motion])

  /* ---- the thumb ---- */

  const stopDragging = () => {
    stageEl.current?.classList.remove('is-dragging')
    drag.current?.detach()
    drag.current = null
  }

  /**
   * A gesture ends: either it turned the card, or it puts it back.
   *
   * Both go down the same settle. A commit hands `release` to the key-change
   * effect and lets the dispatch bring the new screen with it; a refusal builds
   * the same motion aimed at 0 rather than 1. The only asymmetry is the one
   * that has to exist — a refusal changes no state, so there is no key change
   * to hang it on.
   */
  const finish = (d: Drag, e: PointerEvent, cancelled: boolean) => {
    const m = live.current
    const n = now.current
    stopDragging()
    if (!d.armed || !m) return

    const width = d.width
    const p = d.p
    /* A cancelled pointer is the browser taking the gesture for a scroll. That
       is not a decision about the card, so it never turns one. */
    const v = cancelled
      ? 0
      : velocityFrom([...d.samples, { t: e.timeStamp, x: e.clientX }])
    const travelled = Math.abs(e.clientX - d.armX)
    const toward = d.dir === 1 ? n.next : n.prev
    const commit =
      !cancelled &&
      m.toKey !== null &&
      toward !== null &&
      shouldCommit(d.dir, travelled, v, width)

    if (commit && toward) {
      const ms = settleMs((1 - p) * width, v)
      /* Before the dispatch, so the cursor under the card is already running on
         the same clock by the time it is asked to move. */
      setDeckMs(ms)
      /* The settle and the dispatch together, in one handler, so React draws
         them in one render. The layers do not move: slot 0 keeps the key it had
         under the finger and only swaps its live card for a frozen copy, slot 1
         keeps the key it was being dragged toward and becomes the screen. And
         `last` is moved on by hand, because the key-change effect must not also
         answer this dispatch — that is its whole reason for skipping. */
      begin({
        ...m,
        from: { key: n.key, node: n.rendered },
        toNode: n.children(toward),
        committed: true,
        startP: p,
        target: 1,
        ms,
        easing: COMMIT_EASING,
      })
      last.current = {
        key: keyOf(toward),
        rank: rankOf(toward),
        node: n.children(toward),
      }
      n.onPage(d.dir)
      return
    }

    begin({
      ...m,
      committed: true,
      startP: p,
      target: 0,
      ms: settleMs(p * width, v),
      easing: SNAP_EASING,
    })
  }

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const stage = stageEl.current
    if (!stage || drag.current || !e.isPrimary) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    /* The note's controls are pressed, not pulled. A drag begun on one would
       have to decide what its release meant, and "both" is not an answer a
       button can give. Only `button`, unlike the card's own tap guard: the
       empty half of the note's row is a fine place to start a swipe from, and
       it was only a *tap* there that had to be protected from a near miss. */
    if ((e.target as Element).closest('button')) return

    /* A settle still running is already decided — the state behind it moved
       when the finger came off. So it is finished on the spot rather than
       chased: at worst the card jumps whatever it had left, which is the price
       of the second flick being answered at all. */
    const m = live.current
    if (m?.committed) {
      for (const a of running.current) a.cancel()
      running.current = []
      applyFrame(m.target, m)
      setDeckMs(null)
      begin(null)
    }

    moved.current = false

    const onMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.id) return
      d.samples.push({ t: ev.timeStamp, x: ev.clientX })
      if (d.samples.length > 12) d.samples.shift()
      if (d.dead) return

      if (!d.armed) {
        const dx = ev.clientX - d.x0
        const dy = ev.clientY - d.y0
        /* The axis, decided once and never revisited. `touch-action: pan-y` in
           src/dialog.css already hands the browser the vertical for a finger;
           this is the same rule for a mouse, which reports no gesture of its
           own and would otherwise arm a sideways drag out of the jitter in a
           straight pull down a scrolling definition. */
        if (Math.abs(dy) >= SLOP && Math.abs(dy) > Math.abs(dx)) {
          d.dead = true
          return
        }
        if (Math.abs(dx) < SLOP || Math.abs(dx) <= Math.abs(dy)) return

        d.armed = true
        d.armX = ev.clientX
        d.dir = dx < 0 ? 1 : -1
        moved.current = true
        stageEl.current?.classList.add('is-dragging')
        /* Whatever a sideways sweep across the definition had already selected
           before it became a drag. The stylesheet stops the next one; this lets
           go of the one in hand. */
        getSelection()?.removeAllRanges()
        const toward = d.dir === 1 ? now.current.next : now.current.prev
        begin({
          dir: d.dir,
          from: { key: now.current.key, node: now.current.rendered },
          toKey: toward ? keyOf(toward) : null,
          /* Drawn once, here. Nothing about the card being pulled toward can
             change while it is being pulled — only the card under the thumb can
             be answered — and a node captured now is one the commit can hand
             straight on without React seeing a different element. */
          toNode: toward ? now.current.children(toward) : null,
          committed: false,
          startP: 0,
          target: 0,
          ms: 0,
          easing: SNAP_EASING,
        })
        return
      }

      const open = live.current
      if (!open) return
      /* Measured from where it armed. The direction is not reconsidered: pulled
         back past its origin the card sits at rest rather than swapping the
         neighbour out from under the finger, which is what a phone does and
         what leaves a change of mind reversible. */
      d.p = progressOf(ev.clientX - d.armX, d.width, d.dir)
      applyFrame(d.p, open)
    }

    const onUp = (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.id) return
      finish(d, ev, ev.type === 'pointercancel')
      /* Not cleared in the click handler: a drag does not reliably end in a
         click at all — it may finish over another element, or be taken for a
         scroll — and a `true` left standing would swallow the next honest tap.
         A task later is after whatever click this press does or does not
         produce. */
      setTimeout(() => {
        moved.current = false
      }, 0)
    }

    const detach = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }

    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      armX: e.clientX,
      armed: false,
      dead: false,
      dir: 1,
      p: 0,
      samples: [{ t: e.timeStamp, x: e.clientX }],
      width: stage.clientWidth,
      detach,
    }

    /* Best effort, and the gesture does not rest on it. Capture only retargets
       events that go on bubbling to the window either way, so both paths run
       the same handlers — and it throws for a pointer id the browser has no
       active pointer for, which is every pointer a script makes up. Wrapping it
       is what keeps a driven test on the same road as a thumb. */
    try {
      stage.setPointerCapture(e.pointerId)
    } catch {
      /* No capture. The window listeners are the transport regardless. */
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  useLayoutEffect(() => stopDragging, [])

  /* Slot 0 is the live card until the moment it is left behind, so a word
     toggled under the thumb tints as you drag it away; after that it is the
     frozen copy, because the screen behind it has already moved on. */
  const fromKey = motion ? motion.from.key : key
  const fromNode = motion?.committed ? motion.from.node : rendered

  return (
    <div
      className="stage"
      ref={stageEl}
      onPointerDown={onDown}
      /* Everything inside is pressable and none of it should answer the end of
         a drag: not the card, whose tap toggles it, and not the note's buttons,
         which a drag may well have started beside. One swallower over them all
         rather than a test inside each. */
      onClickCapture={(e) => {
        if (!moved.current) return
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <div className="layer" key={fromKey} ref={fromEl} inert={motion !== null}>
        {fromNode}
      </div>
      {motion && motion.toKey !== null ? (
        <div className="layer" key={motion.toKey} ref={toEl} inert>
          {motion.toNode}
        </div>
      ) : null}
    </div>
  )
}
