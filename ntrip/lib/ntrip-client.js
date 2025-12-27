// Code is a modified client taken from here https://github.com/dxhbiz/ntrip-client.
'use strict';

const { NtripClient } = require('ntrip-client');
const net = require('net');

// Orginal class is extended to be able to send data to the caster.
class NtripClientUploader extends NtripClient {
    constructor(options) {  
        super(options);
    }

    _connect() {
        if (this.isClose) {
            return;
        }

        // init connection of client
        this.client = net.createConnection({
            host: this.host,
            port: this.port
        });

        // on timeout event
        this.client.on('timeout', () => {
            this._onError('socket timeouted');
        });

        // on connect event
        this.client.on('connect', () => {
            const mountpoint = this.mountpoint;
            const username = this.username;
            const password = this.password;
            
            let data;
            if (this.username === '' && this.password === '') {
                data = `SOURCE ${mountpoint}\r\n\r\n`;
            }
            else {
                const authorization = Buffer.from(
                    username + ':' + password,
                    'utf8'
                ).toString('base64');
            
                data = `SOURCE ${mountpoint}\r\nAuthorization: Basic ${authorization}\r\n\r\n`;            
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
    return new NtripClient(options)
}

function createUploader(options) {
    return new NtripClientUploader(options)
}

module.exports = {
    createDownloader,
    createUploader
};