import {Injectable, Renderer2, RendererFactory2, inject} from '@angular/core';
import {DOCUMENT} from '@angular/common';

export type ThemeMode = 'light' | 'dark';

function hexToHsl(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Derives an 8-stop brand palette from a single base hex (500). */
export function deriveBrandScale(base500: string): Record<string, string> {
  const [h, s, l] = hexToHsl(base500);
  const stops: [string, number][] = [
    ['50', Math.min(97, l + 50)],
    ['100', Math.min(95, l + 26)],
    ['200', Math.min(92, l + 18)],
    ['300', Math.min(88, l + 10)],
    ['400', Math.min(84, l + 4)],
    ['500', l],
    ['600', Math.max(8, l - 8)],
    ['700', Math.max(5, l - 16)],
    ['800', Math.max(3, l - 24)],
  ];
  return Object.fromEntries(stops.map(([stop, lx]) => [`--brand-${stop}`, hslToHex(h, s, lx)]));
}

@Injectable({providedIn: 'root'})
export class ThemeService {
  private readonly renderer: Renderer2;
  private readonly document = inject(DOCUMENT);
  private readonly root: HTMLElement;

  private _mode: ThemeMode = 'light';
  private _brand500 = '#E8632A';

  get mode(): ThemeMode {
    return this._mode;
  }

  get brand500(): string {
    return this._brand500;
  }

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.root = this.document.documentElement;
    this._restoreFromStorage();
  }

  // ── Mode ────────────────────────────────────────────────────
  setMode(mode: ThemeMode): void {
    this._mode = mode;
    if (mode === 'dark') {
      this.renderer.setAttribute(this.root, 'data-theme', 'dark');
    } else {
      this.renderer.removeAttribute(this.root, 'data-theme');
    }
    this._persist('app-theme-mode', mode);
  }

  toggleMode(): void {
    this.setMode(this._mode === 'light' ? 'dark' : 'light');
  }

  savePreLogoutMode(): void {
    this._persist('app-theme-mode-saved', this._mode);
  }

  restorePreLogoutMode(): void {
    try {
      const savedMode = localStorage.getItem('app-theme-mode-saved') as ThemeMode | null;
      if (savedMode) {
        this.setMode(savedMode);
        localStorage.removeItem('app-theme-mode-saved');
      }
    } catch {
      /* ignore */
    }
  }

  savePreLogoutBrand(): void {
    this._persist('app-brand-500-saved', this._brand500);
  }

  restorePreLogoutBrand(): void {
    try {
      const savedBrand = localStorage.getItem('app-brand-500-saved');
      if (savedBrand) {
        this.setBrandColor(savedBrand);
        localStorage.removeItem('app-brand-500-saved');
      }
    } catch {
      /* ignore */
    }
  }

  applyModeVisualOnly(mode: ThemeMode): void {
    if (mode === 'dark') {
      this.renderer.setAttribute(this.root, 'data-theme', 'dark');
    } else {
      this.renderer.removeAttribute(this.root, 'data-theme');
    }
  }

  restoreSavedMode(): void {
    this.applyModeVisualOnly(this._mode);
  }

  setBrandColor(hex500: string): void {
    this._brand500 = hex500;
    const scale = deriveBrandScale(hex500);
    for (const [prop, value] of Object.entries(scale)) {
      this.root.style.setProperty(prop, value);
    }
    this._persist('app-brand-500', hex500);
  }

  setToken(property: string, value: string): void {
    this.root.style.setProperty(property, value);
  }

  resetBrand(): void {
    this.setBrandColor('#E8632A');
  }

  private _persist(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }

  private _restoreFromStorage(): void {
    try {
      const mode = localStorage.getItem('app-theme-mode') as ThemeMode | null;
      const brand = localStorage.getItem('app-brand-500');
      if (mode) {
        this.setMode(mode);
      }
      if (brand) {
        this.setBrandColor(brand);
      }
    } catch {
      /* ignore */
    }
  }
}
