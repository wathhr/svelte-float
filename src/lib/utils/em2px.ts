export function em2px(em: number, base?: HTMLElement) {
  base ??= document.documentElement;
  const px = parseFloat(getComputedStyle(base).fontSize);

  return em * px;
}

export { em2px as rem2px };
