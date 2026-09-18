import {
  createLightTheme,
  BrandVariants,
  Theme,
} from '@fluentui/react-components';

// 16-shade ramp generated around #6BB338 primary
export const tikiedBrand: BrandVariants = {
  10: '#071503',
  20: '#102808',
  30: '#193A0D',
  40: '#234C13',
  50: '#2D5E19',
  60: '#387120',
  70: '#438327',
  80: '#4F962F',
  90: '#5BAA38',
  100: '#6BB338', // Brand primary
  110: '#7EC348',
  120: '#92D359',
  130: '#A7E36C',
  140: '#BCF181',
  150: '#D1FD97',
  160: '#E4FEB5',
};

// Base light theme with earthy/canvas neutrals applied
export const tikiedTheme: Theme = {
  ...createLightTheme(tikiedBrand),
  colorNeutralBackground1: '#F8F6EC', // Warm cream canvas background
  colorNeutralBackground2: '#EFEBDC', // Slightly darker container fill
  colorNeutralBackground3: '#E3DCBE', // Inset surface fill
  colorNeutralForeground1: '#242220', // Main body text
  colorNeutralForeground2: '#523C2A', // Subdued labels / secondary text
  colorNeutralStroke1: '#D2C8A8',     // Card & panel borders
  colorNeutralStroke2: '#BEB28E',     // Stronger dividers
  colorCompoundBrandStroke: '#F08C18', // Builder accent for highlights/focus rings
};
