# NEXAWEB website

A one-page marketing site for NEXAWEB. It uses plain HTML, Tailwind CSS from its CDN and plain JavaScript. There is no build step and nothing to install.

| File | What it is | Do you edit it? |
|---|---|---|
| `content.js` | Every word, price, link and project on the site | **Yes, this is the only file you edit** |
| `index.html` | Page layout, which reads from `content.js` | No |
| `style.css` | Glow effects, animation and accordion styles | No |
| `class-exercise.html`, `profile.png` | Old class exercise, not part of the site | No |

## How to preview

Double-click `index.html` to open it in a browser. You need an internet connection because Tailwind and the fonts load from the web.

## How to edit content

1. Open `content.js` in any text editor (Notepad, VS Code).
2. Change only the text **inside the quotes**. Keep every quote mark and every comma at the end of a line.
3. Save the file and refresh the browser.

If the page goes blank after an edit, you most likely deleted a quote or a comma. Undo your last change and try again.

## Line guide for `content.js`

Line numbers are for the file as shipped. They shift if you add or remove lines.

### Contact details (fill these in before launch)

| Line | Field | What to put |
|---|---|---|
| 33 | `whatsappNumber` | Your WhatsApp number, digits only, starting with country code: `8801712345678` |
| 34 | `whatsappMessage` | The message that appears pre-typed when someone taps a WhatsApp button |
| 35 | `phoneDisplay` | The phone number as people should see it: `+880 1712-345678` |
| 36 | `phoneLink` | The same number with no spaces: `+8801712345678` |
| 37 | `email` | Your email address |
| 38 | `facebookUrl` | Full link to your Facebook page |
| 39 | `website` | Your domain, without `https://` |
| 40 | `location` | City and country shown in the footer |

Every WhatsApp button on the site (navigation, hero, packages, final CTA, footer and the floating phone button) uses lines 33–34. Change them once and every button updates.

### Prices and packages

| Line | What it controls |
|---|---|
| 151 | `period`: the text after each price (`/ month`) |
| 152 | `popularBadge`: the label on the highlighted card |
| 155–156 | Starter name and price |
| 162–168 | Starter feature list |
| 171–172 | Growth name and price |
| 174 | `highlighted: true` makes this the purple "Most Popular" card. Set it on exactly one tier. |
| 175 | "Everything in Starter, plus:" line |
| 178–184 | Growth feature list |
| 187–188 | Dominate name and price |
| 191 | "Everything in Growth, plus:" line |
| 194–201 | Dominate feature list |
| 206–208 | One-time website: name, price, and the "free on a 6-month contract" note |
| 209–216 | One-time website feature list |
| 219 | The ad-spend disclaimer under the packages |

To add a feature, copy an existing line such as `"Monthly review call",` and edit the text. Every line in a list needs a comma after it except the last one.

### Services

Lines **92–98**. Each service has an `icon`, a `title` and a `text`.
Available icons: `globe`, `megaphone`, `map-pin`, `wrench`, `pen`, `search`, `clock`, `message`, `coins`, `users`, `chart`, `door`, `phone`, `mail`.
The grid rearranges itself if you add or remove a service.

### Projects (Work section)

Lines **136–143**. Each project looks like this:

```js
{ title: "Clinic website", category: "Healthcare", summary: "...", tags: ["Website"], image: "", link: "", sample: true },
```

- `image`: leave `""` to show a purple gradient card, or put a screenshot path such as `"images/clinic.jpg"`. Upload the `images` folder next to `index.html`. Images load lazily.
- `link`: the full URL of the live project, or `""` if the card shouldn't be clickable.
- `sample: true` shows a "Sample" badge. Set it to `false` on real projects.

All six shipped entries are placeholders. Replace or delete them before launch, and only add real projects you have permission to show.

### Other text

| Lines | Section |
|---|---|
| 18–21 | Brand name and footer tagline |
| 24–29 | Page title, description, site URL and share image (see "SEO and link previews" below) |
| 44–53 | Navigation links and the WhatsApp button label |
| 56–71 | Hero: headline, subline, button labels, and the search-result illustration |
| 74–84 | Problem section and its 4 cards |
| 102–111 | Process: the 4 steps |
| 114–124 | Why NEXAWEB: the 4 trust points |
| 223–234 | FAQ questions and answers |
| 237–241 | Final call-to-action band |
| 244–250 | Footer headings and copyright line (the year updates itself) |

## SEO and link previews

`content.js` sets the page title and description in the browser, and Google reads those. Facebook and WhatsApp link previews **do not run JavaScript**. They only read the tags at the top of `index.html` (lines 6–19). If you change the title or description in `content.js`, copy the same text into those tags too. This is the one exception to "only edit content.js".

For link previews you also need a 1200×630 image named `og-image.png` uploaded next to `index.html`.

## Deploy to Hostinger

1. Log in to hPanel and open **File Manager** for nexaweb.io.
2. Open the `public_html` folder.
3. Upload `index.html`, `content.js` and `style.css` (plus `og-image.png` and any `images/` folder).
4. Visit https://nexaweb.io. To make changes later, edit `content.js` and upload it again.

## Before launch checklist

- [ ] Real WhatsApp number, phone, email and Facebook link (lines 33–38)
- [ ] Package feature lists reviewed. They are drafts; make sure you can deliver every line.
- [ ] FAQ answers match your real terms (cancellation, ownership)
- [ ] Placeholder projects replaced or removed
- [ ] `og-image.png` uploaded
