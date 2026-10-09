# RV University — Design Language

Source: *RV University Brand Guidelines, March 2026 (vol. 02)*.
Use this file as the single reference for any UI, document, slide or collateral that should feel like RV University.

> **Legend.** Items marked **[Guide]** are stated in the brand book. Items marked **[Derived]** are my extrapolation from the book's layouts so the system works for screens (the book is print-first). Treat [Derived] values as sensible defaults, not official rules.

---

## 1. Character

Classical, calm, academic. Think marble columns, open books, a pearl in a shell. The system pairs **deep navy and warm gold** with a **cream paper** ground, and sets large, elegant **italic serif headlines** against a quiet, clean sans for everything you actually read.

Keywords: *dignified, warm, literary, assured, unhurried.*
Not: neon, glossy, playful, gradient-heavy, cluttered.

The guiding idea from the brand book: *"Excellence in Education with Societal Commitment"*. Education meets ethics, innovation meets purpose. The design should feel trustworthy first, modern second.

---

## 2. Colour

### 2.1 Core palette **[Guide]**

| Role | Name | HEX | RGB | CMYK | Pantone |
|---|---|---|---|---|---|
| Primary dark | Slate Navy | `#233039` | 35 48 57 | 81 60 49 64 | 7546 C |
| Primary accent | RVU Gold | `#D7AC54` | 215 172 84 | 19 33 75 0 | P 15-13 C |
| Primary neutral | Black | `#000000` | 0 0 0 | 0 0 0 100 | 426 C |

### 2.2 Secondary palette **[Guide]**

| Role | HEX | RGB | CMYK |
|---|---|---|---|
| Deep Teal | `#004854` | 0 72 84 | 100 10 29 68 |
| Antique Gold | `#C29650` | 200 160 82 | 12 33 74 15 |

### 2.3 Surface and support colours **[Derived from page backgrounds]**

| Role | HEX | Use |
|---|---|---|
| Cream (paper) | `#EBEBD3` | Default warm page background; the book's signature ground |
| Mist | `#F4F4F4` | Cool light panel for dense text and tables |
| White | `#FFFFFF` | Cards on cream, form fields, print stock |
| Ink (stationery navy) | `#1A2B35` | Alternate very dark navy used on letterheads |
| Ink text | `#233039` | Body text on light surfaces (same as Slate Navy) |

### 2.4 Tokens

```css
:root {
  /* Brand */
  --rvu-navy:        #233039;
  --rvu-navy-deep:   #1A2B35;
  --rvu-gold:        #D7AC54;
  --rvu-gold-antique:#C29650;
  --rvu-teal:        #004854;
  --rvu-black:       #000000;

  /* Surfaces */
  --rvu-cream:       #EBEBD3;
  --rvu-mist:        #F4F4F4;
  --rvu-white:       #FFFFFF;

  /* Semantic */
  --bg:              var(--rvu-cream);
  --bg-panel:        var(--rvu-mist);
  --bg-inverse:      var(--rvu-navy);
  --text:            var(--rvu-navy);
  --text-inverse:    #F4F1E4;       /* warm off-white on navy [Derived] */
  --accent:          var(--rvu-gold);
  --accent-on-light: var(--rvu-teal); /* use teal, not gold, for small text on cream/white */
  --rule:            var(--rvu-gold);
}
```

### 2.5 Pairings and contrast

Approximate WCAG contrast ratios (computed from the hex values above):

| Text on background | Ratio | Verdict |
|---|---|---|
| Navy on Cream | ≈ 11 : 1 | Excellent, default |
| Navy on White / Mist | ≈ 12 : 1 | Excellent |
| Gold on Navy | ≈ 6 : 1 | Good for headings and body on dark |
| Teal on Cream | ≈ 8 : 1 | Good for links and small accents |
| **Gold on Cream or White** | ≈ 1.7 : 1 | **Fails.** Decorative only (rules, numerals at large size, ornaments). Never for readable text |

