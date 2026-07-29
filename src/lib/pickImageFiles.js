import { filesFromInput } from './uploadFileOrder';

/**
 * Open the OS file picker and return selected files.
 * Uses a detached input so React re-renders (e.g. page-flip) cannot drop the change event.
 *
 * Important (Windows): do NOT cancel on the first window focus after the dialog closes —
 * Chrome often fires focus before the change event populates input.files for large images.
 *
 * @param {{ multiple?: boolean, accept?: string, onPick?: (files: File[]) => void, onCancel?: () => void }} options
 */
export function pickImageFiles({ multiple = false, accept, onPick, onCancel } = {}) {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.multiple = multiple;
    input.style.cssText =
        'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';

    let settled = false;
    let cancelTimer = null;

    const cleanup = () => {
        input.removeEventListener('change', onChange);
        window.removeEventListener('focus', onWindowFocus);
        if (cancelTimer != null) {
            window.clearTimeout(cancelTimer);
            cancelTimer = null;
        }
        if (input.parentNode) input.remove();
    };

    const finish = (files) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (files?.length) onPick?.(files);
        else onCancel?.();
    };

    const onChange = () => finish(filesFromInput(input.files));

    const onWindowFocus = () => {
        // Poll briefly — change can lag behind focus for large files on Windows.
        let attempts = 0;
        const poll = () => {
            if (settled) return;
            if (input.files?.length) {
                finish(filesFromInput(input.files));
                return;
            }
            attempts += 1;
            if (attempts >= 40) {
                // ~4s with no files → treat as cancel
                finish([]);
                return;
            }
            cancelTimer = window.setTimeout(poll, 100);
        };
        cancelTimer = window.setTimeout(poll, 100);
    };

    input.addEventListener('change', onChange);
    document.body.appendChild(input);
    window.addEventListener('focus', onWindowFocus);

    input.click();

    return () => finish([]);
}
