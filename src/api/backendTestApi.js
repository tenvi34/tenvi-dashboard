import { fetchTestEcho } from './testEchoApi.js'

// Echo 메시지 전송 wrapper
export async function sendEchoMessage(message) {
  const response = await fetchTestEcho({ message })
  return response
}

/*
  const response = await fetch(`${API_BASE_URL}/api/test/echo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.message ?? `백엔드 요청 실패: ${response.status}`
    );
  }

  return response.json();
}
*/
