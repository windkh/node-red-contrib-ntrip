module.exports = function (RED) {
    'use strict';

    const { RtcmTransport } = require('@gnss/rtcm');

    // Cap on pending bytes when a decode keeps failing — guards against runaway memory
    // if upstream feeds us garbage rather than truly-partial RTCM frames.
    const MaxPendingBytes = 65536;

    function RtcmDecoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.rtcmMessagesReceived = 0;
        node.invalidMessagesReceived = 0;
        node.pendingBuffer = Buffer.alloc(0);

        function updateStatus() {
            node.status({
                fill: 'green',
                shape: 'ring',
                text: 'RTCM: ' + node.rtcmMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
            });
        }

        this.on('input', function (msg) {
            if (msg.payload === undefined || msg.payload === null) {
                return;
            }

            let chunk = Buffer.isBuffer(msg.payload) ? msg.payload : Buffer.from(msg.payload);
            let buffer = node.pendingBuffer.length > 0
                ? Buffer.concat([node.pendingBuffer, chunk])
                : chunk;

            while (buffer.length > 0) {
                let message;
                let length;
                try {
                    [message, length] = RtcmTransport.decode(buffer);
                } catch (ex) {
                    // Likely a partial frame at the tail of this chunk — keep the bytes
                    // for the next input event. If we've accumulated too much without a
                    // successful decode, drop and emit an error.
                    if (buffer.length > MaxPendingBytes) {
                        let errMsg = {
                            payload: {
                                error: ex,
                                input: buffer,
                                inputString: buffer.toString()
                            }
                        };
                        node.send([null, errMsg]);
                        node.invalidMessagesReceived++;
                        buffer = Buffer.alloc(0);
                    }
                    break;
                }

                if (!Number.isInteger(length) || length <= 0 || length > buffer.length) {
                    // Defensive — guarantees forward progress even if the decoder ever
                    // returns a non-positive length.
                    break;
                }

                let messageType = message.constructor.name.replace('RtcmMessage', '');
                let outMsg = {
                    payload: {
                        rtcm: message.messageType,
                        messageType: messageType,
                        message: message,
                        input: buffer.slice(0, length)
                    }
                };
                node.send([outMsg, null]);
                node.rtcmMessagesReceived++;
                buffer = buffer.slice(length);
            }

            node.pendingBuffer = buffer;
            updateStatus();
        });

        this.on('close', function(done) {
            node.pendingBuffer = Buffer.alloc(0);
            node.status({});
            done();
        });
    }

    return RtcmDecoderNode;
};
