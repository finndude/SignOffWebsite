# SignOffWebsite

A web app built for **UCS Renewables** to handle uploading files and getting them signed by clients — entirely from a browser, no app store install required.

> This README is a living document — update it as the project evolves.

## Overview

An admin (or staff member) uploads a document, assigns it to a specific person, and that person can open it on their phone, drag-and-drop their signature onto the exact spot on the PDF, and submit it back. The original uploader can then view the completed, signed document.

## Core Features

- **Admin-managed accounts** — no public sign-up. Admins create new users (name + email), the system generates account details and emails the new user their login info.
- **File upload** — upload a document (PDF) and assign it to a specific person from a list of users.
- **Assignment view** — the assigned user sees their pending documents.
- **In-browser PDF signing**
  - PDF rendered directly in the browser
  - Signature captured via a signature pad (touch-friendly, works on mobile)
  - Signature can be dragged/positioned (and resized) directly onto the PDF page
  - Signature is stamped into the PDF at the chosen position and saved
- **Completion view** — the original uploader can view/download the finished, signed document.
- **Mobile-first** — works fully in a mobile browser, responsive design, no native app needed.

## Tech Stack (proposed)

| Layer | Choice |
|---|---|
| Frontend | React (mobile-first, responsive) |
| PDF rendering | PDF.js |
| Signature capture | Signature pad library |
| Drag/position handling | Native drag events or interact.js |
| Backend | Python (FastAPI) |
| PDF stamping | PyPDF / ReportLab |
| Database | PostgreSQL |
| File storage | Object storage (Cloudflare R2 / Backblaze B2 / S3) |
| Auth | JWT-based, admin-invite flow (no public sign-up) |
| Email (invites) | SendGrid or Resend |
| Hosting — frontend | Vercel / Netlify |
| Hosting — backend | Render / Railway / Fly.io |
| Hosting — database | Render Postgres / Supabase |

*Stack is not final — open to change as the project develops.*

## User Roles

- **Admin** — creates/invites users, uploads documents, assigns documents to users, views completed signed documents.
- **Assignee** — receives assigned documents, signs them via the mobile browser.

## Planned Flow

1. Admin logs in.
2. Admin uploads a document and selects an assignee from the user list.
3. Assignee gets notified (or checks their dashboard) and opens the document.
4. Assignee draws their signature and drags it into place on the PDF.
5. Signature is merged into the PDF and saved.
6. Admin/uploader views or downloads the completed, signed document.

## Status

🚧 Early planning / design stage — UI mockups and architecture being worked out.

## Notes / Open Questions

- Fixed vs. free-form signature placement — currently leaning towards free-form (drag/resize).
- Notification method for new assignments (email vs. in-app only) — TBD.
- Hosting cost target: aiming for free–£20/month range to start.

## Estimated Hosting Costs (rough)

- Free tier possible to start (Render free backend + Vercel free frontend + Supabase free DB)
- Realistic small-scale running cost: **£0–£20/month**