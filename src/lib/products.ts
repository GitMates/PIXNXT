import {
  Images,
  BookOpen,
  Briefcase,
  Smartphone,
  type LucideIcon,
} from "lucide-react"

export interface Product {
  id: string
  name: string
  tagline: string
  href: string
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
