import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import AlbumBook from '../../components/smart-albums/AlbumBook';

import AlbumEditorSidebar from '../../components/smart-albums/AlbumEditorSidebar';

import { assignPhotosFromFiles } from '../../components/smart-albums/albumPagePhotos';

import {

    getProofCellPhotoIndex,

    getProofSpreadSlotPageIndices,

} from '../../components/smart-albums/albumSpreadGrid';

import { getSpreadPages, pageToSpreadIndex } from '../../components/smart-albums/albumSpreadUtils';

import './AlbumEditor.css';



function getSpreadLeftForBookPage(bookPageIndex, totalPages) {

    const spreadIdx = pageToSpreadIndex(bookPageIndex, { showCover: true });

    return getSpreadPages(spreadIdx, totalPages).left;

}



function isProofGridSpread(leftPage) {

    return leftPage > 0;

}



function buildSpreadSelection(leftPage) {

    return { mode: 'spread', leftPage, cellId: null };

}



/**

 * Gallery edit view — sidebar tools + live album canvas (like collection dashboard).

 */

export default function AlbumEditor({

    album,

    albumId,

    totalPages,

    initialPage,

    onPageChange,

    onOpenPreview,

    photoRevision = 0,

    onPhotosUploaded,

}) {

    const navigate = useNavigate();

    const [activePanel, setActivePanel] = useState('grid');

    const [uploadNotice, setUploadNotice] = useState(null);

    const [uploading, setUploading] = useState(false);

    const [bookPage, setBookPage] = useState(initialPage);

    const [gridSelection, setGridSelection] = useState(() => {

        const left = getSpreadLeftForBookPage(initialPage, totalPages);

        return isProofGridSpread(left) ? buildSpreadSelection(left) : null;

    });



    useEffect(() => {

        setBookPage(initialPage);

        const left = getSpreadLeftForBookPage(initialPage, totalPages);

        if (isProofGridSpread(left)) {

            setGridSelection(buildSpreadSelection(left));

        }

    }, [initialPage, totalPages]);



    const syncSelectionToPage = useCallback(

        (pageIndex) => {

            const left = getSpreadLeftForBookPage(pageIndex, totalPages);

            if (isProofGridSpread(left)) {

                setGridSelection((prev) => {

                    if (prev?.leftPage === left) return prev;

                    return buildSpreadSelection(left);

                });

            } else {

                setGridSelection(null);

            }

        },

        [totalPages]

    );



    const handleBookPageChange = useCallback(

        (idx) => {

            setBookPage(idx);

            syncSelectionToPage(idx);

            onPageChange?.(idx);

        },

        [onPageChange, syncSelectionToPage]

    );



    const handleSelectGridCell = useCallback((leftPage, cellId) => {
        setGridSelection((prev) => {
            if (prev?.mode === 'cell' && prev.cellId === cellId && prev.leftPage === leftPage) {
                return buildSpreadSelection(leftPage);
            }
            return { mode: 'cell', leftPage, cellId };
        });
        setActivePanel('upload');
    }, []);



    const handleSelectGridSpread = useCallback((leftPage) => {

        setGridSelection(buildSpreadSelection(leftPage));

        setActivePanel('upload');

    }, []);



    const uploadTargets = useMemo(() => {

        if (!gridSelection || !isProofGridSpread(gridSelection.leftPage)) return null;

        if (gridSelection.mode === 'cell' && gridSelection.cellId) {

            return [

                getProofCellPhotoIndex(

                    gridSelection.leftPage,

                    gridSelection.cellId,

                    totalPages

                ),

            ];

        }

        return getProofSpreadSlotPageIndices(gridSelection.leftPage, totalPages);

    }, [gridSelection, totalPages]);



    const handleUpload = async (files) => {

        setUploading(true);

        try {

            const count = await assignPhotosFromFiles(albumId, files, {

                startPage: 1,

                totalPages,

                targets: uploadTargets ?? undefined,

            });

            if (count > 0) {

                onPhotosUploaded?.();

                const slotHint =

                    gridSelection?.mode === 'cell' && gridSelection.cellId

                        ? `slot ${gridSelection.cellId}`

                        : 'selected spread';

                setUploadNotice(`Added ${count} photo${count === 1 ? '' : 's'} to ${slotHint}.`);

            } else {

                setUploadNotice('No image files selected.');

            }

        } catch (e) {

            console.error(e);

            setUploadNotice('Upload failed. Try again.');

        } finally {

            setUploading(false);

            window.setTimeout(() => setUploadNotice(null), 4500);

        }

    };



    return (

        <div className="ae-page">

            <header className="ae-topbar">

                <div className="ae-topbar-left">

                    <button

                        type="button"

                        className="ae-icon-btn"

                        onClick={() => navigate('/smart-albums')}

                        aria-label="Back to albums"

                    >

                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">

                            <polyline points="15 18 9 12 15 6" />

                        </svg>

                    </button>

                    <div className="ae-topbar-titles">

                        <span className="ae-topbar-eyebrow">Smart album · Edit</span>

                        <h1 className="ae-topbar-title">{album.name}</h1>

                    </div>

                </div>

                <div className="ae-topbar-right">

                    {uploadNotice && <span className="ae-toast">{uploadNotice}</span>}

                    <button type="button" className="ae-btn-secondary" onClick={() => onOpenPreview()}>

                        Preview

                    </button>

                    <button type="button" className="ae-btn-primary" onClick={() => onOpenPreview()}>

                        Publish view

                    </button>

                </div>

            </header>



            <div className="ae-body">

                <AlbumEditorSidebar

                    activePanel={activePanel}

                    onPanelChange={setActivePanel}

                    album={album}

                    totalPages={totalPages}

                    onUploadFiles={handleUpload}

                    uploading={uploading}

                    gridSelection={gridSelection}

                    onSelectWholeSpread={() => {
                        const left =
                            gridSelection?.leftPage ??
                            getSpreadLeftForBookPage(bookPage, totalPages);
                        if (isProofGridSpread(left)) handleSelectGridSpread(left);
                    }}
                    onSelectCell={(cellId) => {
                        const left =
                            gridSelection?.leftPage ??
                            getSpreadLeftForBookPage(bookPage, totalPages);
                        if (isProofGridSpread(left)) handleSelectGridCell(left, cellId);
                    }}

                    canSelectGrid={Boolean(gridSelection)}

                />



                <main className="ae-canvas">

                    <div className="ae-canvas-chrome">

                        <span className="ae-canvas-label">Spread editor</span>

                        <span className="ae-canvas-hint">

                            Click a slot or the spread to choose where photos go · Arrows change pages

                        </span>

                    </div>

                    <div className="ae-canvas-stage">

                        <AlbumBook

                            key={`${albumId}-edit-${photoRevision}`}

                            album={album}

                            totalPages={totalPages}

                            initialPage={initialPage}

                            onPageChange={handleBookPageChange}

                            editable

                            gridSelection={gridSelection}

                            onSelectGridCell={handleSelectGridCell}

                            onSelectGridSpread={handleSelectGridSpread}

                        />

                    </div>

                </main>

            </div>

        </div>

    );

}

