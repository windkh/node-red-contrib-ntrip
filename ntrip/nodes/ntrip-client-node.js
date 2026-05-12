module.exports = function (RED) {
    'use strict';

    const NtripClient = require("../lib/ntrip-client.js");
    const NtripServerOkReply = 'ICY 200 OK';
    const NtripServerNotOkReply = 'ICY 406';
    const NtripServerMissingMountpoint = 'SOURCETABLE 200 OK';
    const HandshakePrefixBytes = 64;

    function NtripClientNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.messagesReceived = 0;
        node.messagesSent = 0;
        node.passthrough = config.passthrough || false;

        let host = typeof config.host === 'string' ? config.host.trim() : '';
        let port = parseInt(config.port, 10) || 2101;
        let mountpoint = config.mountpoint;
        let mode = config.mode || 'download';
        let authmode = config.authmode || 'legacy';
        let interval = parseInt(config.interval, 10) || 1000;

        if (host === '') {
            node.status({ fill: 'red', shape: 'ring', text: 'Host not configured' });
            return;
        }

        let options = {
            host: host,
            port: port,
            mountpoint: mountpoint,
            username: node.credentials.username,
            password: node.credentials.password,
            interval: interval,
        };

        // Depending on the caster the clients need to provide the location via GGA sentence.
        let x = parseFloat(config.xcoordinate);
        let y = parseFloat(config.ycoordinate);
        let z = parseFloat(config.zcoordinate);

        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
            && !(x === 0 && y === 0 && z === 0)) {
            options.xyz = [x, y, z];
        }

        let client;
        if (mode === 'download') {
            client = NtripClient.createDownloader(options);
        }
        else if (mode === 'upload') {
            options.authmode = authmode;
            try {
                client = NtripClient.createUploader(options);
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: String(error.message || error) });
                node.error('Failed to create uploader: ' + (error.message || error));
                return;
            }
        }
        else {
            node.status({ fill: 'red', shape: 'ring', text: 'Unsupported mode: ' + mode });
            node.error('Mode not supported: ' + mode);
            return;
        }

        // Track handshake state so we only intercept control replies during the handshake,
        // not on every subsequent data packet. Reset on socket close so reconnects work.
        let connected = false;

        function updateStatus() {
            node.status({
                fill: 'green',
                shape: 'ring',
                text: 'Rx ' + node.messagesReceived + ' Tx ' + node.messagesSent,
            });
        }

        client.on('data', (data) => {
            if (!connected) {
                let prefix = data.toString('utf8', 0, Math.min(data.length, HandshakePrefixBytes));
                if (prefix.startsWith(NtripServerOkReply)) {
                    connected = true;
                    node.status({ fill: 'green', shape: 'ring', text: 'NTRIP server connected.' });
                    // Forward any RTCM bytes that arrived in the same TCP segment as the handshake reply.
                    let headerEnd = data.indexOf('\r\n\r\n');
                    if (headerEnd !== -1 && headerEnd + 4 < data.length) {
                        node.messagesReceived++;
                        node.send({ payload: data.slice(headerEnd + 4) });
                        updateStatus();
                    }
                    return;
                }
                if (prefix.startsWith(NtripServerNotOkReply)) {
                    node.status({ fill: 'red', shape: 'ring', text: 'NTRIP server rejected connection.' });
                    node.error('Server rejected connect: ' + prefix);
                    return;
                }
                if (prefix.startsWith(NtripServerMissingMountpoint)) {
                    node.status({ fill: 'red', shape: 'ring', text: 'No mountpoint ' + mountpoint });
                    node.error('No mountpoint: ' + prefix);
                    return;
                }
                // Unexpected: data arrived before any recognised handshake reply.
                // Treat as connected so we don't drop further frames.
                connected = true;
            }

            node.messagesReceived++;
            node.send({ payload: data });
            updateStatus();
        });

        client.on('close', () => {
            connected = false;
            node.log('Closed NTRIP connection.');
        });

        client.on('error', (error) => {
            connected = false;
            if (typeof AggregateError !== 'undefined' && error instanceof AggregateError) {
                error.errors.forEach((e, i) => {
                    node.log('Error ' + (i + 1) + ': ' + e.message);
                    node.error('Error: ' + e.message);
                });
            } else {
                let text = (error && error.message) ? error.message : String(error);
                node.log(text);
                node.error('Error: ' + text);
            }
        });

        try {
            client.run();
        } catch (error) {
            node.status({ fill: 'red', shape: 'ring', text: String(error.message || error) });
            node.error('Failed to start client: ' + (error.message || error));
            return;
        }

        node.status({ fill: 'yellow', shape: 'ring', text: 'connecting...' });

        this.on('input', function (msg) {
            let payload = msg.payload;
            if (payload === undefined || payload === null) {
                return;
            }

            try {
                if (Array.isArray(payload)) {
                    client.setXYZ(payload);
                }
                else {
                    client.write(payload);
                    node.messagesSent++;
                    if (node.passthrough) {
                        node.send(msg);
                    }
                    updateStatus();
                }
            } catch (error) {
                let text = (error && error.message) ? error.message : String(error);
                node.status({ fill: 'red', shape: 'ring', text: text });
                node.error('Failed to write data: ' + text, msg);
            }
        });

        this.on('close', function(done) {
            try {
                client.removeAllListeners();
                client.close();
            } catch (e) {
                // ignore — node is shutting down anyway
            }
            node.status({});
            done();
        });
    }

    return NtripClientNode;
};
