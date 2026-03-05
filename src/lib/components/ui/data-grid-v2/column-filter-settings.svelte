<script lang="ts">
  import Filter from '@lucide/svelte/icons/filter';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import FolderPlus from '@lucide/svelte/icons/folder-plus';
  import ListFilter from '@lucide/svelte/icons/list-filter';
  import LinkIcon from '@lucide/svelte/icons/link';
  import Repeat from '@lucide/svelte/icons/repeat';
  import Check from '@lucide/svelte/icons/check';
  import type { Snippet } from 'svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Popover from '$lib/components/ui/popover/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as BtnGroup from '$lib/components/ui/button-group/index.js';
  import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
  import { cn } from '$lib/utils';
  import {
    useDataGrid,
    createFilterId,
    createRootFilterGroup,
    OPERATOR_LABELS,
    RELATION_OPERATOR_LABELS,
    NO_VALUE_OPERATORS,
    type FilterGroup,
    type FilterCondition,
    type FilterNode,
    type FilterOperator,
    type FilterSchemaField,
  } from './context.svelte';
  import FilterValueInput from './filter-value-input.svelte';

  const CUSTOM_PREFIX = '__custom__:';

  let {
    trigger,
  }: {
    trigger?: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();

  let open = $state(false);
  const grid = useDataGrid();

  let draft = $state<FilterGroup>(createRootFilterGroup());

  const filterSchema = $derived(grid.getFilterableFields());

  type FieldGroup = {
    key: string;
    label: string;
    fields: FilterSchemaField[];
    hasCustomJson: boolean;
  };

  const groupedFields = $derived.by(() => {
    const ungrouped: FilterSchemaField[] = [];
    const groupMap = new Map<string, FieldGroup>();

    for (const field of filterSchema) {
      if (field.group) {
        let g = groupMap.get(field.group);
        if (!g) {
          g = {
            key: field.group,
            label: field.groupLabel ?? field.group,
            fields: [],
            hasCustomJson: false,
          };
          groupMap.set(field.group, g);
        }
        g.fields.push(field);
        if (field.jsonCustomSubField) g.hasCustomJson = true;
      } else {
        ungrouped.push(field);
      }
    }

    return { ungrouped, groups: [...groupMap.values()] };
  });

  const fieldByKey = $derived(new Map(filterSchema.map((f) => [f.key, f])));

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    if (isOpen) {
      draft = structuredClone($state.snapshot(grid.filterTree));
    }
  }

  type FieldLabel = { parts: string[] };

  function getFieldDisplayLabel(fieldKey: string): FieldLabel {
    const field = fieldByKey.get(fieldKey);
    if (!field) return { parts: [fieldKey] };
    if (field.group && field.groupLabel) {
      if (field.type === 'relation') {
        return { parts: [field.groupLabel] };
      }
      return { parts: [field.groupLabel, field.label] };
    }
    return { parts: [field.label] };
  }

  function getField(fieldKey: string): FilterSchemaField | undefined {
    return fieldByKey.get(fieldKey);
  }

  function getEffectiveField(
    condition: FilterCondition
  ): FilterSchemaField | undefined {
    if (!condition.fieldKey) return undefined;
    const field = fieldByKey.get(condition.fieldKey);
    if (!field) return undefined;
    if (
      condition.customJsonKey &&
      condition.customJsonKey !== '' &&
      condition.customJsonKey !== CUSTOM_PREFIX &&
      field.jsonCustomSubField
    ) {
      return {
        ...field,
        type: field.jsonCustomSubField.type,
        operators: field.jsonCustomSubField.operators,
      };
    }
    return field;
  }

  function getOperatorLabel(
    field: FilterSchemaField | undefined,
    op: FilterOperator
  ): string {
    if (field?.type === 'relation') {
      return RELATION_OPERATOR_LABELS[op] ?? OPERATOR_LABELS[op];
    }
    return OPERATOR_LABELS[op];
  }

  function getSelectDisplayLabel(
    condition: FilterCondition
  ): FieldLabel | null {
    if (!condition.fieldKey) return null;
    if (
      condition.customJsonKey &&
      condition.customJsonKey !== '' &&
      condition.customJsonKey !== CUSTOM_PREFIX
    ) {
      const field = fieldByKey.get(condition.fieldKey);
      const groupLabel = field?.groupLabel ?? field?.group ?? '';
      return { parts: [groupLabel, condition.customJsonKey] };
    }
    if (condition.customJsonKey === CUSTOM_PREFIX) {
      const field = fieldByKey.get(condition.fieldKey);
      return { parts: [field?.groupLabel ?? field?.group ?? '', '...'] };
    }
    return getFieldDisplayLabel(condition.fieldKey);
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
      Pick<
        FilterCondition,
        'fieldKey' | 'customJsonKey' | 'operator' | 'operand' | 'enabled'
      >
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
    if (filterSchema.length === 0) return;
    const condition: FilterCondition = {
      type: 'condition',
      id: createFilterId(),
      fieldKey: '',
      operator: '' as FilterOperator,
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
      enabled: true,
    };
    draft = insertNode(draft, parentId, group);
  }

  function updateGroupEnabled(
    tree: FilterGroup,
    groupId: string,
    enabled: boolean
  ): FilterGroup {
    return {
      ...tree,
      children: tree.children.map((child) => {
        if (child.type === 'group' && child.id === groupId) {
          return { ...child, enabled };
        }
        if (child.type === 'group') {
          return updateGroupEnabled(child, groupId, enabled);
        }
        return child;
      }),
    };
  }

  function removeNode(nodeId: string) {
    draft = removeNodeById(draft, nodeId);
  }

  function onConditionUpdate(
    nodeId: string,
    updates: Partial<
      Pick<
        FilterCondition,
        'fieldKey' | 'customJsonKey' | 'operator' | 'operand' | 'enabled'
      >
    >
  ) {
    draft = updateNode(draft, nodeId, updates);
  }

  function onFieldSelect(conditionId: string, fieldKey: string) {
    delete customSubFieldInputs[conditionId];
    draft = updateNode(draft, conditionId, {
      fieldKey,
      customJsonKey: undefined,
      operator: '' as FilterOperator,
      operand: '',
    });
  }

  function onCustomJsonSelect(conditionId: string, baseFieldKey: string) {
    customSubFieldInputs[conditionId] = '';
    draft = updateNode(draft, conditionId, {
      fieldKey: baseFieldKey,
      customJsonKey: CUSTOM_PREFIX,
      operator: '' as FilterOperator,
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

  function isConditionIncomplete(c: FilterCondition): boolean {
    if (!c.enabled) return false;
    if (!c.fieldKey) return true;
    if (c.customJsonKey === CUSTOM_PREFIX) return true;
    if (!c.operator) return true;
    if (!NO_VALUE_OPERATORS.has(c.operator as FilterOperator) && !c.operand)
      return true;
    return false;
  }

  const hasIncomplete = $derived.by(() => {
    function check(node: FilterGroup): boolean {
      for (const child of node.children) {
        if (child.type === 'condition' && isConditionIncomplete(child))
          return true;
        if (child.type === 'group' && check(child)) return true;
      }
      return false;
    }
    return check(draft);
  });

  let customSubFieldInputs = $state<Record<string, string>>({});
  let fieldPickerOpen = $state<Record<string, boolean>>({});

  function isGroupActive(
    condition: FilterCondition,
    groupKey: string
  ): boolean {
    if (!condition.fieldKey) return false;
    const field = fieldByKey.get(condition.fieldKey);
    return field?.group === groupKey;
  }

  function logicToggleClass(logic: 'and' | 'or') {
    return logic === 'and'
      ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'
      : 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20';
  }
</script>

{#snippet conditionRow(condition: FilterCondition)}
  {@const hasField = condition.fieldKey !== ''}
  {@const isCustomPending = condition.customJsonKey === CUSTOM_PREFIX}
  {@const isCustomResolved =
    !!condition.customJsonKey && condition.customJsonKey !== CUSTOM_PREFIX}
  {@const effectiveField = hasField ? getEffectiveField(condition) : undefined}
  {@const operators = effectiveField?.operators ?? []}
  {@const fieldResolved = hasField && !isCustomPending}
  {@const hasOperator = fieldResolved && condition.operator !== ''}
  {@const needsValue =
    hasOperator &&
    !NO_VALUE_OPERATORS.has(condition.operator as FilterOperator)}
  <div
    class={cn(
      'group/row flex flex-1 items-center gap-2',
      !condition.enabled && 'opacity-50'
    )}
  >
    <Checkbox
      checked={condition.enabled}
      onCheckedChange={(v) => onConditionUpdate(condition.id, { enabled: !!v })}
      class="size-3.5 shrink-0"
    />

    <BtnGroup.Root>
      <!-- Field picker using DropdownMenu with nested sub-menus -->
      <DropdownMenu.Root
        open={fieldPickerOpen[condition.id] ?? false}
        onOpenChange={(o) => {
          fieldPickerOpen[condition.id] = o;
        }}
      >
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            {@const displayLabel = getSelectDisplayLabel(condition)}
            <button
              {...props}
              type="button"
              class={cn(
                'flex h-7 min-w-0 items-center gap-1 rounded-md border border-input bg-transparent px-2.5 text-[11px] shadow-xs transition-colors select-none hover:bg-accent/50 dark:bg-input/30 dark:hover:bg-input/50',
                hasField ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {#if displayLabel}
                <span class="flex items-center gap-1 truncate">
                  {#each displayLabel.parts as part, i}
                    {#if i > 0}
                      <span class="mx-0.5 h-3 w-px shrink-0 bg-border"></span>
                    {/if}
                    <span
                      class={i === 0 && displayLabel.parts.length > 1
                        ? 'text-muted-foreground'
                        : ''}
                    >
                      {part}
                    </span>
                  {/each}
                </span>
              {:else}
                <span class="truncate">Select field...</span>
              {/if}
              <ChevronDown class="size-3 shrink-0 opacity-50" />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="start"
          class="max-h-72 min-w-40 overflow-y-auto"
        >
          {#each groupedFields.ungrouped as field (field.key)}
            <DropdownMenu.Item
              class="gap-2 py-1 ps-2 text-[11px]"
              onclick={() => {
                onFieldSelect(condition.id, field.key);
                fieldPickerOpen[condition.id] = false;
              }}
            >
              <Check
                class={cn(
                  'size-3 shrink-0',
                  condition.fieldKey === field.key && !condition.customJsonKey
                    ? 'opacity-100'
                    : 'opacity-0'
                )}
              />
              {field.label}
            </DropdownMenu.Item>
          {/each}

          {#if groupedFields.ungrouped.length > 0 && groupedFields.groups.length > 0}
            <DropdownMenu.Separator />
          {/if}

          {#each groupedFields.groups as group (group.key)}
            {@const active = isGroupActive(condition, group.key)}
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger class="gap-2 py-1 ps-2 text-[11px]">
                <span
                  class={cn('flex size-3 shrink-0 items-center justify-center')}
                >
                  {#if active}
                    <span class="size-1.5 rounded-full bg-foreground"></span>
                  {/if}
                </span>
                {group.label}
              </DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent class="min-w-36">
                {#each group.fields as field (field.key)}
                  <DropdownMenu.Item
                    class="gap-2 py-1 ps-2 text-[11px]"
                    onclick={() => {
                      onFieldSelect(condition.id, field.key);
                      fieldPickerOpen[condition.id] = false;
                    }}
                  >
                    <Check
                      class={cn(
                        'size-3 shrink-0',
                        condition.fieldKey === field.key &&
                          !condition.customJsonKey
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {#if field.type === 'relation'}
                      <LinkIcon class="size-3 shrink-0" />
                      Exact
                    {:else}
                      {field.label}
                    {/if}
                  </DropdownMenu.Item>
                {/each}
                {#if group.hasCustomJson}
                  {@const jsonField = group.fields.find(
                    (f) => f.jsonCustomSubField
                  )}
                  {#if jsonField}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      class="gap-2 py-1 ps-2 text-[11px] text-muted-foreground"
                      onclick={() => {
                        onCustomJsonSelect(condition.id, jsonField.key);
                        fieldPickerOpen[condition.id] = false;
                      }}
                    >
                      <span class="size-3 shrink-0"></span>
                      Custom key...
                    </DropdownMenu.Item>
                  {/if}
                {/if}
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <!-- Custom JSON key input -->
      {#if isCustomPending || isCustomResolved}
        <input
          type="text"
          class="h-7 w-24 min-w-0 rounded-none border-y border-r bg-background px-2 text-[11px] outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
          placeholder="Key name..."
          value={customSubFieldInputs[condition.id] ??
            (isCustomResolved ? (condition.customJsonKey ?? '') : '')}
          oninput={(e) => {
            customSubFieldInputs[condition.id] = (
              e.target as HTMLInputElement
            ).value;
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              const val = customSubFieldInputs[condition.id]?.trim();
              if (val) {
                onConditionUpdate(condition.id, {
                  customJsonKey: val,
                  operator: '',
                  operand: '',
                });
                delete customSubFieldInputs[condition.id];
              }
            }
          }}
          onblur={() => {
            const val = customSubFieldInputs[condition.id]?.trim();
            if (val) {
              onConditionUpdate(condition.id, {
                customJsonKey: val,
                operator: '',
                operand: '',
              });
              delete customSubFieldInputs[condition.id];
            }
          }}
        />
      {/if}

      <!-- Operator selector -->
      {#if fieldResolved}
        <Select.Root
          type="single"
          value={condition.operator || undefined}
          onValueChange={(v) => {
            if (v)
              onConditionUpdate(condition.id, {
                operator: v as FilterOperator,
              });
          }}
        >
          <Select.Trigger
            size="sm"
            class={cn(
              'h-7 min-w-0 px-2.5 text-[11px] data-[size=sm]:h-7 [&_svg]:size-3!',
              hasOperator ? 'text-muted-foreground' : 'text-muted-foreground/50'
            )}
          >
            {hasOperator
              ? getOperatorLabel(
                  effectiveField,
                  condition.operator as FilterOperator
                )
              : 'Select operator...'}
          </Select.Trigger>
          <Select.Content class="max-h-60">
            {#each operators as op (op)}
              <Select.Item
                value={op}
                label={getOperatorLabel(effectiveField, op)}
                class="py-1 pe-6 text-[11px]"
              />
            {/each}
          </Select.Content>
        </Select.Root>
      {/if}

      <!-- Value input -->
      {#if needsValue}
        <FilterValueInput
          inline
          type={effectiveField?.type ?? 'string'}
          value={condition.operand}
          options={effectiveField?.options}
          loaderKey={effectiveField?.loaderKey}
          relationLoaders={grid.relationLoaders}
          onchange={(v) => onConditionUpdate(condition.id, { operand: v })}
        />
      {/if}
    </BtnGroup.Root>

    <button
      type="button"
      class="size-5 shrink-0 rounded text-muted-foreground/60 opacity-0 transition-all group-hover/row:opacity-100 hover:text-destructive"
      onclick={() => removeNode(condition.id)}
    >
      <X class="m-auto size-3" />
    </button>
  </div>
{/snippet}

{#snippet logicLabel(group: FilterGroup, index: number)}
  <div class="flex h-7 w-14 shrink-0 items-center">
    {#if index === 0}
      <span class="text-[11px] text-muted-foreground select-none">Where</span>
    {:else}
      <button
        type="button"
        class={cn(
          'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide capitalize transition-colors select-none',
          logicToggleClass(group.logic)
        )}
        onclick={() => toggleGroupLogic(group.id)}
      >
        {group.logic}
        <Repeat class="size-2.5" />
      </button>
    {/if}
  </div>
{/snippet}

{#snippet filterGroup(group: FilterGroup, depth: number)}
  <div
    class={cn(
      'flex flex-col',
      depth > 0 &&
        'flex-1 rounded-lg border border-border/60 bg-muted/15 px-2.5 pt-2 pb-1.5'
    )}
  >
    {#each group.children as child, i (child.id)}
      <div class={cn('flex items-center gap-3', i > 0 && 'mt-1.5')}>
        {@render logicLabel(group, i)}

        {#if child.type === 'condition'}
          {@render conditionRow(child)}
        {:else if child.type === 'group'}
          <div
            class={cn(
              'group/row flex flex-1 items-center gap-2',
              child.enabled === false && 'opacity-50'
            )}
          >
            <Checkbox
              checked={child.enabled !== false}
              onCheckedChange={(v) => {
                draft = updateGroupEnabled(draft, child.id, !!v);
              }}
              class="size-3.5 shrink-0"
            />
            {@render filterGroup(child, depth + 1)}
            <button
              type="button"
              class="size-5 shrink-0 rounded text-muted-foreground/60 opacity-0 transition-all group-hover/row:opacity-100 hover:text-destructive"
              onclick={() => removeNode(child.id)}
            >
              <X class="m-auto size-3" />
            </button>
          </div>
        {/if}
      </div>
    {/each}

    <div class="flex items-center gap-1.5 py-1.5">
      <button
        type="button"
        class="flex h-6 items-center gap-1 rounded-md border border-dashed border-border/60 px-2 text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
        onclick={() => addCondition(group.id)}
      >
        <Plus class="size-2.5" />
        Add filter
      </button>
      {#if depth < 2}
        <button
          type="button"
          class="flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onclick={() =>
            addGroup(group.id, group.logic === 'and' ? 'or' : 'and')}
        >
          <FolderPlus class="size-2.5" />
          Add group
        </button>
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
      <div class="flex items-center gap-2 border-b px-4 py-2">
        <Filter class="size-3.5 text-muted-foreground" />
        <span class="text-xs font-semibold">Filters</span>
        {#if draft.children.length > 0}
          <button
            type="button"
            class="ml-auto text-[11px] text-muted-foreground transition-colors hover:text-destructive"
            onclick={clearAll}
          >
            Clear all
          </button>
        {/if}
      </div>

      <div class="max-h-[50vh] overflow-y-auto px-2.5 py-2">
        {#if filterSchema.length === 0}
          <div class="flex flex-col items-center gap-1.5 py-6">
            <ListFilter class="size-7 text-muted-foreground/30" />
            <p class="text-[11px] text-muted-foreground">
              No filterable fields configured.
            </p>
          </div>
        {:else if draft.children.length === 0}
          <div class="flex flex-col items-center gap-2.5 py-6">
            <div
              class="flex size-9 items-center justify-center rounded-full bg-muted"
            >
              <ListFilter class="size-4 text-muted-foreground" />
            </div>
            <div class="flex flex-col items-center gap-0.5">
              <p class="text-xs font-medium text-foreground">
                No filters applied
              </p>
              <p class="text-[11px] text-muted-foreground">
                Add a filter to narrow down your data.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="mt-0.5 h-6 gap-1 rounded-md px-2.5 text-[11px]"
              onclick={() => addCondition('root')}
            >
              <Plus class="size-2.5" />
              Add filter
            </Button>
          </div>
        {:else}
          {@render filterGroup(draft, 0)}
        {/if}
      </div>

      {#if draft.children.length > 0}
        <div class="flex items-center justify-end gap-2 border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-3 text-[11px]"
            onclick={cancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            class="h-7 px-4 text-[11px] font-medium"
            disabled={hasIncomplete}
            onclick={apply}
          >
            Apply filters
          </Button>
        </div>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
