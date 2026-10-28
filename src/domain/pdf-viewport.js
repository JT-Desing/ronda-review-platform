export function pdfFitScale(pageWidth, containerWidth, maxWidth = 900) {
  if (![pageWidth, containerWidth, maxWidth].every(Number.isFinite) || pageWidth <= 0 || containerWidth <= 0 || maxWidth <= 0) return 1;
  return Math.min(maxWidth, containerWidth) / pageWidth;
}
