# PIXNXT — Photography Business Platform

> **Project Type:** SaaS Web Application  
> **Reference Product:** [Pixieset](https://pixieset.com) — Analyzed & Rebranded as **PIXNXT**  
> **Tech Stack:** React (Frontend) + Supabase (Backend/Database/Auth/Storage)  
> **Purpose:** This README serves as the complete product specification for AI models and developers to understand the full scope, architecture, and module breakdown of the PIXNXT platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Platform Architecture Summary](#2-platform-architecture-summary)
3. [Module 1 — Client Gallery](#3-module-1--client-gallery)
4. [Module 2 — Studio Manager (CRM)](#4-module-2--studio-manager-crm)
5. [Module 3 — Website Builder](#5-module-3--website-builder)
6. [Module 4 — Store (Print & Digital Commerce)](#6-module-4--store-print--digital-commerce)
7. [Module 5 — Mobile Gallery App](#7-module-5--mobile-gallery-app)
8. [Cross-Module Features](#8-cross-module-features)
9. [User Roles & Permissions](#9-user-roles--permissions)
10. [Pricing & Subscription Plans](#10-pricing--subscription-plans)
11. [Supabase Data Architecture](#11-supabase-data-architecture)
12. [React Application Structure](#12-react-application-structure)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [UI/UX Design Principles](#14-uiux-design-principles)
15. [Key User Journeys](#15-key-user-journeys)
16. [Development Phases & Priorities](#16-development-phases--priorities)

---

## 1. Project Overview

### What is PIXNXT?

PIXNXT is an all-in-one SaaS platform for professional photographers and creative studios. It replicates and extends the core value proposition of Pixieset: enabling photographers to manage their entire business workflow — from booking clients and delivering photos, to building a website and selling prints — all within a single, unified dashboard.

### Target Users

- **Primary:** Professional photographers (wedding, portrait, commercial, event, newborn, senior, mini-session)
- **Secondary:** Photography studios with multiple team members
- **Client-facing:** End clients of photographers (gallery viewers, purchasers)

### Core Value Proposition

> "One platform to book clients, deliver galleries, sell prints, and build your brand."

PIXNXT removes the need for photographers to juggle separate tools for:
- Photo delivery (e.g., Google Drive, Dropbox)
- CRM/booking (e.g., HoneyBook, 17Hats)
- Website (e.g., Squarespace, WordPress)
- Print sales (e.g., Printful, Zenfolio)

---

## 2. Platform Architecture Summary

### Five Core Modules

| Module | Purpose | Supabase Services Used |
|---|---|---|
| **Client Gallery** | Deliver, showcase, and share photo collections with clients | Storage, DB, Auth, Realtime |
| **Studio Manager** | CRM: bookings, invoices, contracts, questionnaires, scheduling | DB, Auth, Edge Functions, Realtime |
| **Website Builder** | Drag-and-drop photography portfolio website | DB, Storage |
| **Store** | Sell prints, digital downloads, and packages from galleries | DB, Edge Functions, Storage |
| **Mobile Gallery App** | White-labeled mobile experience for clients to view galleries | Storage, Auth |

### High-Level Tech Decisions

- **React** with React Router v6 for SPA navigation
- **Supabase** for PostgreSQL database, file storage (photos, documents), authentication, and edge functions
- **Supabase Storage** buckets for gallery photos, website assets, and document uploads
- **Supabase Auth** with Row Level Security (RLS) for multi-tenant isolation (each photographer's data is private)
- **Supabase Edge Functions** (Deno) for server-side logic: payment processing webhooks, email notifications, PDF generation
- **Stripe** for payment processing (invoices, store checkout, subscription billing)
- **Resend / SendGrid** for transactional email (gallery delivery, contract signing, payment receipts)

---

## 3. Module 1 — Client Gallery

### Overview

The Client Gallery is the flagship feature of PIXNXT. It allows photographers to upload, organize, and deliver photo collections to their clients via a password-protected, beautifully designed online gallery link. Clients can view, favorite, comment on, download, and order prints directly from the gallery.

### Sub-Features

#### 3.1 Gallery Creation & Upload

- Photographers create a **Collection** (a gallery) with a name, event date, category tag (e.g., Wedding, Portrait, Newborn), and cover photo.
- Bulk photo and video upload (4K video support).
- **Upload-in-background:** Photographers can continue editing gallery settings while photos upload.
- Drag-and-drop photo reordering within a collection.
- Bulk actions: delete, move, download, apply watermark to selected photos.
- **Starred photos** feature: photographer can star/highlight their best images within a gallery.

#### 3.2 Gallery Organization

- **Collections** = individual galleries (one shoot = one collection).
- **Folders** = containers that group multiple collections (useful for event photographers, e.g., "Smith Family 2024" folder with multiple shoot collections inside).
- Sharing a folder gives clients one link to access all grouped collections.
- Collection Filters in the dashboard: filter by Status (Active, Expired, Hidden), Category Tag, and Event Date.
- **Bulk Edit:** update settings across multiple collections at once (e.g., apply the same expiry date or watermark).

#### 3.3 Gallery Settings & Customization

Each collection has the following configurable settings:

| Setting | Description |
|---|---|
| **Password Protection** | Optional PIN/password gate for clients to access gallery |
| **Download Permissions** | Enable/disable downloads; set download limit (number of photos client can download) |
| **Watermark** | Apply photographer's logo watermark to previewed photos |
| **Expiry Date** | Set a date when the gallery automatically deactivates |
| **Cover Style** | Select gallery layout (grid, slideshow, masonry) |
| **Custom Branding** | Apply photographer's brand colors and logo to the gallery page |
| **Store Assignment** | Attach a price sheet to allow clients to order prints directly from the gallery |

#### 3.4 Client Gallery Viewing Experience

The gallery link opens a **public-facing, client-optimized page** (no PIXNXT branding on upgraded plans). The client experience includes:

- Clean, distraction-free photo viewer.
- Click to expand individual photos in a lightbox.
- **Favorites:** clients can heart/favorite specific photos (photographer sees which were favorited in the dashboard).
- **Download button** (if enabled): single photo download or full-gallery download ZIP (triggers email with download link).
- **Download limit gate:** if photographer set a download limit, client can select which photos to download up to the allowed count.
- **Share options:** client can share the gallery link with family/friends.
- **Quick Share:** photographer can generate a dedicated share page with a curated subset of photos — useful for sharing sneak peeks with vendors while keeping the full gallery private.
- **QR Code:** photographer can generate a QR code for any gallery to use in print materials.

#### 3.5 Gallery Sharing & Notifications

- **Email Delivery:** photographer sends a personalized email to clients with the gallery link directly from PIXNXT dashboard.
- **Automatic notifications:** photographer receives alerts when client views the gallery for the first time, favorites photos, or places a store order.
- **Scheduled delivery:** set a future date/time for the gallery to automatically become accessible to clients.

#### 3.6 Quick Share Links

A sub-feature of Gallery Sharing:
- Select specific photos from a collection.
- Generate a dedicated Quick Share page accessible via a unique link.
- Manage all Quick Share links (enable/disable download per link, deactivate links).
- Used for: sneak peeks, vendor sharing, workshop showcases.

#### 3.7 Gallery Dashboard (Photographer-Side)

- All collections displayed in a dashboard with thumbnail, status badge, event date, view count, and order count.
- Mobile-optimized dashboard: photographers can upload and manage galleries from their phone.
- Search and filter collections.
- Collection analytics: view count, download count, favorites count, store revenue.

---

## 4. Module 2 — Studio Manager (CRM)

### Overview

Studio Manager is the business operations hub of PIXNXT. It is a full CRM (Customer Relationship Management) system designed specifically for photographers. It handles client management, bookings, scheduling, invoicing, contracts, questionnaires, quotes, project tracking, and inbox communication — all in one place.

### Sub-Features

#### 4.1 Contacts (Client Database)

- Store all clients, leads, and contacts with full profiles: name, email, phone, notes, and tags.
- **Contact Forms:** create embeddable lead capture forms that can be placed on the photographer's PIXNXT website or linked from social media. Submissions auto-create contacts and notify the photographer.
- Filter and search contacts by tag, booking status, date added.
- Each contact has a timeline view showing all interactions: emails, invoices, contracts, sessions, questionnaires.

#### 4.2 Bookings & Scheduling

- **Session Types:** photographers define their services with name, description, duration, price, and availability.
  - Supports: standard sessions, **Mini Sessions** (a special type for multiple back-to-back short sessions on a single day with limited spots).
  - Mini Session Creator: set date, session duration, number of spots, display taken slots to create urgency.
- **Booking Site:** a public booking page (hosted on PIXNXT subdomain or custom domain) where clients can:
  - Browse available session types.
  - View the photographer's availability.
  - Select a date/time slot.
  - Optionally complete intake documents during booking (contract, invoice, questionnaire).
  - Pay a retainer or full amount online to confirm the booking.
  - Apply a **booking coupon** (discount codes for promotions).
- **Calendar Integration:** sync with Google Calendar; photographer's availability is pulled from Google Calendar to prevent double-booking.
- **Video Call Scheduling:** integrate with Zoom or Google Meet for consultation calls.
- **Manual Approval:** photographer can configure bookings to require manual approval before confirmation.
- **Booking Reminders:** automated reminder emails sent to clients before their session date.

#### 4.3 Invoices & Payments

- Create branded digital invoices with line items (services, products), pricing, tax, discount, and tip option.
- **Payment Schedules:** split payment into multiple installments with individual due dates (e.g., 50% deposit at booking, 50% one week before session).
- **Retainer/Deposit:** collect a partial payment at the time of booking.
- **Automatic Reminders:** automated follow-up emails sent to clients who have not paid by the due date.
- **Payment Methods:** credit/debit cards, digital wallets (Apple Pay, Google Pay), PayPal, Klarna, Affirm.
- **Offline Payment Tracking:** log cash/check payments manually.
- **Tap to Pay:** accept in-person card payments via the Studio Manager mobile app (NFC tap-to-pay on supported phones).
- **Invoice Templates:** save reusable invoice templates for common service packages.
- **Tips:** prompt clients to leave a tip at the point of payment.
- Invoice expiry dates and prorated plan switching.

#### 4.4 Contracts & eSignatures

- Create branded digital contracts with full rich-text editing.
- Multiple signers supported.
- Clients sign contracts electronically from any device (no printing or scanning).
- **Free Contract Templates:** PIXNXT provides pre-built photography contract samples (wedding, portrait, print release, etc.) as starting points.
- **Automatic Reminders:** send automated follow-ups to clients who have not signed.
- **Expiry Dates:** set contracts to expire after a certain date if unsigned.
- Signed contracts are stored permanently in the client's profile and the photographer's documents library.

#### 4.5 Questionnaires

- Build custom questionnaires with various field types (short text, long text, multiple choice, checkboxes, date pickers).
- Used for: pre-shoot information collection (preferred shots, locations, special requests), post-shoot feedback.
- **Free Questionnaire Templates** provided.
- Clients complete questionnaires from a mobile-optimized web page — no app download required.
- Automatic reminders for incomplete questionnaires.
- Questionnaire responses stored in client's profile.

#### 4.6 Quotes

- Create branded price quotes listing available services and options.
- Client can select from the offered services and accept the quote.
- Upon client acceptance, a **draft invoice is automatically generated** from the accepted quote — reducing manual data re-entry.
- Used for: presenting multiple package options to prospective clients before formal booking.

#### 4.7 Projects Board (Kanban)

- Visual Kanban-style board with customizable stages (e.g., "Inquiry → Booked → Editing → Gallery Delivered → Archived").
- Each **Project Card** represents one client/shoot and contains: client contact, session date, payment status, linked documents (invoice, contract, questionnaire), notes, and deliverables.
- Drag-and-drop cards between stages as work progresses.
- Stages are fully customizable: add, remove, rename, reorder.
- Provides a bird's-eye view of all active and upcoming client work.

#### 4.8 Inbox (Email Communication)

- Centralized email inbox within PIXNXT for all client communication.
- Send and receive emails without leaving the dashboard.
- Conversation threads per client.
- All emails (inquiries, booking confirmations, invoice sends, gallery delivery, replies) are consolidated in one place.
- **Email Templates:** create and save reusable email templates for common scenarios (inquiry reply, thank-you note, session prep guide, gallery delivery message, etc.).
- Instant notifications when clients reply, sign, or pay.

#### 4.9 Document Templates Library

- Centralized template management for contracts, invoices, questionnaires, quotes, and emails.
- PIXNXT-provided samples available as starting points.
- Photographers save their own custom templates for repeated use.

---

## 5. Module 3 — Website Builder

### Overview

PIXNXT Website Builder is an integrated no-code website creation tool designed specifically for photography portfolios and business websites. Photographers can build a complete website — portfolio, about page, pricing page, contact form, blog — without leaving PIXNXT. The website is hosted by PIXNXT on a free subdomain (`username.mypixnxt.com`) or a custom domain.

### Sub-Features

#### 5.1 Themes & Templates

- Multiple professionally designed photography website themes.
- Themes are fully powered by a **Flex Editor** (block-based drag-and-drop editor).
- Themes optimized for: wedding photographers, portrait photographers, commercial, fine art.
- Theme switching without losing content.

#### 5.2 Flex Editor (Page Builder)

The Flex Editor uses a **block/section-based** layout system. Each page is made up of stacked sections, and each section contains configurable **Flex Blocks**:

| Block Type | Description |
|---|---|
| **Gallery / Portfolio Block** | Display curated photos from Client Gallery collections |
| **Slideshow** | Fullscreen or windowed auto-playing slideshow |
| **Carousel** | Horizontal scrolling image carousel |
| **Image Grid** | Masonry or uniform grid of photos |
| **Text Block** | Rich text (headings, paragraphs, lists) |
| **Contact Form** | Embedded contact/inquiry form (leads auto-imported to Studio Manager Contacts) |
| **Map** | Embed a location map |
| **Social Links** | Icons linking to social media profiles |
| **Live Instagram Feed** | Pull and display latest Instagram posts |
| **FAQ Block** | Expandable accordion FAQ section |
| **Custom Code Block** | Inject custom HTML/CSS/JavaScript |

- Drag-and-drop block reordering within sections.
- Full control over typography, colors, spacing, and backgrounds per block.

#### 5.3 Pages & Navigation

- Create unlimited pages (Portfolio, About, Pricing, Blog, Contact, etc.).
- Configure top-level navigation menu.
- **Hide Header/Footer** per page: useful for landing pages, coming-soon pages, thank-you pages, and product/preset sales pages.
- **Draft Sites:** create one or more draft versions of the site and work on redesigns in parallel without affecting the live site. Publish a draft when ready to replace the live site.

#### 5.4 Domain & Hosting

- Free subdomain: `username.mypixnxt.com`
- Custom domain support on paid plans (connect own domain via DNS settings).
- SSL included (HTTPS) on all sites.
- Hosting is fully managed by PIXNXT (no separate hosting account needed).

#### 5.5 SEO & Analytics

- Per-page SEO settings: title, meta description, OG image.
- Built-in analytics: page views, visitor counts.
- Google Analytics integration (add tracking ID).
- Sitemap generation.

#### 5.6 Blog

- Built-in blogging with rich text editor.
- Blog post scheduling.
- Categories and tags.
- SEO-optimized blog post URLs.

#### 5.7 QR Codes

- Generate a QR code for any page on the website.
- Download QR code image for use in printed materials, event displays, business cards.

---

## 6. Module 4 — Store (Print & Digital Commerce)

### Overview

The PIXNXT Store enables photographers to sell physical prints, digital downloads, and product packages directly from within their Client Galleries. Clients browse and purchase without leaving the gallery experience. Fulfillment is either automatic (via partner print labs) or manual (self-fulfilled by the photographer).

### Sub-Features

#### 6.1 Product Types

| Type | Description |
|---|---|
| **Print Products** | Physical prints fulfilled by partner print labs: photographic prints, mounted prints, canvas, metal, acrylic, framed prints, wall art |
| **Digital Downloads** | High-resolution digital files delivered automatically by PIXNXT after purchase |
| **Packages** | Bundles combining multiple prints and/or digitals sold at a set package price |
| **Self-Fulfilled Items** | Custom products (albums, USB drives, branded merchandise) fulfilled manually by the photographer outside PIXNXT |

#### 6.2 Price Sheets

- A **Price Sheet** is a catalog of products with configured pricing, assigned to one or more gallery collections.
- Photographers create multiple price sheets (e.g., "Wedding Pricing," "Portrait Pricing," "Mini Session Pricing") and assign them to relevant galleries.
- Each product within a price sheet has:
  - Base cost (from print lab partner)
  - Photographer's selling price / markup
  - Available size and finish options (e.g., 4×6 Lustre, 8×10 Glossy)
- **Bulk Markup Tool:** apply a percentage markup to all products at once.
- **Recommended Pricing:** PIXNXT provides data-driven recommended prices based on real sales data.
- **Minimum Order Amount:** set a minimum cart value before checkout is allowed.
- **Lab Color Correction:** option to have the print lab color-correct photos before printing.
- **Only Sell Packages mode:** hide individual products and only show package bundles.

#### 6.3 Print Fulfillment

- **Automatic Fulfillment:** orders are automatically routed to partner print labs (photographer selects preferred lab or lets PIXNXT choose). Lab prints and ships directly to client.
- **Self-Fulfillment:** photographer manually handles printing and shipping using their own preferred lab and shipping solution.
- Digital downloads are always fulfilled automatically by PIXNXT (files delivered via secure link after purchase).

#### 6.4 Client Shopping Experience

- Store is embedded within the gallery experience — clients click "Buy" on any photo to add to cart.
- Clean, native-feeling checkout flow.
- Order tracking for clients.
- Secure payment checkout (Stripe-powered).

#### 6.5 Photographer Store Dashboard

- View and manage all orders (pending, processing, shipped, complete).
- Track revenue per gallery and overall.
- **Free plan:** 15% commission fee on store sales retained by PIXNXT.
- **Paid plans:** 0% commission (photographer keeps 100% of revenue after print lab costs).

#### 6.6 Download Limit + Store Upsell Integration

- Photographers can set a download limit on a gallery (e.g., client can download 20 photos for free).
- Beyond the limit, clients are directed to the Store to purchase additional digital downloads.
- This creates a natural upsell pathway from free gallery delivery to paid store purchases.

---

## 7. Module 5 — Mobile Gallery App

### Overview

The Mobile Gallery App provides clients with a native-app-like experience to view, favorite, download, and share their photo gallery from a smartphone. This is a **white-labeled** Progressive Web App (PWA) or native app experience branded for each photographer's account.

### Sub-Features

- Clients receive a link/invitation to install/access the mobile gallery app.
- View full gallery collections with swipe-based photo browsing.
- Favorite/heart individual photos.
- Download individual photos or full gallery to camera roll.
- Share photos directly to social media.
- Receive push notifications when new photos are added to their gallery.
- Offline viewing for downloaded photos.
- App is branded with photographer's logo and colors.

> **Implementation Note:** In the React + Supabase stack, this module is best implemented as a **PWA (Progressive Web App)** with a separate React route/subdomain serving the client gallery experience. Native iOS/Android apps can be considered in a later phase using React Native or Capacitor.

---

## 8. Cross-Module Features

These features span multiple modules and should be treated as shared infrastructure in the React application.

### 8.1 Unified Dashboard

- Single login for all modules.
- Left sidebar navigation with top-level sections: Gallery, Studio Manager, Website, Store, Settings.
- Notification bell showing alerts across all modules (client viewed gallery, contract signed, invoice paid, new booking, etc.).
- Inbox accessible from all dashboard views.
- Mobile-responsive dashboard for on-the-go management.

### 8.2 Custom Branding

- On paid plans, photographers can upload their logo and set brand colors.
- Branding is applied globally to: gallery pages, booking site, invoice/contract documents, questionnaires, email notifications.
- PIXNXT branding removed from all client-facing surfaces on paid plans.

### 8.3 Referral Program

- Each photographer gets a unique referral link.
- New signups through the link receive $20 off their first paid plan.
- Referring photographer earns $20 account credit.
- Managed in Account Settings > Referrals.

### 8.4 Notifications & Automation

- **Automatic Reminders (triggered by PIXNXT):**
  - Unsigned contract reminder (X days after sending)
  - Unpaid invoice reminder (X days before/after due date)
  - Incomplete questionnaire reminder
  - Upcoming session reminder (sent to client)
- **Instant Notifications (to photographer):**
  - Client viewed gallery for the first time
  - Client favorited photos
  - Client placed a store order
  - Contract signed
  - Invoice paid
  - New booking confirmed
  - New inquiry received via contact form

### 8.5 Account & Billing

- Subscription plan management (upgrade, downgrade, cancel).
- Annual billing with discount vs. monthly billing.
- Plan proration on upgrade/downgrade.
- Accept credit/debit cards, Visa, Mastercard, Amex.
- Download invoices for subscription payments.

---

## 9. User Roles & Permissions

### 9.1 Photographer (Account Owner)

- Full access to all modules and settings.
- Creates and manages all content (galleries, documents, bookings, store products, website).
- Manages billing and subscription.

### 9.2 Studio Team Members (Multi-User / Studio Plans)

- Additional team member logins on Studio-tier plans.
- Configurable role-based access per team member.
- Multiple simultaneous logins supported.
- Use cases: second shooter, studio coordinator, sales staff.

### 9.3 Client (Gallery Viewer)

- No PIXNXT account required.
- Accesses gallery via a shared link (with optional password).
- Can: view photos, favorite photos, download photos (if enabled), place store orders, complete questionnaires, sign contracts, pay invoices.
- Client identity tracked via email (entered at first access).

---

## 10. Pricing & Subscription Plans

### 10.1 Plan Structure

PIXNXT offers **individual product plans** or a bundled **Suite plan**. All products have a free tier to get started.

#### Client Gallery Plans

| Plan | Monthly Price | Storage | Key Features |
|---|---|---|---|
| **Free** | $0 | 3 GB | Basic gallery, 15% store commission |
| **Basic** | ~$8/mo | 15 GB | Custom domain, 0% commission, video upload |
| **Plus** | ~$16/mo | 100 GB | All Basic + |
| **Pro** | ~$24/mo | 1 TB | All Plus + RAW file delivery |
| **Ultimate** | ~$40/mo | Unlimited | All Pro + unlimited storage |

#### Studio Manager Plans

| Plan | Monthly Price | Key Features |
|---|---|---|
| **Free** | $0 | Unlimited invoices, 3 contracts, 3 questionnaires, 1 session type |
| **Standard** | ~$12/mo (annual) | Unlimited contracts/questionnaires, 3 session types, custom branding, reminders |
| **Pro** | Higher tier | More session types, advanced booking features, manual approval, tips during booking |

#### Suite Plans (All Products Bundled)

| Plan | Monthly Price (Annual) | Includes |
|---|---|---|
| **Suite Basic** | ~$28/mo | All apps, Basic storage tier |
| **Suite Plus** | ~$42/mo | All apps, Plus storage tier |
| **Suite Pro** | ~$56/mo | All apps, Pro storage tier |
| **Suite Ultimate** | ~$84/mo | All apps, Unlimited storage |

> **Recommendation:** Encourage users toward Suite plans for maximum value. Implement plan comparison UI prominently in onboarding.

### 10.2 Free Tier Limitations (Important for UX)

- 3 GB storage
- 15% commission on store sales
- `username.mypixnxt.com` subdomain only (no custom domain)
- PIXNXT branding visible on all client-facing pages
- Limited number of contracts/questionnaires/session types in Studio Manager

### 10.3 Upgrade Triggers (In-App)

Design UX prompts to encourage upgrades when users hit:
- Storage limit
- Contract/questionnaire/session type limit
- Attempting to use custom domain
- Wanting to remove PIXNXT branding
- Reaching the commission threshold on store sales

---

## 11. Supabase Data Architecture

### 11.1 Authentication

- Use **Supabase Auth** for photographer account sign-up/login (email+password, Google OAuth).
- Client access to galleries is **passwordless / link-based** — not a full Supabase Auth account. Track client identity via `gallery_visitors` table storing email + gallery_id.
- Row Level Security (RLS) policies on all tables: users can only read/write their own data.

### 11.2 Core Database Tables

```
users                        -- Photographer accounts (linked to Supabase auth.users)
  id, email, name, plan_id, brand_logo_url, brand_color, subdomain, custom_domain, created_at

subscriptions                -- Active plan details per photographer
  id, user_id, plan_name, status, stripe_subscription_id, current_period_end

-- GALLERY MODULE
collections                  -- Individual galleries
  id, user_id, title, slug, event_date, category, cover_photo_id, 
  password_hash, download_enabled, download_limit, watermark_enabled,
  expiry_date, status, store_price_sheet_id, created_at

photos                       -- Photos within a collection
  id, collection_id, user_id, storage_path, filename, sort_order, 
  is_starred, width, height, file_size, created_at

folders                      -- Groups of collections
  id, user_id, name, slug, created_at

folder_collections           -- Join table: folders <-> collections
  folder_id, collection_id

gallery_visitors             -- Tracks client access per gallery
  id, collection_id, email, first_viewed_at, download_count

photo_favorites              -- Client-favorited photos
  id, photo_id, collection_id, visitor_email, created_at

quick_share_links            -- Curated sub-selections of photos
  id, collection_id, user_id, slug, download_enabled, is_active, created_at

quick_share_photos           -- Photos included in a quick share
  quick_share_id, photo_id

-- STUDIO MANAGER MODULE
contacts                     -- Clients/leads
  id, user_id, name, email, phone, notes, tags, created_at

projects                     -- Client projects / shoots
  id, user_id, contact_id, title, stage, session_date, notes, created_at

project_stages               -- Customizable Kanban stages
  id, user_id, name, sort_order

invoices                     -- Invoices
  id, user_id, contact_id, project_id, status, subtotal, tax, discount,
  total, due_date, stripe_payment_intent_id, created_at

invoice_items                -- Line items on invoices
  id, invoice_id, description, quantity, unit_price

invoice_payments             -- Payment records
  id, invoice_id, amount, method, paid_at, notes

contracts                    -- Contracts
  id, user_id, contact_id, project_id, title, body_html, status,
  expiry_date, signed_at, signer_name, signer_ip, created_at

questionnaires               -- Questionnaire definitions
  id, user_id, title, fields_json, created_at

questionnaire_responses      -- Submitted responses
  id, questionnaire_id, contact_id, project_id, responses_json, submitted_at

quotes                       -- Price quotes
  id, user_id, contact_id, project_id, status, items_json, total, 
  accepted_at, created_at

session_types                -- Bookable session definitions
  id, user_id, name, description, duration_minutes, price, 
  deposit_amount, is_mini_session, is_active

bookings                     -- Confirmed bookings
  id, user_id, contact_id, session_type_id, start_time, end_time,
  status, payment_status, created_at

availability_slots           -- Photographer's available time slots
  id, user_id, day_of_week, start_time, end_time, is_blocked

inbox_messages               -- Email messages
  id, user_id, contact_id, direction, subject, body, sent_at, read_at

document_templates           -- Reusable document templates
  id, user_id, type, name, content_html, created_at

contact_forms                -- Lead capture form definitions
  id, user_id, name, fields_json, created_at

contact_form_submissions     -- Submitted lead form entries
  id, contact_form_id, user_id, data_json, submitted_at

-- STORE MODULE
price_sheets                 -- Product catalogs
  id, user_id, name, fulfillment_type, lab_id, min_order_amount, 
  lab_color_correct, only_packages, created_at

products                     -- Products in price sheets
  id, price_sheet_id, user_id, type, name, category, base_cost,
  selling_price, options_json, is_visible

orders                       -- Client store orders
  id, user_id, collection_id, visitor_email, status, subtotal, 
  total, stripe_payment_intent_id, shipping_address_json, created_at

order_items                  -- Items in an order
  id, order_id, product_id, photo_id, quantity, unit_price, 
  options_json, fulfillment_status

-- WEBSITE MODULE
websites                     -- Website configurations
  id, user_id, theme_id, is_published, draft_site_id, custom_domain,
  subdomain, seo_json, analytics_tracking_id, created_at

website_pages                -- Individual website pages
  id, website_id, slug, title, meta_description, is_published,
  hide_header_footer, sort_order

website_blocks               -- Page content blocks
  id, page_id, type, content_json, sort_order
```

### 11.3 Supabase Storage Buckets

```
gallery-photos               -- Photographer-uploaded photos (private, access via signed URLs)
gallery-videos               -- Video uploads
website-assets               -- Website images and assets
document-assets              -- Brand logos, document attachments
```

### 11.4 Supabase Edge Functions

```
/send-gallery-email          -- Email gallery link to client
/process-store-order         -- Handle Stripe webhook for completed orders
/send-invoice-reminder       -- Cron-triggered automated invoice reminders
/send-contract-reminder      -- Cron-triggered contract reminder emails
/generate-download-zip       -- Create gallery download ZIP and email link to client
/stripe-subscription-webhook -- Handle plan upgrades/cancellations from Stripe
/process-booking-payment     -- Handle payment collection during booking flow
```

---

## 12. React Application Structure

```
src/
├── main.jsx
├── App.jsx                          # Root with React Router setup
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   └── ForgotPasswordPage.jsx
│   │
│   ├── dashboard/
│   │   └── DashboardHomePage.jsx    # Overview/stats
│   │
│   ├── gallery/
│   │   ├── GalleryListPage.jsx      # All collections
│   │   ├── GalleryDetailPage.jsx    # Edit a collection
│   │   ├── GalleryUploadPage.jsx    # Photo upload
│   │   └── FoldersPage.jsx
│   │
│   ├── studio/
│   │   ├── ContactsPage.jsx
│   │   ├── ProjectBoardPage.jsx
│   │   ├── InvoicesPage.jsx
│   │   ├── InvoiceDetailPage.jsx
│   │   ├── ContractsPage.jsx
│   │   ├── QuestionnairesPage.jsx
│   │   ├── QuotesPage.jsx
│   │   ├── BookingsPage.jsx
│   │   ├── CalendarPage.jsx
│   │   ├── InboxPage.jsx
│   │   └── TemplatesPage.jsx
│   │
│   ├── website/
│   │   ├── WebsiteEditorPage.jsx    # Flex editor
│   │   └── WebsiteSettingsPage.jsx
│   │
│   ├── store/
│   │   ├── PriceSheetsPage.jsx
│   │   ├── PriceSheetDetailPage.jsx
│   │   └── OrdersPage.jsx
│   │
│   └── settings/
│       ├── AccountSettingsPage.jsx
│       ├── BrandingSettingsPage.jsx
│       ├── BillingPage.jsx
│       └── ReferralPage.jsx
│
├── client-facing/                   # Separate route tree for public/client pages
│   ├── GalleryViewPage.jsx          # Client gallery viewer
│   ├── GalleryPasswordPage.jsx      # Password gate
│   ├── QuickSharePage.jsx
│   ├── BookingPage.jsx              # Public booking site
│   ├── InvoicePayPage.jsx           # Client invoice payment
│   ├── ContractSignPage.jsx         # Client contract signing
│   └── QuestionnaireFormPage.jsx    # Client questionnaire
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   └── NotificationBell.jsx
│   ├── gallery/
│   │   ├── PhotoGrid.jsx
│   │   ├── PhotoLightbox.jsx
│   │   ├── UploadDropzone.jsx
│   │   └── CollectionCard.jsx
│   ├── studio/
│   │   ├── KanbanBoard.jsx
│   │   ├── KanbanCard.jsx
│   │   ├── InvoiceBuilder.jsx
│   │   ├── ContractEditor.jsx
│   │   └── QuestionnaireBuilder.jsx
│   ├── website/
│   │   ├── FlexEditor.jsx
│   │   ├── BlockRenderer.jsx
│   │   └── ThemePicker.jsx
│   └── shared/
│       ├── Button.jsx
│       ├── Modal.jsx
│       ├── FileUpload.jsx
│       ├── RichTextEditor.jsx
│       └── PlanGate.jsx             # Shows upgrade prompt if feature requires higher plan
│
├── hooks/
│   ├── useAuth.js
│   ├── useGallery.js
│   ├── useStudio.js
│   ├── useStore.js
│   └── useSubscription.js
│
├── lib/
│   ├── supabase.js                  # Supabase client initialization
│   ├── stripe.js                   # Stripe client
│   └── utils.js
│
└── store/                           # Global state (Zustand or Context)
    ├── authStore.js
    └── notificationStore.js
```

---

## 13. Third-Party Integrations

| Service | Purpose | Integration Method |
|---|---|---|
| **Stripe** | Payment processing (invoices, store, subscriptions) | Stripe.js + Supabase Edge Function webhooks |
| **Google Calendar** | Sync photographer availability for bookings | OAuth2 via Google API |
| **Google Meet** | Video consultation scheduling | Google Meet API |
| **Zoom** | Video consultation scheduling | Zoom OAuth |
| **Resend / SendGrid** | Transactional emails (gallery links, reminders, receipts) | API via Supabase Edge Functions |
| **Print Lab APIs** | Automatic print order fulfillment | Lab-specific REST APIs (e.g., WHCC, Bay Photo) |
| **Instagram API** | Live Instagram feed block in website builder | Instagram Basic Display API |
| **Google Analytics** | Website traffic analytics | GA4 tracking code injection |
| **PayPal** | Alternative payment method | PayPal SDK |
| **Klarna / Affirm** | Buy-now-pay-later payment options | Via Stripe payment methods |

---

## 14. UI/UX Design Principles

PIXNXT follows Pixieset's core design philosophy which is central to its success:

1. **Minimalist & Clean:** Ample white space. Photography is the hero — the UI never competes with the photos.
2. **Mobile-First Client Experience:** All client-facing pages (gallery viewer, booking site, invoice, contract) must be flawless on mobile without requiring app downloads.
3. **Mobile-Optimized Dashboard:** The photographer dashboard must be fully functional on phones (upload, share, manage from anywhere).
4. **Instant Clarity:** Every page communicates its purpose immediately. Onboarding flow is self-explanatory.
5. **Progressive Disclosure:** Free users see full UI but hit soft gates for premium features, with clear, non-disruptive upgrade prompts.
6. **Zero Technical Friction:** Photographers are creatives, not developers. No technical jargon, no required technical knowledge.
7. **Brand Elevation:** Client-facing surfaces (galleries, booking pages) should make the photographer look premium and professional.

### Design Token Targets

- **Typography:** Clean sans-serif (Inter or similar)
- **Color Palette:** Near-white backgrounds, very dark near-black text, single accent color (photographer's brand color replaces default on client pages)
- **Photo Display:** Dark-on-light for portfolio, light-on-dark for gallery viewer mode
- **Spacing:** Generous padding, grid-based layouts

---

## 15. Key User Journeys

### Journey 1: Photographer Onboards and Delivers First Gallery

1. Signs up (email or Google) → Free plan activated automatically.
2. Uploads photos to first Collection.
3. Configures gallery: sets cover photo, enables/disables downloads, optionally sets password.
4. Clicks "Share Gallery" → composes and sends delivery email to client from within PIXNXT.
5. Client receives email, clicks link, optionally enters password, views gallery.
6. Photographer receives notification "Client viewed gallery."
7. Client favorites photos → photographer sees favorites in dashboard.

### Journey 2: Photographer Books a New Client

1. Photographer sets up a Session Type (name, duration, price) and availability in Studio Manager.
2. Publishes their Booking Site (gets a public URL).
3. Shares booking site link in Instagram bio or website.
4. New client visits booking site, selects session type, picks date/time, enters details, pays deposit — all in one flow.
5. Photographer receives "New Booking" notification.
6. System automatically creates: Contact, Project card, Invoice (with remaining balance), Contract (optional, sent automatically).
7. Client receives confirmation email with session prep details.

### Journey 3: Client Orders Prints from Gallery

1. Photographer has assigned a Price Sheet to a gallery.
2. Client views gallery, hovers/clicks a photo, sees "Buy" or shopping cart option.
3. Client selects product (e.g., 8×10 print, Lustre finish), adds to cart.
4. Checkout flow: enter shipping address, payment details (Stripe).
5. Order confirmed → photographer and lab notified.
6. If automatic fulfillment: lab prints and ships directly to client.
7. Photographer sees revenue in Store > Orders dashboard.

### Journey 4: Photographer Builds Their Website

1. Goes to Website module → chooses a theme.
2. Flex Editor opens → edits existing blocks (changes hero text, uploads portfolio photos).
3. Adds a Contact Form block → form submissions go to Studio Manager Contacts automatically.
4. Links their custom domain (on paid plan).
5. Publishes website.

---

## 16. Development Phases & Priorities

### Phase 1 — MVP Core (Months 1–3)

**Goal:** Photographers can sign up, upload galleries, and share them with clients.

- [ ] Supabase project setup (Auth, DB schema, Storage buckets)
- [ ] Photographer auth (signup, login, password reset)
- [ ] Collection CRUD (create, edit, delete galleries)
- [ ] Photo upload to Supabase Storage (bulk, background upload)
- [ ] Photo display grid with drag-and-drop reordering
- [ ] Gallery settings: password, download toggle, expiry date
- [ ] Public gallery viewer (client-facing page)
- [ ] Gallery email delivery (send link to client)
- [ ] Basic dashboard with collections list
- [ ] Free plan with storage limit enforcement
- [ ] Stripe subscription integration (Basic and Pro plans)

### Phase 2 — Studio Manager Core (Months 3–5)

**Goal:** Photographers can manage clients, send invoices, and get paid.

- [ ] Contacts CRUD
- [ ] Invoice builder and payment via Stripe
- [ ] Contract editor with e-signature
- [ ] Basic email Inbox
- [ ] Project Board (Kanban)
- [ ] Automated invoice and contract reminders (Edge Functions + cron)

### Phase 3 — Bookings & Store (Months 5–8)

**Goal:** Self-serve booking and print sales.

- [ ] Session Types management
- [ ] Public Booking Site page
- [ ] Google Calendar sync
- [ ] Retainer/deposit collection at booking
- [ ] Store Price Sheet builder
- [ ] Product catalog (print products + digital downloads)
- [ ] Client checkout flow within gallery
- [ ] Order management dashboard
- [ ] Print lab API integration (at least one lab)

### Phase 4 — Website Builder (Months 8–12)

**Goal:** Photographers can build a portfolio website within PIXNXT.

- [ ] Theme system
- [ ] Flex Editor with core block types
- [ ] Page management (create, publish, delete pages)
- [ ] Custom domain connection
- [ ] SEO settings per page
- [ ] Contact form block → Studio Manager Contacts integration
- [ ] Blog module

### Phase 5 — Polish & Growth (Ongoing)

- [ ] Questionnaires and Quotes in Studio Manager
- [ ] Mini Sessions booking type
- [ ] Mobile Gallery App (PWA)
- [ ] Quick Share links
- [ ] Folders for gallery organization
- [ ] Bulk edit for collections
- [ ] Instagram Feed block for website
- [ ] Referral program
- [ ] Analytics dashboard (gallery views, store revenue, booking conversion)
- [ ] Multi-user / Studio plan

---

## Appendix: Naming Conventions (Pixieset → PIXNXT)

| Pixieset Term | PIXNXT Term |
|---|---|
| Pixieset | PIXNXT |
| Client Gallery | Client Gallery (unchanged) |
| Studio Manager | Studio Manager (unchanged) |
| Pixieset Website | PIXNXT Website / Site Builder |
| mypixieset.com | mypixnxt.com |
| Pixieset Store | PIXNXT Store |
| Mobile Gallery App | PIXNXT Gallery App |
| Suite Plan | PIXNXT Suite |

---

*This README is a living document. Update it as new features are scoped, designed, or built. Every AI model or developer joining this project should read this document first to gain complete context before writing any code.*