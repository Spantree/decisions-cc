import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'decisions-cc',
  tagline: 'Pugh decision matrix React component for weighted multi-criteria evaluation',
  favicon: 'img/favicon.ico',

  url: 'https://decisions.cc',
  baseUrl: '/',

  organizationName: 'Spantree',
  projectName: 'decisions-cc',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: './sidebars.ts',
          exclude: ['**/index.md'],
          editUrl:
            'https://github.com/Spantree/decisions-cc/edit/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'decisions-cc',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://storybook.decisions.cc/',
          label: 'Storybook',
          position: 'left',
        },
        {
          href: 'https://github.com/Spantree/decisions-cc',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/',
            },
            {
              label: 'ADRs',
              to: '/docs/adr/',
            },
          ],
        },
        {
          title: 'Tools',
          items: [
            {
              label: 'Storybook',
              href: 'https://storybook.decisions.cc/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/Spantree/decisions-cc',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Spantree. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
