import type { RemoteQueryListResponse } from '$lib/types/remote';

export const get_last_id_for_next_page_from_responses = <
  T extends { id: string },
>(
  responses: (RemoteQueryListResponse<T> | undefined)[]
): [string | undefined, boolean | undefined] => {
  if (responses.length === 0) return [undefined, undefined];

  if (responses.length === 1) {
    const previous_response = responses[0];
    if (!previous_response || previous_response?.error) {
      return [undefined, undefined];
    }

    const data = previous_response.data.items;
    const count = data.length;
    if (count === 0) {
      return [undefined, undefined];
    }

    return [data[count - 1].id, previous_response.data.has_more];
  }

  let previous_index = responses.length - 1;
  let previous_response = responses[previous_index];
  while (
    (!previous_response || previous_response?.error) &&
    previous_index >= 0
  ) {
    --previous_index;
    previous_response = responses[previous_index];
  }

  if (previous_index < 0 || !previous_response || previous_response?.error) {
    return [undefined, undefined];
  }

  const data = previous_response.data.items;
  const count = data.length;
  if (count === 0) {
    return [undefined, undefined];
  }
  return [data[count - 1].id, previous_response.data.has_more];
};

export const get_last_id_for_previous_page_from_responses = <
  T extends { id: string },
>(
  responses: (RemoteQueryListResponse<T> | undefined)[]
) => {
  // we can skip if there are 2 or less pages since the last id isn't needed for getting first page even when the user is on 2nd page
  if (responses.length < 3) return undefined;

  let previous_index = responses.length - 3;
  let previous_response = responses[previous_index];
  while (
    (!previous_response || previous_response?.error) &&
    previous_index >= 0
  ) {
    --previous_index;
    previous_response = responses[previous_index];
  }

  if (previous_index < 0 || !previous_response || previous_response?.error) {
    return undefined;
  }

  const data = previous_response.data.items;
  const count = data.length;
  if (count === 0) {
    return undefined;
  }
  return data[count - 1].id;
};
