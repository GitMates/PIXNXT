import { filesFromInput } from './uploadFileOrder';

/**
 * Open the OS file picker and return selected files.
 * Uses a detached input so React re-renders (e.g. page-flip) cannot drop the change event.
 * @param {{ multiple?: boolean, onPick?: (files: File[]) => void, onCancel?: () => void }} options
 */
export function pickImageFiles({ multiple = false, onPick, onCancel } = {}) {
    const input = document.createElement('input');
    input.type = 'file';
    // Omit restrictive accept so Windows defaults to All Files; we validate after pick.
    input.multiple = multiple;
    input.style.cssText =
        'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';

    let settled = false;

    const cleanup = () => {
        input.removeEventListener('change', onChange);
        window.removeEventListener('focus', onWindowFocus);
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
        window.setTimeout(() => {
            if (!settled && !input.files?.length) finish([]);
        }, 500);
    };

    input.addEventListener('change', onChange);
    document.body.appendChild(input);
    window.addEventListener('focus', onWindowFocus, { once: true });

    input.click();

    return () => finish([]);
}
