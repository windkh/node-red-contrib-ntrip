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

        function decodeOne(sentence, rawInput, rawString) {
            try {
                let nmeaMessage = NmeaTransport.decode(sentence);
                let messageType = nmeaMessage.constructor.name.replace('NmeaMessage', '').toUpperCase();

                node.send([
                    {
                        payload: {
                            messageType: messageType,
                            nmeaMessage: nmeaMessage,
                            input: sentence,
                        },
                    },
                    null,
                ]);
                node.nmeaMessagesReceived++;
            } catch (ex) {
                node.send([
                    null,
                    {
                        payload: {
                            error: ex,
                            input: rawInput,
                            inputString: rawString,
                        },
                    },
                ]);
                node.invalidMessagesReceived++;
            }
        }

        this.on('input', function (msg) {
            if (msg.payload === undefined || msg.payload === null) {
                return;
            }

            // rawInput is the value the user provided (Buffer, string, ...).
            // Keep it untouched so the error output can return it as-is.
            let rawInput = typeof msg.payload === 'object' && msg.payload.nmeaMessage !== undefined ? msg.payload.nmeaMessage : msg.payload;

            let rawString;
            if (Buffer.isBuffer(rawInput)) {
                rawString = rawInput.toString('utf8');
            } else if (typeof rawInput === 'string') {
                rawString = rawInput;
            } else {
                node.send([
                    null,
                    {
                        payload: {
                            error: 'Payload is neither string nor Buffer',
                            input: rawInput,
                            inputString: String(rawInput),
                        },
                    },
                ]);
                node.invalidMessagesReceived++;
                updateStatus();
                return;
            }

            // A single chunk may carry several sentences delimited by \r\n.
            let sentences = rawString.split(/\r?\n/);
            let any = false;
            for (let i = 0; i < sentences.length; i++) {
                let s = sentences[i].trim();
                if (s.length === 0) {
                    continue;
                }
                decodeOne(s, rawInput, rawString);
                any = true;
            }

            if (any) {
                updateStatus();
            }
        });

        this.on('close', function (done) {
            node.status({});
            done();
        });
    }

    return NmeaDecoderNode;
};
