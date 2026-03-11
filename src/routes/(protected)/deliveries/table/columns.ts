import type { ColumnDef } from '@tanstack/table-core';
import BrickWallIcon from '@lucide/svelte/icons/brick-wall';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import HandshakeIcon from '@lucide/svelte/icons/handshake';
import HashIcon from '@lucide/svelte/icons/hash';
import LockIcon from '@lucide/svelte/icons/lock';
import MessageSquareQuoteIcon from '@lucide/svelte/icons/message-square-quote';
import PackageIcon from '@lucide/svelte/icons/package';
import ReceiptTextIcon from '@lucide/svelte/icons/receipt-text';
import StampIcon from '@lucide/svelte/icons/stamp';
import TruckIcon from '@lucide/svelte/icons/truck';
import WeightIcon from '@lucide/svelte/icons/weight';
import CircleDotIcon from '@lucide/svelte/icons/circle-dot';
import { createRawSnippet, mount, hydrate } from 'svelte';
import {
  renderComponent,
  renderSnippet,
} from '$lib/components/ui/data-table/index.js';
import DataTableColumnHeader from '$lib/components/ui/data-grid/column-header.svelte';
import DataTableCheckbox from '$lib/components/ui/data-grid/checkbox.svelte';
import DataTableActions from './data-table-actions.svelte';
import DateCell from './cell/date.svelte';
import PartyCell from './cell/party.svelte';
import VehicleCell from './cell/vehicle.svelte';
import ProductCell from './cell/product.svelte';
import {
  deliveryState,
  deliveryRemarks,
  deliveryRoyaltyNumber,
  deliveryQuantity,
  deliveryBilled,
} from './cell/others.svelte';
import type { DeliverySlip } from '$lib/api/delivery-slips.remote';

export const columnMap = new Map();

const header_icon_class =
  'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5';

// columnMap.set('external_id', {
//   label: 'Slip No.',
//   icon: {
//     component: Hash as any,
//     props: {
//       class: 'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
//     },
//   },
// });

