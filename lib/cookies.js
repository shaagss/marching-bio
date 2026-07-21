// Figure out what all this means soon!

export function makeCookie(name, value, options = {}) {
    let str = `${name}=${encodeURIComponent(value)}`;
    if (options.maxAge) str += `; Max-Age=${Math.floor(options.maxAge)}`;
    if (options.path) str += `; Path=${options.path}`;
    if (options.httpOnly) str += `; HttpOnly`;
    if (options.secure) str += `; Secure`;
    if (options.sameSite) str += `; SameSite=${options.sameSite}`;

    return str;
}

export function parseCookies(header = ''){
    const result = {};
    header.split(';').forEach(pair => {
        const eqIndex = pair.indexOf('=');
        if(eqIndex < 0) return;
        const key = pair.slice(0, eqIndex).trim();
        const value = pair.slice(eqIndex + 1).trim();
        result[key] = decodeURIComponent(value);
    });
    return result
}