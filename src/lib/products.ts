import {
  Images,
  BookOpen,
  Briefcase,
  Smartphone,
  Star,
  Settings,
  KanbanSquare,
  CalendarDays,
  type LucideIcon,
} from "lucide-react"

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
}

export const products: Product[] = [
  {
    id: "client-gallery",
    name: "Client Gallery",
    tagline: "Collections, proofing & delivery",
    href: "/client-gallery",
    icon: Images,
  },
  {
    id: "smart-albums",
    name: "Smart Albums",
    tagline: "Album design & client proofing",
    href: "/smart-albums",
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
      label: "Collections",
      href: "/client-gallery",
      match: (p) =>
        p === "/client-gallery" ||
        p.startsWith("/collections") ||
        p.startsWith("/folders"),
      icon: Images,
    },
    {
      label: "Starred",
      href: "/starred/collections",
      match: (p) => p.startsWith("/starred"),
      icon: Star,
    },
    {
      label: "Homepage",
      href: "/homepage",
      match: (p) => p === "/homepage",
      icon: BookOpen,
    },
    {
      label: "Settings",
      href: "/settings",
      match: (p) => p.startsWith("/settings"),
      icon: Settings,
    },
  ],
  "smart-albums": [
    {
      label: "Albums",
      href: "/smart-albums",
      match: (p) =>
        p === "/smart-albums" ||
        p === "/smart-albums/" ||
        p.startsWith("/smart-albums/awaiting") ||
        p.startsWith("/smart-albums/approved"),
      icon: BookOpen,
    },
    {
      label: "Settings",
      href: "/smart-albums/settings",
      match: (p) => p.startsWith("/smart-albums/settings"),
      icon: Settings,
    },
  ],
  portal: [
    {
      label: "Pipeline / Leads",
      href: "/portal",
      match: (p) =>
        p === "/portal" ||
        p === "/portal/" ||
        p.startsWith("/portal/pipeline"),
      icon: KanbanSquare,
    },
    {
      label: "Studio Calendar",
      href: "/portal/calendar",
      match: (p) => p.startsWith("/portal/calendar"),
      icon: CalendarDays,
    },
    {
      label: "Settings",
      href: "/portal/settings",
      match: (p) => p.startsWith("/portal/settings"),
      icon: Settings,
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
    },
    {
      label: "Settings",
      href: "/mobile-gallery/settings",
      match: (p) => p.startsWith("/mobile-gallery/settings"),
      icon: Settings,
    },
  ],
}

export function getProductById(productId: string): Product | undefined {
  return products.find((p) => p.id === productId)
}

export function getProductNavItems(productId: string): ProductNavItem[] {
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
      pathname.startsWith("/collections") ||
      pathname.startsWith("/folders") ||
      pathname.startsWith("/starred") ||
      pathname === "/homepage" ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/photos")
    )
  }
  if (productHref === "/smart-albums") {
    return pathname === "/smart-albums" || pathname.startsWith("/smart-albums/")
  }
  if (productHref === "/mobile-gallery") {
    return pathname === "/mobile-gallery" || pathname.startsWith("/mobile-gallery/")
  }
  if (productHref === "/portal") {
    return pathname === "/portal" || pathname.startsWith("/portal/")
  }
  return pathname.startsWith(productHref)
}
