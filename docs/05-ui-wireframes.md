# GlobeTrail UI & User Experience Design

## Version

1.0

---

## Status

Draft

---

## Last Updated

2026-07-14

---

# 1. Design Philosophy

GlobeTrail follows a modern, clean, and accessible design.

Design principles:

- Simple navigation
- Mobile-first responsive design
- Minimal cognitive load
- Consistent spacing
- Clear visual hierarchy
- Fast interactions

---

# 2. Design System

## Primary Colors

Primary:
Blue

Secondary:
Emerald

Accent:
Orange

Success:
Green

Warning:
Amber

Error:
Red

Neutral:
Gray

---

## Typography

Font:

Geist

Fallback:

Inter

---

## Border Radius

Large rounded cards

12px–16px

---

## Shadows

Soft shadows only.

Avoid heavy material-style elevation.

---

# 3. Layout Structure

Navigation

↓

Page Content

↓

Footer

Desktop:

Sidebar + Top Navigation

Mobile:

Bottom Navigation + Drawer Menu

---

# 4. Application Screens

## Screen 1

Landing Page

Purpose

Introduce GlobeTrail.

Sections

- Hero
- Features
- Popular Destinations
- Testimonials
- CTA

Primary CTA

Plan My Trip

---

## Screen 2

Authentication

Features

- Register
- Login
- Forgot Password

Validation

Zod

Forms

React Hook Form

---

## Screen 3

Dashboard

Purpose

User home.

Contains

- Welcome
- Recent Trips
- Saved Trips
- Quick Actions

---

## Screen 4

Country Explorer

Features

Search

Country Cards

Filters

Country Details

Displays

- Flag
- Capital
- Currency
- Population
- Languages
- Region

---

## Screen 5

Country Details

Shows

Overview

Attractions

Travel Information

Budget Estimate

Generate Trip Button

---

## Screen 6

Trip Planner

User selects

Destination

Budget

Travel Style

Duration

Interests

Transportation

Accommodation Preference

Generate Button

---

## Screen 7

AI Loading Screen

Purpose

Provide feedback while Vertex AI generates.

Displays

Progress animation

Status messages

Estimated wait time

Cancel button

---

## Screen 8

Generated Itinerary

Displays

Summary

Daily Schedule

Budget Breakdown

Suggested Attractions

Travel Tips

Actions

Save

Regenerate

Download

Share

---

## Screen 9

Saved Trips

Displays

Trip Cards

Search

Sort

Delete

Edit

Duplicate

---

## Screen 10

Trip Details

Displays

Full itinerary

Map

Budget

Timeline

Notes

---

## Screen 11

Profile

Displays

Profile

Preferences

Travel Interests

Theme

Password

---

# 5. Shared Components

Buttons

Cards

Modals

Dialogs

Badges

Alerts

Skeleton Loaders

Pagination

Search Bar

Empty States

Error Components

Toast Notifications

Breadcrumbs

Tabs

Dropdowns

---

# 6. Navigation Flow

Landing

↓

Login

↓

Dashboard

↓

Country Explorer

↓

Country Details

↓

Trip Planner

↓

AI Generation

↓

Generated Trip

↓

Save Trip

↓

Dashboard

---

# 7. Loading States

Every API request must have:

Skeleton UI

Loading spinner

Disabled actions

Progress indicators

---

# 8. Empty States

Every page must define an empty state.

Examples

No saved trips.

No search results.

No attractions found.

No itinerary generated.

---

# 9. Error States

Friendly messages only.

Never expose stack traces.

Example

Unable to generate itinerary.

Please try again.

---

# 10. Accessibility

Keyboard navigation

Screen reader labels

Semantic HTML

Color contrast compliance

Visible focus indicators

---

# 11. Responsive Strategy

Mobile

320px+

Tablet

768px+

Desktop

1024px+

Large Desktop

1440px+

---

# 12. Performance

Lazy loading

Image optimization

Code splitting

Streaming where appropriate

Server Components where appropriate

---

# 13. Future UI Improvements

Dark Mode

Offline Support

PWA

