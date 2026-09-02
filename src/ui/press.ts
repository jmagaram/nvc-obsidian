/**
 * The half of a press that cannot be CSS: the flash a control gives when it is
 * pressed from the keyboard.
 *
 * `:active` is a pointer state. A button pressed with Enter never enters it in
 * any browser, and one pressed with Space enters it only for as long as the key
 * is held — so a hand on the keyboard got either nothing at all or a dip whose
 * length depended on how long a finger rested on a key. That is the wrong way
 * round for this dialog. The hub and the list are walked with the arrows from a
 * single tab stop, so the keyboard is not the fallback path through the
 * inventory; it is the fast one, and it was the path with no feedback.
 *
 * A class, held for the length of one animation, standing in for the state the
 * browser will not give. Everything it looks like lives in dialog.css beside
 * the `:active` rules it shares — see "hover and press" — and so does the
 * duration, which is why the class comes off when the animation reports itself
 * done rather than on a timer counting the same milliseconds out again here.
 */
const PRESSED = 'nvc-pressed'

/**
 * Which press a control is currently showing.
 *
 * A control pressed again while its flash is still running has that flash
 * restarted, and restarting cancels the first animation — which settles its
 * `finished` promise. Without a token to check against, that first press would
 * come back a beat later and strip the class off the second one, so holding a
 * key down would flash once and then go dead for as long as it repeated.
 */
const showing = new WeakMap<Element, object>()

/**
 * Flash the control a keyboard click landed on.
 *
 * One listener on the dialog rather than a handler per button, because every
 * control in here already has an `onClick` doing the real work and this is not
 * part of it — a screen should not have to remember to ask for feedback, and
 * `Dialog` is the one element every click passes through on its way out.
 *
 * `detail` is what tells the two apart: it counts the clicks in a pointer
 * gesture, so a mouse or a tap arrives with at least one and a key arrives with
 * none. A pointer press is already answered by `:active`, and answering it
 * twice over would leave the flash still running after the button had come back
 * up under the finger.
 */
export function flashKeyboardPress(event: {
  detail: number
  target: EventTarget | null
}) {
  if (event.detail !== 0) return
  if (!(event.target instanceof Element)) return
  const control = event.target.closest('button')
  if (!control) return

  /* Off, then a read of the layout to make the removal take, then on. Without
     the read the two writes coalesce into no change at all, and a second press
     inside the first one's animation joins it rather than restarting it — which
     is exactly the case this exists for, since holding a key down repeats it. */
  control.classList.remove(PRESSED)
  void control.offsetWidth
  control.classList.add(PRESSED)

  const press = {}
  showing.set(control, press)
  const done = () => {
    if (showing.get(control) !== press) return
    showing.delete(control)
    control.classList.remove(PRESSED)
  }

  /* Asked of the animation rather than waited for as an event, and the
     difference is the empty case. `animationend` never arrives if no animation
     ever ran — a control the host has animations switched off for, one styled
     out of the box tree at the moment of the press — and the class would then
     sit on that button looking pressed for the rest of the screen's life. Here
     an empty list simply means there is nothing to wait for.
     `.then(done, done)` because a cancelled animation rejects, and a cancelled
     one is a control pressed again, which `showing` has already answered.
     src/ui/arrival.ts waits on the slide the same way. */
  const flash = control.getAnimations()
  if (flash.length === 0) return done()
  Promise.all(flash.map((a) => a.finished)).then(done, done)
}
