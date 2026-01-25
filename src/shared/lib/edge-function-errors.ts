export type EdgeFunctionErrorDetails = {
  status?: number;
  code?: string;
  message?: string;
  requestId?: string;
};

type EdgeFunctionErrorLike = {
  status?: number;
  context?: Response | null;
};

const REQUEST_ID_HEADERS = ['x-request-id', 'x-supabase-request-id'];

const getRequestId = (response?: Response | null) => {
  if (!response) return undefined;
  for (const header of REQUEST_ID_HEADERS) {
    const value = response.headers.get(header);
    if (value) return value;
  }
  return undefined;
};

export async function getEdgeFunctionErrorDetails({
  response,
  error,
  fallbackStatus,
}: {
  response?: Response | null;
  error?: EdgeFunctionErrorLike | null;
  fallbackStatus?: number;
}): Promise<EdgeFunctionErrorDetails> {
  const resolvedResponse = response ?? error?.context ?? null;
  const status = resolvedResponse?.status ?? error?.status ?? fallbackStatus;
  const requestId = getRequestId(resolvedResponse);

  if (!resolvedResponse) {
    return { status, requestId };
  }

  const payload = await resolvedResponse
    .clone()
    .json()
    .catch(() => null);

  return {
    status,
    requestId,
    code: payload?.error?.code,
    message: payload?.error?.message,
  };
}

export function getEdgeFunctionErrorMessage(details: EdgeFunctionErrorDetails): {
  title: string;
  message: string;
  assistantReply: string;
} {
  const status = details.status;
  const code = details.code?.toLowerCase();

  if (status === 401 || status === 403 || code === 'unauthorized' || code === 'forbidden') {
    return {
      title: 'Authentication Required',
      message: 'Please sign in again to continue.',
      assistantReply: 'Sorry, I couldn’t reach the assistant. Please sign in and try again.',
    };
  }

  if (status === 429 || code === 'rate_limit') {
    return {
      title: 'Too Many Requests',
      message: 'You’re sending requests too quickly. Please wait a moment and try again.',
      assistantReply: 'Sorry, I’m getting too many requests right now. Please try again shortly.',
    };
  }

  if (status === 408 || status === 504 || code === 'timeout') {
    return {
      title: 'Request Timeout',
      message: 'The request took too long. Please check your connection and try again.',
      assistantReply: 'Sorry, I couldn’t reach the assistant. Please try again.',
    };
  }

  if (status && status >= 500) {
    return {
      title: 'Service Unavailable',
      message: 'The assistant is temporarily unavailable. Please try again soon.',
      assistantReply: 'Sorry, I couldn’t reach the assistant. Please try again.',
    };
  }

  if (status === 400 || code === 'invalid_request' || code === 'bad_request') {
    return {
      title: 'Request Failed',
      message: 'We couldn’t process that request. Please try again.',
      assistantReply: 'Sorry, I couldn’t process that request. Please try again.',
    };
  }

  return {
    title: 'Something Went Wrong',
    message: 'Please try again in a moment.',
    assistantReply: 'Sorry, I couldn’t reach the assistant. Please try again.',
  };
}
