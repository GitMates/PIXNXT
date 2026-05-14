declare module '@/services/gallery.service' {
  export const galleryService: {
    createCollection: (collectionData: Record<string, unknown>) => Promise<{ id: string }>;
    deleteCollection: (id: string) => Promise<void>;
  };
}
