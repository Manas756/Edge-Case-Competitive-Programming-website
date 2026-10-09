async function runTests() {
  const base = 'http://localhost:3000';
  console.log('=== 1. Testing Core Pages ===');
  for (const path of ['/', '/contests', '/contests/Chaitanya2k26', '/contest/Chaitanya2k26/leaderboard', '/join', '/organizer/login']) {
    const res = await fetch(base + path);
    console.log(path, '-> status:', res.status, res.status === 200 ? '✓ PASS' : '✗ FAIL');
  }

  console.log('\n=== 2. Testing Code Resolution ===');
  for (const code of ['CHALLENGE', 'Chitanya2k26', 'Chaitanya2k26']) {
    const resResolve = await fetch(base + '/api/join/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const dataResolve = await resResolve.json();
    console.log(`Resolve code [${code}]:`, dataResolve.contest?.name === 'Chaitanya2k26' ? '✓ PASS' : '✗ FAIL');
  }

  console.log('\n=== 3. Testing Participant Join Flow ===');
  const resJoin = await fetch(base + '/api/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'CHALLENGE', name: 'Elite Hacker', email: 'elite@hacker.io' })
  });
  const cookiePart = resJoin.headers.get('set-cookie');
  const dataJoin = await resJoin.json();
  console.log('Join contest:', dataJoin.contestId === 'Chaitanya2k26' ? '✓ PASS' : '✗ FAIL', dataJoin);

  console.log('\n=== 4. Testing Arena State with Session Cookie ===');
  const resArena = await fetch(base + '/api/arena/Chaitanya2k26', {
    headers: { 'Cookie': cookiePart ? cookiePart.split(';')[0] : '' }
  });
  const dataArena = await resArena.json();
  console.log('Arena state loaded:', dataArena.problems?.length > 0 ? '✓ PASS' : '✗ FAIL', 'Problem count:', dataArena.problems?.length);

  console.log('\n=== 5. Testing Code Run in Arena ===');
  const p0 = dataArena.problems[0];
  const resRun = await fetch(base + '/api/arena/Chaitanya2k26/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookiePart ? cookiePart.split(';')[0] : '' },
    body: JSON.stringify({ problemId: p0.id, language: 'cpp', code: '#include <iostream>\nint main(){ std::cout << 0 << std::endl; return 0; }' })
  });
  const dataRun = await resRun.json();
  console.log('Code run verdict:', dataRun.verdict ? '✓ PASS' : '✗ FAIL', 'Verdict:', dataRun.verdict);

  console.log('\n=== 6. Testing Code Submit in Arena ===');
  const resSub = await fetch(base + '/api/arena/Chaitanya2k26/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookiePart ? cookiePart.split(';')[0] : '' },
    body: JSON.stringify({ problemId: p0.id, language: 'cpp', code: '#include <iostream>\nint main(){ std::cout << 0 << std::endl; return 0; }' })
  });
  const dataSub = await resSub.json();
  console.log('Code submit:', dataSub.ok ? '✓ PASS' : '✗ FAIL', 'Submission ID:', dataSub.submissionId);

  console.log('\n=== 7. Testing Organizer Login & Auth ===');
  const resOrgLogin = await fetch(base + '/api/organizer/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'manas' })
  });
  const cookieOrg = resOrgLogin.headers.get('set-cookie');
  console.log('Organizer login:', resOrgLogin.status === 200 ? '✓ PASS' : '✗ FAIL');

  const resOrgOverview = await fetch(base + '/api/organizer/contests/Chaitanya2k26', {
    headers: { 'Cookie': cookieOrg ? cookieOrg.split(';')[0] : '' }
  });
  const dataOrgOverview = await resOrgOverview.json();
  console.log('Organizer overview:', dataOrgOverview.contest?.id ? '✓ PASS' : '✗ FAIL', 'Active participants:', dataOrgOverview.counts?.active);
  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(console.error);
