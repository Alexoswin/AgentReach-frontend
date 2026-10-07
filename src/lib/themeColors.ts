/**
 * Theme colors for code that can't consume CSS variables directly
 * (canvas, chart libraries). Theme tokens may hold light-dark() values,
 * so they are resolved through a hidden probe element rather than read
 * as raw strings.
 */

/** Resolves each CSS custom property in `variables` to a concrete color. */
export function resolveCssColors<K extends string>(
  variables: Record<K, string>
): Record<K, string> {
  const probe = document.createElement('div');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const colors = {} as Record<K, string>;
  for (const key in variables) {
    probe.style.color = `var(${variables[key]})`;
    colors[key] = getComputedStyle(probe).color;
  }
  probe.remove();
  return colors;
}

/** Whether a light-family theme is applied (see localAuth.applyTheme). */
export function isLightTheme() {
  return document.body.classList.contains('theme-light');
}

/**
 * Runs `callback` after the theme or accent on <body> changes and returns
 * an unsubscribe function. Watches the DOM rather than the
 * `reachconvert:user-updated` event: callers fire that event before
 * applyTheme() runs, so its listeners would read the previous colors.
 */
export function onThemeChange(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'data-accent'],
  });
  return () => observer.disconnect();
}
