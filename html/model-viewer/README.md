# Bedrock Model Viewer

A static, browser-only viewer and editor for Minecraft: Bedrock Edition
resource packs. Import a `.zip`/`.mcpack` resource pack, browse every model
and texture it contains, preview any model+texture combination in 3D, swap
out individual files, and export the edited pack back into a new zip —
all client-side, no server, no build step. Designed to be hosted for free
on GitHub Pages.

Everything happens in your browser tab: the resource pack you import is
never uploaded anywhere.

## Features

- **Import a resource pack** — drag & drop a `.zip`/`.mcpack` file onto the
  page, or use the Import button. Parses every `models/**/*.geo.json`
  (both the legacy `"geometry.xxx"` format and the modern
  `"minecraft:geometry"` array format), every texture under `textures/**`,
  every `entity/*.entity.json` client-entity definition, and every
  `render_controllers/*.json` file.
- **Browse by entity** — the default "Entities" tab lists every entity in
  the pack; select one to see just the models and textures tied to it
  (instead of one long flat list of every file in the pack). Files not
  claimed by any entity show up under a separate "Ungrouped files" bucket
  so nothing is hidden.
- **Validation & error checking** — each entity is checked for:
  - a **model file syntax error** in any geometry it references (reported
    as an error);
  - a **texture that isn't a real PNG** — checked by file signature, not
    just the `.png` extension (reported as a warning on that texture);
  - a **texture or model short key that a render controller expects but
    the entity never defines** (reported as an error — this is the
    "render controller references a texture/model the entity doesn't
    have" check);
  - a **texture, model, or render controller reference that isn't
    included in the pack at all** (reported as a warning — Bedrock packs
    are layered over the base game, so this can legitimately mean "falls
    back to a vanilla asset"). This is checked against a small bundled
    index of real vanilla Minecraft texture/geometry/render-controller
    names (see `assets/vanilla/`); when the reference matches something
    genuinely vanilla, no warning is shown at all, so only references
    that are neither in the pack nor recognized as vanilla get flagged.
  Entities are shown with a colored dot (green/yellow/red) for their
  worst issue, and the Entities tab header shows a total warning/error
  badge. JSON files that use `//` comments or trailing commas — both
  tolerated by the game even though they're not strict JSON — parse
  without a false "syntax error".
- **3D preview** — a Three.js viewer renders the selected model with the
  selected texture, with correct Bedrock "box UV" unwrapping, per-face UV,
  mirroring, bone hierarchy/pivots, inflate, and bone/cube rotation.
- **Smart defaults** — reads `entity/*.json` client-entity definitions to
  pair up a sensible, self-consistent starting model + texture
  combination instead of guessing, when the pack includes them.
- **Browse & search** — models and textures also each have their own flat
  tab, grouped by folder, with a filter box (packs with hundreds of
  files, like large NPC/skin packs, work fine).
- **Edit in place** — replace any individual model JSON or texture PNG
  with a file from your computer, add brand-new files at a path you
  choose, or remove files — all without leaving the page.
- **Camera controls** — orbit/zoom/pan with the mouse, plus one-click
  presets (Front / Back / Left / Right / Top / Bottom / Isometric) and a
  "fit to model" button.
- **View toggles** — grid, axes, wireframe, and a few background colors.
- **Export** — re-zips the current state of the pack (including your
  edits) into a downloadable `.zip`, preserving the original folder
  structure.
- **Demo pack** — a tiny bundled sample pack so the page is useful the
  moment it loads, before you bring your own pack.

## Using it

Open `index.html` (locally, or via GitHub Pages once deployed) and either:

- click **Load Demo Pack** to try it immediately, or
- click **Import Pack…** (or drag a file onto the page) and choose a
  `.zip` or `.mcpack` resource pack.

Once loaded, the sidebar opens on the **Entities** tab: click an entity to
see its models, textures, and any errors/warnings found for it (or click
**← All entities** to go back to the full list). You can also pick a
model and texture directly from the dropdowns at the top of the viewer,
or switch to the flat **Models** / **Textures** tabs — clicking a model
anywhere will auto-pick a matching texture when the pack's entity files
define one, and will jump the Entities tab to whichever entity owns that
model. Hover a row in any list to reveal **View** / **Replace** / **✕**
buttons for that file.

When you're happy with your edits, type a name in the box next to
**Export Pack** and click it to download the result as a `.zip`.

## Deploying to GitHub Pages

1. Create a new GitHub repository (or use an existing one) and push the
   contents of this folder to it — `index.html` needs to be at the root
   (or in `/docs`, if you configure Pages that way).
2. In the repo's **Settings → Pages**, set the source to the branch (and
   folder) you pushed to.
3. GitHub will give you a URL like
   `https://<username>.github.io/<repo>/` — that's your live viewer.

No build step, bundler, or server is required — it's plain HTML/CSS/JS
with two vendored libraries (see below), loaded via ES module
`<script type="module">` + an import map.

## How it's built

```
index.html          entry point
styles.css           styling
src/
  app.js             DOM wiring — the only file that touches the page
  packStore.js        in-memory pack model: zip import/export, file
                       classification, edit tracking, entity/render-
                       controller parsing and cross-reference validation,
                       PNG signature checking, entity-based model/texture
                       pairing hints
  bedrockModel.js      parses Bedrock geometry JSON into a three.js
                       Object3D tree (bones, cubes, box UV / per-face UV,
                       mirroring, inflate, rotation)
  viewer.js           three.js scene/camera/renderer/OrbitControls,
                       camera presets, model/texture swapping
vendor/
  three/               three.js (module build) + OrbitControls, vendored
                       so the page works offline / without depending on
                       a CDN's uptime
  jszip/               JSZip, for reading and writing the pack zip
assets/demo/
  demo-pack.zip         the bundled sample pack shown by "Load Demo Pack"
assets/vanilla/
  vanilla_textures.json            texture paths, vanilla_geometry.json
  vanilla_geometry.json            geometry identifiers, and
  vanilla_render_controllers.json  render controller ids — all from
                                    Mojang's bedrock-samples resource pack,
                                    used to recognize legitimate vanilla
                                    fallback references (see its README.txt)
```

Everything is loaded as native ES modules (`import`/`export`), resolved
through the `<script type="importmap">` block in `index.html` — there's
nothing to compile.

## Notes & limitations

- Only geometry, textures, and file management are supported — this is a
  *model/texture* viewer, not a full game-accurate renderer. It does not
  play animations, evaluate molang expressions, or render
  particles/attachables.
- Render-controller cross-checking is a best-effort scan for
  `Texture.xxx` / `Geometry.xxx` tokens in each controller's JSON, not a
  full molang evaluator — it will not catch every possible conditional
  molang expression a controller could use.
- "Texture/model/render controller not found in pack" is reported as a
  warning, not an error — and suppressed entirely when the reference
  matches a known vanilla asset — because Bedrock packs are layered over
  the vanilla game and a missing file can legitimately mean "uses the
  vanilla asset" rather than a mistake. The vanilla asset list is a
  snapshot of one game version (see `assets/vanilla/README.txt` for how
  to refresh it), so it won't recognize assets added in newer versions —
  those still show as a warning rather than being silently missed.
- Bone and cube `rotation` is applied using the same axis convention most
  community Bedrock tools use (X/Y negated, Z as-is, order ZYX). This
  matches vanilla-style models correctly; a small minority of packs using
  unusual rotation setups may look slightly off.
- Very large packs (many hundreds of files) are decompressed concurrently
  on import, so even sizeable NPC/skin megapacks load in about a second.
