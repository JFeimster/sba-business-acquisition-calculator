# SBA 7(a) Business Acquisition Calculator (Widget) — sba business acquisition calculator

Educational widget to estimate:
- SBA loan amount (simplified)
- monthly payment (amortized)
- DSCR vs a target
- rough implied max purchase price capacity

> Disclaimer: educational planning only. Not a loan offer, approval, or commitment to lend.

## Files
- `index.html` — widget UI
- `style.css` — styling
- `script.js` — logic + iframe height messaging
- `embed.html` — iframe wrapper (recommended URL to embed in Wix)

## Deploy (Vercel)
Deploy your repo as a static Vercel project. This widget will then be accessible at:

- Widget page:
  `https://<your-project>.vercel.app/widgets/SBA%207(a)%20Business%20Acquisition%20Calculator%20(Widget)%20—%20sba%20business%20acquisition%20calculator/index.html`

- Embed page (use this in Wix):
  `https://<your-project>.vercel.app/widgets/.../embed.html`

Tip: consider renaming the folder to a URL-safe slug like:
`widgets/sba-business-acquisition-calculator/`

Then your URLs become:
`/widgets/sba-business-acquisition-calculator/embed.html`

## Embed in Wix (Blog / Groups / Members)
1. Add an **Embed Code** element (iframe).
2. Use the `embed.html` URL.
3. Set width to 100%. Height can be ~900px; it will auto-resize.

## Customize CTAs
In `script.js`, find this block:

  `window.open("https://www.distilledfunding.com/", "_blank", "noopener,noreferrer");`

Replace with your Wix intake form, booking page, or application funnel.

## Customization: brand + colors
Edit `style.css` variables:
- `--accent` and `--accent2` for gradients
- `--bg` and `--card` for background tones
- replace the "MC" mark or add your logo in `index.html`

## Notes on calculations (modeling choices)
- Seller note reduces the modeled SBA principal (simple assumption).
- "Add-backs confidence adjustment" applies a conservative haircut to EBITDA/SDE.
- DSCR is computed as:
  `Adjusted Cash Flow / (Annual SBA Debt Service + Other Annual Debt Service)`
- "Implied max purchase price" is a rough back-solve from DSCR capacity using the same rate/term and equity % inputs.
