import type { Preview } from '@storybook/react';
import React from 'react';
import { GlobalStoreProvider } from '../src/lib/store/GlobalStoreProvider';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) =>
      React.createElement(
        GlobalStoreProvider,
        null,
        React.createElement(Story)
      ),
  ],
};

export default preview;