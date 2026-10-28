export function iframeCaptureRect(frameWidth, frameHeight, viewportWidth, viewportHeight, rect) {
  const values = [frameWidth, frameHeight, viewportWidth, viewportHeight, rect?.left, rect?.top, rect?.width, rect?.height];
  if (values.some(value => !Number.isFinite(value)) || frameWidth <= 0 || frameHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0 || rect.width <= 0 || rect.height <= 0) return null;

  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewportWidth, rect.left + rect.width);
  const bottom = Math.min(viewportHeight, rect.top + rect.height);
  if (right <= left || bottom <= top) return null;

  const scaleX = frameWidth / viewportWidth;
  const scaleY = frameHeight / viewportHeight;
  const x = Math.max(0, Math.floor(left * scaleX));
  const y = Math.max(0, Math.floor(top * scaleY));
  const endX = Math.min(frameWidth, Math.ceil(right * scaleX));
  const endY = Math.min(frameHeight, Math.ceil(bottom * scaleY));
  return endX > x && endY > y ? {x, y, width:endX-x, height:endY-y} : null;
}