Interactive Maps

Charts

Travel Timeline

AI Chat Assistant

# user journey map
Visitor
    │
    ▼
Landing Page
    │
    ▼
Sign Up / Login
    │
    ▼
Dashboard
    │
    ▼
Browse Countries
    │
    ▼
Select Destination
    │
    ▼
Configure Trip
    │
    ▼
Generate AI Itinerary
    │
    ▼
Review & Edit
    │
    ▼
Save Trip
    │
    ▼
View Trip History

## Implemented Country Explorer MVP

`/countries` provides an accessible search form, Region selector, cards and pagination. `/countries/[isoCode]` presents name, ISO flag, capital, region, currency, population, codes and coordinates. Search context is preserved in detail/back links. Missing values show “Not available”. Loading, empty database, no matches, page-out-of-range, invalid search, country-not-found and retryable error states are included. Languages, budget controls and trip generation from the earlier wireframes remain outside this slice. Nearby attractions are now implemented as a separate section with independent loading, empty and retry states.


## Implemented site shell and homepage

The current public flow is Home → Explore countries → Country details. Earlier dashboard, authentication and itinerary wireframes above are future concepts, not features advertised by the homepage.

The root layout owns one navigation header, skip link, main landmark and footer. Navigation contains Home and Explore countries, with a visible current-section indicator and keyboard focus styles. It stacks on mobile. Country pages retain their query-preserving return links and country attribution, without duplicate site headers or footers. Geoapify/OpenStreetMap attribution stays beside nearby places.

The homepage introduces GlobeTrail, links directly to /countries, and explains country search, country facts and the limited 50 km attractions sample. It uses the existing warm off-white, deep teal, slate text, Geist typography and rounded cards. No remote images or unfinished-feature CTAs are used. Root metadata and a local globe icon replace Next.js starter branding. The shell uses the existing light palette consistently; a dark theme is not implemented.

Attraction category identifiers are formatted only for display: redundant ancestors and duplicate labels are removed, specific identifiers become readable labels, and unknown identifiers have a readable or “Category unavailable” fallback. API data and cache behavior are unchanged.

Run npm run test:site for focused shell/homepage rendering tests, and npm run test:attractions for category-label coverage. The existing npm run test:countries:ui fixture proxy supports homepage, list and detail browser checks without database/provider calls.

## Implemented public sample planner

Country details link to `/countries/[isoCode]/plan`, preserving validated search/region/page/limit parameters through the return journey. The planner uses the existing site landmarks and visual language. Inputs cover duration, optional UTC start date, travellers, interests and qualitative budget preference. Submission stays on the page. Loading disables the form; validation and unavailable messages are announced and focused; failures preserve entered values and allow another submission. Leaving cancels/ignores stale requests.

The result is escaped plain text with sequential days and morning/afternoon/evening suggestions. The disclosure is prominent: “Mock itinerary preview. Generic suggestions, not a verified travel schedule. This itinerary is not saved.” Refreshing may discard it. Save, editing, downloads, sharing, authentication, monetary budgets and real AI generation in the earlier wireframes remain future concepts, not current controls. Country and Geoapify attribution remain on their respective discovery content.

## Explicit destination selection on the existing planner

The country planner now offers Anywhere in country (default) or Choose a destination. The latter exposes a submitted search, labelled radio choices, explicit selection, and change/remove controls. Search results show formatted location, available county/state, safe category labels and a representative point. Search never runs on keystrokes or selects rank 1. Query edits clear stale choices and results; changing scope clears preview output. Search has initial, searching, empty, error/retry and selected states. A details-resolution failure appears in the planner's focused/announced error region while retaining planning values and selection for retry or change.

Destination results are independently attributed to Geoapify/OpenStreetMap. The existing country-details attractions section remains unchanged and separate. There are no destination images, new maps, prices, accommodation, bookings or save controls. Search and selection use native form/radio/button semantics, wrapping labels and the existing shared landmarks. Return country-search parameters remain unchanged. Selected-place previews name the destination in the heading and generic activity suggestions, retaining the prominent mock/unsaved disclosure.
