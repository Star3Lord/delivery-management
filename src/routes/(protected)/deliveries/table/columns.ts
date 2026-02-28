import type { ColumnDef } from '@tanstack/table-core';
import BrickWall from '@lucide/svelte/icons/brick-wall';
import Calendar from '@lucide/svelte/icons/calendar';
import Handshake from '@lucide/svelte/icons/handshake';
import Hash from '@lucide/svelte/icons/hash';
import Lock from '@lucide/svelte/icons/lock';
import MessageSquareQuote from '@lucide/svelte/icons/message-square-quote';
import Package from '@lucide/svelte/icons/package';
import ReceiptText from '@lucide/svelte/icons/receipt-text';
import Stamp from '@lucide/svelte/icons/stamp';
import Truck from '@lucide/svelte/icons/truck';
import Weight from '@lucide/svelte/icons/weight';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import { createRawSnippet, hydrate } from 'svelte';
import {
  renderComponent,
  renderSnippet,
} from '$lib/components/ui/data-table/index.js';
import DataTableActions from './data-table-actions.svelte';
import DataTableCheckbox from './data-table-checkbox.svelte';
import DataTableColumnHeader from './data-table-column-header.svelte';
import DateCell from './cell/data.svelte';
import PartyCell from './cell/party.svelte';
import type { DeliverySlip } from '$lib/types';

const billedCellSnippet = createRawSnippet<[boolean]>((getValue) => {
  const value = getValue();
  return {
    render: () => `<div></div>`,
    setup(target) {
      if (value) {
        hydrate(Lock, {
          target: target,
          props: { class: 'text-sky-500 size-4' },
        });
      }
    },
  };
});

