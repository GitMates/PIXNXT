import {
  Images,
  LayoutGrid,
  BookOpen,
  Briefcase,
  Smartphone,
  Star,
  Settings,
  KanbanSquare,
  CalendarDays,
  Clock3,
  CheckCircle2,
  PanelLeft,
  type LucideIcon,
} from "lucide-react"
import {
  ALBUM_PROOFER_PRODUCT_ID,
  ALBUM_PROOFER_PRODUCT_ID_LEGACY,
  ALBUM_PROOFER_ROUTE,
  ALBUM_PROOFER_ROUTE_LEGACY,
  isAlbumProoferPath,
} from "./albumProoferIds"
import {
  DELIVERY_PRODUCT_HOME,
  DELIVERY_ROUTE,
  DELIVERY_ROUTE_LEGACY,
  DELIVERY_STARRED_ROUTE,
  isDeliveryPath,
  isDeliveryStarredPath,
} from "./deliveryIds"
import { SHOWCASE_ROUTE, isShowcasePath } from "./showcaseIds"

export interface Product {
  id: string
  name: string
  tagline: string
  href: string
  icon: LucideIcon
}

export interface ProductNavItem {
  label: string
  href: string
  match: (pathname: string) => boolean
  icon: LucideIcon
  section?: "work" | "studio"
  countKey?: "albums" | "needsYou" | "approved"
}

export const products: Product[] = [
  {
    id: "client-gallery",
    name: "Client Gallery",
    tagline: "Deliveries, proofing & sharing",
    href: "/client-gallery",
    icon: Images,
  },
  {
    id: ALBUM_PROOFER_PRODUCT_ID,
    name: "Album Proofer",
    tagline: "Album design & client proofing",
    href: ALBUM_PROOFER_ROUTE,
    icon: BookOpen,
  },
  {
    id: "portal",
    name: "Pixnxt Portal",
    tagline: "Pipeline, proposals & contracts",
    href: "/portal",
    icon: Briefcase,
  },
  {
    id: "mobile-gallery",
    name: "Mobile Gallery",
    tagline: "Branded app delivery for clients",
    href: "/mobile-gallery",
    icon: Smartphone,
  },
]

