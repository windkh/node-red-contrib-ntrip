module.exports = function (RED) {
    'use strict';

    const { RtcmTransport, RtcmMessage, RtcmMessageType } = require('@gnss/rtcm');
   
    function RtcmDecoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.rtcmMessagesReceived = 0;
        node.invalidMessagesReceived = 0;

        this.on('input', function (msg) {

            let done = false;
            let buffer = msg.payload;
            try
            {
                do {
                    let message;
                    let length;
                    [message, length] = RtcmTransport.decode(buffer);     
                    
                    let messageType = message.constructor.name.replace('RtcmMessage', '');

                    let msg = {
                        payload : {
                            rtcm : message.messageType,
                            messageType : messageType,
                            message : message,
                            input : buffer
                        }
                    };

                    node.send([msg, null]);
                    node.rtcmMessagesReceived++;

                    // find next message in buffer.
                    buffer = buffer.slice(length);
                    if(buffer.length == 0){
                        done = true;
                    }
                } while(!done);
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
                    text: 'RTCM: ' + node.rtcmMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
                });
        });

        this.on('close', function(done) {
            node.status({});
            done();
        });
    }
    
    return RtcmDecoderNode;
};