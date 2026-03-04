<script lang="ts">
  import Filter from '@lucide/svelte/icons/filter';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import X from '@lucide/svelte/icons/x';
  import FolderPlus from '@lucide/svelte/icons/folder-plus';
  import type { Snippet } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import { cn } from '$lib/utils';
  import {
    useDataGrid,
    createFilterId,
    createRootFilterGroup,
    type FilterGroup,
    type FilterCondition,
    type FilterNode,
    type FilterOperator,
    type ColumnFilterMeta,
  } from './context.svelte';

  let {
    trigger,
  }: {
    trigger?: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();

  let open = $state(false);
  const grid = useDataGrid();

  let draft = $state<FilterGroup>(createRootFilterGroup());

  const filterableColumns = $derived(grid.getFilterableColumns());

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    if (isOpen) {
      draft = structuredClone($state.snapshot(grid.filterTree));
    }
  }

  const OPERATOR_LABELS: Record<FilterOperator, string> = {
    eq: 'equals',
    neq: 'not equals',
    gt: 'greater than',
    gte: 'greater or equal',
    lt: 'less than',
    lte: 'less or equal',
    contains: 'contains',
    not_contains: 'not contains',
    starts_with: 'starts with',
    ends_with: 'ends with',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
    is_present: 'is present',
    is_not_present: 'is not present',
  };

  const NO_VALUE_OPERATORS = new Set<FilterOperator>([
    'is_empty',
    'is_not_empty',
    'is_present',
    'is_not_present',
  ]);

  function getColumnLabel(columnId: string): string {
    return grid.column_labels?.get(columnId)?.label ?? columnId;
  }

  function getColumnMeta(columnId: string): ColumnFilterMeta | undefined {
    return filterableColumns.find((c) => c.id === columnId)?.meta;
  }

  function getOperatorsForColumn(columnId: string): FilterOperator[] {
    return getColumnMeta(columnId)?.operators ?? ['eq', 'neq'];
  }

  function defaultOperatorForColumn(columnId: string): FilterOperator {
    const ops = getOperatorsForColumn(columnId);
    return ops[0] ?? 'eq';
  }

  function insertNode(
    tree: FilterGroup,
    parentId: string,
    node: FilterNode
  ): FilterGroup {
    if (tree.id === parentId) {
      return { ...tree, children: [...tree.children, node] };
    }
    return {
      ...tree,
      children: tree.children.map((child) =>
        child.type === 'group' ? insertNode(child, parentId, node) : child
      ),
    };
  }

  function removeNodeById(tree: FilterGroup, nodeId: string): FilterGroup {
    return {
      ...tree,
      children: tree.children
        .filter((child) => child.id !== nodeId)
        .map((child) =>
          child.type === 'group' ? removeNodeById(child, nodeId) : child
        ),
    };
  }

  function updateNode(
    tree: FilterGroup,
    nodeId: string,
    updates: Partial<
      Pick<FilterCondition, 'columnId' | 'operator' | 'operand' | 'enabled'>
    >
  ): FilterGroup {
    return {
      ...tree,
      children: tree.children.map((child) => {
        if (child.id === nodeId && child.type === 'condition') {
          return { ...child, ...updates };
        }
        if (child.type === 'group') {
          return updateNode(child, nodeId, updates);
        }
        return child;
      }),
    };
  }

  function updateGroupLogic(
    tree: FilterGroup,
    groupId: string,
    logic: 'and' | 'or'
  ): FilterGroup {
    if (tree.id === groupId) {
      return { ...tree, logic };
    }
    return {
      ...tree,
      children: tree.children.map((child) =>
        child.type === 'group' ? updateGroupLogic(child, groupId, logic) : child
      ),
    };
  }

  function addCondition(parentId: string) {
    const defaultCol = filterableColumns[0];
    if (!defaultCol) return;
    const condition: FilterCondition = {
      type: 'condition',
      id: createFilterId(),
      columnId: defaultCol.id,
      operator: defaultOperatorForColumn(defaultCol.id),
      operand: '',
      enabled: true,
    };
    draft = insertNode(draft, parentId, condition);
  }

  function addGroup(parentId: string, logic: 'and' | 'or') {
    const group: FilterGroup = {
      type: 'group',
      id: createFilterId(),
      logic,
      children: [],
    };
    draft = insertNode(draft, parentId, group);
  }

  function removeNode(nodeId: string) {
    draft = removeNodeById(draft, nodeId);
  }

  function onConditionUpdate(
    nodeId: string,
    updates: Partial<
      Pick<FilterCondition, 'columnId' | 'operator' | 'operand' | 'enabled'>
    >
  ) {
    draft = updateNode(draft, nodeId, updates);
  }

  function onColumnChange(
    nodeId: string,
    newColumnId: string,
    currentOperator: FilterOperator
  ) {
    const newOps = getOperatorsForColumn(newColumnId);
    const operatorStillValid = newOps.includes(currentOperator);
    draft = updateNode(draft, nodeId, {
      columnId: newColumnId,
      operator: operatorStillValid ? currentOperator : (newOps[0] ?? 'eq'),
      operand: '',
    });
  }

  function toggleGroupLogic(groupId: string) {
    const findGroup = (node: FilterGroup): FilterGroup | null => {
      if (node.id === groupId) return node;
      for (const child of node.children) {
        if (child.type === 'group') {
          const found = findGroup(child);
          if (found) return found;
        }
      }
      return null;
    };
    const group = findGroup(draft);
    if (group) {
      draft = updateGroupLogic(
        draft,
        groupId,
        group.logic === 'and' ? 'or' : 'and'
      );
    }
  }

  function apply() {
    grid.filterTree = structuredClone($state.snapshot(draft));
    open = false;
  }

  function cancel() {
    open = false;
  }

  function clearAll() {
    draft = createRootFilterGroup();
  }

  const activeFilterCount = $derived.by(() => {
    function count(node: FilterGroup): number {
      let n = 0;
      for (const child of node.children) {
        if (child.type === 'condition' && child.enabled && child.operand) n++;
        else if (child.type === 'group') n += count(child);
      }
      return n;
    }
    return count(grid.filterTree);
  });
