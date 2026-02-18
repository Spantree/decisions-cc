import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

const theme = create({
  base: 'light',

  // Brand
  brandTitle: 'Fluent Workshop — Decision Matrix',
  brandUrl: 'https://github.com/Spantree/decisions-cc',
  brandImage: '/logo.svg',
  brandTarget: '_blank',

  // Colors
  colorPrimary: '#2e8555',
  colorSecondary: '#2e8555',

  // UI
  appBg: '#f8f9fa',
  appContentBg: '#ffffff',
  appBorderColor: '#dee2e6',
  appBorderRadius: 6,

  // Text
  textColor: '#1c1e21',
  textInverseColor: '#ffffff',
  textMutedColor: '#6c757d',

  // Toolbar
  barTextColor: '#6c757d',
  barSelectedColor: '#2e8555',
  barHoverColor: '#29784c',
  barBg: '#ffffff',

  // Inputs
  inputBg: '#ffffff',
  inputBorder: '#dee2e6',
  inputTextColor: '#1c1e21',
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
});
