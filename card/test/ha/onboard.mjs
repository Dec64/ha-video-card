// Onboards a fresh Home Assistant over its API and writes tokens to $HA_TOKENS.
import { writeFileSync } from 'node:fs';

const HA = 'http://127.0.0.1:8123';
const CLIENT = `${HA}/`;
const post = (path, body, headers = {}) =>
  fetch(`${HA}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const user = await post('/api/onboarding/users', {
  client_id: CLIENT,
  name: 'Tester',
  username: 'tester',
  password: 'tester-pass-123',
  language: 'en',
});
if (!user.ok) throw new Error(`onboarding user: ${user.status} ${await user.text()}`);
const { auth_code } = await user.json();
const tokenRes = await fetch(`${HA}/auth/token`, {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: auth_code,
    client_id: CLIENT,
  }),
});
const tok = await tokenRes.json();
const auth = { authorization: `Bearer ${tok.access_token}` };
for (const [step, body] of [
  ['core_config', {}],
  ['analytics', {}],
  ['integration', { client_id: CLIENT, redirect_uri: `${CLIENT}?auth_callback=1` }],
]) {
  const r = await post(`/api/onboarding/${step}`, body, auth);
  if (!r.ok) throw new Error(`onboarding ${step}: ${r.status}`);
}
writeFileSync(
  process.env.HA_TOKENS ?? 'tokens.json',
  JSON.stringify({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    hassUrl: HA,
    clientId: CLIENT,
  }),
);
console.log('Home Assistant onboarded');
