export interface Package {
  id: string
  name: string
  duration: string
  editedPhotos: number
  videography: boolean
  albums: number
  price: number
}

export interface AddOn {
  id: string
  name: string
  description: string
  price: number
}

export interface BillingTemplate {
  id: string
  name: string
  deposits: Array<{ percentage: number; dueDate: string }>
}

export interface Contract {
  id: string
  name: string
  terms: string[]
}

export interface StudioInfo {
  name: string
  logo: string
  email: string
  phone: string
  website: string
}

export const studioInfo: StudioInfo = {
  name: "Karakovan",
  logo: "https://images.unsplash.com/photo-1611532736596-de2d4265fba3?w=200&h=200&fit=crop",
  email: "hello@karakovan.com",
  phone: "+91 98765 43210",
  website: "www.karakovan.com",
}

export const packages: Package[] = [
  {
    id: "p1",
    name: "Essentials",
    duration: "8 hours",
    editedPhotos: 400,
    videography: false,
    albums: 0,
    price: 80000,
  },
  {
    id: "p2",
    name: "Premium",
    duration: "12 hours",
    editedPhotos: 600,
    videography: true,
    albums: 1,
    price: 150000,
  },
  {
    id: "p3",
    name: "Luxury",
    duration: "16 hours",
    editedPhotos: 800,
    videography: true,
    albums: 2,
    price: 250000,
  },
]

export const addOns: AddOn[] = [
  {
    id: "a1",
    name: "Pre-wedding Shoot",
    description: "2-hour engagement photo session",
    price: 25000,
  },
  {
    id: "a2",
    name: "Drone Photography",
    description: "Aerial coverage of venue",
    price: 15000,
  },
  {
    id: "a3",
    name: "Same-day Edits",
    description: "Edited video reel shown at reception",
    price: 20000,
  },
  {
    id: "a4",
    name: "Album Upgrade",
    description: "Premium leather-bound album",
    price: 30000,
  },
  {
    id: "a5",
    name: "Extended Coverage",
    description: "Additional 4 hours",
    price: 40000,
  },
]

export const billingTemplates: BillingTemplate[] = [
  {
    id: "b1",
    name: "Standard (50-50)",
    deposits: [
      { percentage: 50, dueDate: "Booking Confirmation" },
      { percentage: 50, dueDate: "1 week before event" },
    ],
  },
  {
    id: "b2",
    name: "Flexible (30-70)",
    deposits: [
      { percentage: 30, dueDate: "Booking Confirmation" },
      { percentage: 70, dueDate: "1 week before event" },
    ],
  },
  {
    id: "b3",
    name: "Monthly (3 payments)",
    deposits: [
      { percentage: 40, dueDate: "Booking Confirmation" },
      { percentage: 30, dueDate: "1 month before event" },
      { percentage: 30, dueDate: "1 week before event" },
    ],
  },
]

export const contracts: Contract[] = [
  {
    id: "c1",
    name: "Standard Terms",
    terms: [
      "50% deposit required to confirm booking",
      "Final payment due 7 days before event",
      "50% refund if cancellation > 30 days",
      "Edited photos delivered within 45 days",
      "All images are copyrighted",
    ],
  },
  {
    id: "c2",
    name: "Premium Terms",
    terms: [
      "50% deposit required to confirm booking",
      "Final payment due 7 days before event",
      "75% refund if cancellation > 30 days",
      "Edited photos delivered within 30 days",
      "Unlimited revisions included",
      "All images are copyrighted",
    ],
  },
]
