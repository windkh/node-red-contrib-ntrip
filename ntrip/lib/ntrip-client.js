// Code is a modified client taken from here https://github.com/dxhbiz/ntrip-client.
'use strict';

const { NtripClient } = require('ntrip-client');
const net = require('net');

// Orginal class is extended to be able to send data to the caster.
class NtripClientUploader extends NtripClient {
    constructor(options) {  
        super(options);
        this.authmode = options.authmode || 'legacy';
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
            const userAgent = this.userAgent;
            const username = this.username;
            const password = this.password;
            const host = this.host;
            const port = this.port;
            const authmode = this.authmode;
            const authorization = Buffer.from(
                username + ':' + password,
                'utf8'
            ).toString('base64');
        
            let data;
            switch (authmode) {
                case 'legacy': // Legacy --> rtk2Go accepts this. 
                    if (username === '' && password === '') {
                        data = `SOURCE ${mountpoint}\r\n\r\n`;
                    }
                    else {
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
                    throw new Error("Auth mode is not supported " + authmode);
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

function getMountpoints(options) {
    return new Promise(function (resolve, reject) {
        if (options !== undefined ) {
    
            const client = new NtripClient(options);

            client.on('error',(err) => {
                reject(err);
            });

            client.on('data', (data) => {
                resolve(data);
            });

            client.run();
        }
        else {
            resolve([]);
        }
    });
}

module.exports = {
    createDownloader,
    createUploader,
    getMountpoints
};