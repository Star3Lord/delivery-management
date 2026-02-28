import Sortable from 'sortablejs';

/**
 * A Svelte ($effect) hook that creates a sortable instance on a DOM element.
 *
 * This hook initializes a sortable drag-and-drop interface using the SortableJS library.
 * It automatically handles the lifecycle of the sortable instance using $effect, creating it when the
 * component mounts and destroying it when the component unmounts.
 *
 * @param getter - A function that returns the HTML element to make sortable, or null if not available
 * @param options - Optional configuration options for the Sortable instance
 *
 * @example
 * ```svelte
 * <script>
 *   import { useSortable } from '$lib/hooks/use-sortable.svelte';
 *
 *   let listEl = $state<HTMLElement | null>(null);
 *
 *   useSortable(() => listEl, {
 *     animation: 150,
 *     onEnd: (evt) => {
 *       // Handle the end of sorting
 *     }
 *   });
 * </script>
 *
 * <ul bind:this={listEl}>
 *   <li>Item 1</li>
 *   <li>Item 2</li>
 * </ul>
 * ```
 */
export const useSortable = (
  getter: () => HTMLElement | null,
  options?: Sortable.Options
) => {
  $effect(() => {
    const sortableEl = getter();
    const sortable = sortableEl ? Sortable.create(sortableEl, options) : null;
    // Sortable.mount(Sortable.MultiDrag);
    return () => sortable?.destroy();
  });
};

/**
 * Reorders elements within a single array based on a SortableJS drag event.
 *
 * This function takes the result of a SortableJS drag operation and creates a new array
 * with the elements reordered according to the drag operation.
 *
 * @param evt - A SortableJS event containing `oldIndex` and `newIndex` properties
 * @param array - The array whose elements should be reordered
 * @returns A new array with elements reordered according to the drag operation
 *
 * @example
 * ```js
 * const items = ['Apple', 'Banana', 'Cherry', 'Date'];
 *
 * // After dragging 'Apple' to position 2
 * const sortableEvent = { oldIndex: 0, newIndex: 2 };
 * const reorderedItems = reorder(sortableEvent, items);
 * // reorderedItems: ['Banana', 'Cherry', 'Apple', 'Date']
 * ```
 */
export function reorder<T>(
  evt: Sortable.SortableEvent,
  array: T[]
): ReturnType<typeof $state.snapshot<T>>[] {
  // should have no effect on stores or regular array
  const workArray = $state.snapshot(array);

  // get changes
  const { oldIndex, newIndex } = evt;

  if (oldIndex === undefined || newIndex === undefined) {
    return workArray;
  }
  if (newIndex === oldIndex) {
    return workArray;
  }

  // move elements
  const target = workArray[oldIndex];
  const increment = newIndex < oldIndex ? -1 : 1;

  for (let k = oldIndex; k !== newIndex; k += increment) {
    workArray[k] = workArray[k + increment];
  }
  workArray[newIndex] = target;
  return workArray;
}

/**
 * Moves an element between two arrays based on a SortableJS drag event.
 *
 * This function handles both reordering within a single array and moving elements
 * between different arrays. If the source and target arrays are the same (indicated
 * by the sameArray parameter), it just reorders the array.
 * Otherwise, it removes the dragged element from the source array and inserts it
 * into the target array at the specified position.
 *
 * @param evt - A SortableJS event containing `oldIndex` and `newIndex` properties
 * @param fromArray - The source array (where the dragged element originates)
 * @param toArray - The target array (where the dragged element should be placed)
 * @param isSameArray - A boolean indicating whether `fromArray` and `toArray` are the same array
 * @returns A tuple containing the updated source and target arrays
 *
 * @example
 * ```js
 * // Example 1: Moving between different arrays
 * const list1 = ['Apple', 'Banana', 'Cherry'];
 * const list2 = ['Date', 'Elderberry'];
 *
 * // After dragging 'Banana' from list1 to position 1 in list2
 * const sortableEvent = { oldIndex: 1, newIndex: 1 };
 * const [updatedList1, updatedList2] = reorderMaybeWithMove(sortableEvent, list1, list2);
 * // updatedList1: ['Apple', 'Cherry']
 * // updatedList2: ['Date', 'Banana', 'Elderberry']
 *
 * // Example 2: Reordering within the same array
 * const list = ['Apple', 'Banana', 'Cherry', 'Date'];
 * const sortableEvent = { oldIndex: 0, newIndex: 2 };
 * const [result1, result2] = reorderMaybeWithMove(sortableEvent, list, list, true);
 * // Both result1 and result2: ['Banana', 'Cherry', 'Apple', 'Date']
 * ```
 */
export function reorderMaybeWithMove<T>(
  evt: Sortable.SortableEvent,
  fromArray: T[],
  toArray: T[],
  isSameArray: boolean = false
): [
  ReturnType<typeof $state.snapshot<T>>[],
  ReturnType<typeof $state.snapshot<T>>[],
] {
  // If source and target are the same array, use simpler reorder
  if (isSameArray) {
    const result = reorder(evt, fromArray);
    return [result, result];
  }

  // Create snapshots of both arrays
  const workFrom = $state.snapshot(fromArray);
  const workTo = $state.snapshot(toArray);

  const { oldIndex, newIndex } = evt;

  if (oldIndex === undefined || newIndex === undefined) {
    return [workFrom, workTo];
  }

  // Get and remove the item from source array
  const itemToMove = workFrom[oldIndex];

  // Shift elements in source array
  for (let k = oldIndex; k < workFrom.length - 1; k++) {
    workFrom[k] = workFrom[k + 1];
  }
  workFrom.pop();

  // Shift elements in target array to make space
  for (let k = workTo.length; k > newIndex; k--) {
    workTo[k] = workTo[k - 1];
  }
  workTo[newIndex] = itemToMove;

  return [workFrom, workTo];
}