**[Guide]** The gold logo must not be placed on a white background. The same logic applies to gold text and gold UI on light grounds.

### 2.6 Usage ratio **[Derived]**

Roughly **60 % cream / white / mist, 30 % navy, 10 % gold**. Gold is a *seasoning*: rules, numerals, braces, hover states, one highlight per view. Teal is a rare secondary accent (links, data highlights).

### 2.7 Dark and light sections

The book alternates between two modes, and so should layouts:

- **Dark section:** navy ground, gold headings and brace, off-white body. Used for introductions, section openers and key statements.
- **Light section:** cream or mist ground, navy text, gold only as decoration.

Alternate them to create rhythm down a long page.

---

## 3. Typography

### 3.1 Families **[Guide]**

| Role | Family | Weights / styles | Use |
|---|---|---|---|
| **Primary** | **Cantarell** | Regular, Bold, Oblique (Medium on stationery) | Headlines where needed, subheads, body, captions, long-form, UI |
| **Secondary** | **Playfair Display** | Regular, Bold, Italic | Emphasis and contrast: display headings, feature titles, pull quotes, taglines. **Never extended body copy** |
| **Numerals** | **Montserrat** | Regular, Medium, Bold | Statistics, dates, tables, charts, infographics, data-led content |

All three are open-source Google Fonts. Email signatures fall back to a generic sans-serif.

```css
:root {
  --font-body:    "Cantarell", "Helvetica Neue", Arial, sans-serif;
  --font-display: "Playfair Display", Georgia, "Times New Roman", serif;
  --font-numeric: "Montserrat", "Helvetica Neue", Arial, sans-serif;
}
```

### 3.2 The signature headline treatment **[Derived from the book's layouts]**

The book's most recognisable move is a **very large Playfair Display Italic** word set beside a **smaller Playfair Regular lead-in**: *"What is* **Inside?**", *"Know your* **logo**", *"brand* **guide***lines*". Reproduce this:

- Lead-in: Playfair Regular or Italic, modest size.
- Key word: Playfair Italic, 3 to 5 times larger, tight leading, navy on light (or gold on dark).
- Use once per section opener, not on every heading.

### 3.3 Type scale **[Derived]**

| Token | Family | Size (desktop / mobile) | Weight | Line height |
|---|---|---|---|---|
| `display` | Playfair Display | 96 / 56 px | Italic | 0.95 |
| `h1` | Playfair Display | 56 / 36 px | Italic or Bold | 1.05 |
| `h2` | Playfair Display | 36 / 28 px | Italic | 1.15 |
| `h3` | Cantarell | 22 / 20 px | Bold | 1.3 |
| `eyebrow` | Cantarell | 13 px, tracking +0.12em, uppercase | Bold | 1.2 |
| `body` | Cantarell | 17 / 16 px | Regular | 1.65 |
| `body-lead` | Playfair Display | 20 / 18 px | Italic | 1.5 (short intros only) |
| `caption` | Cantarell | 13 px | Regular / Oblique | 1.4 |
| `stat` | Montserrat | 48 to 72 px | Bold | 1.0 |
| `numeral-inline` | Montserrat | inherits | Medium | inherits |

### 3.4 Rules

- Headlines in **sentence case**, not Title Case and not ALL CAPS. All caps is reserved for tiny eyebrows and personal names on stationery.
- Body copy is **Cantarell only**. Never set paragraphs in Playfair.
- **Every number that is data** (stats, dates in tables, chart labels, prices) uses Montserrat. Numbers inside running prose stay in Cantarell.
- Left-align body text. The book occasionally justifies long copy in print; avoid justification on screens.
- Limit line length to roughly 60 to 75 characters.

---

## 4. Logo and brand marks

These are **[Guide]** rules and are non-negotiable ("there are no exceptions").

