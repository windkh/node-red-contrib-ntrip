'use strict';

const helper = require('node-red-node-test-helper');
const { expect } = require('chai');
const ntripModule = require('../ntrip/99-ntrip.js');

helper.init(require.resolve('node-red'));

const GGA = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
const GLL = '$GPGLL,4916.45,N,12311.12,W,225444,A,*1D';

function flow() {
    return [
        { id: 'n1', type: 'NmeaDecoder', wires: [['ok'], ['err']] },
        { id: 'ok', type: 'helper' },
        { id: 'err', type: 'helper' },
    ];
}

describe('NmeaDecoder', function () {
    before(() => helper.startServer());
    after(() => helper.stopServer());
    afterEach(() => helper.unload());

    it('decodes a valid GGA sentence on the success output', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                ok.on('input', (msg) => {
                    try {
                        expect(msg.payload.messageType).to.equal('GGA');
                        expect(msg.payload.nmeaMessage).to.have.property('latitude');
                        expect(msg.payload.input).to.equal(GGA);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: GGA });
            });
        });
    });

    it('splits a multi-sentence chunk into separate output messages', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                const types = [];
                ok.on('input', (msg) => {
                    types.push(msg.payload.messageType);
                    if (types.length === 2) {
                        try {
                            expect(types).to.deep.equal(['GGA', 'GLL']);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
                n1.receive({ payload: GGA + '\r\n' + GLL + '\r\n' });
            });
        });
    });

    it('accepts a Buffer payload and decodes it as UTF-8', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                ok.on('input', (msg) => {
                    try {
                        expect(msg.payload.messageType).to.equal('GGA');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: Buffer.from(GGA, 'utf8') });
            });
        });
    });

    it('reads payload.nmeaMessage when payload is an object', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                ok.on('input', (msg) => {
                    try {
                        expect(msg.payload.messageType).to.equal('GGA');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: { nmeaMessage: GGA } });
            });
        });
    });

    it('error output preserves Buffer input as `input`, utf8 as `inputString`', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const err = helper.getNode('err');
                const garbage = Buffer.from([0xd3, 0x00, 0x13, 0x3e, 0xd0, 0x00]);
                err.on('input', (msg) => {
                    try {
                        expect(Buffer.isBuffer(msg.payload.input)).to.equal(true);
                        expect(msg.payload.input).to.deep.equal(garbage);
                        expect(msg.payload.inputString).to.be.a('string');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: garbage });
            });
        });
    });

    it('does not call node.error on decode failure (regression: log flood)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                let errorCalled = false;
                const originalError = n1.error.bind(n1);
                n1.error = function (...args) {
                    errorCalled = true;
                    return originalError(...args);
                };
                n1.receive({ payload: Buffer.from([0xd3, 0x00, 0x13, 0x3e]) });
                setTimeout(() => {
                    try {
                        expect(errorCalled).to.equal(false);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 50);
            });
        });
    });
});
