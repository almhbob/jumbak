import { Dimensions, PixelRatio } from 'react-native';

const { width: W } = Dimensions.get('window');
const BASE = 390; // iPhone 14 Pro baseline

/** Scale a size proportionally to the screen width */
export const sw = (n: number) =>
  Math.round(PixelRatio.roundToNearestPixel((W / BASE) * n));

/** Clamp a scaled value between min and max */
export const swc = (n: number, min: number, max: number) =>
  Math.min(Math.max(sw(n), min), max);

export const SCREEN_WIDTH = W;
export const isSmall = W < 375;   // e.g. iPhone SE
export const isTiny  = W < 340;   // very small phones
export const isTablet = W >= 768; // iPad and up
