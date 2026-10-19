export type PresetKey = 'none' | 'smoke' | 'whale' | 'maid' | 'chibi' | 'earth' | 'pan';

export interface HeroRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Layer {
  canvas: HTMLCanvasElement;
  resize(grid: any, cssWidth: number, cssHeight: number): boolean;
  setInk(rgb: number[], alpha: number): void;
  setGlow(rgb: number[]): void;
  setBackgroundVisible(visible: boolean): void;
  setHero(active: boolean, rect: HeroRect | null, dpr: number, preset?: string): void;
  reloadHeroMask(): void;
  draw(state: any): void;
  destroy(): void;
}

export interface SlotRegistry {
  inject(name: string, factory: () => unknown): void;
  register(spec: { name: string; id: string; order?: number }, component: any): unknown;
}

export interface DshContext {
  slots: SlotRegistry;
  effect?: (callback: () => void | (() => void), label?: string) => void;
}
