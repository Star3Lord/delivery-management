import * as v from 'valibot';
import { query, getRequestEvent, command } from '$app/server';
// import {
//   checkAccessTokenExpiration,
//   refreshAccessToken,
//   setSessionFromTokens,
// } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const getAccessToken = command(
  v.boolean(),
  async (force_refresh_token?: boolean) => {
    const event = getRequestEvent();
    // const { expired, token: access_token } = checkAccessTokenExpiration();
    // if (!access_token || expired || force_refresh_token) {
    //   const refresh_token = event.locals.session?.refreshToken;
    //   if (!refresh_token) {
    //     console.error('No refresh token found');
    //     throw new Error('Unauthorized');
    //   }
    //   const tokens = await refreshAccessToken(refresh_token);
    //   if (!tokens) {
    //     console.error('Failed to refresh tokens');
    //     throw new Error('Unauthorized');
    //   }
    //   setSessionFromTokens(tokens);
    //   return tokens.accessToken;
    // }
    // return access_token;
    return 'access_token';
  }
);

export const getUser = query(async () => {
  const event = getRequestEvent();
  // return event.locals.user;
  return {
    name: 'John Doe',
    email: 'john.doe@example.com',
    picture: `https://picsum.photos/seed/${Math.random()}/200/200`,
  };
});

export const logout = query(async () => {
  redirect(303, '/logout');
});
