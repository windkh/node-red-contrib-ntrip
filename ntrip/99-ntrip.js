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

    // Route for searching mountpoints.
    //RED.httpAdmin.get('/node-red-contrib-ntrip-getmountpints', async function (req, res) {

    //    let nodeId = req.query.node;
    //    const node = RED.nodes.getNode(nodeId);
    //    if (!node) {
    //        return res.status(404).json({ error: 'Node not found' });
    //    }
        
    //    const options = {
    //        host: node.host,
    //        port: node.port,
    //        mountpoint: '', // empty mount point gets the list of available ones.
    //        username: node.credentials.username,
    //        password: node.credentials.password,
    //    };
    //    let mountpoints = await NtripClient.getMountpoints(options);
    //    res.json(mountpoints);
    //});

    const RtcmDecoderNode = require('./nodes/rtcm-decoder-node.js')(RED);
    RED.nodes.registerType("RtcmDecoder", RtcmDecoderNode);

    const NmeaDecoderNode = require('./nodes/nmea-decoder-node.js')(RED);
    RED.nodes.registerType("NmeaDecoder", NmeaDecoderNode);
}