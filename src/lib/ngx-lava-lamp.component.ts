import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  signal,
  ViewChild
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';

import {Camera, Mesh, OGLRenderingContext, Program, Renderer, Transform, Triangle, Vec3} from 'ogl';

@Component({
  selector: 'om-lava-lamp',
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./ngx-lava-lamp.component.html",
  styleUrl: "./ngx-lava-lamp.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxLavaLampComponent implements AfterViewInit, OnDestroy {
  @ViewChild('OmLavaLamp') containerRef!: ElementRef<HTMLElement>;

  @Input('styleClass') styleClass?: string;

  @Input() set color(val: string) {
    this._color = val;
    this.resetScene();
  }

  @Input() set speed(val: number) {
    this._speed = val;
    this.resetScene();
  }

  @Input() set enableMouseInteraction(val: boolean) {
    this._enableMouseInteraction = val;
    this.resetScene();
  }

  @Input() set hoverSmoothness(val: number) {
    this._hoverSmoothness = val;
    this.resetScene();
  }

  @Input() set animationSize(val: number) {
    this._animationSize = val;
    this.resetScene();
  }

  @Input() set ballCount(val: number) {
    this._ballCount = val;
    this.resetScene();
  }

  @Input() set clumpFactor(val: number) {
    this._clumpFactor = val;
    this.resetScene();
  }

  @Input() set cursorBallSize(val: number) {
    this._cursorBallSize = val;
    this.resetScene();
  }

  @Input() set cursorBallColor(val: string) {
    this._cursorBallColor = val;
    this.resetScene();
  }

  private _color = '#ffffff';
  private _speed = 0.2;
  private _enableMouseInteraction = false;
  private _hoverSmoothness = 0.05;
  private _animationSize = 30;
  private _ballCount = 15;
  private _clumpFactor = 1;
  private _cursorBallSize = 3;
  private _cursorBallColor = '#ffffff';

  private initialized = false;
  private running = false;
  private animationFrameId: number | null = null;
  private intersectionObserver?: IntersectionObserver;
  isInView = signal(false);

  private renderer?: Renderer;
  private gl?: OGLRenderingContext;
  private program?: Program;
  private metaBallsUniform: Vec3[] = [];
  private mesh?: Mesh;
  private scene?: Transform;
  private camera?: Camera;
  private ballParams: any[] = [];
  private mouseBallPos = {x: 0, y: 0};
  private pointerInside = false;
  private pointerX = 0;
  private pointerY = 0;

  private resizeListener?: () => void;
  private pointerMoveListener?: (e: PointerEvent) => void;
  private pointerEnterListener?: () => void;
  private pointerLeaveListener?: () => void;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      const wasInView = this.isInView();
      this.isInView.set(entry.isIntersecting);
      if (!wasInView && this.isInView()) {
        this.running = true;
        this.initLavaLamp();
        this.animate();
      }
      if (wasInView && !this.isInView()) {
        this.running = false;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
      }
    });
    this.intersectionObserver.observe(this.containerRef.nativeElement);
  }

  ngOnDestroy() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    this.cleanupOGL();
  }

  private cleanupOGL() {
    try {
      if (this.gl?.canvas && this.containerRef.nativeElement.contains(this.gl.canvas)) {
        this.containerRef.nativeElement.removeChild(this.gl.canvas);
      }
      this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
    }

    if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
    if (this.pointerMoveListener) this.containerRef.nativeElement.removeEventListener('pointermove', this.pointerMoveListener);
    if (this.pointerEnterListener) this.containerRef.nativeElement.removeEventListener('pointerenter', this.pointerEnterListener);
    if (this.pointerLeaveListener) this.containerRef.nativeElement.removeEventListener('pointerleave', this.pointerLeaveListener);
    this.resizeListener = undefined;
    this.pointerMoveListener = undefined;
    this.pointerEnterListener = undefined;
    this.pointerLeaveListener = undefined;
    this.initialized = false;
  }

  // If any @Input changes, completely reset the OGL scene:
  private resetScene() {
    if (!this.initialized) return;
    this.running = false;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.cleanupOGL();
    this.initialized = false;
    if (this.isInView()) {
      this.running = true;
      this.initLavaLamp();
      this.animate();
    }
  }

  private parseHexColor(hex: string): [number, number, number] {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return [r, g, b];
  }

  private fract(x: number) {
    return x - Math.floor(x);
  }

  private hash31(p: number): number[] {
    let r = [p * 0.1031, p * 0.1030, p * 0.0973].map(this.fract);
    const r_yzx = [r[1], r[2], r[0]];
    const dotVal = r[0] * (r_yzx[0] + 33.33) +
      r[1] * (r_yzx[1] + 33.33) +
      r[2] * (r_yzx[2] + 33.33);
    for (let i = 0; i < 3; i++) {
      r[i] = this.fract(r[i] + dotVal);
    }
    return r;
  }

  private hash33(v: number[]): number[] {
    let p = [v[0] * 0.1031, v[1] * 0.1030, v[2] * 0.0973].map(this.fract);
    const p_yxz = [p[1], p[0], p[2]];
    const dotVal = p[0] * (p_yxz[0] + 33.33) +
      p[1] * (p_yxz[1] + 33.33) +
      p[2] * (p_yxz[2] + 33.33);
    for (let i = 0; i < 3; i++) {
      p[i] = this.fract(p[i] + dotVal);
    }
    const p_xxy = [p[0], p[0], p[1]];
    const p_yxx = [p[1], p[0], p[0]];
    const p_zyx = [p[2], p[1], p[0]];
    const result = [];
    for (let i = 0; i < 3; i++) {
      result[i] = this.fract((p_xxy[i] + p_yxx[i]) * p_zyx[i]);
    }
    return result;
  }

  private initLavaLamp() {
    this.cleanupOGL(); // Just in case
    this.initialized = false;

    const container = this.containerRef.nativeElement;
    if (!container) return;

    const dpr = 1;
    this.renderer = new Renderer({dpr, alpha: true, premultipliedAlpha: false});
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    container.appendChild(this.gl.canvas);

    this.camera = new Camera(this.gl, {
      left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 10,
    });
    this.camera.position.z = 1;

    const geometry = new Triangle(this.gl);
    const [r1, g1, b1] = this.parseHexColor(this._color);
    const [r2, g2, b2] = this.parseHexColor(this._cursorBallColor);

    this.metaBallsUniform = [];
    for (let i = 0; i < 50; i++) this.metaBallsUniform.push(new Vec3(0, 0, 0));

    const vertex = `#version 300 es
    precision highp float;
    layout(location = 0) in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }`;

    const fragment = `#version 300 es
    precision highp float;
    uniform vec3 iResolution;
    uniform float iTime;
    uniform vec3 iMouse;
    uniform vec3 iColor;
    uniform vec3 iCursorColor;
    uniform float iAnimationSize;
    uniform int iBallCount;
    uniform float iCursorBallSize;
    uniform vec3 iMetaBalls[50];
    uniform float iClumpFactor;
    uniform bool enableTransparency;
    out vec4 outColor;
    const float PI = 3.14159265359;
    float getMetaBallValue(vec2 c, float r, vec2 p) {
      vec2 d = p - c;
      float dist2 = dot(d, d);
      return (r * r) / dist2;
    }
    void main() {
      vec2 fc = gl_FragCoord.xy;
      float scale = iAnimationSize / iResolution.y;
      vec2 coord = (fc - iResolution.xy * 0.5) * scale;
      vec2 mouseW = (iMouse.xy - iResolution.xy * 0.5) * scale;
      float m1 = 0.0;
      for (int i = 0; i < 50; i++) {
        if (i >= iBallCount) break;
        m1 += getMetaBallValue(iMetaBalls[i].xy, iMetaBalls[i].z, coord);
      }
      float m2 = getMetaBallValue(mouseW, iCursorBallSize, coord);
      float total = m1 + m2;
      float f = smoothstep(-1.0, 1.0, (total - 1.3) / min(1.0, fwidth(total)));
      vec3 cFinal = vec3(0.0);
      if (total > 0.0) {
        float alpha1 = m1 / total;
        float alpha2 = m2 / total;
        cFinal = iColor * alpha1 + iCursorColor * alpha2;
      }
      outColor = vec4(cFinal * f, enableTransparency ? f : 1.0);
    }`;

    this.program = new Program(this.gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: {value: 0},
        iResolution: {value: new Vec3(0, 0, 0)},
        iMouse: {value: new Vec3(0, 0, 0)},
        iColor: {value: new Vec3(r1, g1, b1)},
        iCursorColor: {value: new Vec3(r2, g2, b2)},
        iAnimationSize: {value: this._animationSize},
        iBallCount: {value: this._ballCount},
        iCursorBallSize: {value: this._cursorBallSize},
        iMetaBalls: {value: this.metaBallsUniform},
        iClumpFactor: {value: this._clumpFactor},
        enableTransparency: {value: true},
      },
    });

    this.mesh = new Mesh(this.gl, {geometry, program: this.program});
    this.scene = new Transform();
    this.mesh.setParent(this.scene);

    // Ball params
    const maxBalls = 50;
    const effectiveBallCount = Math.min(this._ballCount, maxBalls);
    this.ballParams = [];
    for (let i = 0; i < effectiveBallCount; i++) {
      const idx = i + 1;
      const h1 = this.hash31(idx);
      const st = h1[0] * (2 * Math.PI);
      const dtFactor = 0.1 * Math.PI + h1[1] * (0.4 * Math.PI - 0.1 * Math.PI);
      const baseScale = 5.0 + h1[1] * (10.0 - 5.0);
      const h2 = this.hash33(h1);
      const toggle = Math.floor(h2[0] * 2.0);
      const radiusVal = 0.5 + h2[2] * (2.0 - 0.5);
      this.ballParams.push({st, dtFactor, baseScale, toggle, radius: radiusVal});
    }

    this.mouseBallPos = {x: 0, y: 0};
    this.pointerInside = false;
    this.pointerX = 0;
    this.pointerY = 0;

    // ---- Event listeners
    this.resizeListener = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.renderer?.setSize(width * dpr, height * dpr);
      if (this.gl) {
        this.gl.canvas.style.width = width + 'px';
        this.gl.canvas.style.height = height + 'px';
        this.program?.uniforms['iResolution'].value.set(this.gl.canvas.width, this.gl.canvas.height, 0);
      }
    };
    window.addEventListener('resize', this.resizeListener);
    this.resizeListener();

    this.pointerMoveListener = (e: PointerEvent) => {
      if (!this._enableMouseInteraction) return;
      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      this.pointerX = (px / rect.width) * (this.gl?.canvas.width || 1);
      this.pointerY = (1 - py / rect.height) * (this.gl?.canvas.height || 1);
    };
    this.pointerEnterListener = () => {
      if (!this._enableMouseInteraction) return;
      this.pointerInside = true;
    };
    this.pointerLeaveListener = () => {
      if (!this._enableMouseInteraction) return;
      this.pointerInside = false;
    };
    container.addEventListener('pointermove', this.pointerMoveListener);
    container.addEventListener('pointerenter', this.pointerEnterListener);
    container.addEventListener('pointerleave', this.pointerLeaveListener);

    this.initialized = true;
  }

  private animate = () => {
    if (!this.running) return;
    const startTime = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.animationFrameId = requestAnimationFrame(loop);
      const elapsed = (t - startTime) * 0.001;
      this.program!.uniforms['iTime'].value = elapsed;

      const effectiveBallCount = Math.min(this._ballCount, 50);
      for (let i = 0; i < effectiveBallCount; i++) {
        const p = this.ballParams[i];
        const dt = elapsed * this._speed * p.dtFactor;
        const th = p.st + dt;
        const x = Math.cos(th);
        const y = Math.sin(th + dt * p.toggle);
        const posX = x * p.baseScale * this._clumpFactor;
        const posY = y * p.baseScale * this._clumpFactor;
        this.metaBallsUniform[i].set(posX, posY, p.radius);
      }

      let targetX: number, targetY: number;
      if (this.pointerInside) {
        targetX = this.pointerX;
        targetY = this.pointerY;
      } else {
        const cx = this.gl!.canvas.width * 0.5;
        const cy = this.gl!.canvas.height * 0.5;
        const rx = this.gl!.canvas.width * 0.15;
        const ry = this.gl!.canvas.height * 0.15;
        targetX = cx + Math.cos(elapsed * this._speed) * rx;
        targetY = cy + Math.sin(elapsed * this._speed) * ry;
      }
      this.mouseBallPos.x += (targetX - this.mouseBallPos.x) * this._hoverSmoothness;
      this.mouseBallPos.y += (targetY - this.mouseBallPos.y) * this._hoverSmoothness;
      this.program!.uniforms['iMouse'].value.set(this.mouseBallPos.x, this.mouseBallPos.y, 0);

      this.renderer!.render({scene: this.scene!, camera: this.camera!});
    };
    this.animationFrameId = requestAnimationFrame(loop);
  };
}
