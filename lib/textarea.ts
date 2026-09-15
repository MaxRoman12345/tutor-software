import type { KeyboardEvent } from "react";

/**
 * onKeyDown handler that makes Tab insert a real tab character in a controlled
 * textarea (for indenting notes) instead of moving focus. Shift+Tab is left
 * alone so keyboard users can still tab backwards out of the field.
 */
export function tabIndents(
  value: string,
  setValue: (next: string) => void,
) {
  return (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    setValue(value.slice(0, start) + "\t" + value.slice(end));
    // Restore the caret just after the inserted tab, once React has re-rendered.
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 1;
    });
  };
}
