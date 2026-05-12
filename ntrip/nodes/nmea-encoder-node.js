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

        function updateStatus(ok) {
            node.status({
                fill: ok ? 'green' : 'red',
                shape: 'ring',
                text: 'NMEA: ' + node.nmeaMessagesReceived + ' Invalid: ' + node.invalidMessagesReceived,
            });
        }

        function safeToString(value) {
            if (value === undefined || value === null) {
                return '';
            }
            try {
                return String(value);
            } catch {
                return '';
            }
        }

        this.on('input', function (msg) {
            let payload = msg.payload;

            if (payload == null || payload.nmeaMessage == null || payload.messageType == null) {
                let errMsg = {
                    payload: {
                        error: 'Invalid input. Expected payload with nmeaMessage and messageType properties.',
                        input: payload,
                        inputString: safeToString(payload),
                    },
                };
                node.send([null, errMsg]);
                node.invalidMessagesReceived++;
                updateStatus(false);
                return;
            }

            let input = payload.nmeaMessage;

            try {
                let messageType = String(payload.messageType).toUpperCase();

                let nmeaMessage;
                if (input instanceof NmeaMessage) {
                    nmeaMessage = input;
                } else {
                    switch (messageType) {
                        case 'OBJECT':
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
                            throw new Error('Unsupported NMEA message type: ' + messageType);
                    }
                }

                let message = NmeaTransport.encode(nmeaMessage);

                let outMsg = {
                    payload: {
                        nmeaMessage: message,
                        messageType: payload.messageType,
                        input: input,
                    },
                };

                node.send([outMsg, null]);
                node.nmeaMessagesReceived++;
                updateStatus(true);
            } catch (ex) {
                let errMsg = {
                    payload: {
                        error: ex,
                        input: input,
                        inputString: safeToString(input),
                    },
                };
                node.send([null, errMsg]);
                node.invalidMessagesReceived++;
                updateStatus(false);
            }
        });

        this.on('close', function (done) {
            node.status({});
            done();
        });
    }

    return NmeaEncoderNode;
};
