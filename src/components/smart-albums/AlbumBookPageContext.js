import { createContext, useContext } from 'react';

/** Live props for flipbook pages — avoids remounting HTMLFlipBook on selection/photo updates. */
export const AlbumBookPageContext = createContext(null);

export function useAlbumBookPageContext() {
    return useContext(AlbumBookPageContext) || {};
}
