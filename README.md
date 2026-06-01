# Interactive Practice Wheel 3D Model

This repository contains a dependency-free WebGL 2 viewer and procedural 3D
reconstruction of the supplied mechanical drawing. The model focuses on the
visible circular wheel: 18 repeated raised ribs, a rolled outer rim, recessed
pockets, raised hub, bore, chamfers, and metallic inspection materials.

## Run locally

Open `index.html` directly in a modern browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls

- Drag: rotate the model.
- Shift-drag or right-drag: pan/move the model.
- Mouse wheel: zoom.
- Double-click or **Reset view**: restore the default camera.
- **Labels**: toggle feature callouts.
- **Wireframe**: overlay mesh edges for close inspection.
- **Download OBJ**: export the generated mesh for import into another platform.

## Model notes

The drawing screenshot has limited resolution, so the procedural model uses the
visible dimensions and repeated feature counts as constraints:

- Outer diameter: 6.60 in.
- 18 repeated ribs at 20 degree pitch.
- 5 degree rib sweep represented as subtle twist.
- Raised hub, bore, beveled rim, and recessed pockets modeled from the visible
  section/profile cues.

See `assets/model-spec.json` for the structured parameter summary.
