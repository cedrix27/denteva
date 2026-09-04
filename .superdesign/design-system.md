# Denta Assistant — Cabinet SaaS visual system

## Product and users
Private SaaS workspace for Moroccan dental practices. Primary user: secretary or dentist supervising a WhatsApp AI receptionist. The interface must make conversations, appointments, follow-ups and the clinic configuration feel controlled, calm and valuable. It must never look like medical software for diagnoses and never expose clinical advice.

## Visual direction
Premium American SaaS: disciplined white canvas, black primary actions, sharp but warm typography, editorial spacing and refined component transitions. Inspired by the supplied Riotters Dribbble dashboard only at the level of hierarchy, restrained warm accents, soft surfaces and bespoke detail — not a direct copy. Avoid generic teal SaaS appearance, gradients, glassmorphism and excessive rounded cards.

## Color system
- Canvas: #FAFAF8 (warm near-white)
- Surface: #FFFFFF
- Ink / primary action: #171716 (black-brown, not pure blue-black)
- Muted ink: #73716C
- Line: #E9E8E5
- Sand: #F2EEEA
- Clay accent: #D7BDB3 (decorative / low-emphasis only)
- Olive accent: #767557 (selected-supportive areas only)
- Orange accent: #DD9B26 (attention only)
- Conversation: #6963D9 with wash #EEEDFF (messages, language, waiting threads)
- Appointment: #C9772B with wash #FFF0E3 (calendar, planned appointment, pending)
- Automation: #6F7A45 with wash #EEF1E3 (AI flows, setup progress, performance)
- Patient: #A85C76 with wash #F9EAF0 (patient and relationship context)
- Success: #287A57
- Urgent: #C94336

## Typography and spacing
- UI font: Geist Sans / Inter-like modern grotesk. No serif in app screens.
- Display/page title: 30px / 36px, 600, -0.04em letter spacing.
- Section title: 18px / 24px, 600.
- Body: 14px / 20px, 400–500.
- Meta / labels: 11–12px uppercase or sentence case with increased tracking only when useful.
- Desktop content gutter: 40px; mobile 20px.
- Use 8px spacing rhythm. Airy rows and generous panel padding.

## Components and interaction
- Primary button: near-black, white text, 10px radius, 36–40px high; a tiny translate/opacity hover, no loud effect.
- Secondary button: white with #E9E8E5 stroke; icon buttons are compact rounded squares.
- Cards: white with 1px #E9E8E5 border, 14px radius, no heavy shadow. Use shadow only while overlaying.
- Sidebar: white, not dark; slim 232px, hairline divider, monochrome icons, dark active capsule or warm sand selected state.
- Top bar: minimal, white, title/breadcrumb left, search/action/profile right.
- Status chips: very small, soft tinted backgrounds, semantic icon + label where possible.
- Apply color at the element level, not as a page background: coloured icon tile, selected tab, status chip, tiny progress segment or left-edge accent. Every color must convey a category or status.
- Tables: no dense grid; clear row hover, dividers only, avatars and contextual secondary text.
- Empty states: one calm line illustration/icon plus a clear setup action.
- Motion: 160–200ms ease-out, background/border/opacity only. Never animate important medical/urgent states.

## First page to establish the system
Cabinet overview dashboard: white slim sidebar, premium top header, warm greeting, compact KPI strip, “Aujourd'hui” appointments timeline, inbox attention panel, onboarding/configuration block, and a subtle alert card for urgent patient handoff. It must feel like a credible paid SaaS product at desktop width.

## Planned cabinet pages
1. Overview
2. Inbox / conversation takeover
3. Calendar and appointment detail
4. Patients (administrative record only)
5. Automation and reminders
6. Clinic profile / operating rules
7. Team and access (future authentication foundation)
8. Billing (later; shell only now)
