module.exports = function (RED) {
    'use strict';

    const NtripClient = require("../lib/ntrip-client.js");
    const NtripServerOkReply = 'ICY 200 OK';
    const NtripServerNotOkReply = 'ICY 406';
    const NtripServerMissingMountpoint = 'SOURCETABLE 200 OK';

    function NtripClientNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.messagesReceived = 0;
        let host = config.host;
        let port = config.port || 2101;
        let mountpoint = config.mountpoint;
        let mode = config.mode || 'download';
        let authmode = config.authmode || 'legacy';
        node.passthrough = config.passthrough || false;
        
        let client;
        if(host !== undefined ) {

            let options = {
                host: host,
                port: port,
                mountpoint: mountpoint,
                username: node.credentials.username,
                password: node.credentials.password,
                interval: config.interval,
            };

            // Depending on the caster the clients need to provide the location via GGA sentence.
            let x = config.xcoordinate;
            let y = config.ycoordinate;
            let z = config.zcoordinate;
            
            if (x !== undefined && x !== 0 &&
                y !== undefined && y !== 0 &&
                z !== undefined && z !== 0) {
                options.xyz = [x, y, z];
            }
            
            if (mode === 'download') {
                // Clients only consume ntrip data.
                client = NtripClient.createDownloader(options);
            }
            else  if (mode === 'upload') {
                // Uploaders send RTCM data to a mountpoint so that clients can consume it.
                options.authmode = authmode;
                client = NtripClient.createUploader(options);
            }
            else {
                node.error('Mode not supported ' + mode);
            }

            client.on('data', (data) => {
                node.messagesReceived++;
                node.status({
                    fill: 'green',
                    shape: 'ring',
                    text: 'Messages ' + node.messagesReceived,
                });

                let msg = {
                    payload : data
                }

                // check if ICY 200 OK
                const response = data.toString();
                if (response.startsWith(NtripServerOkReply)) {
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'NTRIP server connected.',
                    }); 
                }
                // check if ICY 406 Not Acceptable
                else if (response.startsWith(NtripServerNotOkReply)) {
                    node.status({
                        fill: 'red',
                        shape: 'ring',
                        text: 'NTRIP server rejected connection.',
                    }); 
                    node.error('Server rejected connect: ' + response); 
                } 
                else if (response.startsWith(NtripServerMissingMountpoint)) {
                    node.status({
                        fill: 'red',
                        shape: 'ring',
                        text: 'No mountpont ' + mountpoint,
                    });
                    node.error('No mountpoint: ' + response); 
                }
                else {
                    node.send(msg);    
                }
            });

            client.on('close', () => {
                node.log('Closed NTRIP connection.');
            });

            client.on('error', (error) => {
                if (error instanceof AggregateError) {
                    error.errors.forEach((e, i) => {
                        node.log(`Error ${i + 1}: ${e.message}`);
                        node.error('Error: ' + e.message);
                    });
                } else {
                    node.log(error);
                    node.error('Error: ' + error);
                }
            });

            client.run();
            node.status({
                fill: 'green',
                shape: 'ring',
                text: 'ok',
            });

            this.on('input', async function (msg) {
                if (msg.payload) {
                    node.messagesReceived++;
                    node.status({
                        fill: 'green',
                        shape: 'ring',
                        text: 'Messages ' + node.messagesReceived,
                    });

                    try {
                        let data = msg.payload;
                        if (Array.isArray(data)) {
                            client.setXYZ(data);
                        } 
                        else {
                            client.write(data);

                            if(node.passthrough) {
                                node.send(msg);
                            }
                        }
                    } catch (error) {
                        node.status({ fill: 'red', shape: 'ring', text: error });
                        node.error('Failed to write data: ' + error, error);
                    }
                }
            });

            this.on('close', function(done) {
                client.close();
                node.status({});
                done();
            });
        }
    }
    
    return NtripClientNode;
};