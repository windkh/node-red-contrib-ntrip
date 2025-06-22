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
                // TODO: xyz, ... see https://github.com/dxhbiz/ntrip-client/blob/master/lib/client.js
            };

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
                let msg = {
                    payload : {
                        messageType : message.messageType,
                        message : message,
                        info : message.info,
                    },
                    length : length,
                    buffer : buffer,
                };

                // TODO: slice buffer and iterate.
                node.send([msg, null]);
                node.rtcmMessagesReceived++;
            }
            catch(ex)
            {
                let msg = {
                    payload : ex,
                    buffer : buffer,
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
            try
            {
                let message = NmeaTransport.decode(buffer);   
                let messageType = message.constructor.name.replace('NmeaMessage', '').toUpperCase();

                let msg = {
                    payload : {
                        messageType : messageType,
                        message : message,
                    },
                    buffer : buffer,
                };

                node.send([msg, null]);
                node.nmeaMessagesReceived++;
            }
            catch(ex)
            {
                let msg = {
                    payload : ex,
                    buffer : buffer,
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