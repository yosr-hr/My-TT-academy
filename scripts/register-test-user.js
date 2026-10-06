import fetch from 'node-fetch';

const register = async () => {
  const res = await fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      N_CIN: 'T123456',
      matricule: 'M123456',
      nom: 'Test',
      prenom: 'User',
      email: 'test@example.com',
      password: 'password123'
    })
  });

  const body = await res.json();
  console.log('status', res.status);
  console.log('body', JSON.stringify(body, null, 2));
};

register().catch(console.error);
