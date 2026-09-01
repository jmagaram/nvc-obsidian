import { Plugin } from 'obsidian'
import FeelingPickerModal from './FeelingPickerModal.tsx'
// The plugin's own chrome for the modal frame. Everything else in the shipped
// styles.css comes from src/dialog.css, which the build reaches through the
// import in Dialog.tsx.
import './styles.css'

export default class NvcPlugin extends Plugin {
  onload() {
    /* `callback`, not `editorCallback`: nothing is written to a note yet, so
       the picker should open whether or not one is in front of you. That
       changes when inserting is wired up. */
    this.addCommand({
      id: 'insert-feelings',
      name: 'Insert feelings…',
      callback: () => {
        new FeelingPickerModal(this.app).open()
      },
    })
  }
}
