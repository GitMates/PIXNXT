import React, { useRef, useEffect } from 'react';
import { Link, Unlink } from 'lucide-react';

const RichTextEditor = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null);

    // Initialize content only once when component mounts or value changes externally (not by typing)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        editorRef.current?.focus();
    };

    const handleLink = () => {
        const url = prompt('Enter link URL:', 'https://');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const handleUnlink = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let container = range.commonAncestorContainer;

            // Find the closest anchor tag
            let anchor = null;
            if (container.nodeType === Node.TEXT_NODE) {
                anchor = container.parentNode;
            } else {
                anchor = container;
            }

            // Walk up to find anchor tag inside editor
            while (anchor && anchor !== editorRef.current && (!anchor.tagName || anchor.tagName.toUpperCase() !== 'A')) {
                anchor = anchor.parentNode;
            }

            if (anchor && anchor.tagName && anchor.tagName.toUpperCase() === 'A' && editorRef.current.contains(anchor)) {
                // Create a new range selecting the anchor tag
                const newRange = document.createRange();
                newRange.selectNode(anchor);
                selection.removeAllRanges();
                selection.addRange(newRange);
            }
        }

        // Execute unlink command
        document.execCommand('unlink', false, null);

        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        editorRef.current?.focus();
    };

    return (
        <div className="set-rte-box cg-field-shell-textarea neu-inset">
            <div className="set-rte-toolbar">
                <button
                    type="button"
                    className="rte-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('bold')}
                    title="Bold"
                >
                    B
                </button>
                <button
                    type="button"
                    className="rte-btn italic"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('italic')}
                    title="Italic"
                >
                    I
                </button>
                <button
                    type="button"
                    className="rte-btn underline"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => execCommand('underline')}
                    title="Underline"
                >
                    U
                </button>
                <div className="rte-divider"></div>
                <button
                    type="button"
                    className="rte-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleLink}
                    title="Insert Link"
                >
                    <Link size={16} />
                </button>
                <button
                    type="button"
                    className="rte-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleUnlink}
                    title="Remove Link"
                >
                    <Unlink size={16} />
                </button>
            </div>
            <div
                ref={editorRef}
                className="set-rte-content"
                contentEditable={true}
                onInput={handleInput}
                onBlur={handleInput}
                data-placeholder={placeholder}
                style={{ outline: 'none', overflowY: 'auto' }}
            />
        </div>
    );
};

export default RichTextEditor;
