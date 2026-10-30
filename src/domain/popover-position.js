const EDGE=12,GAP=18;
const clamp=(value,min,max)=>Math.max(min,Math.min(value,max));

// Window coordinates for a popover anchored to a point: below it when it fits, otherwise
// above, and always inside the window.
export function placePopover(anchor,size,viewport){
  const fitsBelow=anchor.y+GAP+size.height<=viewport.height-EDGE;
  const top=fitsBelow?anchor.y+GAP:anchor.y-GAP-size.height;
  return {
    left:clamp(anchor.x-size.width/2,EDGE,Math.max(EDGE,viewport.width-size.width-EDGE)),
    top:clamp(top,EDGE,Math.max(EDGE,viewport.height-size.height-EDGE)),
    placement:fitsBelow?'below':'above',
  };
}

// Position after dragging by delta. Placement says which way the mention menu has room.
export function movePopover(from,delta,size,viewport){
  const top=clamp(from.top+delta.y,EDGE,Math.max(EDGE,viewport.height-size.height-EDGE));
  return {
    left:clamp(from.left+delta.x,EDGE,Math.max(EDGE,viewport.width-size.width-EDGE)),
    top,
    placement:top+size.height/2>viewport.height/2?'above':'below',
  };
}
