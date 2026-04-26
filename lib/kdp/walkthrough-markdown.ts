/**
 * Static Kindle Direct Publishing walkthrough (eBook + paperback).
 * Bundled in the KDP listing ZIP alongside AI-generated metadata.
 */
export function getStaticKdpWalkthroughMarkdown(): string {
  return `# Kindle Direct Publishing — guided walkthrough

Use this checklist on **https://kdp.amazon.com** together with the **KDP listing metadata** file from this ZIP. Nothing here is legal or tax advice—follow KDP’s own help pages for tax interviews and payment setup.

---

## Before you start

1. **Amazon account** you can use for publishing (separate from your buyer account is fine).
2. **Manuscript** as .docx (from ChapterAI **Compile & Download**).
3. **Cover image** meeting KDP minimums (eBook and paperback have different requirements—KDP shows current pixel sizes when you upload).
4. **Bank account / tax forms**—KDP will prompt you during setup.

---

## Part A — Create the book on KDP

### 1. Sign in and create a new book

1. Go to **kdp.amazon.com** and sign in.
2. Open **Your Bookshelf**.
3. Click **\\+ Create** and choose **Kindle eBook** and/or **Paperback** (you can add the other format later with “Create new version” or a linked edition—follow KDP’s current UI).

### 2. Language, title, and edition

1. Set **Primary language** to match your manuscript.
2. **Book title** — paste your chosen title from the metadata file (you can edit before publishing).
3. **Subtitle** — optional; paste a subtitle option from the metadata file if you use one.
4. **Edition** — leave blank for first edition, or enter “2nd edition” etc. if applicable.
5. **Author** — your real name or pen name (should match your cover).

### 3. Description and keywords

1. **Book description** — open your metadata file and paste the **Amazon book description** into KDP’s description field. You can tweak length to fit; avoid ALL CAPS spam.
2. **Publishing rights** — confirm you hold the rights (typical for your own work).
3. **Keywords** — KDP allows **7 keyword boxes**. Paste one keyword or short phrase per box from the metadata file. Use phrases readers actually search; avoid unrelated trending words.

### 4. Categories

1. Choose **two categories** that best fit your book (genre + niche).
2. Use the **category hints** in the metadata file as a starting point; pick the closest match KDP offers in the picker.

### 5. ISBN and publication (paperback)

- **Paperback** may require an ISBN or a free KDP ISBN depending on your choices—read KDP’s explanation on that screen and pick what fits your goals.
- **Release date** — many indies use “as soon as possible” unless you’re planning a preorder.

---

## Part B — Upload interior and preview

### 6. Manuscript upload

1. In the **Manuscript** section, upload your **.docx** from ChapterAI.
2. Wait for processing; fix any errors KDP reports (fonts, images, etc.).

### 7. Preview

1. Open **Online Previewer** (or download the preview) and scroll **every chapter**: chapter titles, scene breaks, and paragraph spacing.
2. Fix issues in your source manuscript, re-export from ChapterAI, and re-upload if needed.

---

## Part C — Cover

### 8. eBook cover

1. Upload a cover that meets KDP’s **current** dimension and file-type rules (shown on the upload page).
2. Check the thumbnail view—most readers see the book first as a small image.

### 9. Paperback cover

1. Paperback requires a **full cover** (back + spine + front). KDP provides a **cover template** after you choose trim size, paper, and page count—download it and use a design tool, or use a service that accepts the template.
2. **Back cover copy** — use the **Back of book (paperback)** text from your metadata file on the back cover layout (you may shorten to fit the design).

### 10. About the author (paperback / optional)

- Many paperbacks include a short **About the author** on the back cover or inside flap. Use the **two-sentence author bio** from your metadata file (edit to match your voice).

---

## Part D — Pricing and territories

### 11. Royalties and price

1. Choose **35% or 70% royalty** where offered; 70% often requires price within KDP’s stated band and territory rules—read the on-screen help.
2. Set **list price** per marketplace or use a global price. The metadata file may suggest a band for your genre—adjust based on your strategy.

### 12. Territories

- **Worldwide** is typical unless you have a reason to limit regions.

---

## Part E — Review and publish

### 13. Review summary

1. Open **Review** and confirm title, author, categories, price, and that preview looks correct.

### 14. Publish

1. Click **Publish** (wording may vary). KDP will move the book to **In review**, then **Live**—often within **72 hours**, sometimes faster.

### 15. After launch

1. Claim **Author Central** (Amazon’s author profile) to add bio and photos when available in your region.
2. Monitor **Reviews**, **Reports**, and any **quality notifications** from KDP.

---

## Need help?

- KDP’s official help: use the **?** links inside each KDP step.
- Re-download your manuscript or regenerate listing ideas from **ChapterAI** on your project’s **Export** page.

*Generated by ChapterAI — listing copy in the companion file is AI-assisted; edit for accuracy and your voice before publishing.*
`;
}
