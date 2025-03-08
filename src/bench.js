const loginResult = await fetch('http://localhost:3000/login', {
    method: 'post',
    body: new URLSearchParams({
        username: 'asdf',
        password: 'jkl',
    }),
    // mode: 'same-origin',
    redirect: 'manual',
    credentials: 'include',
});

if (loginResult.status == 302 && loginResult.headers.get('location') == '/projects') {
    console.log('should be good?');
}

const ws = new WebSocket('ws://localhost:3000/projects/d6bd38f0-56c6-4acf-93bd-1257341834ce/ws', ['http', 'ws']);
ws.addEventListener('open', () => {
    console.log('ws opened');
});
ws.addEventListener('message', (e) => {
    console.log('ws message:', e);
})

export { }