# SLang waitlist page

A single static page (`index.html` + `draco.svg` + `icon.png`); no build step.

## 1. Make the Google Form

Suggested questions: **Email** (short answer, response validation → email, required), **Which language
are you learning?** (dropdown), **Would you pay about $5/month for SLang Pro?** (Yes / Maybe / No),
**Where would you want SLang next?** (checkboxes: Netflix, phone, other sites). In the form's Responses
tab, link it to a Google Sheet. Then **Send → 🔗 → copy the link**.

## 2. Connect it

Paste the link into `FORM_URL` near the bottom of `index.html`. Every "Join the waitlist" button opens it.

## 3. Host it (free)

- **Netlify Drop:** go to app.netlify.com/drop and drag this `site` folder in. You get a URL right away.
- **GitHub Pages:** needs a public repo (or a paid plan for private ones); serve this folder from a branch.

## 4. Show it in the extension

Put the hosted URL in `WAITLIST_URL` (`src/ui/links.ts`) and rebuild: a "Join the waitlist" link then
appears in the popup and settings page.