export const columns: ColumnDef<DeliverySlip>[] = [
  {
    id: 'table-row-select',
    header: ({ table }) =>
      renderComponent(DataTableCheckbox, {
        class: 'ml-5',
        checked: table.getIsAllPageRowsSelected(),
        indeterminate:
          table.getIsSomePageRowsSelected() &&
          !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all',
      }),
    cell: ({ row }) =>
      renderComponent(DataTableCheckbox, {
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
        'aria-label': 'Select row',
      }),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enablePinning: true,
    size: 56,
    minSize: 56,
    maxSize: 56,
    meta: {
      header: {
        class: 'p-0 text-xs text-neutral-900 capitalize font-normal truncate',
        style: {
          width: '3.5rem',
          'min-width': '3.5rem',
          'max-width': '3.5rem',
        },
      },
      cell: {
        // class: 'p-0',
      },
    },
  },
  {
    accessorKey: 'external_id',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Slip No.',
        column,
        icon: {
          component: Hash as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Date',
        column,
        icon: {
          component: Calendar as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    cell: ({ row }) => {
      return renderComponent(DateCell, {
        value: row.getValue('date') as string,
      });
    },
    size: 125,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
    },
  },
  {
    accessorKey: 'party',
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Party',
        column,
        icon: {
          component: Handshake as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      }),
    cell: ({ row }) => {
      return renderComponent(PartyCell, {
        value: row.getValue('party') as any,
      });
    },
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
    },
  },
  {
    accessorKey: 'vehicle',
    accessorFn: (row) => row.vehicle?.number_plate,
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Vehicle',
        column,
        icon: {
          component: Truck as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
    },
  },
  {
    accessorKey: 'royalty_number',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Pitpass',
        column,
        icon: {
          component: Stamp as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    size: 115,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
    },
  },
  {
    id: 'royalty_quantity',
    accessorFn: (row) => ({
      quantity: row.royalty_quantity,
      unit: row.royalty_quantity_unit,
    }),
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Ton',
        column,
        icon: {
          component: Weight as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    cell: ({ row }) => {
      const { quantity, unit } = row.getValue('royalty_quantity') as {
        quantity: string;
        unit: string;
      };
      return `${quantity}`;
    },
    sortingFn: (a, b) => {
      const { quantity: aQuantity } = a.getValue('royalty_quantity') as {
        quantity: string;
        unit: string;
      };
      const { quantity: bQuantity } = b.getValue('royalty_quantity') as {
        quantity: string;
        unit: string;
      };
      return parseFloat(aQuantity) - parseFloat(bQuantity);
    },
    size: 100,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '15rem',
        },
      },
    },
  },
  {
    accessorKey: 'product',
    accessorFn: (row) => row.product?.name,
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Product',
        column,
        icon: {
          component: Package as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '15rem',
        },
      },
    },
  },
  {
    id: 'product_quantity',
    accessorFn: (row) => ({
      quantity: row.product_quantity,
      unit: row.product_quantity_unit,
    }),
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Quantity',
        column,
        icon: {
          component: BrickWall as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      });
    },
    cell: ({ row }) => {
      const { quantity, unit } = row.getValue('product_quantity') as {
        quantity?: string;
        unit: string;
      };
      return quantity ? `${quantity} ${unit}` : '—';
    },
    sortingFn: (a, b) => {
      const { quantity: aQuantity } = a.getValue('product_quantity') as {
        quantity?: string;
        unit: string;
      };
      const { quantity: bQuantity } = b.getValue('product_quantity') as {
        quantity?: string;
        unit: string;
      };
      return parseFloat(aQuantity ?? '0') - parseFloat(bQuantity ?? '0');
    },
    size: 150,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '15rem',
        },
      },
    },
  },
  {
    accessorKey: 'state',
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'State',
        column,
        icon: {
          component: CircleDot as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      }),
    cell: ({ row }) => {
      const state = row.getValue('state') as string;
      return state.charAt(0).toUpperCase() + state.slice(1);
    },
    enableSorting: false,
    size: 100,
    minSize: 70,
    meta: {
      header: {
        class: 'p-0',
        style: {
          width: '5rem',
        },
      },
    },
  },
  {
    accessorKey: 'remarks',
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Remarks',
        column,
        icon: {
          component: MessageSquareQuote as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      }),
    enableSorting: false,
    size: 250,
    minSize: 100,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
    },
  },
  {
    accessorKey: 'billed',
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        label: 'Billed',
        column,
        icon: {
          component: ReceiptText as any,
          props: {
            class:
              'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
          },
        },
      }),
    cell: ({ row }) => {
      return renderSnippet(
        billedCellSnippet,
        row.getValue('state') === 'billed'
      );
    },
    enableSorting: false,
    size: 100,
    minSize: 70,
    meta: {
      header: {
        class: 'p-0',
        style: {
          width: '5rem',
          // 'min-width': '12.5rem',
        },
      },
    },
  },
  {
    id: 'table-row-actions',
    cell: ({ row }) => {
      // You can pass whatever you need from `row.original` to the component
      return renderComponent(DataTableActions, { id: row.original.id });
    },
    enableHiding: false,
    enableSorting: false,
    enableResizing: false,
    enablePinning: true,
    size: 56,
    minSize: 56,
    maxSize: 56,
    meta: {
      header: {
        class: 'text-xs text-neutral-900 font-normal truncate',
        style: {
          width: '3.5rem',
          'min-width': '3.5rem',
          'max-width': '3.5rem',
        },
      },
      cell: {
        class: 'px-0 text-center',
      },
    },
  },
];

export const columnMap = new Map();

columnMap.set('external_id', {
  label: 'Slip No.',
  icon: {
    component: Hash as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('date', {
  label: 'Date',
  icon: {
    component: Calendar as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('vehicle', {
  label: 'Vehicle',
  icon: {
    component: Truck as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('party', {
  label: 'Party',
  icon: {
    component: Handshake as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('royalty_number', {
  label: 'Pitpass',
  icon: {
    component: Stamp as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('royalty_quantity', {
  label: 'Ton',
  icon: {
    component: Weight as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('product', {
  label: 'Product',
  icon: {
    component: Package as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('product_quantity', {
  label: 'Quantity',
  icon: {
    component: BrickWall as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('state', {
  label: 'State',
  icon: {
    component: CircleDot as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});

columnMap.set('remarks', {
  label: 'Remarks',
  icon: {
    component: MessageSquareQuote as any,
    props: {
      class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
    },
  },
});
