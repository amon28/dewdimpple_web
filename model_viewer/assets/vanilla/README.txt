This folder ships a small offline index of vanilla Minecraft: Bedrock Edition
assets, used only to tell "this texture/model isn't in the imported pack, but
it's a real vanilla asset the pack is meant to fall back to" apart from
"this texture/model isn't in the pack and isn't vanilla either" (a likely
mistake worth flagging).

vanilla_textures.json
  A JSON array of every texture path in Mojang's bedrock-samples resource
  pack, relative to the resource pack root and without a file extension
  (e.g. "textures/entity/wolf/wolf") — the same format Bedrock entity files
  use to reference textures.

vanilla_geometry.json
  A JSON array of every geometry identifier defined in that same pack's
  models/entity/*.geo.json files (e.g. "geometry.wolf"), covering the
  modern "minecraft:geometry" array format, the legacy top-level-key
  format, and the legacy "geometry.child:geometry.parent" inheritance
  syntax (both the child and parent identifiers are included).

vanilla_render_controllers.json
  A JSON array of every render controller id defined in that pack's
  render_controllers/*.json files (e.g. "controller.render.zombie"),
  covering both the modern "minecraft:render_controllers" key and the
  legacy bare "render_controllers" key.

All three files were generated offline from a local checkout of
github.com/Mojang/bedrock-samples (resource_pack/) and are static data —
nothing in this app fetches or depends on that repository at runtime. They
reflect a single game version and format snapshot, so they won't be
exhaustive for every future vanilla asset; the viewer treats an unresolved
reference that ISN'T in these lists as a warning rather than a hard error,
for exactly that reason.

To refresh these lists against a newer bedrock-samples checkout: walk
resource_pack/textures for texture paths (strip the extension); walk
resource_pack/models/entity/*.geo.json for geometry identifiers (splitting
any "child:parent" key on the colon and keeping both halves); and walk
resource_pack/render_controllers/*.json for controller ids under either
key name above. Overwrite these three files with the results as plain
JSON arrays.
