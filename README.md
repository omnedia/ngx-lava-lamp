# ngx-lava-lamp

<a href="https://ngxui.com" target="_blank" style="display: flex;gap: .5rem;align-items: center;cursor: pointer; padding: 0 0 0 0; height: fit-content;">
  <img src="https://ngxui.com/assets/img/ngxui-logo.png" style="width: 64px;height: 64px;">
</a>

This library is part of the NGXUI ecosystem.
View all available components at [https://ngxui.com](https://ngxui.com)

`@omnedia/ngx-lava-lamp` is an Angular component for rendering highly-performant, customizable metaball ("lava lamp") visuals using WebGL. It’s ideal for hero backgrounds, section dividers, and eye-catching UI elements. Uses [OGL](https://github.com/oframe/ogl) under the hood for smooth and efficient rendering.

## Features

* Fully hardware-accelerated metaball animation (WebGL via OGL)
* Highly configurable: color, speed, ball count, ball size, clump factor, etc.
* Transparent by default: blends seamlessly into any background
* Responsive, auto-resizes with container
* Pauses animation when scrolled out of view (performance optimized)
* Pure Angular v20+, standalone, no NgZone needed
* No external CSS required; all styles scoped

## Installation

Install the library:

```
npm install @omnedia/ngx-lava-lamp
```

## Usage

Import the `NgxLavaLampComponent` in your Angular module or component:

```typescript
import { NgxLavaLampComponent } from '@omnedia/ngx-lava-lamp';

@Component({
  ...
  imports: [
    ...
    NgxLavaLampComponent,
  ],
  ...
})
```

Use the component in your template:

```html
<div class="lava-demo">
  <om-lava-lamp
    [color]="'#1976d2'"
    [cursorBallColor]="'#ffb400'"
    [speed]="0.25"
    [ballCount]="10"
    [animationSize]="25"
    [clumpFactor]="1.2"
    [cursorBallSize]="3"
    [enableMouseInteraction]="true"
    [hoverSmoothness]="0.07"
    styleClass="custom-lava"
  ></om-lava-lamp>
</div>
```

## API

```html
<om-lava-lamp
  [color]="color"                 // main metaball color (hex)
  [cursorBallColor]="cursorBallColor"   // hover/cursor metaball color (hex)
  [speed]="speed"                 // animation speed (default 0.2)
  [ballCount]="ballCount"         // number of metaballs (default 15)
  [animationSize]="animationSize" // scale of animation (default 30)
  [clumpFactor]="clumpFactor"     // controls how tight/loose the blobs are
  [cursorBallSize]="cursorBallSize" // size of the cursor/hover ball
  [enableMouseInteraction]="enableMouseInteraction" // (default false)
  [hoverSmoothness]="hoverSmoothness" // cursor smooth-follow (default 0.05)
  [styleClass]="your-custom-class" // optional: add extra class
></om-lava-lamp>
```

* `color`: (string, required) Hex color for the metaballs, e.g. `#ff00aa`
* `cursorBallColor`: (string, optional) Hex color for the ball that follows mouse/touch
* `speed`: (number, optional) Animation speed, default `0.2`
* `ballCount`: (number, optional) Number of metaballs, default `15`
* `animationSize`: (number, optional) Animation scaling, default `30`
* `clumpFactor`: (number, optional) Controls how tightly the blobs cluster, default `1`
* `cursorBallSize`: (number, optional) Cursor ball size, default `3`
* `enableMouseInteraction`: (boolean, optional) Enable mouse following blob, default `false`
* `hoverSmoothness`: (number, optional) Smoothness of cursor interpolation, default `0.05`
* `styleClass`: (string, optional) Custom CSS class for container styling

## Styling

Component is fully transparent by default, and will blend into any parent. You can size the container directly:

```css
.lava-demo {
  width: 600px;
  height: 320px;
  border-radius: 2rem;
  overflow: hidden;
  position: relative;
}

.custom-lava {
  /* extra styles if needed */
}
```

## Notes

* Hardware-accelerated: requires WebGL2 support (almost universal).
* No CSS required, all animation is via WebGL.
* Pauses automatically when off-screen for max efficiency.
* Zero Angular zone usage (zoneless).
* Works with Angular SSR; rendering is browser-only and guarded.

## Contributing

Contributions are welcome! Open an issue or PR to discuss new features or bugfixes.

## License

MIT
