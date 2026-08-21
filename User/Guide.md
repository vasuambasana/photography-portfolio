# Photography Portfolio: User Guide & To-Do

Welcome to your new Astro-powered photography portfolio! The site has been fully scaffolded with a high-performance architecture and a dark editorial theme. 

This document serves as your personal checklist for making the site your own, replacing placeholders, and understanding where everything lives in the codebase.

---

## 🏗️ App Structure Overview

Your project is built using Astro (for fast, static HTML generation), Tailwind CSS (for styling), and a touch of React (for the interactive image lightbox).

Here is the breakdown of your project folder (`v:\Personal Projects\app`):

```text
├── public/                 # Static assets (favicons, robots.txt, manifest). Files here are served at the root URL (e.g., /favicon.svg). You can place your actual images here under public/images/ if you prefer.
├── src/
│   ├── components/         # Reusable UI building blocks
│   │   ├── common/         # Global pieces (Header, Footer, Nav, SEO)
│   │   ├── contact/        # Contact form UI
│   │   └── portfolio/      # Gallery specific UI (ProjectCard, GalleryGrid, Lightbox)
│   ├── content/            # The heart of your site's data
│   │   ├── photos/         # Markdown files (.md) for each photo.
│   │   └── config.ts       # Validates the data in your Markdown files (Zod schema).
│   ├── layouts/            # Page wrappers that provide the HTML skeleton and global styling.
│   │   ├── BaseLayout.astro    # Used for generic pages (Home, About, Contact)
│   │   └── PhotoLayout.astro   # Used specifically for the single photo viewing experience.
│   ├── pages/              # Every .astro file here becomes a route (e.g. about.astro -> /about)
│   │   ├── portfolio/      
│   │   │   └── [slug].astro # Dynamic route that generates a unique page for EVERY photo in src/content/photos/
│   │   ├── index.astro     # The Homepage
│   │   ├── about.astro     # About page
│   │   ├── contact.astro   # Contact page
│   │   └── ... (privacy, accessibility, 404)
│   ├── styles/             # Global CSS (global.css) where Tailwind is imported and custom keyframes are defined.
│   └── utils/              # Helper functions (SEO structured data, aspect ratio math).
├── astro.config.mjs        # Astro configuration (integrations like React and Tailwind live here).
├── tailwind.config.mjs     # Your design tokens (colors, fonts, breakpoints).
└── package.json            # Project dependencies and npm scripts (like 'npm run dev').
```

---

## ✅ To-Do Checklist: Replacing Placeholders

Currently, the site is populated with placeholder text and generated SVG images so you can see the layout structure. Here is what you need to swap out to make it yours:

### 1. The Portfolio Content (Markdown Files)
Go to `src/content/photos/`. You will see sample files like `morning-geometry.md` and `forest-mist.md`.
- [ ] **Images:** Replace the placeholder `image` URL with paths to your actual photos. (e.g., `/images/my-photo.jpg` if you put it in the `public/images/` folder).
- [ ] **Metadata:** Update the `title`, `category`, `date`, `location`, and `cameraSpecs` (Canon R5 Mark II).
- [ ] **Description:** Write a brief description or story behind the photo in the body of the markdown file.

### 2. The Homepage (`src/pages/index.astro`)
- [ ] **Hero Text:** Update the introductory `<h1>` and `<p>` tags at the top of the page to reflect your personal brand statement.
- [ ] **Featured Photos:** The homepage currently fetches featured photos from the content collection. You can later adjust this to only filter/slice the top 3-4 photos if you prefer.

### 3. The About Page (`src/pages/about.astro`)
- [ ] **Bio Picture:** Replace the placeholder `<ImageWithRatio>` source with your actual portrait.
- [ ] **Biography:** Replace the placeholder biography text with your actual journey, artistic vision, and background.
- [ ] **Social Links:** Update any social media links pointing out to Instagram, X, etc.

### 4. The Contact Page (`src/pages/contact.astro` & `src/components/contact/ContactForm.astro`)
- [ ] **Email Address:** Update the direct email/mailto links on the contact page.
- [ ] **Form Backend:** The UI for the contact form is built, but HTML forms need a backend to actually send you the email. You will need to wire the `<form>` `action` attribute to a service like **Formspree**, **Netlify Forms**, or **Web3Forms**.

### 5. Legal Pages
- [ ] **Privacy Policy (`src/pages/privacy.astro`):** Search for `[PLACEHOLDER: Date]` and update it. Read through to ensure it matches your actual data practices.
- [ ] **Accessibility (`src/pages/accessibility.astro`):** Update the `[PLACEHOLDER: Date]` at the bottom.

### 6. Global Configuration
- [ ] **Site URL:** In `astro.config.mjs`, update the `site` property from `'https://example.com'` to your actual purchased domain name.
- [ ] **Sitemap:** Once the site URL is updated, re-add `sitemap()` to the `integrations` array in `astro.config.mjs` (I temporarily removed it to ensure the scaffolding build wouldn't fail on a dummy URL).
- [ ] **SEO Defaults:** Open `src/components/common/SEO.astro` and verify the default meta descriptions and OpenGraph images are what you want shared on Twitter/iMessage.

---

## 🎨 Next Steps: Visual Editing
Since you mentioned having some example websites for visual inspiration:
1. Have a look around the site locally using `npm run dev`.
2. Share the links/examples with me!
3. We can dive into `tailwind.config.mjs` or specific layout files to tweak spacing, typography sizes, colors, and layout structures to match your inspiration.
