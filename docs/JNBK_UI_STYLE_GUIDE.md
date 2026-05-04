# JNBK / جنبك — Modern UI Style Guide

This guide documents the latest approved visual direction for the JNBK app and admin dashboard.

## Final brand direction

The approved public-facing phrase is:

```text
ركشة.. جنبك
```

English supporting phrase:

```text
Rickshaw near you
```

JNBK should feel like a modern, trusted ride-hailing product for Sudan with a premium but simple interface.

Core feeling:

- Modern
- Professional
- Clean
- Arabic-first
- Trustworthy
- Fast and accessible

## Logo usage

Use the JNBK / جنبك identity consistently:

- Arabic brand: جنبك
- English brand: JNBK
- Product phrase: ركشة.. جنبك
- English support: Rickshaw near you
- Arabic promise: أقرب إليك دائمًا
- Service promise: أقرب ريكشة إليك في السودان

The logo direction includes:

- Rickshaw icon
- Movement lines
- Location pins
- Blue and gold identity

## Colors

Primary palette already exists in `apps/mobile/src/constants/theme.ts`:

- Navy deep: `#042B49`
- Navy: `#063B63`
- Blue: `#075A8A`
- Teal: `#0E8FB3`
- Gold: `#D6A936`
- Soft gold: `#FFF6D8`
- Light sky: `#EAF6FA`
- Background: `#F7FAFC`
- Card: `#FFFFFF`
- Border: `#E7EEF5`
- Text: `#102A43`
- Muted: `#6B7C93`

## UI rules

### Mobile app

Use:

- Large rounded cards
- Strong navy headers
- Gold main action buttons
- Light backgrounds
- Clear Arabic labels
- White cards with subtle borders
- Map cards for booking screens
- Progress steps for registration
- Upload/document cards for driver onboarding

Avoid:

- Crowded screens
- Too many colors
- Unclear icons
- English-only labels
- Hard-to-tap small buttons

### Admin dashboard

Use:

- Header hero cards with navy/teal gradient
- White cards for metrics
- Gold numbers for key values
- Clear role-based action buttons
- Read-only business agreements
- Developer-only system settings
- Staff task cards grouped by role

## Core screens to keep aligned

Mobile:

- Welcome screen
- Passenger booking screen
- Driver registration screen
- Driver document upload step
- Support screen
- Settings screen

Admin:

- `/portal`
- `/operations`
- `/drivers`
- `/staff`
- `/business`
- `/finance`
- `/workflow`
- `/settings`

## Staff UX rules

- Staff login starts from `/portal`.
- Default staff access code is `123456`.
- Staff must update the default access code after first login.
- Developer access is separate and must not be changed with staff defaults.
- Staff pages must not expose programmer/internal notes.
- Each employee should see their role, workspace, daily tasks, weekly tasks, limits, KPI, and escalation path.

## Business rules

- Profit shares and agreements are locked.
- Any change requires a new contract.
- Old contracts must be archived.
- Management can view app costs and subscriptions for awareness only.
- Technical subscriptions and runtime settings belong to the developer panel.

## Driver onboarding rules

Driver applications should include:

- Driver details
- Vehicle details
- Guarantor details
- Optional document links
- Document status
- Review status
- Free month flag
- Compliance status

Firestore collection:

```text
driverApplications
```

Approval updates should persist to Firebase when configured.

## Implementation notes

Current identity tokens are stored in:

```text
apps/mobile/src/constants/theme.ts
```

Reusable mobile logo component:

```text
apps/mobile/src/components/BrandLogo.tsx
```

Admin visual styling:

```text
apps/admin/app/style.css
```