- **Never alter** the logo: no distortion, recolouring, rearranging, or splitting elements apart.
- The **crest** has three foundational elements: **tree** (growth from the seed you sow), **book** (where you study and strengthen knowledge), **sun** (a fresh start towards a bright future). Beneath it sits the motto **प्रज्ञा : ★ धीरा :** (*Pragya*, wisdom; *Dhira*, steadiness and clarity of purpose).
- The **baseline** "Go, change the world" and the line "an initiative of RV Educational Institutions" are integral. The logo cannot be used without them.
- **Approved colourways:** gold or white-on-dark (navy / near-black), and navy-on-light. **Never** place the gold logo on white.
- **Minimum height: 21 mm (2.1 cm)** in print. On screen, keep the full lockup at **≥ 96 px tall** **[Derived]**.
- **Clear space:** leave at least **5 mm** after the icon as a basic rule. Scale to **x = icon width ÷ 4** on screen **[Derived]**.
- The **crest alone** is exception-only and needs Brand Team approval. Legitimate uses: secondary signage, watermark or hologram on certificates, stationery branding. Use the full logo wherever possible.
- **Sub-brands** (schools and centres) use the master lockup plus a **gold panel** carrying the school name and location. No separate identities, no independent logos, no logos for events or campaigns. Requests go through the Communications Department.
- **Sponsor lockups** place the partner logo in the gold panel with equal respect for each brand.
- The RV University logo always leads in scale, placement and hierarchy.

---

## 5. Signature motifs

These are what make a layout read as RV University. Use two or three per view, not all of them.

### 5.1 Numbered section roundel **[Guide]**

A solid **navy circle** holding a **gold Playfair Italic numeral** followed by a thin gold **slash `/`** that breaks out of the circle, with the section title in Playfair Italic beside it ("**3/** Logo / Different components"). On dark backgrounds the circle inverts to gold with a navy numeral.

```css
.roundel {
  display: inline-grid; place-items: center;
  width: 72px; height: 72px; border-radius: 50%;
  background: var(--rvu-navy); color: var(--rvu-gold);
  font: italic 700 40px/1 var(--font-display);
  position: relative;
}
.roundel::after { /* the slash */
  content: "/"; position: absolute; right: -10px; top: 6px;
  font: italic 400 56px/1 var(--font-display); color: var(--rvu-gold);
}
.on-dark .roundel { background: var(--rvu-gold); color: var(--rvu-navy); }
```

### 5.2 Curly brace **[Guide]**

A large, thin **gold `{` or `}`** bracketing a block of text or a title. It anchors cover lockups, intro statements ("Introduction" on the left, copy bracketed on the right) and closing titles ("Genesis of RV University }"). Draw it as an SVG stroke, not a font glyph, for crisp scaling.

### 5.3 Brace-tail callout **[Guide]**

A **navy rounded rectangle** (radius ≈ 16 px) with off-white text, whose edge flows into a small brace that points at the thing being explained. Used for annotations on diagrams and "important facts" panels.

### 5.4 Dotted gold rule **[Guide]**

A fine **dotted or dashed gold line** under section intros and above contact blocks. Also appears as table-of-contents leaders. Keep it 1 px, gold, dotted.

```css
.rule { border: 0; border-top: 1px dotted var(--rvu-gold); }
```

### 5.5 Gold pill label **[Guide]**

Small **rounded gold button / tag** with navy bold text ("Download"). Also a **navy header bar** with a gold uppercase label ("DIFFERENT SCHOOLS") to introduce a grid.

### 5.6 Gold panel + navy panel pairs **[Guide]**

Horizontal strips split into a **navy lockup block** and a **gold information block**. This is the sub-brand construction and works as a general "title strip" component.

### 5.7 Footer folio **[Guide]**

Every page carries a tiny footer: `NN / RV University Brand Guidelines / March 2026`, in small Cantarell, bottom-left. For web, a quiet footer line serves the same role.