/** In-product left-nav for the shared SidebarLayout shell. */
export const productNavItems: Record<string, ProductNavItem[]> = {
  "client-gallery": [
    {
      label: "Deliveries",
      href: DELIVERY_PRODUCT_HOME,
      match: (p) => isDeliveryPath(p),
      icon: Images,
      section: "work",
    },
    {
      label: "Library",
      href: "/photos",
      match: (p) => p === "/photos" || p.startsWith("/photos/"),
      icon: LayoutGrid,
      section: "work",
    },
    {
      label: "Starred",
      href: DELIVERY_STARRED_ROUTE,
      match: (p) => isDeliveryStarredPath(p),
      icon: Star,
      section: "work",
    },
    {
      label: "Showcase",
      href: SHOWCASE_ROUTE,
      match: (p) => isShowcasePath(p),
      icon: BookOpen,
      section: "work",
    },
    {
      label: "Settings",
      href: "/settings",
      match: (p) => p.startsWith("/settings"),
      icon: Settings,
      section: "studio",
    },
  ],
  [ALBUM_PROOFER_PRODUCT_ID]: [
    {
      label: "Albums",
      href: ALBUM_PROOFER_ROUTE,
      match: (p) =>
        p === ALBUM_PROOFER_ROUTE ||
        p === `${ALBUM_PROOFER_ROUTE}/` ||
        p === ALBUM_PROOFER_ROUTE_LEGACY ||
        p === `${ALBUM_PROOFER_ROUTE_LEGACY}/`,
      icon: PanelLeft,
      section: "work",
      countKey: "albums",
    },
    {
      label: "Needs you",
      href: `${ALBUM_PROOFER_ROUTE}/awaiting`,
      match: (p) =>
        p.startsWith(`${ALBUM_PROOFER_ROUTE}/awaiting`) ||
        p.startsWith(`${ALBUM_PROOFER_ROUTE_LEGACY}/awaiting`),
      icon: Clock3,
      section: "work",
      countKey: "needsYou",
    },
    {
      label: "Approved",
      href: `${ALBUM_PROOFER_ROUTE}/approved`,
      match: (p) =>
        p.startsWith(`${ALBUM_PROOFER_ROUTE}/approved`) ||
        p.startsWith(`${ALBUM_PROOFER_ROUTE_LEGACY}/approved`),
      icon: CheckCircle2,
      section: "work",
      countKey: "approved",
    },
    {
      label: "Settings",
      href: `${ALBUM_PROOFER_ROUTE}/settings`,
      match: (p) =>
        p.startsWith(`${ALBUM_PROOFER_ROUTE}/settings`) ||
        p.startsWith(`${ALBUM_PROOFER_ROUTE_LEGACY}/settings`),
      icon: Settings,
      section: "studio",
    },
  ],
  // Keep legacy product id wired to the same nav during redirects.
  [ALBUM_PROOFER_PRODUCT_ID_LEGACY]: [],
  portal: [
    {
      label: "Pipeline / Leads",
      href: "/portal",
      match: (p) =>
        p === "/portal" ||
        p === "/portal/" ||
        p.startsWith("/portal/pipeline"),
      icon: KanbanSquare,
      section: "work",
    },
    {
      label: "Studio Calendar",
      href: "/portal/calendar",
      match: (p) => p.startsWith("/portal/calendar"),
      icon: CalendarDays,
      section: "work",
    },
    {
      label: "Settings",
      href: "/portal/settings",
      match: (p) => p.startsWith("/portal/settings"),
      icon: Settings,
      section: "studio",
    },
  ],
  "mobile-gallery": [
    {
      label: "Apps",
      href: "/mobile-gallery",
      match: (p) =>
        p === "/mobile-gallery" ||
        p === "/mobile-gallery/" ||
        p.startsWith("/mobile-gallery/app/"),
      icon: Smartphone,
      section: "work",
    },
    {
      label: "Settings",
      href: "/mobile-gallery/settings",
      match: (p) => p.startsWith("/mobile-gallery/settings"),
      icon: Settings,
      section: "studio",
    },
  ],
}

// Alias legacy id to the same nav items
productNavItems[ALBUM_PROOFER_PRODUCT_ID_LEGACY] =
  productNavItems[ALBUM_PROOFER_PRODUCT_ID]

export function getProductById(productId: string): Product | undefined {
  if (productId === ALBUM_PROOFER_PRODUCT_ID_LEGACY) {
    return products.find((p) => p.id === ALBUM_PROOFER_PRODUCT_ID)
  }
  return products.find((p) => p.id === productId)
}

export function getProductNavItems(productId: string): ProductNavItem[] {
  if (productId === ALBUM_PROOFER_PRODUCT_ID_LEGACY) {
    return productNavItems[ALBUM_PROOFER_PRODUCT_ID] || []
  }
  return productNavItems[productId] || productNavItems["client-gallery"]
}

export function getPortalViewFromPath(pathname: string): "pipeline" | "calendar" | "settings" {
  if (pathname.startsWith("/portal/calendar")) return "calendar"
  if (pathname.startsWith("/portal/settings")) return "settings"
  return "pipeline"
}

export function portalPathForView(view: "pipeline" | "calendar" | "settings"): string {
  if (view === "calendar") return "/portal/calendar"
  if (view === "settings") return "/portal/settings"
  return "/portal"
}

export function isProductActive(productHref: string, pathname: string): boolean {
  if (productHref === "/client-gallery") {
    return (
      pathname === "/client-gallery" ||
      pathname.startsWith("/deliveries") ||
      pathname.startsWith("/collections") ||
      pathname.startsWith("/folders") ||
      pathname.startsWith("/starred") ||
      isShowcasePath(pathname) ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/photos")
    )
  }
  if (productHref === ALBUM_PROOFER_ROUTE || productHref === ALBUM_PROOFER_ROUTE_LEGACY) {
    return isAlbumProoferPath(pathname)
  }
  if (productHref === "/mobile-gallery") {
    return pathname === "/mobile-gallery" || pathname.startsWith("/mobile-gallery/")
  }
  if (productHref === "/portal") {
    return pathname === "/portal" || pathname.startsWith("/portal/")
  }
  return pathname.startsWith(productHref)
}
