import { describe, it, expect } from "vitest";
import { sortDashboardPhotos } from "./sortDashboardPhotos";
import type { Photo } from "@/types/collection.types";

describe("sortDashboardPhotos", () => {
  it("sorts by filename (A-Z) using natural numeric sorting", () => {
    const photos = [
      { id: "3", filename: "RAJ07144.jpg" },
      { id: "1", filename: "RAJ06952.jpg" },
      { id: "2", filename: "RAJ06956.jpg" },
      { id: "4", filename: "RAJ07000.jpg" },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "name-az");
    expect(sorted.map((p) => p.filename)).toEqual([
      "RAJ06952.jpg",
      "RAJ06956.jpg",
      "RAJ07000.jpg",
      "RAJ07144.jpg",
    ]);
  });

  it("sorts by filename (Z-A)", () => {
    const photos = [
      { id: "1", filename: "A.jpg" },
      { id: "2", filename: "C.jpg" },
      { id: "3", filename: "B.jpg" },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "name-za");
    expect(sorted.map((p) => p.filename)).toEqual(["C.jpg", "B.jpg", "A.jpg"]);
  });

  it("sorts by date taken (new to old) with EXIF and ISO timestamps safely without NaN", () => {
    const photos = [
      { id: "1", filename: "old.jpg", exif_taken_at: "2024:09:10 10:00:00" },
      { id: "2", filename: "new.jpg", exif_taken_at: "2026-09-12T16:34:52.000Z" },
      { id: "3", filename: "mid.jpg", exif_taken_at: "2025:01:01 12:00:00" },
      { id: "4", filename: "nodate.jpg" },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "taken-new-old");
    expect(sorted.map((p) => p.filename)).toEqual([
      "new.jpg",
      "mid.jpg",
      "old.jpg",
      "nodate.jpg",
    ]);
  });

  it("sorts by date taken (old to new)", () => {
    const photos = [
      { id: "2", filename: "new.jpg", exif_taken_at: "2026-09-12T16:34:52.000Z" },
      { id: "1", filename: "old.jpg", exif_taken_at: "2024:09:10 10:00:00" },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "taken-old-new");
    expect(sorted.map((p) => p.filename)).toEqual(["old.jpg", "new.jpg"]);
  });

  it("sorts starred photos first", () => {
    const photos = [
      { id: "1", filename: "unstarred1.jpg", is_starred: 0 },
      { id: "2", filename: "starred.jpg", is_starred: 1 },
      { id: "3", filename: "unstarred2.jpg", is_starred: false },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "starred-first");
    expect(sorted[0].filename).toBe("starred.jpg");
  });

  it("sorts by camera name A-Z", () => {
    const photos = [
      { id: "1", filename: "sony.jpg", exif_camera: "Sony ILCE-7M3" },
      { id: "2", filename: "canon.jpg", exif_camera: "Canon EOS R5" },
      { id: "3", filename: "nikon.jpg", exif_camera: "Nikon Z8" },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "camera-az");
    expect(sorted.map((p) => p.filename)).toEqual([
      "canon.jpg",
      "nikon.jpg",
      "sony.jpg",
    ]);
  });

  it("sorts by custom position", () => {
    const photos = [
      { id: "1", position: 50 },
      { id: "2", position: 10 },
      { id: "3", position: 30 },
    ] as unknown as Photo[];

    const sorted = sortDashboardPhotos(photos, "custom");
    expect(sorted.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });
});
