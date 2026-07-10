# CarMatchr — Complete Functional Specification

> **Scope:** This document covers every visible and interactive element of the CarMatchr website — pages, sections, forms, buttons, modals, filters, notifications, and validation rules. Technology stack, APIs, and database details are intentionally excluded.

---

## Table of Contents

1. [Global Navigation (Navbar)](#1-global-navigation-navbar)
2. [Home Page](#2-home-page)
3. [Marketplace Page](#3-marketplace-page)
4. [New Car Dealers Directory](#4-new-car-dealers-directory)
5. [Used Car Dealers Directory](#5-used-car-dealers-directory)
6. [Dealer Profile Page](#6-dealer-profile-page)
7. [Login Page](#7-login-page)
8. [Registration Page](#8-registration-page)
9. [Buyer Dashboard](#9-buyer-dashboard)
10. [Broker Dashboard](#10-broker-dashboard)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Profile Settings Page](#12-profile-settings-page)
13. [Shared Modals & Overlays](#13-shared-modals--overlays)

---

## 1. Global Navigation (Navbar)

The Navbar appears on all pages and adapts based on the user's authentication state and screen size.

### 1.1 Logo
- **Element:** "CarMatchr" text logo with a compact "CM" icon on smaller viewports.
- **Behavior:** Clicking navigates to the Home page (`/`).

### 1.2 Location Selector (City Picker)
- **Element:** A pill-shaped button showing the currently selected city (e.g., "Chennai") with a map-pin icon.
- **Behavior:** Clicking opens the **City Selector Modal** (see §13.1). Selecting a city filters home-page dealer lists to that city.
- **State:** The selected city persists across navigation within the session.

### 1.3 Primary Navigation Links (Logged Out)
| Link | Destination |
|------|-------------|
| Home | `/` |
| Marketplace | `/marketplace` |
| Dealers ▾ | Dropdown → New Car Dealers (`/dealers`) / Used Car Dealers (`/dealers/used`) |
| Login | `/login` |
| Register | `/register` |

### 1.4 Primary Navigation Links (Logged In — Buyer)
| Link | Destination |
|------|-------------|
| Home | `/` |
| Marketplace | `/marketplace` |
| Dealers ▾ | Dropdown → New Car Dealers / Used Car Dealers |
| Dashboard | `/buyer-dashboard` |
| Notification Bell | Unread badge count; opens notification feed in the dashboard |
| User Avatar/Name | Dropdown: My Profile, Settings, Logout |

### 1.5 Primary Navigation Links (Logged In — Broker)
Same as Buyer, with "Dashboard" pointing to `/broker-dashboard`.

### 1.6 Primary Navigation Links (Logged In — Admin)
Dashboard points to `/admin`.

### 1.7 Language Selector
- **Single Source of Truth:** Controlled dynamically by the frontend `LanguageContext`.
- **Options:** English, Tamil, Hindi, Telugu, Malayalam, Kannada.
- **Immediate Sync:** Changing the selection in either the navbar chip or the buyer settings preference immediately updates the active language on all page headers and body components.
- **Guest behavior:** Stores the preference in browser `localStorage` (`carmatchr_lang`), defaulting to `'en'`.
- **Logged-in behavior:** On login, the user's stored database language preference is fetched and loaded into the `LanguageContext`. Changing the selection updates both the database profile settings and `localStorage` fallback.

### 1.8 Mobile Behaviour
- On mobile viewports, primary links collapse behind a hamburger menu (☰).
- Tapping the hamburger opens a slide-in or dropdown with all nav links.

---

## 2. Home Page (`/`)

The Home Page is the landing page and serves as the primary entry point for the reverse marketplace.

### 2.1 Hero Section

A full-width banner with a car image background and a semi-transparent white overlay.

#### 2.1.1 Left Column — Headline & Stats
- **Badge:** "India's #1 Reverse Car Marketplace" (small text with a star icon).
- **Headline (H1):** "You tell us what you want / We'll find your perfect deal." (Primary brand statement)
- **Subtitle:** "Post your car requirements and get verified brokers competing to bring you the best offers."
- **Tagline:** "No searching. No calling. No hassle."
- **Trust Stats Row:** Four inline statistics:
  - 10,000+ Active Buyers
  - 2,500+ Verified Brokers
  - 50,000+ Deals Done
  - 4.8 ★ Rating

#### 2.1.2 Right Column — Post Requirement Form Card

A white card titled "Post Your Requirement" with the subtitle "It's quick, easy and free."

**Form Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Vehicle Condition * | Pill selector | Toggle pills: "New" or "Used"; required |
| Select Brand * | Dropdown | Populated from the product catalog; required |
| Select Model * | Dropdown | Populated based on selected Brand; disabled until Brand is chosen; required |
| Your Budget * | Number input (₹ Lakh) | Numeric; positive; representing Max Budget; required |
| State * | Dropdown | Select from Indian states; required |
| City * | Dropdown | Populated based on selected State (from master-data dropdown); disabled until State is chosen; required |

**Submit Button:** "Post Requirement" (with a send icon).
- Shows a loading spinner ("Posting…") while submitting.
- **Logged-in Buyer:** Redirects the user to the Buyer Dashboard, and automatically opens the Post Requirement Form modal with these details pre-filled in a **Draft** state.
- **Non-buyer (Broker/Admin):** Shows error toast "Only buyers can post requirements."
- **Logged-out user:**
  - Validates the home form fields.
  - If valid, saves the incomplete requirement data to the browser's `sessionStorage` under the key `pending_requirement`.
  - Shows a toast: "Please log in or register to complete your requirement!" and redirects the user to the Login page (`/login`).
  - **Resuming Incomplete Submissions:** After successful login or registration, the application checks `sessionStorage` for `pending_requirement`. If found, the user is redirected to the Buyer Dashboard (`/buyer-dashboard`), and the Post Requirement Form modal is automatically opened and pre-filled with the saved data in a **Draft** state. The user can review it, add any optional/deferred fields, and click "Post Requirement" to finalize and publish it. The `pending_requirement` key is then cleared from `sessionStorage`.

**Deferred Fields (Deferred to Dashboard):**
- **Common:** Min Budget (pre-populated as 85% of "Your Budget", editable), Variant, Additional Notes.
- **New Car Specific:** Fuel Type, Transmission, Color Preference, Purchase Timeline.
- **Used Car Specific:** Min Year, Max Year, Max KM Driven, Ownership Preference, Accident History.

**Privacy Note:** "🔒 Your details are secure and private."

**Validation Errors (toast notifications):**
- "Please select vehicle condition (New or Used)."
- "Please select a car brand."
- "Please select a car model."
- "Please specify your budget."
- "Please select a state."
- "Please select a city."

### 2.2 Trusted Dealers Strip

Displayed below the hero. Shows two horizontally scrolling (auto-animated) dealer card rows:

- **Row 1 — New Car Showrooms** (red label)
- **Row 2 — Pre-Owned Car Dealers** (green label)

**When a city is selected** (via location filter), the auto-scroll stops and replaces with a static filtered view showing only dealers in that city. A city badge with an ✕ button appears to clear the filter.

**Stats shown:**
- Default: 500+ Dealers | 36 Districts | 15 Brands
- Filtered: Count of New Car dealers | Count of Pre-Owned dealers | Total in selected city

**Empty state (city filtered, no dealers):**
- Displays an icon, "No new car showrooms in [City]", and a "View all Tamil Nadu →" link.

#### 2.2.1 Individual Dealer Card

Each dealer card (200px wide) in the strip shows:
- **Badge** (top-left): "⭐ TOP RATED" (amber) for rating ≥ 4.8, or "⚡ FAST RESPONSE" (green) for others.
- **Avatar:** 44×44px square with rounded corners, showing brand-color-coded initials.
- **Dealer Name** with a verified red badge check (✓) if verified.
- **City** with map-pin icon.
- **Star Rating** and review count.
- **Stats row:** `X+ Offers` | `X yr Exp`
- **Actions:**
  - "View Profile" button → navigates to `/dealers/:id`.
  - Phone icon button → initiates a `tel:` call.

**Hover effect:** Card lifts up (transform: translateY(-3px)) with a shadow.

### 2.3 "Why Buyers Love CarMatchr" Feature Strip

A horizontal row of four glassmorphic benefit cards:
1. **Save Time** — "No more endless searching"
2. **Best Prices** — "Brokers compete for you"
3. **Verified Brokers** — "Trusted & experienced"
4. **Secure & Private** — "100% safe & confidential"

### 2.4 How It Works Section

**Heading (H2):** "How It Works"
**Subtitle:** "A reverse marketplace that flips the used-car buying experience."

Three step cards in a 3-column grid (glassmorphic style):

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 01 | Search | Post Your Requirement | (translated string) |
| 02 | Zap | Get Offers | (translated string) |
| 03 | Award | Close the Deal | (translated string) |

Each card has a subtle "STEP 0X" label in the top-right corner. Cards lift on hover.

### 2.5 CTA Section (Call to Action)

Centered glassmorphic panel (max-width 640px):
- **Heading (H2):** "Ready to find your car?" (translated)
- **Subtitle:** (translated)
- **Two buttons:**
  - "Post Your Requirement →" (primary/red) → navigates to `/register`.
  - "Join as a Broker" (secondary/outlined) → navigates to `/register?role=broker`.

---

## 3. Marketplace Page (`/marketplace`)

The Marketplace page displays the full catalog of pre-owned and broker-listed vehicles, with rich filtering and sorting options.

### 3.1 Page Header
- **H1:** "Marketplace"
- **Subtitle:** "Explore, filter and find premium pre-owned vehicles verified by local brokers"
- **City Button** (top-right): Shows current city filter or "All Cities". Clicking opens the **City Selector Modal** (§13.1).

### 3.2 Toolbar

A white card containing the search bar, filter button, and sort options.

#### 3.2.1 Results Count
- Text: "**X** cars found" | "**X** cars found in **[City]**"

#### 3.2.2 Search Bar
- **Placeholder:** "Search cars..."
- **Behavior:** Real-time filtering as user types. Matches across make, model, variant, and city.

#### 3.2.3 Filters Button
- Shows a "Filters" label with a sliders icon.
- If filters are active, a red circular badge shows the **count of active filters**.
- Clicking opens the **Filter Panel Modal** (§13.2).

#### 3.2.4 Sort Chips
Pill-shaped buttons in a row; active pill has a red border and light-red background:
- **Newest** (default)
- **Price: Low to High**
- **Price: High to Low**
- **Rating**

### 3.3 Active Filter Chips Bar

Visible only when one or more filters are active. Shows individual chips that can be removed:

| Chip | Removal Behavior |
|------|------------------|
| `[Make] ×` | Clears the Make filter |
| `[Body Type] ×` | Clears the Body Type filter |
| `[Fuel Type] ×` | Clears the Fuel Type filter |
| `[Transmission] ×` | Clears the Transmission filter |
| `Budget ×` | Resets budget to full range |
| **Clear All** link | Resets all filters (retains city) |

### 3.4 Car Grid

A responsive 4-column grid (fewer on smaller screens). Each **Car Card** contains:

#### 3.4.1 Car Card — Image Area
- Image with full-width display; multiple images supported.
- **Image carousel** (if multiple images):
  - Left (‹) and right (›) arrow buttons to navigate images.
  - Dot indicators at the bottom showing current index.
- **Featured badge** (top-left): "Featured" — dark translucent pill (shown for featured listings).
- **Broker Listed badge** (top-left): "🏪 Broker Listed" — red translucent pill (shown for broker-listed cars; mutually exclusive with Featured badge).

#### 3.4.2 Car Card — Details Area
- **Year / Make / Model** (H3, bold)
- **Variant** (small, gray)
- **Price** (₹X Lakh, large, red)
- **Specs row** (small icons + text):
  - Odometer icon + KM Driven (formatted with commas)
  - Fuel icon + Fuel Type
  - Transmission type (AT for Automatic, MT for Manual)
- **Location row:**
  - 📍 City (left)
  - ★ Seller Rating (right, amber)
- **"Contact Broker" button** (blue, full-width): Only visible on **Broker Listed** cards. Clicking opens the **Contact Broker Modal** (§13.3).

#### 3.4.3 Card Interaction
- **Standard (non-broker) listings:** Cards are intentionally non-clickable. There is no detail page for standard marketplace listings. Users who wish to contact the seller for a standard listing are directed via a "Find a Dealer" link (shown on hover) to the Dealer Directory (`/dealers` or `/dealers/used` depending on car type). This is by design — the marketplace is discovery-only for standard listings; deal-making happens through the reverse-requirement flow.
- **Broker Listed cards:** Clicking any non-button area of the card opens the **Contact Broker Modal** (§13.3) for the listed car.

### 3.5 Empty State

When no cars match the current filters:
- Search icon
- **Title:** "No Results Found"
- **Subtitle:** "Try resetting your filters or adjusting your budget limits."

---

## 4. New Car Dealers Directory (`/dealers` or `/dealers/new`)

### 4.1 Hero Header

Dark gradient background with decorative overlays.

- **Breadcrumb:** "New Car Dealers / Used Car Dealers" (the latter is a clickable link to `/dealers/used`)
- **Category badge:** "✨ Authorized Dealerships" (indigo pill)
- **H1:** "Authorized New Car Dealers / in Tamil Nadu" (with gradient text)
- **Subtitle:** "Find official dealerships, compare offers, and drive home your dream car."

#### 4.1.1 Hero Search Bar
A glassmorphic input bar:
- **Placeholder:** "Search dealer, city or brand…"
- **Search button** — filters the dealer list in real-time.

### 4.2 Trust Stats Bar

Shown below the hero once data loads. Four stat tiles in a row:
| Stat | Icon |
|------|------|
| Authorized Dealers + | Blue check |
| Total Vehicles + | Red car |
| Cities Covered + | Amber map-pin |
| Brands Covered + | Green award |

### 4.3 Browse by Brand

A horizontal row of toggle-pill buttons for quick brand filtering:
- Maruti Suzuki 🚗, Hyundai 🚙, Tata Motors 🚐, Mahindra 🛻, Toyota 🚕, Honda 🏎️, Kia 🚘, MG 🚖.
- **Active pill:** shows brand color, border, and an × icon.
- Clicking an active pill deselects the filter.

**Brand Filter Synchronization (Pills ↔ Dropdown):**
The brand pills (§4.3) and the "All Brands" dropdown in the Filter Controls Bar (§4.5.4) are **synchronized to the same single brand filter state**. They do not override or combine with each other — they represent two UI controls for the same value:
- Selecting a pill sets the brand filter to that brand; the dropdown simultaneously updates to show that brand.
- Selecting a brand from the dropdown simultaneously highlights the matching pill (if visible in the row).
- Deselecting via either control (pill × or dropdown reset to "All Brands") clears the filter for both.
- **Only one brand can be active at a time.** Selecting a second pill deselects the first.

### 4.4 Featured Dealerships

Shown when dealers with rating ≥ 4.7 and verified status exist. Dark gradient cards:

Each featured card contains:
- "AUTHORIZED" badge (top-right, indigo)
- Dealer logo (initials in brand-color circle)
- Business name + city
- Brand chip
- 3-col stats mini-grid: Rating | Vehicles | Years
- **"View Profile" button** → `/dealers/:id`
- **Phone icon button** → `tel:` call

Cards lift on hover.

### 4.5 Filter & Controls Bar

#### 4.5.1 Tab switcher
Two-button toggle:
- **New Cars** (active — indigo filled, non-clickable)
- **Used Cars** → navigates to `/dealers/used`

#### 4.5.2 View Mode Toggle
- **Grid** (LayoutGrid icon)
- **List** (List icon)
- Active mode has an indigo background.

#### 4.5.3 Sort Dropdown
Options:
- Highest Rated (default)
- Most Vehicles
- Most Experienced
- A → Z

#### 4.5.4 Filter Chips Row
| Filter | Type | Options |
|--------|------|---------|
| 📍 All Cities | Dropdown | 10 Tamil Nadu cities |
| 🚗 All Brands | Dropdown | 12 car brands |
| ⭐ Any Rating | Dropdown | 4.8+, 4.5+, 4.0+ |
| Authorized Only | Toggle button | Filters to verified dealers only |
| Clear All | Button (red) | Visible only when filters are active |

**Results count** is shown at the far right of the filter row (e.g., "24 dealers found").

### 4.6 Dealer Cards

#### 4.6.1 Grid View Card
Vertical card with:
- **Badge** (top-left): "⭐ TOP RATED" (amber) or "⚡ FAST REPLY" (indigo).
- **Logo** (64×64px, rounded square, brand-color initials).
- **Business Name** + verified badge.
- **City** with map-pin.
- **Star rating** + review count.
- **2-col stats mini-grid:** Vehicles | Experience.
- **Brand tag** chip (if applicable).
- **Actions:** "View Profile" button + Phone icon button.

**Hover:** Card lifts (translateY(-4px)) with an indigo-tinted shadow.

#### 4.6.2 List View Row
Horizontal row with:
- Logo (56×56px).
- Name, verified badge, "TOP RATED" chip (if applicable).
- Inline stats: City, Rating, Vehicles, Years, Brand tag.
- **Actions:** "View Profile" button + Phone icon button.

**Hover:** Row slides right slightly (translateX(2px)).

### 4.7 Empty State (No Results)
- Car icon, "No dealers found", "Try adjusting your filters.", "Clear Filters" button.

### 4.8 Features Banner (Footer)

A dark gradient panel at the bottom with 4 feature highlights:
1. **Authorized Only** — Official manufacturer-certified dealers
2. **Expert Staff** — Trained sales & service professionals
3. **Latest Models** — Full lineup of current-year vehicles
4. **Test Drive Ready** — Book a test drive at any dealership

---

## 5. Used Car Dealers Directory (`/dealers/used`)

Functionally identical to the New Car Dealers directory (§4) with the following differences:

- **Hero H1:** "Pre-Owned Car Dealers / in Tamil Nadu"
- **Tab Switcher:** "New Cars" (clickable → `/dealers`) | **"Used Cars"** (active)
- **Data:** Fetches dealers with `type=used`.
- **Features Banner:** Highlights relevant to pre-owned cars (e.g., RC Transfer Support, Vehicle Inspection, Transparent History).

---

## 6. Dealer Profile Page (`/dealers/:id`)

### 6.1 Hero Banner

Dark gradient (navy to deep blue) with decorative circles.

#### 6.1.1 Back Navigation
- "← Back to Dealers" link (top-left, navigates to `/dealers`).

#### 6.1.2 Dealer Identity Block
- **Avatar** (88×88px): Red gradient with white initials (first two words of business name).
- **Business Name (H1)** (white, large).
- **Verified badge** (green, "✓ Verified") — shown only if `verified = true`.
- **Owner Name** — shown in small gray text if available.
- **Contact row:** 📍 City/State | 📞 Phone (clickable `tel:` link) | ✉ Email.
- **Type badges:**
  - Dealer type pill: "🚗 New/Used/Both Cars"
  - Business type pill (if applicable): e.g., "Dealer" or "Individual"

#### 6.1.3 Rating Chip (top-right)
A glassmorphic chip showing:
- ⭐ Rating (large)
- Review count

#### 6.1.4 Stats Strip (below banner)

Four stat tiles separated by vertical dividers:
| Stat | Value | Calculation |
|------|-------|-------------|
| Listings | Count of active inventory | Live count of active marketplace listings |
| Years Active | Years in business | **Derived from the `Founding Year` field** (set in §12.6). Displayed as `current_year − founding_year`. If `Founding Year` is not set, falls back to `current_year − year(createdAt)` and is labeled "Member for X yr" instead. |
| Member Since | Year joined | Year extracted from `createdAt` timestamp (the account registration date) |
| Reviews | Total review count | Count of all reviews submitted for this dealer |

### 6.2 Main Body (2-Column Layout)

#### 6.2.1 Left Column

**About Card** (shown if description, website, maps link, brands, or address exist):
- **Title (H2):** "About [Business Name]"
- Business description text (with a left red border).
- Full address with map-pin icon.
- Website link (opens in new tab, with external link icon).
- "View on Google Maps" link (opens maps link in new tab).
- **Authorized Brands** section (if applicable): Comma-separated brand tags as pill chips.

**Current Inventory Section:**
- **Title (H2):** "Current Inventory" + count badge.
- Responsive grid of listing cards.
- **Each listing card:**
  - Image (with fallback car icon for no image) + Year badge (top-right overlay).
  - Make + Model (bold), Variant (small gray).
  - Specs row: ⛽ Fuel | ⚙ Transmission | 📍 City.
  - KM Driven (gray) + Price (red, large).
- **Empty state:** "No active listings — This dealer hasn't posted any cars yet."

#### 6.2.2 Right Sidebar (sticky)

**Contact Card:**
- **Call Now** button (red, full-width `tel:` link).
- **WhatsApp** button (green, opens `https://wa.me/{phone}`).
- **Get Directions** button (gray, opens maps link in new tab).

**At a Glance Card:**
A checklist of trust indicators with green check (✓) or other icons:
- ✓ Verified Business License
- ✓ X+ Years Experience
- ✓ Member since [year]
- ✓ [Type] Car Dealer
- ✓ Website available (shown only if website exists)
- ✓ Location on Maps (shown only if maps link exists)

Then: ⭐ X.X rating · X reviews (amber text).

---

## 7. Login Page (`/login`)

### 7.1 Layout

Two-column or centered card, depending on viewport. Supports toggling between Email Login, Phone Login, and Account Recovery modes.

### 7.2 Authentication Modes

#### 7.2.1 Email Login (Standard)
- **Fields:** Email Address, Password.
- **Verification:** Authenticates directly with username/password match (does not prompt or require OTP code check).
- **Validation:** Both fields required; valid email format required.
- **Submit Button:** "Sign In" — shows loading spinner and disables during flight.

#### 7.2.2 Phone OTP Login
- **Fields:** Phone Number (10 digits).
- **Verification:** Checks database for account matching phone and role. If found, triggers SMS verification code. Verifying the 6-digit code logs the user in.
- **Submit Button:** "Send OTP" -> "Verify & Sign In".

#### 7.2.3 Google Login
- **Element:** "Continue with Google" button.
- **Behavior:** Standard OAuth popup. On success, maps Google user context to DB account and logs the user in.

#### 7.2.4 Forgot Password & Account Recovery
- **Trigger:** "Forgot Password" link on the email form.
- **Flow:**
  1. User enters Email Address.
  2. Clicking "Send Reset Code" generates an OTP reset code and emails it to the user.
  3. Form displays OTP input, New Password, and Confirm Password fields.
  4. Validating the OTP code resets the password, updates the DB credentials, and returns the user to the Email Login screen.

### 7.3 Verified Status Display
- Once a user has successfully verified their phone number (either at registration or settings profile update), a green verification checkmark badge (`BadgeCheck`) is shown next to their name in the main navigation header and dashboards.

### 7.4 Register Link
- "Don't have an account? **Register**" — navigates to `/register`.

### 7.5 Error Handling
- Invalid credentials, expired reset codes, or incorrect OTP values trigger clear and helpful toast notifications. Server errors are gracefully reported.

---

## 8. Registration Page (`/register`)

### 8.1 Role Selection

Two large role toggle cards at the top:
- **Buyer** — "I want to buy a car"
- **Broker/Dealer** — "I'm a car dealer"

The selected role card is highlighted. Selecting a role changes the form fields shown.

### 8.2 Buyer Registration Form

| Field | Type | Rules |
|-------|------|-------|
| Full Name | Text | Required |
| Email Address | Email | Required; valid email format |
| Password | Password | Required; min 6 characters; show/hide toggle |
| Confirm Password | Password | Must match Password |
| Mobile Number | +91 prefix (fixed) + 10-digit input | Required; exactly 10 digits; digits only |

**Onboarding Consents (Required & Optional):**
- **Terms of Service & Privacy Policy Agreement *:** Checkbox. "I agree to the Terms of Service & Privacy Policy". **Must be checked to submit.**
- **Marketing Consent:** Checkbox. "I consent to receive marketing updates & promotions". **Optional.**

**Submit:** "Create Buyer Account" button.

**On success:** Phone OTP verification step (§13.4) is triggered to verify the mobile number before account activation.

### 8.3 Broker Registration Form

| Field | Type | Rules |
|-------|------|-------|
| Business Name | Text | Required |
| Owner Name | Text | Required |
| Email Address | Email | Required |
| Password | Password | Required; min 6 characters |
| Confirm Password | Password | Must match |
| Mobile Number | +91 prefix (fixed) + 10-digit input | Required; 10 digits |
| State * | Dropdown | Select from Indian states; required |
| City * | Dropdown | Populated dynamically based on selected State (loaded from master-data dropdown); required |
| Business Type | Radio/toggle | Dealer / Individual Seller |

**Onboarding Consents (Required & Optional):**
- **Terms of Service & Privacy Policy Agreement *:** Checkbox. "I agree to the Terms of Service & Privacy Policy". **Must be checked to submit.**
- **Marketing Consent:** Checkbox. "I consent to receive marketing updates & promotions". **Optional.**

**Submit:** "Create Broker Account" button.

**On success:** Phone OTP verification step is triggered. After phone is verified, the account enters a **Pending Approval** state until an admin approves it.

### 8.4 Google OAuth

- **Availability:** "Continue with Google" — available for both buyer and broker registration.
- **Broker Details Completion Form:** For the broker role selected via Google, additional business fields (Business Name, License, State, City, Mobile Number, Dealer Type) are prompted after Google sign-in.
- **Onboarding Consents (Required & Optional):**
  - **Terms of Service & Privacy Policy Agreement *:** Checkbox. "I agree to the Terms of Service & Privacy Policy". **Must be checked to submit.**
  - **Marketing Consent:** Checkbox. "I consent to receive marketing updates & promotions". **Optional.**

### 8.5 Login Link

"Already have an account? **Sign In**" → `/login`.

### 8.6 Validation Errors (toast)

- "Please fill in all required fields."
- "Passwords do not match."
- "Password must be at least 6 characters."
- "Please select a state."
- "Please select a city."
- "Please enter a valid 10-digit mobile number."
- "You must accept the Terms of Service & Privacy Policy to register." (for standard registration validation error)
- "You must accept the Terms of Service & Privacy Policy." (for Google OAuth registration validation error)

### 8.7 Standardized Onboarding & Consent Policies

To ensure legal compliance and standardize onboarding across all roles (Buyers and Brokers), the registration flows enforce a unified consent and validation system:

#### 8.7.1 Consent Checkboxes
1. **Terms of Service & Privacy Policy Agreement * (Mandatory):**
   - **Label:** "I agree to the Terms of Service & Privacy Policy"
   - **Hyperlinks:** Includes direct links pointing to the Terms of Service page (`/terms`) and Privacy Policy page (`/privacy`). Both links must open in new browser tabs.
   - **Behavior:** This checkbox is mandatory. The registration button remains blocked or will show a validation toast error if the user attempts to submit the form without checking this box.
2. **Marketing Consent (Optional):**
   - **Label:** "I consent to receive marketing updates & promotions"
   - **Behavior:** This checkbox is optional and does not affect form submission. Users are free to leave it unchecked. If checked, their marketing preference is captured.

#### 8.7.2 Unified Validation Flow
Before any registration request is processed:
1. **Consents Validation:** The client checks the status of the Terms & Privacy checkbox. If unchecked, validation fails immediately, showing the appropriate role-specific or flow-specific error toast (see §8.6).
2. **Standard Fields Validation:** Validates required text inputs, password constraints (minimum 6 characters, matching confirmation), and mobile number validation (must be exactly 10 digits and fully verified via OTP).
3. **Registration Submission:** Registration is only submitted to the server once all validation checks, including the mandatory Terms/Privacy consent, are successfully passed.

---

## 9. Buyer Dashboard (`/buyer-dashboard`)

The Buyer Dashboard has a collapsible left sidebar and a main content area driven by URL query parameters (`?tab=...`).

### 9.1 Dashboard Layout

#### 9.1.1 Left Sidebar Navigation

- **Hamburger (☰)** toggle (visible on mobile) to show/hide sidebar.
- **User avatar and name** at the top.
- Navigation tabs (icons + labels):
  | Tab Key | Label |
  |---------|-------|
  | `active` | Active Requirements |
  | `all` | All Requirements |
  | `history` | Deal History |
  | `messages` | Messages |
  | `notifications` | Notifications |
- **Settings** icon at the bottom → navigates to `/settings`.

#### 9.1.2 Stats Cards Row

Four stat summary cards:
| Stat | Description |
|------|-------------|
| Total Posted | Count of all requirements posted |
| Active | Count of open requirements |
| Conversations | Unique broker conversation threads |
| Total Offers | Total offer count from all brokers |

### 9.2 "Post New Requirement" Button

A large red button at the top of the main content area. Clicking opens the **Post Requirement Form** (§9.3).

### 9.3 Post Requirement Form (Modal/Expansion)

Appears as an expanded form panel when the "Post New Requirement" button is clicked.

#### 9.3.1 Vehicle Type Toggle
- **New** | **Used** (toggle pills)
- Selecting a type shows/hides type-specific fields.

#### 9.3.2 Common Fields

| Field | Type | Rules |
|-------|------|-------|
| Select Brand * | Dropdown | Populated from catalog; required |
| Select Model * | Dropdown | Populated based on Brand; required |
| Variant | Text | Optional (e.g., "ZXi Plus") |
| Budget Range (Min) * | Number (₹ Lakh) | Required; must be ≤ Max |
| Budget Range (Max) * | Number (₹ Lakh) | Required; must be ≥ Min |
| State * | Dropdown | Required |
| City * | Dropdown (based on state) | Required |
| Additional Notes | Textarea | Optional |
| Requirement Active Duration * | Dropdown | 3 Days, 7 Days, 14 Days |

**Requirement Expiry Lifecycle:**

The duration selected determines the requirement's `expires_at` timestamp, calculated as `posted_at + duration_days`. The system enforces the following lifecycle when a requirement expires:

| State | Trigger | Behavior |
|-------|---------|----------|
| **Active** | Immediately after posting | Visible to all brokers; accepting offers and counters are allowed |
| **Expiring Soon** | `expires_at − 6 hours` | The countdown label turns red on broker cards ("Expires in Xh Ym"); a push notification is sent to the buyer |
| **Expired** | `expires_at` timestamp reached | Requirement is automatically moved to **Archived** status. No new offers can be submitted. Existing pending offers are auto-rejected with notification to each broker |
| **Archived** | On expiry or manual close | Visible under the **All Requirements** tab with an "Expired" gray badge. Not shown to brokers. The requirement record is retained permanently for deal history |

**"Expires in Xh Ym" Calculation:** Computed as `expires_at − now()` in real-time on the frontend. Displayed as `Xh Ym` when > 1 hour remaining; displayed as `Xm` when < 1 hour; displayed as `Expired` when `now() ≥ expires_at`.

**Buyer Extension:** A buyer may extend an active requirement once by 3 days using the **"Extend by 3 Days"** button visible on the requirement card in the Active Requirements tab. Extension is only available while the requirement is still **Active** (not yet expired). The `expires_at` is updated server-side and the new countdown is reflected immediately. Only one extension per requirement is permitted.

**Expiry Notifications:**
- Buyer receives a push + email notification: "Your requirement for [Make] [Model] expires in 6 hours. Extend it to keep receiving offers."
- On expiry: Buyer receives "Your [Make] [Model] requirement has expired. View your offers or post again."
- Brokers with a pending offer on that requirement receive: "The buyer's requirement for [Make] [Model] has expired. Your offer has been closed."

**Validation errors (toast):**
- "Please select a car brand."
- "Please select a car model."
- "Please enter budget range."
- "Min budget cannot be greater than Max budget."
- "Please select a state."
- "Please select a city."

#### 9.3.3 New Car Specific Fields
| Field | Type | Options |
|-------|------|---------|
| Fuel Type | Dropdown | Any, Petrol, Diesel, CNG, Electric, Hybrid |
| Transmission | Dropdown | Any, Manual, Automatic |
| Color Preference | Text | Optional |
| Purchase Timeline | Dropdown | Immediate, Within 1 Month, 1-3 Months, 3-6 Months |

#### 9.3.4 Used Car Specific Fields
| Field | Type | Options |
|-------|------|---------|
| Min Year | Dropdown | Last 30 years |
| Max Year | Dropdown | Last 30 years (must be ≥ Min Year) |
| Max KM Driven | Number | Optional |
| Ownership Preference | Dropdown | Any, 1st Owner, 2nd Owner, 3rd Owner |
| Accident History | Dropdown | No Accidents, Minor Accidents OK |

**Validation:** If Used is selected, at least one year field must be filled. Min year cannot exceed Max year.

**Submit:** "Post Requirement" button (spinner + "Posting..." while loading). On success: toast "Requirement posted! Dealers will now send you offers." Form closes and collapses.

**Cancel (✕):** Closes the form without posting.

### 9.4 Active Requirements Tab (`?tab=active`)

Lists all open requirements with expandable cards.

#### 9.4.1 Requirement Card (collapsed)
- Make + Model badge, Vehicle Type (New/Used).
- Budget range.
- Location (City, State).
- Status badge: "Open" (green).
- Date posted.
- Offer count badge (e.g., "3 Offers").
- **Expand / Collapse button (▼/▲):** Shows/hides offer details.

#### 9.4.2 Requirement Card (expanded — Offer List)

For each offer received:
- **Broker name + business name.**
- **Proposed price** (₹X Lakh, red).
- **Offer details** (variant, year, dealer location, price breakdown, delivery time, stock status, benefits/extras).
- **Status badge:** Pending / Shortlisted / Accepted / Rejected / Counter Offer.
- **Unread indicator** (red dot) if the offer hasn't been viewed.
- **Action buttons** (context-dependent on current status):
  | Button | Action |
  |--------|--------|
  | ✓ Accept | Marks this offer as **Accepted**. All other **pending or shortlisted** offers on the same requirement are simultaneously auto-rejected. Each affected broker receives a notification: "Another offer was accepted for this requirement. Your offer has been closed." The requirement status is set to **Closed** and is removed from the broker marketplace feed. |
  | ✗ Reject | Marks offer as **Rejected**. Broker receives notification: "Your offer was rejected by the buyer." |
  | ★ Shortlist | Marks offer as **Shortlisted**. Broker receives notification: "Your offer has been shortlisted!" |
  | 💬 Counter | Opens counter price input to negotiate (see §9.4.3 and negotiation lifecycle below) |
  | 🗨️ Message | Opens message thread with this broker |

#### 9.4.3 Counter Offer Inline Form
- Text input: "Enter your counter price (₹ Lakh)"
- "Submit Counter" button
- "Cancel" button

#### 9.4.4 Negotiation Lifecycle

Negotiation between a buyer and broker follows a strictly defined state machine. Each counter resets the action ball to the other party.

```
Pending
  └─► Buyer Counter          (buyer submits a counter price)
        └─► Broker Counter   (broker submits a revised price)
              └─► Buyer Counter  (buyer counters again)
                    └─► ... (up to 5 total rounds combined)
                          └─► Accepted  ─► [closes all other offers]
                          └─► Rejected  ─► [broker notified]
                          └─► Expired   ─► [auto-rejected on requirement expiry]
```

**Rules:**

| Rule | Detail |
|------|--------|
| **Max Rounds** | A maximum of **5 counter rounds** are allowed per offer (combined buyer + broker counters). After 5 rounds, the Counter button is hidden and the buyer must Accept or Reject. |
| **Turn Locking** | Only the party whose turn it is can act. If it is the broker's turn to counter, the buyer's Counter button is disabled (grayed, tooltip: "Waiting for broker counter"). If it is the buyer's turn, the broker's Edit form shows "Buyer is reviewing — waiting for their response." |
| **Offer States** | `Pending` → `Counter Offer Received` (broker's perspective when buyer counters) → `Buyer Counter Pending` (buyer's perspective after broker counters) → `Accepted` / `Rejected` / `Expired` |
| **Final State** | Once an offer reaches **Accepted**, **Rejected**, or **Expired**, it is permanently locked and no further counters can be submitted. |
| **Counter Price Validation** | Counter price must be a positive number in ₹ Lakh. Empty or zero values are rejected with toast: "Please enter a valid counter price." |
| **Round Counter Display** | Each offer card shows the current round: "Round 2 of 5" in small gray text below the offered price. |

**Empty state (no active requirements):** Car icon + "No active requirements" + "Post your first requirement to get broker offers."

### 9.5 All Requirements Tab (`?tab=all`)

Shows a sortable table of all requirements (open and closed).

**Sort dropdown:** Latest | Oldest | Budget: High to Low | Budget: Low to High

**Table columns:**
| Column | Description |
|--------|-------------|
| Car Requirement | Make + Model + Fuel/Transmission sub-labels |
| Budget | Budget range |
| Location | Extracted city/state |
| Posted On | Date formatted (e.g., "6 Jul 2026") |
| Status | "Active" (green) or "Completed" (gray) badge |
| Responses | Count of dealer offers (e.g., "3 Dealers") |
| Best Offer | Lowest price offer received |
| Action | "View Summary" button |

**Empty state:** Car icon + "No requirements posted yet."

### 9.6 Deal History Tab (`?tab=history`)

Shows a table of only **closed/completed** requirements.

**Header:** "Deal History" + "[X] Closed Deal(s)"

**Table columns:**
| Column | Description |
|--------|-------------|
| Vehicle | Make + Model + Fuel/Transmission |
| Budget | Original budget |
| Location | Location |
| Posted Date | Date |
| Status | "Completed" badge (gray) |
| Responses | Count of dealers |
| Best Offer | Accepted offer price |
| Savings | Budget minus accepted price (e.g., ₹50,000) |
| Action | "View Summary" button |

**Empty state:** Clock icon + "No history yet" + explanatory text.

### 9.7 Messages Tab (`?tab=messages`)

**Title:** "Messages Portal"
**Subtitle:** "Chat with dealers tied to your active or completed offers."

Renders the **ConversationCenter** component (buyer mode):
- Lists conversation threads grouped by requirement + broker.
- Selecting a thread shows the message history.
- A message input at the bottom allows typing and sending messages.

### 9.8 Notifications Tab (`?tab=notifications`)

**Title:** "Notifications Feed"
**Subtitle:** "Read status updates, offer alerts, and deal activity in one place."

**"Mark all read" button:** Shown only when there are unread notifications.

**Notification List:**

Each notification card:
- **Unread state:** Red-tinted border, light-red background, pulsing red dot.
- **Read state:** Gray border, white background, gray dot.
- **Title** + **Priority label** (e.g., "HIGH" — red pill).
- **Message body.**
- **Timestamp** (e.g., "6 Jul, 3:45 PM").
- **"Mark as read" button** (shown inline for unread items; hides on hover with red fill).
- Clicking the card itself also marks it as read.

**Empty state:** Bell icon + "No notifications yet" + "You will see offer changes, shortlist updates, and deal activity here."

---

## 10. Broker Dashboard (`/broker-dashboard`)

### 10.1 Pending Verification State

If the broker's account status is `pending`, the entire dashboard is replaced with a full-page card:
- Clock icon (amber).
- **Title:** "Verification Pending"
- **Message:** "Your broker application is under review. You'll receive full marketplace access once an admin approves your account."

### 10.2 Dashboard Layout

Similar to Buyer Dashboard: collapsible left sidebar + URL-driven main content.

#### 10.2.1 Left Sidebar Navigation
| Tab | Label |
|-----|-------|
| `dashboard` | Dashboard |
| `requirements` | Open Requirements |
| `saved` | Saved Requirements |
| `offers` | My Offers |
| `accepted` | Accepted Deals |
| `closed` | Closed Deals |
| `listings` | My Listings |
| `messages` | Messages |
| `notifications` | Notifications |
| `settings` | Quick Settings |

### 10.3 Dashboard Overview Tab (`?tab=dashboard`)

#### 10.3.1 Stats Row (5 cards)
| Stat | Description |
|------|-------------|
| Active Buyer Requirements | Total open requirements in the marketplace |
| Offers Submitted | Total offers this broker has sent |
| Accepted Offers | Offers currently in accepted (not yet closed) state |
| Closed Deals | Deals confirmed as closed |
| Total Deal Value | Sum of closed deal prices (₹ Lakh) |

#### 10.3.2 Recent Activity
A preview of the latest open requirements and the broker's recent offer statuses.

### 10.4 Open Requirements Tab (`?tab=requirements`)

#### 10.4.1 Toolbar
- **Sort dropdown:** Newest | Oldest | Highest Budget
- Clicking "Newest" closes any open sort menu.

#### 10.4.2 Requirement Card

Each open requirement card shows:
- **Title:** "[Make] [Model]" with vehicle type badge (New/Used).
- **Budget:** ₹X – ₹Y Lakh range.
- **Location:** City, State.
- **Posted:** Time ago (e.g., "2h ago").
- **Expiry:** "Expires in Xh Ym" countdown (shown in red if < 6 hours remaining).
- **Price Suggestion** (if the broker has matching inventory): "Avg: ₹X.X L | Low: ₹X.X L | High: ₹X.X L" with a trend label (low/fair/high).
- **Save / Unsave button** (bookmark icon): Toggles the requirement into the broker's saved list.
- **View Details button:** Opens the **Requirement Details Drawer** (§10.4.3).
- **Send Offer button:** Opens the **Proposal Form** (§10.4.4).

#### 10.4.3 Requirement Details Drawer

A side drawer or modal showing the full requirement specification:
- All fields the buyer filled in (Make, Model, Variant, Budget range, Location, Fuel, Transmission, Color, Timeline / Year range, Max KM, Ownership, Accident history).
- Posted date.
- "Close" (✕) button.

#### 10.4.4 Proposal Form (Send Offer)

Inline form that expands below the requirement card (or in a modal).

**Quick Templates selector** (3 pre-built templates):
1. "Single Owner, Low KM" — pre-fills Details field.
2. "Certified Pre-Owned" — pre-fills Details field.
3. "Competitive Pricing" — pre-fills Details field.

**Mandatory Fields:**
| Field | Type | Notes |
|-------|------|-------|
| Offered Price * | Number (₹ Lakh) | Required |
| Vehicle Variant * | Text | e.g., "ZXi Plus" |
| Model Year * | Dropdown | Current year and backwards |
| Dealer Name * | Text | Required |
| Dealer Location * | Text | Required |

**Optional/Recommended Fields:**
| Field | Type |
|-------|------|
| Price Breakdown | Textarea |
| Delivery Time | Text |
| Stock Status | Dropdown (In Stock, On Order, Pre-Booking) |
| Benefits/Extras | Textarea |
| Offer Details/Notes | Textarea |

**Used Car Specific Fields** (shown when requirement type = Used):
| Field | Type |
|-------|------|
| Registration Year | Dropdown |
| KM Driven | Number |
| Ownership | Dropdown (1st Owner, 2nd Owner, etc.) |
| Insurance Valid Till | Date |
| Service History | Dropdown (Full, Partial, None) |
| Vehicle Condition | Dropdown (Excellent, Good, Fair) |

**Validation:**
- "Add your contact number in your broker profile before sending offers." (if phone not set)
- "Vehicle variant is required."
- "Model Year is required."
- "Dealer Name is required."
- "Dealer Location is required."

**Submit:** "Submit Offer" button → toast "Offer submitted successfully!" Form collapses.

**"Retract" (Cancel):** Closes the form.

**Inventory Picker:** A secondary button "Pick from My Inventory" pre-fills the proposal from one of the broker's existing listings.

### 10.4b Saved Requirements Tab (`?tab=saved`)

Lists requirements bookmarked by the broker. Similar to the Open Requirements tab, it shows requirement details, price suggestions, and allows sending offers directly.
- **Empty State:** Bookmark icon + "No Saved Requirements" + "Bookmarked requirements from your available search feed will show up here."

### 10.5 My Offers Tab (`?tab=offers`)

Lists all offers submitted by this broker.

**Each offer card shows:**
- Requirement details (Make, Model, Budget).
- Buyer's requirement location.
- Offered price.
- Offer status badge: Pending | Shortlisted | Accepted | Rejected | Counter Offer Received.
- Submitted date.

**Actions (per offer):**
- **Edit (pencil icon):** Opens the **Edit Offer Form** with pre-filled fields:
  - New Price (₹ Lakh)
  - Updated Details
  - "Submit Counter Offer" button | "Cancel" button
- **Retract (trash icon):** Asks for confirmation ("Are you sure you want to retract this offer? This cannot be undone."). On confirm, removes the offer from the list locally.

### 10.6 Accepted Deals Tab (`?tab=accepted`)

Lists offers where the buyer has accepted.

**Each deal card shows:**
- Requirement + buyer details.
- Accepted price.
- Deal progress tracker (inline dropdown or step selector):
  - Stages: Initial Contact → Test Drive → Documentation → Closed
- **"Mark as Closed" button:** Shows a confirmation dialog.

**Confirmation Dialog:** "Close this deal? This will mark the deal as successfully completed." → "Yes, Close Deal" | "Cancel".

**On close:** Deal is moved to Closed Deals count. Progress is set to "Closed".

### 10.7 My Listings Tab (`?tab=listings`)

Displays cars the broker has listed in the marketplace (broker-listed inventory).

Each listing card mirrors the Marketplace car card style:
- Image, make/model, price, KM, fuel type, transmission, city, year badge.
- Status indicator (active/inactive).

### 10.8 Messages Tab (`?tab=messages`)

Same as Buyer Messages (§9.7), but in broker mode — shows all conversations with buyers.

### 10.9 Notifications Tab (`?tab=notifications`)

Same as Buyer Notifications (§9.8). The broker dashboard polls for updates every 4 seconds for real-time notification delivery.

**Notification types brokers receive:**
- New requirement posted that matches their inventory/city.
- Buyer accepted an offer.
- Buyer rejected an offer.
- Buyer sent a counter offer.
- Buyer shortlisted an offer.

### 10.10 Quick Settings Tab (`?tab=settings`)

A simple inline profile form within the dashboard:

| Field | Type |
|-------|------|
| Display Name | Text |
| Business Name | Text |
| Phone | Text (with +91 prefix) |
| State | Dropdown (master-data) |
| City | Dropdown (based on State, master-data) |

**"Save Profile" button** → Updates the profile immediately with a success toast.

---

## 11. Admin Dashboard (`/admin`)

A separate, purpose-built admin interface with a distinctive dark pill-shaped left sidebar and a different visual style from the main app.

### 11.1 Layout

- **Left Sidebar (76px, dark/pill-shaped):** Icon-only navigation, sticky.
- **Main Content Area:** Header row + Tab pills + Pane content.

### 11.2 Left Sidebar Icons (Navigation)

| Icon | Tab |
|------|-----|
| 🏠 Home | Overview |
| 👥 Users | Broker Validation |
| 🖼️ Image | Catalog Media |
| 🖥️ CPU | Model Features |
| ⚙️ Settings | Master Data |
| 🚗 Car | Car Catalog |

Bottom: Settings gear icon + "AD" avatar circle.

### 11.3 Header Row

- **H1:** "Business Performance"
- **Subtitle:** "Live metrics, broker validations, and centralized marketplace controls"
- **Theme Toggle button:** ☀/🌙 (light/dark mode visual toggle).
- **"✨ Launch Admin Action" button** (lime/yellow, pill-shaped) → triggers a growth action wizard toast.

### 11.4 Tab Pills Row

| Tab | Label |
|-----|-------|
| overview | Overview |
| brokers | Broker Validation |
| media | Catalog Media |
| features | Model Features |
| master-data | Master Data |
| catalog | Car Catalog |

Active tab: black background, white text. Inactive: white background, gray text.

### 11.5 Overview Tab

A 2-column layout: main metrics + a right panel.

**Key Metrics Cards:**
- Total Buyers (count)
- Total Brokers (active + pending breakdown)
- Pending Approvals (count with alert badge if > 0)
- Total Listings

**Charts/Visuals** (if rendered): Activity trends.

**Recent Broker Registrations** list (quick preview).

### 11.6 Broker Validation Tab

Two tables:

#### 11.6.1 Pending Brokers Table
**Columns:** ID | Name + Business Name | Email | City | Action

**Action:** "✓ Approve" button (green) — confirms with a toast "Broker approved successfully!" and moves the broker to Active.

#### 11.6.2 Active Brokers Table
**Columns:** ID | Name + Business Name | Email | City | Status (Active badge)

### 11.7 Catalog Media Tab

Two sections for updating brand logos and model images.

#### 11.7.1 Brand Logo Update
1. **Brand dropdown** — select a brand.
2. **Logo URL input** — paste the image URL.
3. **"Save Logo" button** — updates and refreshes the catalog.

#### 11.7.2 Model Image Update
1. **Brand dropdown** — filter the model list.
2. **Model dropdown** — select a model.
3. **Image URL input** — paste the image URL.
4. **"Save Image" button** — updates and refreshes the catalog.

### 11.8 Model Features Tab

#### 11.8.1 Create Feature
- **Feature Name input** + **"Add Feature" button.**
- On success: feature appears in the list below with a delete (🗑) button.

#### 11.8.2 Assign Feature to Model
1. **Model dropdown** — select a model.
2. **Feature dropdown** — select from existing features.
3. **"Assign" button** — links the feature to the model.
4. Assigned features shown as chips on the model; each chip has an ✕ to remove.

### 11.9 Master Data Tab

Manages lookup data used across the site.

**Sub-type tabs (4):**
| Type | Fields |
|------|--------|
| Cities | City Name (required), State, Icon |
| Fuel Types | Fuel Type Name (required) |
| Body Types | Body Type Name (required) |
| Transmissions | Transmission Name (required) |

**Add Form:**
- Input fields based on the selected type.
- **"Save" button** — creates a new row.

**Data Table:**
- One row per entry with Edit (pencil) and Delete (trash) buttons.
- **Edit:** Opens an inline edit form with current values pre-filled. "Save" | "Cancel" buttons.
- **Delete:** Shows a browser confirm dialog ("Delete this entry?"). On confirm, removes the row.

**Bulk Upload:**
- File chooser (CSV).
- **"Upload" button** — sends the file to the server for bulk import.

**Validation Errors:**
- "Please provide [Field Name]." (if required field is empty)
- "Please choose a CSV file."

### 11.9.1 City Data Consistency & Integrity Rules

To maintain high data quality and avoid orphaned or invalid records, the application enforces the following rules for location/city data:

1. **Canonical City Source:**
   - The `cities` master-data table in the backend database is the single source of truth for all locations in the application. Free-text inputs for cities are strictly prohibited across all customer, dealer, broker, and admin portals.

2. **Admin-Controlled Cities:**
   - Admins manage the active list of cities under the **Master Data** -> **Cities** tab. Each city record must be mapped to a valid state.

3. **Registration & Profile Settings Behavior:**
   - In both the registration wizard and profile settings forms, selecting a **State** is required before the **City** dropdown is enabled.
   - The City dropdown is dynamically populated with active cities configured for that selected State in the Master Data.

4. **Search and Filtering Compatibility:**
   - All search queries, home dealer strips, marketplace listings, and the global Navbar City Picker operate directly against these canonical city records (using exact city IDs or normalized name matches).

5. **Validation and Required States:**
   - Forms requiring location inputs (Buyer requirements, Broker profile settings, Dealer settings) will fail validation and display error messages if a selected State/City pair does not exist in the active master list.

6. **Handling of Removed (Deleted) Cities:**
   - To prevent orphaned user accounts and active requirements, the system blocks the deletion of any city from the Master Data tab if there are active brokers, listings, or buyer requirements currently associated with it. The admin is shown the error: *"Cannot delete city. There are active requirements, listings, or brokers registered in this city."*
   - Admins may instead flag cities as inactive (soft-delete). Inactive cities are hidden from new dropdown selections but remain intact on existing database records to maintain history.

### 11.10 Car Catalog Tab

Accessible via the 🚗 Car icon in the left sidebar.

**Sub-tabs:** Brands | Models

#### 11.10.1 Brands Sub-tab

**Add Brand Form:**
| Field | Type |
|-------|------|
| Brand Name * | Text |
| Logo URL | Text (optional) |

**"Add Brand" button** → creates the brand.

**Brands Table:**
| Column | Description |
|--------|-------------|
| ID | Auto-generated |
| Brand Name | Editable inline |
| Logo URL | Editable inline |
| Actions | Edit (pencil) / Save + Cancel / Delete (trash) |

**Delete:** Browser confirm "Delete this brand and all its models?" → removes brand.

**Bulk Upload:** CSV file chooser + "Upload Brands" button.

#### 11.10.2 Models Sub-tab

**Filter:** "Filter by Brand" dropdown — narrows the table to one brand.

**Add Model Form:**
| Field | Type |
|-------|------|
| Brand * | Dropdown (from catalog) |
| Model Name * | Text |
| Image URL | Text (optional) |

**"Add Model" button** → creates the model.

**Models Table:**
| Column | Description |
|--------|-------------|
| ID | Auto-generated |
| Brand | Parent brand name |
| Model Name | Editable inline |
| Image URL | Editable inline |
| Actions | Edit / Save + Cancel / Delete |

**Bulk Upload:** CSV file chooser + "Upload Models" button.

---

## 12. Profile Settings Page (`/settings`)

A sidebar-driven settings page. The sidebar and available tabs differ by user role.

### 12.1 Page Header
- **H1:** "Profile Settings"
- **Subtitle:** "Manage your account, preferences, and security settings"

### 12.2 Sidebar

**Avatar card:**
- 60×60 circular avatar with the user's initials (red background).
- Display name (buyer's full name or broker's business name).
- Role pill badge: "Buyer" / "New Dealer" / "Used Dealer" etc.

**Navigation items:**

**Buyer tabs:**
| Icon | Tab | Section |
|------|-----|---------|
| 👤 | Personal Info | Personal details & phone |
| 🔔 | Preferences | Language & notifications |
| 🔒 | Security | Password & account actions |

**Broker/Dealer tabs:**
| Icon | Tab | Section |
|------|-----|---------|
| 🏢 | Business Info | Business & contact details |
| 🌐 | Public Profile | Description, website, maps |
| 🔔 | Notifications | Notification preferences |
| ✅ | Verification | Verification status |
| 🔒 | Security | Password & account actions |

### 12.3 Buyer — Personal Info Tab

**Section Title:** "Personal Information" — "Update your personal information"

| Field | Type | Rules / Notes |
|-------|------|---------------|
| Full Name | Text | Editable |
| Mobile Number | +91 prefix (fixed dropdown) + 10-digit input | Digits only; max 10 characters |
| Email Address | Text | **Read-only** — cannot be changed |
| State | Dropdown | Indian states list |
| City | Text | Editable |

**"Save Changes" button** (red, with save icon; spinner + "Saving…" while in progress).

**Phone change behavior:** If the phone number is changed, saving triggers the **OTP Modal** (§13.4) to verify the new number before saving.

**Validation:** "Please enter a valid 10-digit mobile number." (toast error if invalid).

### 12.4 Buyer — Preferences Tab

**Section Title:** "Preferences" — "Manage your language and notification preferences"

**Preferred Language dropdown:** English | Tamil | Hindi | Telugu | Malayalam | Kannada

**Notification Preferences section (H3):**

Three **Toggle Rows** (each with icon, title, subtitle, and a toggle switch):
1. **Push Notifications** — "In-app alerts for new offers and updates"
2. **Email Notifications** — "Send updates to your email address"
3. **SMS Notifications** — "Get text alerts for accepted offers"

Each toggle is a 44×24px pill switch (red when on, gray when off).

**Persistence behavior:**
- **On toggle:** The new preference is **immediately saved to the database** via an authenticated API call (`PATCH /api/user/preferences`). A loading micro-animation is shown on the toggle during the in-flight request.
- **Local cache:** On a successful API response, the updated preferences are also written to `localStorage` (`carmatchr_prefs`) as an offline UX cache, so the last known state is shown instantly on next page load before the API responds.
- **Cross-device sync:** When the user logs in on a new device, preferences are fetched from the database (not localStorage) and loaded as the authoritative state.
- **Server enforcement:** The Email and SMS channels configured here are read by the server before sending any outbound Email or SMS notification. If the user has toggled Email Notifications off, the server will not send email alerts regardless of the event type.
- **Failure handling:** If the API call fails, the toggle reverts to its previous state and shows a toast: "Failed to save preference. Please try again."

### 12.5 Buyer — Security Tab

**Section Title:** "Security" — "Manage your account security"

Three action rows (each a clickable button card):

1. **Change Password** (indigo lock icon):
   - Label: "Change Password"
   - Sublabel: "Update your account password"
   - Clicking opens the **Change Password Modal** (§13.5).

2. **Logout From All Devices** (amber logout icon):
   - Label: "Logout From All Devices"
   - Sublabel: "End all active sessions"
   - Clicking immediately logs out and redirects to `/login` with a success toast.

3. **Delete Account** (red trash icon):
   - Label: "Delete Account" (red text)
   - Sublabel: "Permanently delete your account and data" (lighter red)
   - Clicking opens the **Delete Confirmation Modal** (§13.6).

### 12.6 Dealer — Business Info Tab

**Section Title:** "Business Information" — "Update your dealership information"

A 2-column grid of fields:

| Field | Type | Rules |
|-------|------|-------|
| Business Name | Text | Editable |
| Owner Name | Text | Editable |
| Mobile Number | +91 prefix + 10-digit input | Digits only; 10 characters |
| Email Address | Text | **Read-only** |
| State | Dropdown | Indian states |
| City | Text | Editable |

**Full-width field:**
- **Business Address** — Text input (full showroom/business address)

**Dealer Details section** (inside a gray box):

*For New Car / Both dealers:*
- **Authorized Brands** — Text (comma-separated, e.g., "Hyundai, Tata Motors")
- **Showroom Address** — Text

*For Used Car / Individual dealers:*
- **Business Type** — Toggle: "Dealer" | "Individual Seller"

**Founding Year:**
- **Founding Year** — Number input (e.g., "2018"). Min 1900, Max current year.

**"Save Changes" button** (same behavior as buyer; triggers OTP if phone changed).

### 12.7 Dealer — Public Profile Tab

**Section Title:** "Public Profile" — "Control what buyers see on your public dealer profile"

| Field | Type | Notes |
|-------|------|-------|
| Business Description | Textarea (4 rows) | Shown on dealer profile page |
| Website | URL input | Optional; e.g., "https://yourdealership.com" |
| Google Maps Link | Text | Optional; Google Maps URL |

**"Save Public Profile" button.**

### 12.8 Dealer — Notifications Tab

**Section Title:** "Notification Preferences" — "Choose which notifications you receive"

**Notification Event Toggles:**
1. **New Requirement Alerts** — "Get notified when buyers post matching requirements"
2. **Offer Updates** — "Shortlist, accept or reject notifications"
3. **Buyer Messages** — "Feature under development — coming soon"

**Delivery Channels section (H3):**
1. **Email Notifications**
2. **SMS Notifications**

**Persistence behavior (identical to §12.4 buyer preferences):**
- **On toggle:** The new preference is **immediately saved to the database** via an authenticated API call (`PATCH /api/broker/preferences`). A loading micro-animation is shown on the toggle during the in-flight request.
- **Local cache:** On a successful API response, the updated value is also written to `localStorage` (`carmatchr_prefs`) as an offline UX cache. This allows the toggle to render at the last known state instantly on page load, before the API response arrives.
- **Cross-device sync:** On login from a new device, notification preferences are fetched from the database and used as the authoritative state. `localStorage` is treated as a display cache only.
- **Server enforcement:** The Email and SMS channel toggles are read by the server before dispatching any outbound Email or SMS notification. A disabled channel will not receive messages regardless of the event type (new requirements, offer updates, etc.).
- **Failure handling:** If the API call fails, the toggle reverts to its previous visual state and shows a toast: "Failed to save preference. Please try again."

### 12.9 Dealer — Verification Tab

**Section Title:** "Verification Status" — "Your account verification status"

Three status rows (each with a green check (✓) or amber warning (⚠) icon):

| Check | Conditions |
|-------|------------|
| Mobile Verified | ✓ (green) if phone is verified; shows phone number. ⚠ (amber) if phone added but not verified (shows "Verify Now" button) or not added. |
| Email Verified | Always ✓ (green); shows email address. |
| Business Verified | ✓ (green) if status = active; ⚠ (amber) "Pending admin review" if status = pending. |

**"Verify Now" button** (red): Shown only when phone is added but not verified. Clicking opens the **OTP Modal** (§13.4) to verify the existing phone number.

### 12.10 Dealer — Security Tab

Same as Buyer Security Tab (§12.5), except:

- **Third action:** "Deactivate Account" (red bell-off icon) instead of "Delete Account."
  - Sublabel: "Temporarily disable your dealer account"
  - Clicking opens a **Deactivate Confirmation Modal** (§13.6).

---

## 13. Shared Modals & Overlays

These components are reused across multiple pages.

### 13.1 City Selector Modal

Triggered from: Navbar, Marketplace city button, Home page context.

- **Title:** "Choose Your City"
- A grid of Indian city chips (clickable pills).
- Clicking a city selects it, closes the modal, and updates the city filter context.
- A close (✕) button in the corner.
- **Backdrop:** Semi-transparent dark overlay; clicking the backdrop closes the modal.

### 13.2 Filter Panel Modal (Marketplace)

Triggered from: Marketplace "Filters" button.

A slide-in drawer or full overlay panel.

**Filter Sections:**

| Filter | Type | Options |
|--------|------|---------|
| Car Make | Dropdown or radio | All brands in catalog |
| Body Type | Dropdown or radio | Sedan, SUV, Hatchback, MUV, etc. |
| Fuel Type | Dropdown or radio | Petrol, Diesel, CNG, Electric, Hybrid |
| Transmission | Radio pills | Any, Manual, Automatic |
| Budget Range | Dual-handle slider or Min/Max inputs | 0 to ∞ (₹ Lakh) |

**Buttons:**
- **"Apply Filters"** — closes panel and updates the car grid.
- **"Reset All"** — clears all filter values.
- **Close (✕)** — closes without applying.

**Real-time result count** displayed within the panel (e.g., "12 cars found").

### 13.3 Contact Broker Modal (Marketplace)

Triggered from: "Contact Broker" button on Broker Listed car cards.

A centered dialog card with a close (✕) button.

**Sections:**

**Broker Info Box** (light red background):
- Broker name (large, red)
- Showroom city

**Phase 1 — Unverified State (Form):**

| Field | Type | Rules |
|-------|------|-------|
| Your Name * | Text | Required |
| Your Email | Email | Optional |
| Your Mobile Number * | +91 prefix (fixed) + 10-digit input | Required; 10 digits only |

**OTP Bypass Optimization:**
To optimize UX and prevent repeating OTP verification for every contact request, the system checks for OTP bypass conditions:
1. **Logged-in Verified Account:** If the active user has a verified phone matching the entered number, OTP is completely bypassed.
2. **Session Trust Duration:** If the user has successfully verified the entered number within the last 24 hours (stored in client `sessionStorage` and database `verified_guest_sessions` table), OTP is bypassed.
* If either condition is met, clicking the action button skips the OTP modal, immediately logs the contact request, and transitions to the success state.

**"Verify Phone & Request Contact" button** — Validates fields. If bypass is active, submits the request immediately; otherwise, triggers the **OTP Modal** (§13.4).

**Phase 2 — After OTP Verified / Bypassed:**

The OTP Modal closes (if opened), the request is submitted to the server (with the code or `BYPASS`), and a trust session duration is cached for the next 24 hours.

**Phase 3 — Verified/Success State:**

The form is replaced with:
- "✓ Request Successfully Logged!" (green text)
- "Your contact request has been sent to **[Broker Name]**. They will reach out to you at **+91 XXXXXXXXXX** shortly."
- **"Close" button.**

### 13.4 OTP Verification Modal

Triggered from: Registration, Settings (phone change), Settings (Verify Now), Marketplace Contact Broker flow.

**Title:** (context-dependent — e.g., "Verify Phone Number", "Verify Buyer Phone")
**Subtitle:** (context-dependent — e.g., "Enter the 6-digit code sent to your phone.")

**Content:**
- Phone number display ("+91 XXXXXXXXXX — sent to this number").
- **OTP Input:** 6-digit code field (single text input or segmented 6-box input).
- **Resend OTP button + countdown timer** (e.g., "Resend in 45s") — disabled while timer is running; enabled after countdown.
- **"Verify" button** — validates the OTP; shows loading state.
- **Footer text:** "Code valid for 5 minutes."

**Success:** Modal closes; the calling flow continues (e.g., saves the phone change, logs the contact lead, activates the account).

**Failure:** Toast error message ("Invalid OTP. Please try again." or "OTP has expired. Please request a new one.").

**Close (✕):** Cancels the verification; the phone change or lead is not submitted.

### 13.5 Change Password Modal

Triggered from: Security tabs in both Buyer and Dealer Settings.

**Title:** "Change Password"
**Subtitle:** "Enter your current and new password"

**Fields (all password type with a single show/hide toggle 👁 that applies to all):**
| Field | Type | Rules |
|-------|------|-------|
| Current Password | Password | Required |
| New Password | Password | Required; min 6 characters |
| Confirm New Password | Password | Must match New Password |

**Buttons:**
- **"Update Password"** (indigo, with save icon; spinner + "Saving…" on submit).
- **"Cancel"** (gray border) — closes modal.

**Validation Errors (toast):**
- "New passwords do not match."
- "New password must be at least 6 characters."
- "Password change failed." (server error)

**Success:** Toast "Password changed successfully!" — modal closes, fields reset.

### 13.6 Delete / Deactivate Account Confirmation Modal

Triggered from: Security tabs.

A centered dialog with a red warning icon.

**Title:** "Delete Account?"
**Message:** "This will soft-delete your account and close/reject all active requirements or pending offers. Your data will be anonymized after a 30-day retention period."

**Verification step:**
- **For standard accounts:** An input field asks for the user's current password to confirm deletion.
- **For Google OAuth accounts:** An input field asks the user to type "DELETE" to confirm.

**Buttons:**
- **"Delete Account"** (red) — Submits the deletion request, logs the user out, and redirects to the login page upon success.
- **"Cancel"** (gray) — Closes the modal without action.

---

## Appendix A — Toast Notification System

The app uses a toast notification system visible at the top of the screen. Toasts appear for:

| Type | Color | Examples |
|------|-------|---------|
| Success | Green | "Requirement posted!", "Profile saved!", "OTP sent!" |
| Error | Red | "Please select a car brand.", "Invalid OTP.", "Failed to update." |
| Info | Blue | (informational prompts) |

Toasts auto-dismiss after a few seconds.

---

## Appendix B — Badge & Label Reference

| Badge | Location | Meaning |
|-------|----------|---------|
| ✅ Verified (green) | Dealer cards, profiles | Admin-approved broker |
| ⭐ TOP RATED | Dealer cards | Rating ≥ 4.8 |
| ⚡ FAST REPLY / FAST RESPONSE | Dealer cards | Default for non-top-rated |
| 🏪 Broker Listed | Marketplace car cards | Car listed directly by a broker |
| Featured | Marketplace car cards | Featured/promoted listing |
| 🔵 Active | Requirement cards | Requirement is open |
| ✅ Completed | Requirement/history rows | Requirement is closed |
| 🟡 Pending | Offer status | Offer awaiting buyer action |
| 🟠 Counter Offer | Offer status | Buyer sent a counter price |
| 🔴 Unread dot | Notification cards | Notification not yet read |
| AUTHORIZED | Dealer directory cards | Official manufacturer-authorized dealer |

---

## Appendix C — Empty States Summary

| Page / Section | Empty State Shown When |
|----------------|------------------------|
| Marketplace | No cars match current filters |
| Buyer — Active Requirements | No open requirements |
| Buyer — All Requirements | No requirements posted |
| Buyer — Deal History | No closed requirements |
| Buyer — Notifications | No notifications received |
| Broker — Open Requirements | No requirements in marketplace |
| Broker — My Offers | No offers submitted |
| Dealer Profile — Inventory | Dealer has no active listings |
| Dealer Directory | No dealers match search/filters |
| Admin — Pending Brokers | No brokers awaiting approval |
