/**
* Created by Karl-Heinz Wind
**/

module.exports = function (RED) {
    "use strict";
    	
    const pkg = require('./../package.json');
    RED.log.info('node-red-contrib-ntrip version: v' + pkg.version);

    const NtripClientNode = require('./nodes/ntrip-client-node.js')(RED);
    RED.nodes.registerType("NtripClient", NtripClientNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" },
        }
    });

    const RtcmDecoderNode = require('./nodes/rtcm-decoder-node.js')(RED);
    RED.nodes.registerType("RtcmDecoder", RtcmDecoderNode);

    const NmeaDecoderNode = require('./nodes/nmea-decoder-node.js')(RED);
    RED.nodes.registerType("NmeaDecoder", NmeaDecoderNode);

    const NmeaEncoderNode = require('./nodes/nmea-encoder-node.js')(RED);
    RED.nodes.registerType("NmeaEncoder", NmeaEncoderNode);
}