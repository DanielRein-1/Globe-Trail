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

`/countries` provides an accessible search form, Region selector, cards and pagination. `/countries/[isoCode]` presents name, ISO flag, capital, region, currency, population, codes and coordinates. Search context is preserved in detail/back links. Missing values show “Not available”. Loading, empty database, no matches, page-out-of-range, invalid search, country-not-found and retryable error states are included. Languages, attractions, budget controls and trip generation from the earlier wireframes remain outside this slice.
