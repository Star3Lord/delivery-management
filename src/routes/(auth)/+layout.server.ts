import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
  if (event.url.pathname.includes('/logout')) {
    return;
  }
  if (event.locals.session) {
    const nextUrl =
      (event.url.searchParams.has('next') &&
        event.url.searchParams.get('next')) ||
      '/';
    redirect(303, nextUrl);
  }
};
