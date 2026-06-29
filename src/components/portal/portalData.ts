export type ViewMode = "pipeline" | "calendar" | "settings"
export type SettingsTab =
  | "General"
  | "Packages & Add-ons"
  | "Branding"
  | "Billing & Tax"
  | "Notifications"
  | "Team & Permissions"
  | "Integrations"
  | "Legal Templates"

export type EventKind = "shoot" | "milestone" | "deadline"
export type DeliveryStatus = "overdue" | "progress" | "completed"
export type CalendarView = "month" | "week" | "list"
export type FinancialTone = "paid" | "awaiting" | "editing" | "delivered"

export interface PipelineCard {
  id: string
  clientName: string
  eventDate: string
  location: string
  amount?: string
  quoteSent?: boolean
  invoiceSent?: boolean
  depositReceived?: boolean
  bookingAmount?: string
  paidAmount?: string
  statusLabel?: string
  statusTone?: FinancialTone
}

export interface PipelineStage {
  id: string
  title: string
  section: "leads" | "projects"
  cards: PipelineCard[]
}

export interface StudioEvent {
  id: string
  date: string
  kind: EventKind
  title: string
  detail?: string
  location?: string
  asset?: string
  status?: DeliveryStatus
}

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

export interface LegalTemplate {
  id: string
  name: string
  updated: string
  body: string
}

export const INITIAL_STAGES: PipelineStage[] = [
  {
    id: "inquiry",
    title: "Inquiry / New",
    section: "leads",
    cards: [
      {
        id: "card-1",
        clientName: "Priya & Rohit",
        eventDate: "July 15, 2025",
        location: "Mumbai, Maharashtra",
      },
      {
        id: "card-2",
        clientName: "Anjali & Vikram",
        eventDate: "August 2, 2025",
        location: "Bangalore, Karnataka",
      },
      {
        id: "card-3",
        clientName: "Neha & Arjun",
        eventDate: "August 20, 2025",
        location: "Delhi, Delhi",
      },
    ],
  },
  {
    id: "quote-sent",
    title: "Quote Sent",
    section: "leads",
    cards: [
      {
        id: "card-4",
        clientName: "Kavya & Aditya",
        eventDate: "September 5, 2025",
        location: "Pune, Maharashtra",
        quoteSent: true,
        bookingAmount: "₹1,20,000",
        statusLabel: "Awaiting Signature",
        statusTone: "awaiting",
      },
      {
        id: "card-5",
        clientName: "Pooja & Nikhil",
        eventDate: "September 12, 2025",
        location: "Hyderabad, Telangana",
        quoteSent: true,
        bookingAmount: "₹1,35,000",
        statusLabel: "Awaiting Signature",
        statusTone: "awaiting",
      },
    ],
  },
  {
    id: "booked",
    title: "Booked / Deposited",
    section: "projects",
    cards: [
      {
        id: "card-6",
        clientName: "Isha & Rahul",
        eventDate: "June 28, 2025",
        location: "Goa, Goa",
        amount: "₹1,50,000",
        depositReceived: true,
        bookingAmount: "₹1,50,000",
        paidAmount: "₹88,500",
        statusTone: "paid",
      },
      {
        id: "card-7",
        clientName: "Divya & Sanjay",
        eventDate: "July 5, 2025",
        location: "Chennai, Tamil Nadu",
        amount: "₹1,70,000",
        depositReceived: true,
        bookingAmount: "₹1,70,000",
        paidAmount: "₹85,500",
        statusTone: "paid",
      },
      {
        id: "card-8",
        clientName: "Simran & Karan",
        eventDate: "July 22, 2025",
        location: "Jaipur, Rajasthan",
        amount: "₹1,90,000",
        depositReceived: true,
        bookingAmount: "₹1,90,000",
        paidAmount: "₹95,000",
        statusTone: "paid",
      },
    ],
  },
  {
    id: "post-production",
    title: "Post-Production / Editing",
    section: "projects",
    cards: [
      {
        id: "card-9",
        clientName: "Meera & Rohan",
        eventDate: "June 10, 2025",
        location: "Pune, Maharashtra",
        amount: "₹1,40,000",
        bookingAmount: "₹1,40,000",
        statusLabel: "In Editing",
        statusTone: "editing",
      },
      {
        id: "card-10",
        clientName: "Sneha & Aryan",
        eventDate: "June 15, 2025",
        location: "Ahmedabad, Gujarat",
        amount: "₹1,60,000",
        bookingAmount: "₹1,60,000",
        statusLabel: "In Editing",
        statusTone: "editing",
      },
    ],
  },
  {
    id: "completed",
    title: "Completed / Delivered",
    section: "projects",
    cards: [
      {
        id: "card-11",
        clientName: "Ritika & Nirav",
        eventDate: "May 20, 2025",
        location: "Kolkata, West Bengal",
        amount: "₹1,30,000",
        bookingAmount: "₹1,30,000",
        statusLabel: "Delivered",
        statusTone: "delivered",
      },
      {
        id: "card-12",
        clientName: "Shruti & Vikrant",
        eventDate: "May 30, 2025",
        location: "Lucknow, Uttar Pradesh",
        amount: "₹1,45,000",
        bookingAmount: "₹1,45,000",
        statusLabel: "Delivered",
        statusTone: "delivered",
      },
      {
        id: "card-13",
        clientName: "Divya & Harsh",
        eventDate: "April 18, 2025",
        location: "Udaipur, Rajasthan",
        amount: "₹1,75,000",
        bookingAmount: "₹1,75,000",
        statusLabel: "Delivered",
        statusTone: "delivered",
      },
    ],
  },
]

