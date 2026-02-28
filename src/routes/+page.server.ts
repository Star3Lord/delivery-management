import { redirect } from '@sveltejs/kit';
// import { isAuthenticatedSession } from '$lib/server/auth';

export const load = async (event) => {
  // if (isAuthenticatedSession(event)) {
  //   redirect(303, '/dashboard');
  // }
  // redirect(303, '/login');
  redirect(303, '/dashboard');
};
