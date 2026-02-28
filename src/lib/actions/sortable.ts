import Sortable from 'sortablejs';
// import Sortable, { MultiDrag } from 'sortablejs';
import type { Action } from 'svelte/action';

export const sortable: Action<HTMLElement, Sortable.Options> = (node, args) => {
  // console.log({ Sortable });
  // Sortable.mount(new Sortable.MultiDrag());
  // Sortable.mount(new MultiDrag());
  let sortableInstance: Sortable | undefined = undefined;
  const createSortableInstance = (options: Sortable.Options) => {
    sortableInstance = Sortable.create(node, options);
  };
  createSortableInstance(args);
  return {
    update(newArgs) {
      if (sortableInstance) {
        sortableInstance.destroy();
      }
      createSortableInstance(newArgs);
    },
    destroy() {
      sortableInstance?.destroy();
    },
  };
};
