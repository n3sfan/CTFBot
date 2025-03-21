const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36';

export async function registerAccount(url, user) {
    var html = (await fetch(url + '/register', {
        method: 'GET',
        headers: {
            'User-Agent': USER_AGENT
        }
    }));
    if (html.status !== 200) {
        return false;
    }

    var text = await html.text();
    console.log(text);
    var matcher = text.match(/\'csrfNonce\': \"(.*?)\",/);
    if (!matcher)
        return false;
    var csrfNonce = matcher[1];
    // console.log(csrfNonce);
    var cookies = html.headers.get('set-cookie');
    // console.log(cookies);

    var data = new FormData();
    data.append('name', user.name);
    data.append('email', user.email);
    data.append('password', user.password);
    data.append('nonce', csrfNonce);
    data.append('_submit', 'Submit');
    var response = await (await fetch(url + '/register', {
        method: 'POST',
        headers: {
            'User-Agent': USER_AGENT,
            'Cookie': cookies
        },
        body: data
    })).text();
    // console.log(data);
    // console.log(response);
    return response.includes('Logout');
}
