/** Preserve browser file-picker order — never sort by filename. */
export function filesFromInput(fileList) {
    if (!fileList?.length) return [];
    const files = [];
    for (let i = 0; i < fileList.length; i += 1) {
        const file = fileList.item ? fileList.item(i) : fileList[i];
        if (file) files.push(file);
    }
    return files;
}

/** Drag-and-drop from Explorer keeps the order files were selected. */
export function filesFromDataTransfer(dataTransfer) {
    if (!dataTransfer) return [];

    const items = dataTransfer.items;
    if (items?.length) {
        const files = [];
        for (let i = 0; i < items.length; i += 1) {
            const entry = items[i];
            if (entry?.kind === 'file') {
                const file = entry.getAsFile?.();
                if (file) files.push(file);
            }
        }
        if (files.length) return files;
    }

    return filesFromInput(dataTransfer.files);
}
/** Move one entry in an ordered file list. */
export function moveFileInOrder(files, fromIndex, toIndex) {
    if (!files?.length || fromIndex === toIndex) return files || [];
    if (fromIndex < 0 || fromIndex >= files.length) return files;
    const clampedTo = Math.max(0, Math.min(toIndex, files.length - 1));
    if (fromIndex === clampedTo) return files;

    const next = files.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(clampedTo, 0, moved);
    return next;
}
