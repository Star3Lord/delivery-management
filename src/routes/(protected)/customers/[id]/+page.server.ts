// import { validateSession } from '$lib/server/auth';
import { get_customer } from '$lib/api/customers.remote';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
  // validateSession();
  const { id } = event.params;
  const customer = await get_customer({ id });
  if (!customer) {
    error(404, 'Customer not found');
  }
  return customer;
};
