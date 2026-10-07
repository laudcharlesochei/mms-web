import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';

/** University blue brand ramp (Fluent UI expects 16 shades, 10 = darkest, 160 = lightest). */
export const mmsBrand: BrandVariants = {
  10: '#03081c',
  20: '#0b1435',
  30: '#111e52',
  40: '#162a6c',
  50: '#1c3586',
  60: '#2541a0',
  70: '#2f4db7',
  80: '#3a5acc',
  90: '#4c69d6',
  100: '#5f7adc',
  110: '#738ae1',
  120: '#879be6',
  130: '#9cacea',
  140: '#b0bdef',
  150: '#c5cff4',
  160: '#dae0f8',
};

export const lightTheme: Theme = createLightTheme(mmsBrand);
export const darkTheme: Theme = { ...createDarkTheme(mmsBrand), colorBrandForeground1: mmsBrand[110], colorBrandForeground2: mmsBrand[120] };
