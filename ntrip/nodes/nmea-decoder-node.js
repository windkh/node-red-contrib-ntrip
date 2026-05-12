module.exports = function (RED) {
    'use strict';

    const { NmeaTransport } = require('@gnss/nmea');

    function NmeaDecoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.nmeaMessagesReceived = 0;
        node.invalidMessagesReceived = 0;

        function updateStatus() {
            node.status({
                fill: 'green',
                shape: 'ring',
                text: 'NMEA: ' + node.nmeaMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
            });
        }

        function decodeOne(sentence, originalMsg) {
            try {
                let nmeaMessage = NmeaTransport.decode(sentence);
                let messageType = nmeaMessage.constructor.name.replace('NmeaMessage', '').toUpperCase();

                node.send([{
                    payload: {
                        messageType: messageType,
                        nmeaMessage: nmeaMessage,
                        input: sentence
                    }
                }, null]);
                node.nmeaMessagesReceived++;
            } catch (ex) {
                node.send([null, {
                    payload: {
                        error: ex,
                        input: sentence,
                        inputString: String(sentence)
                    }
                }]);
                node.error(ex, originalMsg);
                node.invalidMessagesReceived++;
            }
        }

        this.on('input', function (msg) {
            if (msg.payload === undefined || msg.payload === null) {
                return;
            }

            let raw = (typeof msg.payload === 'object' && msg.payload.nmeaMessage !== undefined)
                ? msg.payload.nmeaMessage
                : msg.payload;

            if (Buffer.isBuffer(raw)) {
                raw = raw.toString('utf8');
            }
            if (typeof raw !== 'string') {
                node.send([null, {
                    payload: {
                        error: 'Payload is neither string nor Buffer',
                        input: raw,
                        inputString: String(raw)
                    }
                }]);
                node.invalidMessagesReceived++;
                updateStatus();
                return;
            }

            // A single chunk may carry several sentences delimited by \r\n.
            let sentences = raw.split(/\r?\n/);
            let any = false;
            for (let i = 0; i < sentences.length; i++) {
                let s = sentences[i].trim();
                if (s.length === 0) {
                    continue;
                }
                decodeOne(s, msg);
                any = true;
            }

            if (any) {
                updateStatus();
            }
        });

        this.on('close', function(done) {
            node.status({});
            done();
        });
    }

    return NmeaDecoderNode;
};
