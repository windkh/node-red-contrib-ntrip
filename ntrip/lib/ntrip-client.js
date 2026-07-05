// Code is a modified client taken from here https://github.com/dxhbiz/ntrip-client.
'use strict';

const { NtripClient } = require('ntrip-client');
const net = require('net');

// Backoff schedule for reconnect attempts, in milliseconds. The upstream
// client's default is a fixed 2000ms interval which flooded casters (and the
// Node-RED error log) when a server was down for a while. See issue on repeated
// error output during outages. The last entry acts as a cap for further retries.
const RECONNECT_BACKOFF_MS = [1000, 2000, 5000, 10000];

// Extends the upstream client with an exponential backoff on reconnect.
// The schedule advances on each failed reconnect and resets to the first
// entry as soon as the caster completes the handshake (`ICY 200 OK`).
class NtripClientWithBackoff extends NtripClient {
    constructor(options) {
        super(options);
        this._backoffIndex = 0;
        this.reconnectInterval = RECONNECT_BACKOFF_MS[0];
    }

    _onData(data) {
        const wasReady = this.isReady;
        super._onData(data);
        // Reset the backoff schedule the moment the handshake completes —
        // subsequent connection failures start over at the first entry.
        if (!wasReady && this.isReady) {
            this._backoffIndex = 0;
            this.reconnectInterval = RECONNECT_BACKOFF_MS[0];
        }
    }

    async _reconnect() {
        const step = Math.min(this._backoffIndex, RECONNECT_BACKOFF_MS.length - 1);
        this.reconnectInterval = RECONNECT_BACKOFF_MS[step];
        this._backoffIndex++;
        return super._reconnect();
    }
}

// Orginal class is extended to be able to send data to the caster.
class NtripClientUploader extends NtripClientWithBackoff {
    constructor(options) {
        super(options);
        this.authmode = options.authmode || 'legacy';

        // Reject CR/LF in user-supplied fields that are interpolated into the
        // handshake string, to prevent header injection.
        for (const field of ['mountpoint', 'username', 'password']) {
            const value = this[field];
            if (typeof value === 'string' && /[\r\n]/.test(value)) {
                throw new Error('Invalid character in ' + field + ': CR/LF not allowed');
            }
        }
    }

    _connect() {
        if (this.isClose) {
            return;
        }

        // init connection of client
        this.client = net.createConnection({
            host: this.host,
            port: this.port,
        });

        // on timeout event
        this.client.on('timeout', () => {
            this._onError('socket timeout');
        });

        // on connect event
        this.client.on('connect', () => {
            const mountpoint = this.mountpoint;
            const userAgent = this.userAgent;
            const username = this.username;
            const password = this.password;
            const host = this.host;
            const port = this.port;
            const authmode = this.authmode;
            const authorization = Buffer.from(username + ':' + password, 'utf8').toString('base64');

            let data;
            switch (authmode) {
                case 'legacy': // Legacy --> rtk2Go accepts this.
                    if (username === '' && password === '') {
                        data = `SOURCE ${mountpoint}\r\n\r\n`;
                    } else {
                        data = `SOURCE ${password} /${mountpoint}\r\nSource-Agent: NTRIP ${username}\r\n\r\n`;
                    }
                    break;
                case 'hybrid': // hybrid (legacy + http auth) --> SNIP accepts this.
                    data = `SOURCE ${mountpoint}\r\nAuthorization: Basic ${authorization}\r\n\r\n`;
                    break;
                case 'ntripv1': // NTRIP V1 POST
                    data = `POST /${mountpoint} HTTP/1.0\r\nUser-Agent: NTRIP ${userAgent}\r\nAuthorization: Basic ${authorization}\r\nContent-Type: gnss/data\r\n\r\n`;
                    break;
                case 'ntripv2': // NTRIP V2 POST
                    data = `POST /${mountpoint} HTTP/1.1\r\nHost: ${host}:${port}\r\nUser-Agent: NTRIP ${userAgent}\r\nAuthorization: Basic ${authorization}\r\nNtrip-Version: Ntrip/2.0\r\nContent-Type: gnss/data\r\nConnection: keep-alive\r\n\r\n`;
                    break;
                default:
                    throw new Error('Auth mode is not supported ' + authmode);
            }

            this.client.write(data);
        });

        // on data event
        this.client.on('data', (data) => {
            this._onData(data);
        });

        // on end event
        this.client.on('end', () => {
            this._onError('socket ended');
        });

        // on close event
        this.client.on('close', () => {
            this._onError('socket closed');
        });

        // on error event
        this.client.on('error', (err) => {
            // TODO: check for code = ECONNREFUSED
            this._onError(err);
        });

        this.client.setTimeout(this.timeout);
    }
}

function createDownloader(options) {
    return new NtripClientWithBackoff(options);
}

function createUploader(options) {
    return new NtripClientUploader(options);
}

module.exports = {
    createDownloader,
    createUploader,
};
