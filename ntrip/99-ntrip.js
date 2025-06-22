/**
* Created by Karl-Heinz Wind
**/

module.exports = function (RED) {
    "use strict";
    	
    const { RtcmTransport, RtcmMessage, RtcmMessageType } = require('@gnss/rtcm');
    const { NmeaTransport, NmeaMessageUnknown } = require('@gnss/nmea');
    const { NtripClient } = require('ntrip-client');

    // --------------------------------------------------------------------------------------------
    // NTRIP client node.
    function NtripClientNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.messagesReceived = 0;

        if(config.host !== undefined ) {

            let options = {
                host: config.host,
                port: config.port || 2101,
                mountpoint: config.mountpoint,
                username: node.credentials.username,
                password: node.credentials.password,
                interval: config.interval,
            };

            let x = config.xcoordinate;
            let y = config.ycoordinate;
            let z = config.zcoordinate;
            
            if (x !== undefined && x !== 0 &&
                y !== undefined && y !== 0 &&
                z !== undefined && z !== 0) {
                options.xyz = [x, y, z];
            }

            const client = new NtripClient(options);

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
                node.send(msg);
            });

            client.on('close', () => {
                node.log('Closed NTRIP connection.');
            });

            client.on('error', (err) => {
                node.log(err);
            });

            client.run();
            node.status({
                fill: 'green',
                shape: 'ring',
                text: 'ok',
            });

            this.on('close', function(done) {
                client.close();
                node.status({});
                done();
            });
        }
    }
    RED.nodes.registerType("NtripClient", NtripClientNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });


    // --------------------------------------------------------------------------------------------
    // RTCM decoder node.
    function RtcmDecoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.rtcmMessagesReceived = 0;
        node.invalidMessagesReceived = 0;

        this.on('input', function (msg) {

            let buffer = msg.payload;
            try
            {
                let message;
                let length;
                [message, length] = RtcmTransport.decode(buffer);     
                
                let messageType = message.constructor.name.replace('RtcmMessage', '');

                let msg = {
                    payload : {
                        rtcm : message.messageType,
                        messageType : messageType,
                        message : message,
                        input : buffer,
                        length : length
                    }
                };

                // TODO: slice buffer and iterate.
                node.send([msg, null]);
                node.rtcmMessagesReceived++;
            }
            catch(ex)
            {
                let msg = {
                    payload : {
                        error : ex,
                        input : buffer,
                    }
                };
                node.send([null, msg]);
                node.invalidMessagesReceived++;
            }

            node.status({
                fill: 'green',
                    shape: 'ring',
                    text: 'RTCM: ' + node.rtcmMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
                });
        });

        this.on('close', function(done) {
            node.status({});
            done();
        });
    }
    RED.nodes.registerType("RtcmDecoder", RtcmDecoderNode);

        // --------------------------------------------------------------------------------------------
    // NMEA decoder node.
    function NmeaDecoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.nmeaMessagesReceived = 0;
        node.invalidMessagesReceived = 0;

        this.on('input', function (msg) {

            let buffer = msg.payload;
            if(Buffer.isBuffer(buffer)){
                buffer = buffer.toString();
            }
            
            try
            {
                let message = NmeaTransport.decode(buffer);   
                let messageType = message.constructor.name.replace('NmeaMessage', '').toUpperCase();

                let msg = {
                    payload : {
                        messageType : messageType,
                        message : message,   
                        input : buffer
                    },
                };

                node.send([msg, null]);
                node.nmeaMessagesReceived++;
            }
            catch(ex)
            {
                let msg = {
                    payload : {
                        error : ex,
                        input : buffer,
                    }
                };
                node.send([null, msg]);
                node.invalidMessagesReceived++;
            }

            node.status({
                fill: 'green',
                    shape: 'ring',
                    text: 'NMEA: ' + node.nmeaMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
                });
        });

        this.on('close', function(done) {
            node.status({});
            done();
        });
    }
    RED.nodes.registerType("NmeaDecoder", NmeaDecoderNode);
}