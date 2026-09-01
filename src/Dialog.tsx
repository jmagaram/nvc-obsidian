import { useEffect, useReducer } from 'react'
import './dialog.css'
import { buildMarkdown } from './model/markdown'
import { createInitialState, reducer } from './model/reducer'
import { toScreen } from './model/screen'
import type { Screen } from './model/screen'
import type { Categories } from './model/types'
import { Focus } from './ui/Focus'
import { Hub } from './ui/Hub'
import { HostProvider } from './ui/host'
import type { SetIcon } from './ui/host'
import { List } from './ui/List'
import { Note } from './ui/Note'
import { Slide } from './ui/Slide'

/**
 * A key that changes exactly when the view should animate, and a rank that
 * orders the screens so `Slide` can tell a push from a pop. Focus cards are
 * ranked by position, so paging through the deck slides as well.
 */
function identify(screen: Screen): { key: string; rank: number } {
  switch (screen.kind) {
    case 'hub':
      return { key: 'hub', rank: 0 }
    case 'list':
      return { key: `list:${screen.category}`, rank: 1000 }
    /* One key for the whole deck. Paging between cards is animated inside
       Focus, so the outer layer — header and footer included — must hold still
       through it and only push when the screen itself changes. */
    case 'focusCard':
    case 'focusEnd':
      return { key: `focus:${screen.category}`, rank: 2000 }
    case 'categoryNote':
      return { key: `note:${screen.category}`, rank: 3000 }
    case 'feelingNote':
      return { key: `note:${screen.category}:${screen.word}`, rank: 3000 }
  }
}

export function Dialog({
  categories,
  onInsert,
  onClose,
  icon,
}: {
  categories: Categories
  onInsert: (markdown: string) => void
  onClose: () => void
  /** The host's icon renderer — Obsidian's `setIcon`. Absent in the gallery. */
  icon?: SetIcon
}) {
  const [state, dispatch] = useReducer(reducer, categories, createInitialState)
  const screen = toScreen(state, categories)
  const { key, rank } = identify(screen)

  // The end card pages too, so the keyboard must match the ‹ › buttons there.
  const inFocus = screen.kind === 'focusCard' || screen.kind === 'focusEnd'
  useEffect(() => {
    if (!inFocus) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') dispatch({ type: 'nextCard' })
      if (e.key === 'ArrowLeft') dispatch({ type: 'prevCard' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inFocus])

  function render() {
    switch (screen.kind) {
      case 'hub':
        return (
          <Hub
            cards={screen.cards}
            groups={screen.groups}
            total={screen.total}
            onOpen={(category) => dispatch({ type: 'openCategory', category })}
            onClear={() => dispatch({ type: 'clearAll' })}
            onInsert={() => onInsert(buildMarkdown(state, categories))}
            onClose={onClose}
          />
        )

      case 'list': {
        const category = screen.category
        return (
          <List
            category={category}
            note={screen.note}
            rows={screen.rows}
            count={screen.count}
            reveal={screen.reveal}
            onBack={() => dispatch({ type: 'goHub' })}
            onClose={onClose}
            onOneAtATime={() =>
              dispatch({
                type: 'showFocus',
                category,
                at: { kind: 'card', index: 0 },
              })
            }
            onCategoryNote={() =>
              dispatch({ type: 'openCategoryNote', category, from: 'list' })
            }
            onToggle={(word) =>
              dispatch({ type: 'toggleFeeling', category, word })
            }
            onOpenNote={(word) =>
              dispatch({ type: 'openFeelingNote', category, word, from: 'list' })
            }
          />
        )
      }

      case 'focusCard':
      case 'focusEnd': {
        const category = screen.category
        const word = screen.kind === 'focusCard' ? screen.word : ''
        return (
          <Focus
            screen={screen}
            onBack={() => dispatch({ type: 'goHub' })}
            onClose={onClose}
            onShowList={() => dispatch({ type: 'showList', category })}
            onPrev={() => dispatch({ type: 'prevCard' })}
            onNext={() => dispatch({ type: 'nextCard' })}
            onToggle={() => dispatch({ type: 'toggleFeeling', category, word })}
            onOpenNote={() =>
              dispatch({ type: 'openFeelingNote', category, word, from: 'focus' })
            }
            onCategoryNote={() =>
              dispatch({ type: 'openCategoryNote', category, from: 'focusEnd' })
            }
          />
        )
      }

      case 'categoryNote': {
        const category = screen.category
        return (
          <Note
            title={category}
            label={`Note about ${category}`}
            placeholder={`What's going on with ${category}?`}
            text={screen.text}
            onDone={() => dispatch({ type: 'closeCategoryNote' })}
            onClose={onClose}
            onChange={(text) =>
              dispatch({ type: 'setCategoryNote', category, text })
            }
          />
        )
      }

      case 'feelingNote': {
        const { category, word } = screen
        return (
          <Note
            title={word}
            label="Note"
            placeholder={`What's going on with feeling ${word}?`}
            text={screen.text}
            singleLine
            onDone={() => dispatch({ type: 'closeFeelingNote' })}
            onClose={onClose}
            onChange={(text) =>
              dispatch({ type: 'setFeelingNote', category, word, text })
            }
          />
        )
      }
    }
  }

  // Everything the dialog styles is scoped under this class, so nothing leaks
  // into the Obsidian app around it.
  return (
    <HostProvider icon={icon}>
      <div className="nvc-dialog">
        <Slide
          screenKey={key}
          rank={rank}
          restoreScroll={screen.kind !== 'list' || screen.reveal === null}
        >
          {render()}
        </Slide>
      </div>
    </HostProvider>
  )
}
