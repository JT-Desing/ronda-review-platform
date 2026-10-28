export function ignoreReviewShortcut(event, document) {
 if(event.defaultPrevented || document.querySelector('[role="dialog"][aria-modal="true"]'))return true;
 // Escape must still leave fullscreen when focus is on its exit button.
 return event.key!=='Escape' && !!event.target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],audio,video');
}
export function containDialogFocus(event, dialog) {
 if(event.key!=='Tab')return;
 const items=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')];
 const first=items[0],last=items.at(-1);
 if(!first)return;
 if(event.shiftKey&&dialog.ownerDocument.activeElement===first){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&dialog.ownerDocument.activeElement===last){event.preventDefault();first.focus();}
}
