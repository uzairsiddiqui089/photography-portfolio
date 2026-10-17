# Quiet Aperture

A portfolio website for a portrait and fashion photography studio. The page opens with a 3D camera that builds itself piece by piece, then follows your cursor. As you scroll, the camera turns around, zooms into its own rear screen, and the rest of the site is seen through a viewfinder.

> The studio name is a placeholder and may change.

**Live site:** _add your link here (see "Publish" below)_

## What it does

- **3D camera, built in code:** a generic DSLR made from basic shapes in Three.js (no brand, no model files). Parts fly in one by one while the page loads.
- **Cursor and touch:** the camera turns toward the mouse, or toward your finger on a phone.
- **Scroll journey:** the camera turns, and its rear screen shows a live view of the page. The zoom lands exactly on the real "What we capture" section.
- **Viewfinder overlay:** a timecode that follows the scroll, exposure readouts that change per section, and a focus box that follows the mouse.
- **Sections:** What we capture, a sideways gallery, a "one level up" reveal, the shoot process, and contact.
- **Work page:** a filterable photo grid with a full-size viewer.
- **Responsive and light:** works on phones, respects "reduce motion", lowers its own render quality if a device is slow, and stops drawing 3D once it is off screen.

## Built with

HTML, CSS and JavaScript only, no build step.
[GSAP](https://gsap.com/) and ScrollTrigger for animation, [Three.js](https://threejs.org/) (r128) for the 3D camera. Both are loaded from a CDN.

## Project structure

```
.
|-- index.html        main page
|-- work.html         all work, with filters
|-- contact.html      booking form, contact details, FAQ
|-- css/
|   |-- style.css     main page styles
|   |-- work.css      shared base styles and the work page
|   `-- contact.css   booking form styles
|-- js/
|   |-- main.js       camera, loader, scroll journey, sections
|   |-- work.js       filters and photo viewer
|   `-- contact.js    booking form (validation, event fields, sending)
`-- images/           photos (see the sizes below)
```

## Run it locally

Open `index.html` in a browser. For the most accurate behaviour, use a small local server:

```bash
npx serve .
```

## Publish (free)

**GitHub Pages:** push this folder to a repository, open _Settings > Pages_, choose the `main` branch and the root folder, and save. Your site appears at `https://<your-username>.github.io/<repository>/`.

## Customize

- **Colours and fonts:** the variables at the top of `css/style.css` (`:root`).
- **Text:** edit `index.html` and `work.html` directly.
- **Photos:** put them in `images/` and point each slot at them.
  - _What we capture_ (4:5 portrait): about 1200 x 1500 px.
  - _Recent work_ and the work page landscape frames (8:5): about 1840 x 1150 px.
  - Use `.jpg` or `.webp` under about 250 KB each.
- **Camera look:** the `M` object in `js/main.js` holds the materials and colours.
- **Add a photo to the work page:** copy a `<figure>` block in `work.html` and change the file name, size, title and category.

## Booking form

The form on `contact.html` checks the fields, shows extra event fields when "Event coverage" is chosen, and has a hidden spam trap. A static site has no server, so there are two ways it sends:

- **Default:** it opens the visitor's email app with the request filled in.
- **Direct to your inbox:** create a free form at [Formspree](https://formspree.io) (or a similar service), then set `FORM_ENDPOINT` at the top of `js/contact.js` to its address.

The Services section on the home page and the contact details (phone, address, hours, social links) are placeholders to edit.

## Image credits

The photographs in `images/` are AI-generated placeholders. Replace them with your own work before using the site commercially, and credit or disclose generated images where required.
