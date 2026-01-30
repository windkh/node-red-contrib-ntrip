module.exports = function (RED) {
    'use strict';

    const { 
        NmeaTransport, 
        NmeaMessageUnknown,
        NmeaMessage,
        NmeaMessageDtm,
        NmeaMessageGbs,
        NmeaMessageGga,
        NmeaMessageGll,
        NmeaMessageGns, 
        NmeaMessageGrs, 
        NmeaMessageGsa,
        NmeaMessageGst,
        NmeaMessageGsv,
        NmeaMessageRmc,
        NmeaMessageThs,
        NmeaMessageTxt,
        NmeaMessageVhw,
        NmeaMessageVlw,
        NmeaMessageVpw,
        NmeaMessageVtg,
        NmeaMessageZda,
    } = require('@gnss/nmea');

    function NmeaEncoderNode(config) {
        RED.nodes.createNode(this, config);
        let node = this;
        node.nmeaMessagesReceived = 0;
        node.invalidMessagesReceived = 0;

        this.on('input', function (msg) {

            let input = msg.payload.nmeaMessage;
            let isNmeaMessage = input.prototype instanceof NmeaMessage; 
            let messageType = msg.payload.messageType;
            messageType = messageType.toUpperCase();
                   
            try
            {
                let message;
                let nmeaMessage;
                if(isNmeaMessage){
                    nmeaMessage = input; // is already a NmeaMessage
                }
                else {
                    
                    switch (messageType) {
                        case 'Object':
                            nmeaMessage = NmeaMessageUnknown.construct(input);
                            break;
                        case 'DTM':
                            nmeaMessage = NmeaMessageDtm.construct(input);
                            break;
                        case 'GBS':
                            nmeaMessage = NmeaMessageGbs.construct(input);
                            break;
                        case 'GGA':
                            nmeaMessage = NmeaMessageGga.construct(input);
                            break;
                        case 'GLL':
                            nmeaMessage = NmeaMessageGll.construct(input);
                            break;
                        case 'GNS':
                            nmeaMessage = NmeaMessageGns.construct(input);
                            break;
                        case 'GRS':
                            nmeaMessage = NmeaMessageGrs.construct(input);
                            break;
                        case 'GSA':
                            nmeaMessage = NmeaMessageGsa.construct(input);
                            break;
                        case 'GST':
                            nmeaMessage = NmeaMessageGst.construct(input);
                            break;
                        case 'GSV':
                            nmeaMessage = NmeaMessageGsv.construct(input);
                            break;
                        case 'RMC':
                            nmeaMessage = NmeaMessageRmc.construct(input);
                            break;
                        case 'THS':
                            nmeaMessage = NmeaMessageThs.construct(input);
                            break;
                        case 'TXT':
                            nmeaMessage = NmeaMessageTxt.construct(input);
                            break;
                        case 'VHW':
                            nmeaMessage = NmeaMessageVhw.construct(input);
                            break;
                        case 'VLW':
                            nmeaMessage = NmeaMessageVlw.construct(input);
                            break;
                        case 'VPW':
                            nmeaMessage = NmeaMessageVpw.construct(input);
                            break;
                        case 'VTG':
                            nmeaMessage = NmeaMessageVtg.construct(input);
                            break;
                        case 'ZDA':
                            nmeaMessage = NmeaMessageZda.construct(input);
                            break;
                        default:
                            // message could not be converted.
                            break;
                    }
                }

                if (nmeaMessage !== undefined) {
                    message = NmeaTransport.encode(nmeaMessage); 
                }
                
                let msg = {
                    payload : {
                        nmeaMessage : message,   
                        input : input
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
                        input : input,
                        inputString : input.toString()
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

    return NmeaEncoderNode;
};