columnMap.set('date', {
  label: 'Date',
  icon: {
    component: CalendarIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('vehicle', {
  label: 'Vehicle',
  icon: {
    component: TruckIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('party', {
  label: 'Party',
  icon: {
    component: HandshakeIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('product', {
  label: 'Product',
  icon: {
    component: PackageIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('product_quantity', {
  label: 'Product Qty',
  icon: {
    // component: BrickWall as any,
    component: WeightIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('royalty_number', {
  label: 'Royalty',
  icon: {
    component: StampIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('royalty_quantity', {
  label: 'Royalty Qty',
  icon: {
    component: WeightIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('state', {
  label: 'State',
  icon: {
    component: CircleDotIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

columnMap.set('remarks', {
  label: 'Remarks',
  icon: {
    component: MessageSquareQuoteIcon as any,
    props: {
      class: header_icon_class,
    },
  },
});

// columnMap.set('billed', {
//   label: 'Billed',
//   icon: {
//     component: ReceiptText as any,
//     props: {
//       class: icon_class,
//     },
//   },
// });

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
  // {
  //   accessorKey: 'external_id',
  //   header: ({ column }) => {
  //     return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
  //       label: 'Slip No.',
  //       column,
  //       icon: {
  //         component: Hash as any,
  //         props: {
  //           class:
  //             'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
  //         },
  //       },
  //     });
  //   },
  //   meta: {
  //     header: {
  //       class: 'p-0',
  //       style: {
  //         'min-width': '12.5rem',
  //       },
  //     },
  //     sort: { field: 'external_id' },
  //   },
  // },
  {
    accessorKey: 'date',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('date'),
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
      sort: { field: 'date' },
    },
  },
  {
    accessorKey: 'party',
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('party'),
      }),
    cell: ({ row }) => {
      const party = row.getValue('party') as DeliverySlip['party'];
      return renderComponent(PartyCell, {
        value: party || undefined,
      });
    },
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
      sort: { field: 'party.name' },
    },
  },
  {
    accessorKey: 'vehicle',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('vehicle'),
      });
    },
    cell: ({ row }) => {
      const vehicle = row.getValue('vehicle') as DeliverySlip['vehicle'];
      return renderComponent(VehicleCell, {
        value: vehicle || undefined,
      });
    },
    size: 160,
    minSize: 100,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '10rem',
        },
      },
      sort: { field: 'vehicle.number_plate' },
    },
  },
  {
    accessorKey: 'product',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('product'),
      });
    },
    cell: ({ row }) => {
      const product = row.getValue('product') as DeliverySlip['product'];
      return renderComponent(ProductCell, {
        value: product || undefined,
      });
    },
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '15rem',
        },
      },
      sort: { field: 'product.name' },
    },
  },
  {
    id: 'product_quantity',
    accessorFn: (row) => ({
      value: row.product_quantity,
      unit: row.product_quantity_unit,
    }),
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('product_quantity'),
      });
    },
    cell: ({ row }) => {
      const product_quantity = row.getValue('product_quantity') as {
        value: string;
        unit: string;
      };
      return renderSnippet(deliveryQuantity, product_quantity);
    },
    sortingFn: (a, b) => {
      const { quantity: aQuantity } = a.getValue('product_quantity') as {
        quantity: string;
        unit: string;
      };
      const { quantity: bQuantity } = b.getValue('product_quantity') as {
        quantity: string;
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
      sort: { field: 'product_quantity' },
    },
  },
  {
    accessorKey: 'royalty_number',
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('royalty_number'),
      });
    },
    cell: ({ row }) => {
      const royalty_number = row.getValue(
        'royalty_number'
      ) as DeliverySlip['royalty_number'];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return renderSnippet(deliveryRoyaltyNumber, { number: royalty_number });
    },
    size: 115,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '12.5rem',
        },
      },
      sort: { field: 'royalty_number' },
    },
  },
  {
    id: 'royalty_quantity',
    accessorFn: (row) => ({
      value: row.royalty_quantity,
      unit: row.royalty_quantity_unit,
    }),
    header: ({ column }) => {
      return renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('royalty_quantity'),
      });
    },
    cell: ({ row }) => {
      const royalty_quantity = row.getValue('royalty_quantity') as {
        value: string;
        unit: string;
      };
      return renderSnippet(deliveryQuantity, royalty_quantity);
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
    size: 120,
    meta: {
      header: {
        class: 'p-0',
        style: {
          'min-width': '15rem',
        },
      },
      sort: { field: 'royalty_quantity' },
    },
  },
  {
    id: 'state',
    accessorKey: 'state',
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('state'),
      }),
    cell: ({ row }) => {
      const state: DeliverySlip['state'] = row.getValue('state');
      return renderSnippet(deliveryState, { state });
    },
    enableSorting: false,
    size: 120,
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
    id: 'remarks',
    accessorFn: (row) => row.metadata?.remarks,
    header: ({ column }) =>
      renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
        column,
        ...columnMap.get('remarks'),
      }),
    cell: ({ row, cell, table }) => {
      const remarks = cell.getValue() as DeliverySlip['metadata']['remarks'];
      const delivery_id = row.original.id;
      return renderSnippet(deliveryRemarks, { remarks, delivery_id });
    },
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
  // {
  //   id: 'billed',
  //   accessorFn: (row) => row.state,
  //   header: ({ column }) =>
  //     renderComponent(DataTableColumnHeader<DeliverySlip, unknown>, {
  //       label: 'Billed',
  //       column,
  //       icon: {
  //         component: ReceiptText as any,
  //         props: {
  //           class:
  //             'text-neutral-700/80 dark:text-neutral-300/80 !size-3.5 mr-0.5',
  //         },
  //       },
  //     }),
  //   cell: ({ cell }) => {
  //     const slip_state = cell.getValue() as DeliverySlip['state'];
  //     return renderSnippet(deliveryBilled, { state: slip_state });
  //   },
  //   enableSorting: false,
  //   size: 100,
  //   minSize: 70,
  //   meta: {
  //     header: {
  //       class: 'p-0',
  //       style: {
  //         width: '5rem',
  //       },
  //     },
  //   },
  // },
  {
    id: 'table-row-actions',
    cell: ({ row }) => {
      // You can pass whatever you need from `row.original` to the component
      return renderComponent(DataTableActions, {
        id: row.original.id,
        party_id: row.original.party_id,
        royalty_number: row.original.royalty_number,
      });
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
