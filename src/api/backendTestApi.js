const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7048';

export async function sendEchoMessage(message) {
  const response = await fetch(`${API_BASE_URL}/api/test/echo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  
}