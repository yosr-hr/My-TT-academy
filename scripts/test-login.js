import fetch from 'node-fetch';

const test = async () => {
  const res = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  });
  const data = await res.json();
  console.log('status', res.status);
  console.log('body', JSON.stringify(data, null, 2));
};

test().catch(console.error);