export const INITIAL_EVENTS: StudioEvent[] = [
  {
    id: "shoot-priya",
    date: "2026-07-15",
    kind: "shoot",
    title: "Priya & Rohit — Wedding",
    location: "Mumbai",
    asset: "Full-Day Wedding Coverage",
    status: "completed",
  },
  {
    id: "milestone-priya-album",
    date: "2026-07-28",
    kind: "milestone",
    title: "Priya & Rohit — Album Selection Call",
    detail: "Client to shortlist 60 frames",
    asset: "Album Frame Shortlist",
    status: "progress",
  },
  {
    id: "shoot-anjali",
    date: "2026-08-02",
    kind: "shoot",
    title: "Anjali & Vikram — Wedding",
    location: "Bangalore",
    asset: "Full-Day Wedding Coverage",
    status: "progress",
  },
  {
    id: "milestone-anjali-pre",
    date: "2026-08-18",
    kind: "milestone",
    title: "Anjali & Vikram — Pre-Wedding Brief",
    detail: "Moodboard sign-off",
    asset: "Pre-Wedding Moodboard",
    status: "progress",
  },
  {
    id: "deadline-priya-gallery",
    date: "2026-09-05",
    kind: "deadline",
    title: "Priya & Rohit Gallery Delivery",
    detail: "8-Week Mark · per contract SLA",
    asset: "Full Edited Gallery",
    status: "overdue",
  },
]

export const INITIAL_PACKAGES: Package[] = [
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

export const INITIAL_ADDONS: AddOn[] = [
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
    price: 18000,
  },
]

export const INITIAL_LEGAL_TEMPLATES: LegalTemplate[] = [
  {
    id: "wedding",
    name: "Standard Wedding & Destination Agreement",
    updated: "Last updated June 28, 2026",
    body: `WEDDING PHOTOGRAPHY & VIDEOGRAPHY AGREEMENT

This Agreement is entered into between Karakovan Studio ("the Studio") and {{Client Name}} ("the Client") for coverage of the event scheduled on {{Event Date}}.

1. SCOPE OF SERVICES
The Studio agrees to provide full-day wedding photography and cinematic videography coverage, including a pre-wedding shoot, ceremony, and reception.

2. RETAINER & PAYMENT
A non-refundable retainer of forty percent (40%) of the total package value of {{Package Value}} is due upon signing to reserve the date.

3. DELIVERY
Final edited galleries will be delivered within eight (8) weeks of {{Event Date}} via the Pixnxt Cloud portal.`,
  },
  {
    id: "commercial",
    name: "Commercial Editorial & Licensing Agreement",
    updated: "Last updated June 26, 2026",
    body: `COMMERCIAL EDITORIAL & LICENSING AGREEMENT

This Agreement governs the commercial engagement between Karakovan Studio ("the Studio") and {{Client Name}} ("the Client") for the production scheduled on {{Event Date}}.

1. USAGE & LICENSING RIGHTS
The Studio grants the Client a limited commercial license for editorial use of all delivered assets. Extended or exclusive licensing is subject to the agreed fee of {{Package Value}}.

2. PRODUCTION SCOPE
The Studio will deliver assets according to the agreed production schedule and creative brief outlined in the proposal valued at {{Package Value}}.`,
  },
  {
    id: "portrait",
    name: "Studio Portrait & Event Session Terms",
    updated: "Last updated June 20, 2026",
    body: `STUDIO PORTRAIT & EVENT SESSION TERMS

This Agreement is entered into between Karakovan Studio ("the Studio") and {{Client Name}} ("the Client") for portrait or event coverage scheduled on {{Event Date}}.

1. SESSION DETAILS
The Studio agrees to provide the session services described in the selected package valued at {{Package Value}}.

2. DELIVERY
Edited images will be delivered via the Pixnxt Cloud portal within four (4) weeks of {{Event Date}}.`,
  },
]
