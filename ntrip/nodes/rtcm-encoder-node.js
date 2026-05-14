module.exports = function (RED) {
    'use strict';

    const { RtcmTransport, RtcmMessage } = require('@gnss/rtcm');

    // Maximum RTCM 3 frame size — 3-byte header + 1023-byte payload + 3-byte CRC.
    const MaxFrameBytes = 1029;

    function RtcmEncoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.rtcmMessagesReceived = 0;
        node.invalidMessagesReceived = 0;

        function updateStatus(ok) {
            node.status({
                fill: ok ? 'green' : 'red',
                shape: 'ring',
                text: 'RTCM: ' + node.rtcmMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
            });
        }

        this.on('input', function (msg) {
            let payload = msg.payload;

            // Accept either an RtcmMessage instance directly as msg.payload, or the
            // shape emitted by the RtcmDecoder (msg.payload.message). Anything else
            // routes to the error output.
            let message;
            if (payload instanceof RtcmMessage) {
                message = payload;
            } else if (payload != null && payload.message instanceof RtcmMessage) {
                message = payload.message;
            } else {
                node.send([
                    null,
                    {
                        payload: {
                            error: 'Invalid input. Expected an RtcmMessage instance as msg.payload, or msg.payload.message.',
                            input: payload,
                        },
                    },
                ]);
                node.invalidMessagesReceived++;
                updateStatus(false);
                return;
            }

            try {
                let buffer = Buffer.alloc(MaxFrameBytes);
                let length = RtcmTransport.encode(message, buffer);
                let encoded = buffer.slice(0, length);
                let messageType = message.constructor.name.replace('RtcmMessage', '');

                node.send([
                    {
                        payload: {
                            rtcmMessage: encoded,
                            rtcm: message.messageType,
                            messageType: messageType,
                            input: payload,
                        },
                    },
                    null,
                ]);
                node.rtcmMessagesReceived++;
                updateStatus(true);
            } catch (ex) {
                node.send([
                    null,
                    {
                        payload: {
                            error: ex,
                            input: payload,
                        },
                    },
                ]);
                node.invalidMessagesReceived++;
                updateStatus(false);
            }
        });

        this.on('close', function (done) {
            node.status({});
            done();
        });
    }

    return RtcmEncoderNode;
};
