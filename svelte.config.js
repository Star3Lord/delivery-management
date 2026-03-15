// import adapter from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter({}),
    alias: {
      $backend: './src/backend',
    },
    experimental: {
      remoteFunctions: true,
    },
  },
  vitePlugin: {
    inspector: {
      toggleKeyCombo: 'alt-x',
      showToggleButton: 'active',
      toggleButtonPos: 'bottom-right',
    },
  },
};

export default config;
