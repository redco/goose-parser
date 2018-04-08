import {expect} from 'chai';
import PhantomEnvironment from '../../lib/PhantomEnvironment';
import Parser from '../../lib/Parser';
import http from 'http';

const port = 60053;
const url = `http://localhost:${port}`;
let responseHtml = '';

export function createParser () {
    return new Parser({
        environment: new PhantomEnvironment({url})
    });
}

export function createServer () {
    return new Promise((resolve, reject) => {
        const server = http.createServer((request, response) => {
            response.statusCode = 200;
            response.end(`
                <html>
                <head>
                    <meta charset="utf-8">
                </head>
                <body>
                ${responseHtml}
                </body>
                </html>
            `);
        });

        server.listen(port, () => resolve());
    });
}

export function setServerResponse (html, fn) {
    responseHtml = html;

    if (fn) {
        responseHtml += `
            <script>
                ${fn.toString()}
                run();
            </script>
        `;
    }
}
