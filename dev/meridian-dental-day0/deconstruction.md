Here is the technical build blueprint to translate the Aventura Dental Arts reference into the Meridian Dental Co. brand. 

## 1. Section-by-Section Structural Breakdown

*   **1. Hero (100vh)**: Split-screen layout (50/50). Left: Static brand typography and sub-navigation. Right: Autoplaying, muted background video. *Layout Pattern:* CSS Grid (`grid-template-columns: 1fr 1fr`).
*   **2. Philosophy/Intro (120vh - 150vh)**: Asymmetrical content reveal. Left: Portrait image. Right: Oversized, cascading typography. *Layout Pattern:* Spacer block with a `position: sticky` image container while the right-side text scrolls into the viewport.
*   **3. Service Pillars (~300vh - 400vh)**: Pinned scroll section. Left: Large hero image and massive section title (e.g., "Esthetic Dentistry"). Right: Scrolling list of specific treatments with inline or hover-revealed images. *Layout Pattern:* Pinned left column using GSAP `ScrollTrigger` or `position: sticky`, while the right column contains the scrollable track.
*   **4. Technology Stack (150vh)**: Centralized interactive list. Left/Center: Dynamic image area. Right/Center: List of technologies. *Layout Pattern:* Hover-driven state changes where hovering a text item dynamically swaps the absolute-positioned image in the adjacent frame.
*   **5. Team/Portraits (100vh)**: Full-width visual break. Large, edge-to-edge photography of the team. *Layout Pattern:* CSS Flexbox/Grid row, highly reliant on high-res, visually consistent studio photography.
*   **6. Statistics/Impact (100vh)**: Data visualization. Floating, overlapping circles containing metrics. *Layout Pattern:* Absolute positioning with physics-based or staggered entrance animations.
*   **7. Testimonials (100vh)**: Horizontal scroll or fade-in carousel. Minimalist layout focusing purely on the typographic quote. *Layout Pattern:* CSS Grid, wide center column.
*   **8. Footer & Final CTA (80vh)**: Large typographic sign-off ("Bringing Your Perfect Smile to Life"). Top edge features a distinct convex curve or border-radius bridging the previous section to the dark footer. *Layout Pattern:* Standard flex-column footer with an SVG mask or `border-radius` on the top boundary.

## 2. Motion Vocabulary

*   **Entry Animations (Page Load)**:
    *   *Curtain Reveal*: Images and videos unmask using `clip-path: inset(0 0 100% 0)` to `inset(0 0 0% 0)`.
    *   *Staggered Text Up*: Headings wrap lines in `overflow: hidden` spans, translating Y from `100%` to `0%` with a subtle skew. *Duration:* 0.8s - 1.2s. *Easing:* `cubic-bezier(0.16, 1, 0.3, 1)` (custom ease-out).
*   **Scroll-Driven Animations**:
    *   *Smooth Scroll*: Global locomotive-style smooth scrolling (via Lenis or similar) to give weight and momentum to the page.
    *   *Parallax*: Background images in the services section translate Y at 10-15% of the scroll speed.
    *   *Pinning*: Left columns in the "Services" section lock into place while the right side continues to scroll.
*   **Hover/Interaction States**:
    *   *Image Reveal*: Hovering over a service name triggers a `clip-path` or opacity reveal of a corresponding image.
    *   *Blend Modes*: The hero text explicitly crosses the center threshold, utilizing `mix-blend-mode: difference` or an inverted color mask to remain legible over both the solid background and the video.
*   **Section-to-Section Transitions**:
    *   *Background Color Tweens*: Smooth transitions of the `<body>` or `<main>` background color as the user enters a new section (e.g., transitioning from light to dark mode for the footer).

## 3. Type System

Based on the Meridian brief, applying the reference's typographic scale:
*   **H1 (Hero/Display)**: Fraunces, Italic accents. 
    *   Size: `clamp(4rem, 10vw, 9rem)`
    *   Weight: 400 (Regular)
    *   Line-height: 0.9 (Extremely tight)
    *   Tracking: `-0.03em` (Tight for interlocking letterforms)
*   **H2 (Section Headers)**: Fraunces.
    *   Size: `clamp(3rem, 6vw, 6rem)`
    *   Weight: 400
    *   Line-height: 1.0
    *   Tracking: `-0.02em`
*   **H3 (Service Titles/Stats)**: Fraunces.
    *   Size: `clamp(1.5rem, 3vw, 2.5rem)`
    *   Weight: 300
    *   Line-height: 1.1
*   **Body/UI**: Inter.
    *   Size: `clamp(0.875rem, 1vw, 1.125rem)`
    *   Weight: 400
    *   Line-height: 1.5
    *   Tracking: `0.01em` (Slightly loose for legibility at small sizes)