</script>

{#snippet conditionRow(condition: FilterCondition)}
  {@const operators = getOperatorsForColumn(condition.columnId)}
  {@const needsValue = !NO_VALUE_OPERATORS.has(condition.operator)}
  <div class="flex items-center gap-2">
    <Checkbox
      checked={condition.enabled}
      onCheckedChange={(v) => onConditionUpdate(condition.id, { enabled: !!v })}
      class="shrink-0"
    />

    <Select.Root
      type="single"
      value={condition.columnId}
      onValueChange={(v) => {
        if (v) onColumnChange(condition.id, v, condition.operator);
      }}
    >
      <Select.Trigger size="sm" class="h-8 min-w-32 text-xs">
        {getColumnLabel(condition.columnId)}
      </Select.Trigger>
      <Select.Content class="max-h-60">
        {#each filterableColumns as col (col.id)}
          <Select.Item value={col.id} label={getColumnLabel(col.id)} />
        {/each}
      </Select.Content>
    </Select.Root>

    <Select.Root
      type="single"
      value={condition.operator}
      onValueChange={(v) => {
        if (v)
          onConditionUpdate(condition.id, { operator: v as FilterOperator });
      }}
    >
      <Select.Trigger size="sm" class="h-8 min-w-32 text-xs">
        {OPERATOR_LABELS[condition.operator]}
      </Select.Trigger>
      <Select.Content class="max-h-60">
        {#each operators as op (op)}
          <Select.Item value={op} label={OPERATOR_LABELS[op]} />
        {/each}
      </Select.Content>
    </Select.Root>

    {#if needsValue}
      <Input
        type="text"
        value={condition.operand}
        oninput={(e) =>
          onConditionUpdate(condition.id, { operand: e.currentTarget.value })}
        placeholder="Value"
        class="h-8 min-w-32 text-xs"
      />
    {/if}

    <Button
      variant="ghost"
      size="icon"
      class="size-7 shrink-0 text-muted-foreground hover:text-destructive"
      onclick={() => removeNode(condition.id)}
    >
      <X class="size-3.5" />
    </Button>
  </div>
{/snippet}

{#snippet logicBadge(group: FilterGroup)}
  <button
    type="button"
    class="my-0.5 flex items-center gap-2 self-start"
    onclick={() => toggleGroupLogic(group.id)}
  >
    <span class="h-px w-4 bg-border"></span>
    <span
      class={cn(
        'rounded-md px-2 py-0.5 text-[0.675rem] font-semibold tracking-wide uppercase transition-colors select-none',
        group.logic === 'and'
          ? 'bg-blue-500/15 text-blue-400'
          : 'bg-amber-500/15 text-amber-400'
      )}
    >
      {group.logic}
    </span>
    <span class="h-px w-4 bg-border"></span>
  </button>
{/snippet}

{#snippet filterGroup(group: FilterGroup, depth: number)}
  <div
    class={cn(
      'flex flex-col gap-1',
      depth > 0 && 'rounded-lg border border-border/60 bg-muted/30 p-3'
    )}
  >
    {#if depth > 0}
      <div class="mb-1 flex items-center justify-between">
        <button
          type="button"
          class={cn(
            'rounded-md px-2 py-0.5 text-[0.675rem] font-semibold tracking-wide uppercase transition-colors select-none',
            group.logic === 'and'
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-amber-500/15 text-amber-400'
          )}
          onclick={() => toggleGroupLogic(group.id)}
        >
          {group.logic}
        </button>
        <Button
          variant="ghost"
          size="icon"
          class="size-6 text-muted-foreground hover:text-destructive"
          onclick={() => removeNode(group.id)}
        >
          <X class="size-3" />
        </Button>
      </div>
    {/if}

    {#each group.children as child, i (child.id)}
      {#if i > 0 && depth === 0}
        {@render logicBadge(group)}
      {:else if i > 0 && depth > 0}
        <div class="my-0.5 flex items-center gap-2 self-start pl-7">
          <span
            class="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
          >
            {group.logic}
          </span>
        </div>
      {/if}

      {#if child.type === 'condition'}
        {@render conditionRow(child)}
      {:else if child.type === 'group'}
        {@render filterGroup(child, depth + 1)}
      {/if}
    {/each}

    <div class="mt-1 flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        class="h-7 gap-1 px-2 text-xs text-muted-foreground"
        onclick={() => addCondition(group.id)}
      >
        <Plus class="size-3" />
        Add Filter
      </Button>
      {#if depth < 2}
        <Button
          variant="ghost"
          size="sm"
          class="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onclick={() =>
            addGroup(group.id, group.logic === 'and' ? 'or' : 'and')}
        >
          <FolderPlus class="size-3" />
          Add Group
        </Button>
      {/if}
    </div>
  </div>
{/snippet}

<Popover.Root {open} onOpenChange={handleOpenChange}>
  <Popover.Trigger>
    {#snippet child({ props })}
      {@render trigger?.({ props })}
    {/snippet}
  </Popover.Trigger>
  <Popover.Content
    class="w-auto max-w-3xl min-w-xl p-0"
    align="start"
    sideOffset={8}
  >
    <div class="flex flex-col">
      <div class="flex items-center gap-2 border-b border-border px-4 py-3">
        <Filter class="size-3.5 text-muted-foreground" />
        <h3 class="text-sm font-semibold">Filter Data</h3>
        {#if draft.children.length > 0}
          <Button
            variant="ghost"
            size="sm"
            class="ml-auto h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onclick={clearAll}
          >
            <Trash2 class="size-3" />
            Clear all
          </Button>
        {/if}
      </div>

      <div class="max-h-[50vh] overflow-y-auto px-4 py-3">
        {#if filterableColumns.length === 0}
          <p class="py-4 text-center text-sm text-muted-foreground">
            No filterable columns configured.
          </p>
        {:else if draft.children.length === 0}
          <div class="flex flex-col items-center gap-2 py-4">
            <p class="text-sm text-muted-foreground">No filters applied.</p>
            <Button
              variant="outline"
              size="sm"
              class="h-7 gap-1 text-xs"
              onclick={() => addCondition('root')}
            >
              <Plus class="size-3" />
              Add Filter
            </Button>
          </div>
        {:else}
          {@render filterGroup(draft, 0)}
        {/if}
      </div>

      <div
        class="flex items-center justify-end gap-2 border-t border-border px-4 py-3"
      >
        <Button
          variant="ghost"
          size="sm"
          class="h-8 px-3 text-xs"
          onclick={cancel}
        >
          Cancel
        </Button>
        <Button size="sm" class="h-8 px-4 text-xs" onclick={apply}>
          Apply
        </Button>
      </div>
    </div>
  </Popover.Content>
</Popover.Root>
