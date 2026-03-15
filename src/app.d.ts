import {
  KVNamespace,
  DurableObjectNamespace,
  Hyperdrive,
  ExecutionContext,
  CacheStorage,
  IncomingRequestCfProperties,
  CfProperties,
} from '@cloudflare/workers-types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {
    // 	env: {
    // 		// YOUR_KV_NAMESPACE: KVNamespace;
    // 		// YOUR_DURABLE_OBJECT_NAMESPACE: DurableObjectNamespace;
    //     HYPERDRIVE: Hyperdrive;
    // 	};
    // }
    interface Platform {
      env: {
        HYPERDRIVE: Hyperdrive;
      };
      cf: CfProperties;
      ctx: ExecutionContext;
    }

    interface Platform {
      env: {
        HYPERDRIVE: Hyperdrive;
      };
      ctx: ExecutionContext;
      caches: CacheStorage;
      cf?: IncomingRequestCfProperties;
    }
  }
}

export {};
