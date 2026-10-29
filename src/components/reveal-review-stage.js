// After a piece is picked from the cards above the viewer, brings the viewer (its
// title bar) to the top so the person sees what opened. Waits a few frames because
// the review room may remount when the piece changes.
// With remount, the bar on screen when the card is clicked belongs to the old piece, so it waits for a new one.
export function revealReviewStage({ document = globalThis.document, frame = globalThis.requestAnimationFrame, attempts = 60, remount = true } = {}) {
  if (!document || !frame) return;
  const previous = remount ? document.querySelector('.review-main .asset-bar') : null;
  const tryScroll = left => {
    const bar = document.querySelector('.review-main .asset-bar');
    if (bar && bar !== previous) { bar.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (left > 0) frame(() => tryScroll(left - 1));
  };
  frame(() => tryScroll(attempts));
}
