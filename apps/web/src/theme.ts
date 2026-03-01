import { createTheme, MantineColorsTuple, DEFAULT_THEME, mergeMantineTheme } from '@mantine/core';

// Electric Indigo — primary brand color
const indigo: MantineColorsTuple = [
  '#f3f1ff',
  '#e4e0ff',
  '#c9bfff',
  '#ab9aff',
  '#9180ff',
  '#7b6cf0',
  '#6C5CE7', // index 6 = primary shade
  '#5a4bd4',
  '#4a3db8',
  '#3a2f9c',
];

// Hot Coral — secondary / streaks / urgency
const coral: MantineColorsTuple = [
  '#fff1f1',
  '#ffe0e0',
  '#ffc4c4',
  '#ffa3a3',
  '#ff8585',
  '#ff7676',
  '#FF6B6B', // index 6
  '#e85d5d',
  '#cc4f4f',
  '#b04242',
];

// Sunshine Yellow — achievements / gold / stars
const sunshine: MantineColorsTuple = [
  '#fffbeb',
  '#fff4cc',
  '#ffec99',
  '#ffe066',
  '#fed840',
  '#fecf4a',
  '#FECA57', // index 6
  '#e5b34e',
  '#cc9e45',
  '#b2893c',
];

// Mint — success / completed states
const mint: MantineColorsTuple = [
  '#e6fffe',
  '#ccfffe',
  '#99fffd',
  '#66f8f0',
  '#33ede5',
  '#1ae0d8',
  '#00D2D3', // index 6
  '#00b8b9',
  '#009e9f',
  '#008485',
];

// Vivid Orange — points / flames / energy
const energy: MantineColorsTuple = [
  '#fff6ed',
  '#ffecda',
  '#ffd9b5',
  '#ffc38a',
  '#ffb066',
  '#ffa757',
  '#FF9F43', // index 6
  '#e58c3b',
  '#cc7b33',
  '#b26a2b',
];

export const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({
    primaryColor: 'indigo',
    colors: {
      indigo,
      coral,
      sunshine,
      mint,
      energy,
    },
    fontFamily: "'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif",
    headings: {
      fontFamily: "'Plus Jakarta Sans Variable', system-ui, -apple-system, sans-serif",
    },
    defaultRadius: 'lg',
    components: {
      Button: {
        defaultProps: {
          radius: 'xl',
        },
      },
      Paper: {
        defaultProps: {
          radius: 'lg',
          shadow: 'xs',
        },
      },
      Card: {
        defaultProps: {
          radius: 'lg',
          shadow: 'xs',
        },
      },
    },
  }),
);
