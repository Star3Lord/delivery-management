import { list_delivery_slips_v2 } from '$lib/api/delivery-slips.remote';
import { useDataGrid } from '$lib/components/ui/data-grid/index.js';

export type ListParams = Parameters<typeof list_delivery_slips_v2>[0];
export type ListResult = Awaited<ReturnType<typeof list_delivery_slips_v2>>;

export const LIMIT_OPTIONS = [10, 20, 50, 100] as const;

const DEFAULT_SORT: ListParams['order_by'] = [
  { column: 'date', direction: 'desc' },
];

/**
 * Derives `server_filters` and `server_sort` from the data-grid context.
 * Must be called during component initialisation (reads Svelte context).
 */
export function useDeliveryListParams() {
  const grid = useDataGrid();

  const sort_field_map = new Map<string, string>();
  for (const col of grid.columns) {
    const id = col.id ?? (col as { accessorKey?: string }).accessorKey;
    if (!id) continue;
    const meta = col.meta as { sort?: { field: string } } | undefined;
    if (meta?.sort?.field) sort_field_map.set(id, meta.sort.field);
  }

  const server_filters = $derived(
    grid.serverFilters.children.length > 0
      ? (grid.serverFilters as ListParams['filters'])
      : undefined
  );

  const server_sort = $derived(
    grid.sorting.length > 0
      ? (grid.sorting
          .map((s) => {
            const field = sort_field_map.get(s.id);
            if (!field) return null;
            return {
              column: field,
              direction: s.desc ? ('desc' as const) : ('asc' as const),
            };
          })
          .filter(
            (s): s is NonNullable<typeof s> => s !== null
          ) as ListParams['order_by'])
      : DEFAULT_SORT
  );

  return {
    get server_filters() {
      return server_filters;
    },
    get server_sort() {
      return server_sort;
    },
  };
}
