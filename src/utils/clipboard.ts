/**
 * Enterprise-grade clipboard copy & share utility for web, mobile, and PWA environments.
 * Handles Secure Contexts (navigator.clipboard), Insecure Contexts (HTTP local network),
 * PWA standalone mode, iOS Safari selection constraints, and Ant Design Modal focus traps.
 */

/**
 * Checks if the Web Share API is available in the current browser/PWA environment.
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Shares text using the native OS share sheet (Google Pay, PhonePe, WhatsApp, Clipboard, etc.).
 * Highly reliable on mobile PWAs.
 */
export async function shareText(text: string, title = 'Pay via UPI'): Promise<boolean> {
  if (!text || !canShare()) return false;
  try {
    await navigator.share({
      title,
      text,
    });
    return true;
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      console.warn('Native share failed:', err);
    }
    return false;
  }
}

/**
 * Copies text synchronously from a rendered HTMLInputElement (or fallback string)
 * directly in the caller's user gesture call stack without any `await` delay.
 *
 * @param input The rendered HTMLInputElement containing the text.
 * @param textFallback Optional string if input element is not mounted.
 * @returns boolean Returns true if copy command succeeded or clipboard write was queued.
 */
export function copyFromInput(input: HTMLInputElement | null, textFallback = ''): boolean {
  const text = input?.value || textFallback;
  if (!text) return false;

  let execSuccess = false;

  // 1. Synchronously focus and select the real visible input element in the DOM
  if (input) {
    try {
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      execSuccess = document.execCommand('copy');
    } catch (e) {
      console.warn('execCommand on input failed:', e);
    }
  }

  // 2. Fallback DOM copy if input was not provided
  if (!execSuccess && typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '-9999px';
      textArea.style.fontSize = '16px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');

      const targetParent =
        document.querySelector('.ant-modal-content') ||
        document.querySelector('[role="dialog"]') ||
        document.body;

      targetParent.appendChild(textArea);
      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, text.length);
      execSuccess = document.execCommand('copy');
      if (textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    } catch (e) {
      console.warn('fallback execCommand failed:', e);
    }
  }

  // 3. Trigger modern Clipboard API in background (without awaiting before execCommand)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }

  return execSuccess;
}

/**
 * Convenience wrapper calling copyFromInput.
 */
export async function copyTextToClipboard(
  text: string,
  _containerElement?: HTMLElement | null
): Promise<boolean> {
  return copyFromInput(null, text);
}
