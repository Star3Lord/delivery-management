<script lang="ts">
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import PackageIcon from '@lucide/svelte/icons/package';
  import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
  import { resolve } from '$app/paths';
  import { list_products } from '$lib/api/products.remote';
  import PageHeader from '$lib/components/page-header.svelte';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Spinner } from '$lib/components/ui/spinner/index.js';

  type Product = Awaited<ReturnType<typeof list_products>>['items'][number];
</script>

<div class="relative flex h-full min-h-0 flex-col">
  <PageHeader>
    {#snippet titleSection()}
      <div class="flex flex-1 items-center justify-between">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Page>Products</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>
      </div>
    {/snippet}
  </PageHeader>

  <div class="flex min-h-[calc(100%-var(--header-height))] flex-col p-6">
    {#snippet productItem({ product }: { product: Product })}
      <div
        class="relative flex w-full items-center gap-2 rounded-md p-2 transition-colors duration-150 ease-in-out hover:bg-muted/50"
      >
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"
        >
          <PackageIcon class="size-3.5 text-muted-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-medium text-foreground">{product.name}</h3>
        </div>
        <!-- <div class="absolute top-1/2 right-2 -translate-y-1/2 group-hover/product:flex hidden scale-0 group-hover/product:scale-100 -translate-x-1 group-hover/product:translate-x-0 transition-transform duration-500 ease-in-out">
                    <ArrowUpRightIcon class="size-4" />
                </div> -->
        <span
          class="absolute top-1/2 right-4 inline-flex size-4.5 -translate-y-1/2 items-center justify-center rounded-[inherit] opacity-0 backdrop-blur-md transition-opacity duration-150 group-hover/product:opacity-100"
        >
          <ArrowUpRightIcon
            class="size-6 -translate-x-0.5 translate-y-0.5 scale-75 text-foreground transition-all delay-100 duration-200 ease-out group-hover/product:translate-x-0 group-hover/product:translate-y-0 group-hover/product:scale-100"
          />
        </span>
      </div>
    {/snippet}

    <section>
      <h2 class="px-2 text-sm font-medium text-muted-foreground">
        All Products
      </h2>

      <ul class="mt-3 flex flex-col gap-0">
        <svelte:boundary>
          {#each (await list_products( { limit: undefined } )).items as product (product.id)}
            <li
              class="group/product w-full translate-x-0 opacity-100 transition-discrete delay-[calc(0.03s*(sibling-index()-1))] duration-150 ease-in-out starting:-translate-x-4 starting:opacity-0"
            >
              <a
                href={resolve(`/products/${product.id}`)}
                class="w-full no-underline"
              >
                {@render productItem({ product })}
              </a>
            </li>
          {/each}

          {#snippet pending()}
            <li>
              <div
                class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
              >
                <Spinner class="size-4 animate-spin text-muted-foreground/40" />
                <p class="text-sm text-muted-foreground">Loading products...</p>
              </div>
            </li>
          {/snippet}

          {#snippet failed(_, reset)}
            <li>
              <div
                class="flex w-full grow flex-col items-center justify-center gap-2 px-6 py-8"
              >
                <p class="text-sm text-muted-foreground">
                  Failed to load products
                </p>
                <Button variant="outline" size="sm" onclick={reset}>
                  <RefreshCcwIcon class="size-4" />
                  Retry
                </Button>
              </div>
            </li>
          {/snippet}
        </svelte:boundary>
      </ul>
    </section>
  </div>
</div>
