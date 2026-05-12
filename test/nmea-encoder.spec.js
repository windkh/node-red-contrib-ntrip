'use strict';

const helper = require('node-red-node-test-helper');
const { expect } = require('chai');
const { NmeaTransport } = require('@gnss/nmea');
const ntripModule = require('../ntrip/99-ntrip.js');

helper.init(require.resolve('node-red'));

const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';

function flow() {
    return [
        { id: 'n1', type: 'NmeaEncoder', wires: [['ok'], ['err']] },
        { id: 'ok', type: 'helper' },
        { id: 'err', type: 'helper' },
    ];
}

describe('NmeaEncoder', function () {
    before(() => helper.startServer());
    after(() => helper.stopServer());
    afterEach(() => helper.unload());

    it('encodes a pre-constructed NmeaMessage instance (instanceof passthrough)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                const instance = NmeaTransport.decode(GGA);
                ok.on('input', (msg) => {
                    try {
                        expect(msg.payload.nmeaMessage).to.be.a('string');
                        expect(msg.payload.nmeaMessage).to.match(/^\$.+\*[0-9A-Fa-f]{2}\r?\n?$/);
                        expect(msg.payload.nmeaMessage).to.include('GGA');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                // Even with a bogus messageType, an instance must take precedence and
                // flow straight through to NmeaTransport.encode without re-construction.
                n1.receive({ payload: { messageType: 'NONSENSE', nmeaMessage: instance } });
            });
        });
    });

    it('routes unknown messageType to the error output (no silent success)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                const err = helper.getNode('err');
                ok.on('input', () => reject(new Error('unexpected success output')));
                err.on('input', (msg) => {
                    try {
                        expect(msg.payload.error).to.exist;
                        expect(String(msg.payload.error).toLowerCase()).to.include('unsupported');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: { messageType: 'XYZ', nmeaMessage: { foo: 1 } } });
            });
        });
    });

    it('routes missing nmeaMessage to the error output without crashing', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const err = helper.getNode('err');
                err.on('input', (msg) => {
                    try {
                        expect(msg.payload.error).to.exist;
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: { messageType: 'GGA' } });
            });
        });
    });

    it('routes empty payload to the error output without crashing', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const err = helper.getNode('err');
                err.on('input', (msg) => {
                    try {
                        expect(msg.payload.error).to.exist;
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: {} });
            });
        });
    });
});
