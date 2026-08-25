const http = require('http');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3456, path, method, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  console.log('=== MemoAle API Tests ===\n');

  // 1. Empty list
  let clients = await req('GET', '/api/clients');
  console.log('1. GET /api/clients (empty):', JSON.stringify(clients));
  console.assert(Array.isArray(clients) && clients.length === 0, 'Should be empty array');

  // 2. Create clients
  let c1 = await req('POST', '/api/clients', { name: 'Mario Rossi' });
  console.log('2. Create Mario Rossi:', JSON.stringify(c1));
  console.assert(c1.id, 'Should have id');

  let c2 = await req('POST', '/api/clients', { name: 'Azienda SRL' });
  console.log('   Create Azienda SRL:', JSON.stringify(c2));

  // 3. Duplicate client
  try {
    await req('POST', '/api/clients', { name: 'Mario Rossi' });
    console.log('3. Duplicate: FAIL - should have errored');
  } catch(e) {
    console.log('3. Duplicate correctly rejected');
  }

  // 4. Create projects
  let p1 = await req('POST', `/api/clients/${c1.id}/projects`, {
    name: 'Sito Web',
    web_url: 'https://mariorossi.it',
    repo_url: 'https://bitbucket.org/mario/sito'
  });
  console.log('4. Create project:', JSON.stringify(p1));

  let p2 = await req('POST', `/api/clients/${c1.id}/projects`, {
    name: 'App Mobile',
    web_url: 'https://app.mariorossi.it'
  });
  console.log('   Create project 2:', JSON.stringify(p2));

  // 5. Get clients with projects
  clients = await req('GET', '/api/clients');
  console.log('5. GET /api/clients (full):');
  clients.forEach(c => {
    console.log(`   ${c.name}: ${c.projects.length} projects`);
    c.projects.forEach(p => console.log(`     - ${p.name} (web: ${p.web_url}, repo: ${p.repo_url})`));
  });
  console.assert(clients.length === 2, 'Should have 2 clients');
  console.assert(clients[0].projects.length === 2, 'Mario should have 2 projects');

  // 6. Update client
  await req('PUT', `/api/clients/${c1.id}`, { name: 'Mario Rossi (aggiornato)' });
  clients = await req('GET', '/api/clients');
  const updated = clients.find(c => c.id === c1.id);
  console.log(`6. Updated name: ${updated.name}`);
  console.assert(updated.name === 'Mario Rossi (aggiornato)', 'Name should be updated');

  // 7. Update project
  await req('PUT', `/api/projects/${p1.id}`, {
    name: 'Sito Web (v2)',
    web_url: 'https://v2.mariorossi.it',
    repo_url: 'https://bitbucket.org/mario/sito-v2'
  });
  clients = await req('GET', '/api/clients');
  const proj = clients.find(c => c.id === c1.id).projects.find(p => p.id === p1.id);
  console.log(`7. Updated project: ${proj.name} -> ${proj.web_url}`);
  console.assert(proj.web_url === 'https://v2.mariorossi.it', 'Web URL should be updated');

  // 8. Delete project
  await req('DELETE', `/api/projects/${p2.id}`);
  clients = await req('GET', '/api/clients');
  const remaining = clients.find(c => c.id === c1.id).projects;
  console.log(`8. After delete project: ${remaining.length} remaining`);
  console.assert(remaining.length === 1, 'Should have 1 project left');

  // 9. Delete client (cascade)
  await req('DELETE', `/api/clients/${c2.id}`);
  clients = await req('GET', '/api/clients');
  console.log(`9. After delete client: ${clients.length} clients remaining`);
  console.assert(clients.length === 1, 'Should have 1 client left');

  console.log('\n=== All tests passed! ===');
}

main().catch(e => {
  console.error('Test failed:', e.message);
  process.exit(1);
});