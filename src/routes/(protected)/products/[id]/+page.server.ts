// import { validateSession } from '$lib/server/auth';
import { get_product } from '$lib/api/products.remote';
import { error } from '@sveltejs/kit';

export const load = async (event) => {
  // validateSession();
  const { id } = event.params;
  const product = await get_product({ id });
  if (!product) {
    error(404, 'Product not found');
  }
  return product;
};