---

## 6. Layout and spacing **[Derived]**

- **Format.** The book is a wide **landscape split-screen**: roughly one-third dark panel (or image) and two-thirds light content, or the reverse. On screens, mirror this with a 5/7 or 4/8 grid on desktop, stacking on mobile.
- **Generous whitespace.** Margins are large; text blocks sit narrow beside big headlines. Prefer less content per screen.
- **Grid.** 12 columns, 1200 to 1280 px max width, 24 px gutters.
- **Spacing scale (px).** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Section padding 96 px desktop, 56 px mobile.
- **Radius.** Cards and callouts 16 px; pills 999 px; images square-cornered or with the large arch/brace shapes seen in the book. Avoid small 2 to 4 px radii.
- **Elevation.** Mostly flat. Separation comes from colour blocks and dotted rules, not shadows. If needed: `0 8px 24px rgba(35,48,57,.12)`.
- **Borders.** Hairline 1 px in navy at 15 % opacity, or dotted gold.

---

## 7. Imagery

**[Guide, from the book's photography]**

- **Classical and aspirational:** marble columns and capitals, a seashell with a pearl, an oversized open book on a surreal horizon, an old typewriter, metal type, a mortarboard and scroll, a hand holding a seedling.
- **Metaphor over literal.** Images stand for ideas (growth, knowledge, craft, potential) rather than showing generic campus stock.
- **Tone.** Soft natural light, muted and slightly desaturated colour, cool-warm contrast. Black-and-white and sepia are welcome.
- **Treatment.** Large, full-bleed or half-page, used on the dark split panel or as a section opener. Clean cut-outs on cream are fine for object photos.
- Avoid loud filters, heavy gradients, busy collages, and anything glossy or neon.

---

## 8. Components (web) **[Derived]**

| Component | Spec |
|---|---|
| **Primary button** | Navy fill, off-white Cantarell Bold 15 px, 12 × 28 px padding, pill radius. Hover: gold fill, navy text. On dark: gold fill, navy text |
| **Secondary button** | 1.5 px navy outline, navy text. Hover: navy fill |
| **Link** | Teal, underlined on hover; on dark sections gold |
| **Card** | White on cream, 16 px radius, 1 px hairline, 32 px padding, Playfair Italic title, Cantarell body |
| **Section header** | Roundel + Playfair Italic `h2` + dotted gold rule |
| **Callout** | Navy ground, gold heading, off-white text, brace tail |
| **Stat block** | Montserrat Bold figure in navy (gold on dark) over a Cantarell caption |
| **Table** | Mist header row in navy Cantarell Bold, hairline row dividers, Montserrat for numeric columns, right-aligned |
| **Form field** | White fill, 1 px navy 30 % border, 12 px radius; focus ring 2 px gold plus a 1 px navy border |
| **Tag / chip** | Gold fill, navy Cantarell Bold 12 px uppercase, pill |
| **Nav** | Navy bar, off-white Cantarell links, gold underline for the active item; logo lockup left at the minimum size or larger |
| **Footer** | Navy, off-white text, dotted gold divider, full address block |

---

## 9. Motion **[Derived]**

Unhurried and dignified: 200 to 350 ms, ease-out. Fades and slight 8 to 16 px rises; brace and rule "draw-in" animations are on brand. No bounces, spins or parallax gimmicks. Respect `prefers-reduced-motion`.

---

## 10. Voice and writing rules **[Guide]**

These are mandatory in all copy.

- **Name:** always **RV University**. Capital R, V, U, with a space. Never "R V University", "R.V. University", "Rv University", or an expanded "Rashtreeya Vidyalaya University".
- **UK English throughout:** programme, specialisation, colour, centre, organise.
- **Dates:** `DD Month YYYY`, no leading zero, no commas. ✔ *4 April 2026*, ✘ *04 April 2026*, ✘ *April 4, 2026*.
- **Campuses:** exactly **Bengaluru Campus** and **Mysuru Campus**.
- **Initials and titles use full stops:** N.H.R. Davda, Ms., Dr., Prof.
- **Tone:** warm, assured, plain. Short sentences. Education with purpose: avoid hype words ("revolutionary", "world-beating") and exclamation marks.
- **Tagline:** "Go, change the world". **Mission line:** "Excellence in Education with Societal Commitment".

---

## 11. Stationery and print specifications **[Guide]**

| Item | Size | Key specs |
|---|---|---|
| Business card | — | Logo 41 × 20 mm. Name: Cantarell Bold, all caps, 7 pt. Title: Cantarell Medium, sentence case, 6 pt. Email / mobile: Cantarell Medium, caps, 6.3 pt. Baseline: Playfair Display, sentence case, 4.6 pt. Divider line 41.5 mm |
| Letterhead | 8.25 × 11.5 in | Logo ≈ 57.7 × 28.6 mm (offset 15.1 mm from top, 8.4 mm from left). Body Cantarell 8.75 pt sentence case. Baseline Playfair 7.4 to 7.6 pt. Rule 105 × 0.635 mm in gold `#D0A863`. Stationery navy `C90 M70 Y55 K40` ≈ `#1A2B35` |
| Large envelope | 8.9 × 12.4 in | Logo ≈ 226 × 300 mm full-bleed lockup; Cantarell 8.87 pt |
| Visiting card | 5.5 w × 8.5 h cm | Logo 3.8 × 1.9 cm. Playfair Bold 7 to 8 pt names, Playfair Regular 6 to 11 pt details, Cantarell Regular 6.75 pt, website in Playfair lowercase 8.33 pt |
| ID card | — | QR code per employee; registrar's scanned signature; Playfair Display throughout with Cantarell for small details |
| Email signature | — | Name: sans-serif bold, normal size. Title and mobile: sans-serif, normal. Address and landlines: Cantarell Bold 12 pt. Website: Cantarell Medium 12 pt. Social handles: Cantarell Medium 8 pt. RVU logo at left |

Contact block used throughout: RV Vidyaniketan Post, 8th Mile, Mysuru Road, Bengaluru 560059 · Office: 080 6819 9900 · headcommunication@rvu.edu.in

---

## 12. Do and don't

**Do**
- Open sections with a big Playfair Italic word and a numbered roundel.
- Alternate navy and cream sections for rhythm.
- Keep gold small, deliberate and on dark grounds when it carries meaning.
- Set data in Montserrat.
- Use the full logo lockup with its baseline.
- Write in UK English with the correct date format.

**Don't**
- Put gold text, gold UI or the gold logo on white or cream.
- Set body paragraphs in Playfair Display.
- Stretch, recolour, rotate, outline or rearrange the logo, or use the crest alone without approval.
- Invent a sub-brand logo or a new colour for an event, school or campaign.
- Use gradients, neon, heavy drop shadows, or ALL CAPS headlines.
- Write "R.V. University", "Rv University", or US spellings.

---

## 13. Quick-start snippet

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cantarell:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">

<style>
  body { margin: 0; background: var(--bg); color: var(--text);
         font: 400 17px/1.65 var(--font-body); }
  h1, h2 { font-family: var(--font-display); font-style: italic; font-weight: 400;
           letter-spacing: -0.01em; }
  .eyebrow { font: 700 13px/1.2 var(--font-body); letter-spacing: .12em;
             text-transform: uppercase; color: var(--rvu-teal); }
  .stat { font: 700 64px/1 var(--font-numeric); }
  .section--dark { background: var(--bg-inverse); color: var(--text-inverse); }
  .section--dark h1, .section--dark h2 { color: var(--rvu-gold); }
</style>
```

---

*Contact for clarifications: headcommunication@rvu.edu.in. Logo files and school lockups are issued by the RV University Communications Department / Brand Team.*
