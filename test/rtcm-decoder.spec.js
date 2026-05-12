'use strict';

const helper = require('node-red-node-test-helper');
const { expect } = require('chai');
const ntripModule = require('../ntrip/99-ntrip.js');

helper.init(require.resolve('node-red'));

// A real RTCM 3 message type 1005 (Stationary RTK Reference Station ARP).
// 25 bytes total: 3-byte header + 19-byte payload + 3-byte CRC.
const RTCM_1005 = Buffer.from('D300133ED7D30202980EDEEF34B4BD62AC0941986F33360B98', 'hex');

function flow() {
    return [
        { id: 'n1', type: 'RtcmDecoder', wires: [['ok'], ['err']] },
        { id: 'ok', type: 'helper' },
        { id: 'err', type: 'helper' },
    ];
}

describe('RtcmDecoder', function () {
    before(() => helper.startServer());
    after(() => helper.stopServer());
    afterEach(() => helper.unload());

    it('decodes a valid RTCM 1005 frame on the success output', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                ok.on('input', msg => {
                    try {
                        expect(msg.payload.rtcm).to.equal(1005);
                        expect(msg.payload.messageType).to.be.a('string');
                        expect(msg.payload.message).to.be.an('object');
                        expect(Buffer.isBuffer(msg.payload.input)).to.equal(true);
                        resolve();
                    } catch (e) { reject(e); }
                });
                n1.receive({ payload: RTCM_1005 });
            });
        });
    });

    it('decodes two concatenated frames as two separate output messages', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                let count = 0;
                ok.on('input', () => {
                    count++;
                    if (count === 2) resolve();
                });
                n1.receive({ payload: Buffer.concat([RTCM_1005, RTCM_1005]) });
            });
        });
    });

    it('reassembles a frame split across two input events (carry-over buffer)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const ok = helper.getNode('ok');
                let received = false;
                ok.on('input', msg => {
                    if (received) return;
                    received = true;
                    try {
                        expect(msg.payload.rtcm).to.equal(1005);
                        resolve();
                    } catch (e) { reject(e); }
                });
                const half = Math.floor(RTCM_1005.length / 2);
                n1.receive({ payload: RTCM_1005.slice(0, half) });
                setImmediate(() => n1.receive({ payload: RTCM_1005.slice(half) }));
            });
        });
    });

    it('does not call node.error on decode failure (regression: log flood)', function () {
        return new Promise((resolve, reject) => {
            helper.load(ntripModule, flow(), () => {
                const n1 = helper.getNode('n1');
                const err = helper.getNode('err');
                let errorCalled = false;
                const originalError = n1.error.bind(n1);
                n1.error = function (...args) {
                    errorCalled = true;
                    return originalError(...args);
                };
                // A buffer of garbage larger than the pending-buffer cap triggers the
                // error-output path. node.error must NOT be called for that.
                const big = Buffer.alloc(70000, 0xFF);
                let errEmitted = false;
                err.on('input', () => { errEmitted = true; });
                n1.receive({ payload: big });
                setTimeout(() => {
                    try {
                        expect(errEmitted).to.equal(true);
                        expect(errorCalled).to.equal(false);
                        resolve();
                    } catch (e) { reject(e); }
                }, 200);
            });
        });
    });
});
