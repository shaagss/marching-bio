async function main() {
    const {requestLogin} = await import('../api/request-login.mjs');

    requestLogin('shags6669@gmail.com');
}

main();
