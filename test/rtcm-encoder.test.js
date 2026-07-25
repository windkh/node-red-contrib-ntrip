'use strict';
const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');

const helper = require('node-red-node-test-helper');
const { RtcmTransport, RtcmMessage } = require('@gnss/rtcm');
const ntripModule = require('../ntrip/99-ntrip.js');

helper.init(require.resolve('node-red'));

// A real RTCM 3 message type 1005 (Stationary RTK Reference Station ARP).
const RTCM_1005 = Buffer.from('D300133ED7D30202980EDEEF34B4BD62AC0941986F33360B98', 'hex');

function flow() {
    return [
        { id: 'n1', type: 'RtcmEncoder', wires: [['ok'], ['err']] },
        { id: 'ok', type: 'helper' },
        { id: 'err', type: 'helper' },
    ];
}

describe('RtcmEncoder', function () {
    before(() => helper.startServer());
    after(() => helper.stopServer());
    afterEach(() => helper.unload());

    it('encodes an RtcmMessage instance round-tripped from the decoder', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                const [instance] = RtcmTransport.decode(RTCM_1005);
                ok.on('input', (msg) => {
                    try {
                        assert.strictEqual(msg.payload.rtcm, 1005);
                        assert.strictEqual(typeof msg.payload.messageType, 'string');
                        assert.strictEqual(Buffer.isBuffer(msg.payload.rtcmMessage), true);
                        assert.deepStrictEqual(msg.payload.rtcmMessage, RTCM_1005);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: instance });
            });
        });
    });

    it('accepts the decoder output shape (msg.payload.message)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                const [instance, length] = RtcmTransport.decode(RTCM_1005);
                ok.on('input', (msg) => {
                    try {
                        assert.strictEqual(msg.payload.rtcm, 1005);
                        assert.strictEqual(Buffer.isBuffer(msg.payload.rtcmMessage), true);
                        assert.strictEqual(msg.payload.rtcmMessage.length, length);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                // Mimic the RtcmDecoder's success payload shape.
                n1.receive({
                    payload: {
                        rtcm: instance.messageType,
                        messageType: 'StationArp',
                        message: instance,
                        input: RTCM_1005,
                    },
                });
            });
        });
    });

    it('routes a non-RtcmMessage payload to the error output', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                const err = helper.getNode('err');
                ok.on('input', () => reject(new Error('unexpected success output')));
                err.on('input', (msg) => {
                    try {
                        assert.strictEqual(typeof msg.payload.error, 'string');
                        assert.ok(msg.payload.error.toLowerCase().includes('invalid'));
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: { foo: 'bar' } });
            });
        });
    });

    it('routes empty payload to the error output', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const err = helper.getNode('err');
                err.on('input', (msg) => {
                    try {
                        assert.ok(msg.payload.error !== undefined && msg.payload.error !== null);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                n1.receive({ payload: null });
            });
        });
    });

    it('does not call node.error on decode-shape failure (regression: log flood)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                let errorCalled = false;
                const originalError = n1.error.bind(n1);
                n1.error = function (...args) {
                    errorCalled = true;
                    return originalError(...args);
                };
                n1.receive({ payload: 'not-an-rtcm-message' });
                setTimeout(() => {
                    try {
                        assert.strictEqual(errorCalled, false);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                }, 50);
            });
        });
    });

    // Sanity check: RtcmMessage is exported and the test fixture decodes to an instance.
    it('test fixture sanity: decoded 1005 frame is an RtcmMessage instance', function () {
        const [instance] = RtcmTransport.decode(RTCM_1005);
        assert.ok(instance instanceof RtcmMessage);
    });
});
