import type { Preview } from '@storybook/react-vite'
import { create } from 'storybook/theming/create';

const docsTheme = create({
  base: 'light',
  colorPrimary: '#2e8555',
  colorSecondary: '#2e8555',
  textColor: '#1c1e21',
  appBg: '#f8f9fa',
  appContentBg: '#ffffff',
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    docs: {
      theme: docsTheme,
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;