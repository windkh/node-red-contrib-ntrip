module.exports = function (RED) {
    'use strict';

    const { NmeaTransport, NmeaMessageUnknown } = require('@gnss/nmea');

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
                        inputString : buffer.toString()
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

    return NmeaDecoderNode;
};