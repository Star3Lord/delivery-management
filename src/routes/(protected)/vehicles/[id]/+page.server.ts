// import { validateSession } from '$lib/server/auth';
import { get_vehicle } from '$lib/api/vehicles.remote';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
  // validateSession();
  const { id } = event.params;
  const vehicle = await get_vehicle({ id });
  if (!vehicle) {
    error(404, 'Vehicle not found');
  }
  return vehicle;
};
