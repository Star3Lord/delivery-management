<script lang="ts">
  import { Label } from '$lib/components/ui/label/index.js';
  import type { Snippet } from 'svelte';

  let {
    label,
    issues = [],
    children,
    class: className = '',
  }: {
    label: string;
    issues?: { message: string }[];
    children: Snippet;
    class?: string;
  } = $props();
</script>

<div class="space-y-1.5 {className}">
  <Label class="text-xs font-medium text-muted-foreground">{label}</Label>
  {@render children()}
  <p class="text-xs text-destructive">{issues?.[0]?.message}</p>
</div>