*   **Editorial Treatments**: Selective italicization of specific words within H1 and H2 elements to create visual rhythm (e.g., "Dentistry, *considered*").

## 4. Color Logic and Contrast Strategy

*   **Base Theme**: The site operates on a stark binary. Backgrounds alternate between #F5F2ED (Warm Off-White) and #0A0A0A (Matte Black) to delineate sections. 
*   **Typography**: Text color is always the direct inverse of the background. On #F5F2ED, text is #0A0A0A. On #0A0A0A, text is #F5F2ED.
*   **Accent Usage (#B8956A - Brushed Brass)**: Do *not* use this for large blocks of color or typography. Reserve it for micro-interactions: the hover state of an underline, the border of a focused input, a subtle active state indicator on the sub-nav, or the background of a primary CTA button.

## 5. Layout and Grid System

*   **Grid**: 12-column CSS Grid. `gap: 2rem` (desktop), `gap: 1rem` (mobile).
*   **Gutters/Margins**: Generous outer padding. `padding: 0 4vw` on desktop.
*   **Breaking the Grid**: The design feels premium because it ignores strict containment. The massive H1 text in the hero intentionally bleeds across the 6-column center line into the video area. Images touch the edges of the viewport rather than sitting inside containers.
*   **Mobile Adaptations**: The 50/50 split drops completely on mobile. Pinned sections become standard stacked sections. The emphasis shifts entirely to typography and pacing, rather than complex scroll physics.

## 6. The 3 Specific Techniques That Make This Feel "Premium"

1.  **Print-Level Typographic Leading & Kerning**: The H1 and H2 tags use a line-height of `0.9` or `1.0`. Standard web frameworks default to `1.2`. By tightening the leading and applying negative tracking to the Fraunces font, the text feels like a high-end editorial magazine cover, not a standard website header.
2.  **Asymmetric Pinned Scrolling**: When a user scrolls the "Services" section, the left half locks, and only the right half moves. This reduces cognitive load. Instead of the entire page rushing past, the user feels anchored. It signals intentional pacing—the website is controlling the narrative flow.
3.  **Blend Modes over Boundaries**: Text crossing the boundary between a solid color and a video utilizes CSS `mix-blend-mode`. This removes the need for drop shadows or text backdrops (which look cheap) while maintaining perfect legibility.

## 7. Component List for Reusable Build

1.  `<SmoothScrollProvider/>`: Wrapper implementing Lenis/Locomotive scroll for global momentum scrolling.
2.  `<SplitHero/>`: The 50/50 hero component with the text intersection blend logic.
3.  `<TextReveal/>`: A wrapper component that takes text, splits it by line, and applies the staggered Y-axis entry animation using GSAP.
4.  `<StickySection/>`: A layout component that pins its `LeftSlot` while allowing its `RightSlot` to scroll.
5.  `<ImageMaskReveal/>`: An image component that reveals via `clip-path` linked to a ScrollTrigger threshold.
6.  `<HoverImageList/>`: The text list component where hovering an item changes the `src` and triggers a transition of a decoupled image element.
7.  `<MagneticButton/>`: A CTA button that slightly pulls toward the user's cursor on hover (a staple of premium Awwwards-style sites).
8.  `<CurvedTransition/>`: The SVG or border-radius shape divider used before the footer to soften the grid.

## 8. Translation to Meridian Dental Co.

**Section Mapping:**
*   **Keep**: Hero (Split screen), Philosophy (Scrolling text), Services (Pinned scroll), Testimonials.
*   **Modify**: Change the "Statistics" floating bubble section. The Meridian brief specifies "Quiet confidence. No exclamation marks." Floating stats circles feel slightly too loud/energetic. Replace this with a quiet, beautifully typeset 3-column grid of key metrics or foundational pillars.
*   **Drop**: "Team of Experts" (unless high-end editorial photography is available, bad photos will instantly kill the premium vibe), and drop the 4th service ("Beyond the Smile").

**Service Mapping:**
Map the 3 brief services to the pinned scroll section:
1.  *Esthetic Dentistry* -> "Aesthetic Dentistry" (Update copy to focus on veneers, whitening, smile design).
2.  *Restorative Dentistry* -> "Restorative Care" (Implants, crowns, full-mouth).
3.  *Preventive Care* -> "Preventive Wellness" (Cleanings, checkups, oral health planning).

**Color Implementation:**
*   Set CSS variables: `--bg-light: #F5F2ED; --text-dark: #0A0A0A; --accent: #B8956A;`
*   The hero will feature `#F5F2ED` on the left with `#0A0A0A` text.
*   The footer and alternating sections will feature `#0A0A0A` background with `#F5F2ED` text.
*   Use the Brushed Brass (`#B8956A`) for the "Book A Call" button hover state and the thin dividing lines (`border-bottom`) in the Services list.