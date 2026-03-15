<script lang="ts">
  import type { Snippet } from 'svelte';

  type Props = {
    message?: string | Snippet;
  };

  const { message = 'Loading ...' }: Props = $props();
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-5">
  <div class="flex h-14 items-end justify-center gap-1" aria-hidden="true">
    {#each { length: 7 } as _, i (i)}
      <div
        class="bar w-2 rounded-sm bg-muted-foreground/20"
        style:--index={i}
      ></div>
    {/each}
  </div>

  {#if message}
    {#if typeof message === 'string'}
      <span class="message text-sm font-medium text-muted-foreground">
        {message}
      </span>
    {:else}
      {@render message?.()}
    {/if}
  {/if}
</div>

<style>
  .bar {
    animation: wave 1.6s cubic-bezier(0.4, 0, 0.2, 1) calc(var(--index) * 90ms)
      infinite;
  }

  @keyframes wave {
    0%,
    100% {
      height: 14%;
      background: color-mix(in oklch, var(--muted-foreground) 12%, transparent);
    }
    45% {
      height: calc(30% + var(--index) * 10%);
      background: color-mix(in oklch, var(--muted-foreground) 28%, transparent);
    }
  }

  .message {
    animation: breathe 2.8s ease-in-out infinite;
  }

  @keyframes breathe {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 0.75;
    }
  }
</style>
