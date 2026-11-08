/**
 * DARK ALISE SoundPad v10.2 — WebRTC microphone mixer
 * Routes microphone + soundboard audio into supported outbound WebRTC audio.
 * Runs in the page MAIN world. User must grant normal microphone permission.
 */
(function () {
  'use strict';
  if (window.__darkAliseMixerV102) return;
  window.__darkAliseMixerV102 = true;

  var ctx = null, destination = null, sfxGain = null, micGain = null;
  var currentSource = null, currentMicStream = null;
  var mixedTrack = null;
  var wiredTracks = new WeakSet();

  function setup() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('Web Audio API unavailable');
    ctx = new AC();
    destination = ctx.createMediaStreamDestination();
    sfxGain = ctx.createGain();
    micGain = ctx.createGain();
    sfxGain.gain.value = 0.85;
    micGain.gain.value = 1.0;
    sfxGain.connect(destination);
    micGain.connect(destination);
    // Local monitoring: user hears the soundpad too.
    sfxGain.connect(ctx.destination);
    mixedTrack = destination.stream.getAudioTracks()[0];
  }

  async function resume() {
    setup();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  function report(state, extra) {
    try { window.postMessage(Object.assign({ __sp10: state }, extra || {}), '*'); } catch (_) {}
  }

  ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(function (type) {
    document.addEventListener(type, function () {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    }, { capture: true, passive: true });
  });

  try { setup(); } catch (e) { console.warn('[DARK ALISE] Audio setup deferred:', e); }

  function attachMicTrack(track) {
    setup();
    if (!track || track.kind !== 'audio' || track === mixedTrack || wiredTracks.has(track)) return;
    try {
      var source = ctx.createMediaStreamSource(new MediaStream([track]));
      source.connect(micGain);
      wiredTracks.add(track);
    } catch (e) {
      console.warn('[DARK ALISE] Could not attach microphone track:', e);
    }
  }

  // Main path: intercept microphone capture before the calling site receives it.
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var originalGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      if (!constraints || !constraints.audio) return originalGUM(constraints);
      var realStream;
      try {
        realStream = await originalGUM(constraints);
        await resume();
        realStream.getAudioTracks().forEach(attachMicTrack);

        // Give each call its own clone so the site cannot end the shared mixer track.
        var callTrack = mixedTrack.clone();
        var tracks = [callTrack].concat(realStream.getVideoTracks());
        var output = new MediaStream(tracks);
        currentMicStream = realStream;

        // Stop the real microphone when this call's cloned outbound track ends.
        callTrack.addEventListener('ended', function () {
          if (currentMicStream) {
            currentMicStream.getTracks().forEach(function (t) {
              try { t.stop(); } catch (_) {}
            });
            currentMicStream = null;
          }
        }, { once: true });

        report('hooked', { route: 'getUserMedia' });
        return output;
      } catch (err) {
        console.error('[DARK ALISE] Microphone mix failed:', err);
        report('fail', { message: String(err && err.message || err) });
        if (realStream) return realStream;
        throw err;
      }
    };
  }

  // Fallback path: some WebRTC apps add an audio track through a different capture path.
  if (window.RTCPeerConnection && RTCPeerConnection.prototype.addTrack) {
    var nativeAddTrack = RTCPeerConnection.prototype.addTrack;
    RTCPeerConnection.prototype.addTrack = function (track) {
      var args = Array.prototype.slice.call(arguments);
      if (track && track.kind === 'audio' && track !== mixedTrack) {
        try {
          setup();
          attachMicTrack(track);
          args[0] = mixedTrack.clone();
          report('hooked', { route: 'RTCPeerConnection.addTrack' });
        } catch (e) {
          console.warn('[DARK ALISE] addTrack fallback unavailable:', e);
        }
      }
      return nativeAddTrack.apply(this, args);
    };
  }

  window.addEventListener('message', async function (event) {
    var data = event.data;
    if (!data || !data.__sp10) return;
    try {
      switch (data.__sp10) {
        case 'init':
          await resume();
          report('ready');
          break;
        case 'ping':
          report(destination ? 'ready' : 'idle');
          break;
        case 'vol':
          setup();
          sfxGain.gain.value = Math.max(0, Math.min(1, Number(data.v) || 0));
          break;
        case 'stop':
          if (currentSource) {
            try { currentSource.stop(); } catch (_) {}
            try { currentSource.disconnect(); } catch (_) {}
            currentSource = null;
          }
          break;
        case 'play':
          await resume();
          if (currentSource) {
            try { currentSource.stop(); } catch (_) {}
            try { currentSource.disconnect(); } catch (_) {}
            currentSource = null;
          }
          try {
            var raw = data.buf;
            var copy = raw.slice ? raw.slice(0) : raw;
            var decoded = await ctx.decodeAudioData(copy);
            var source = ctx.createBufferSource();
            source.buffer = decoded;
            source.loop = !!data.loop;
            source.connect(sfxGain);
            source.start(0);
            currentSource = source;
            source.onended = function () {
              if (currentSource === source) {
                currentSource = null;
                report('ended');
              }
            };
          } catch (err) {
            console.error('[DARK ALISE] Sound playback failed:', err);
            report('ended');
          }
          break;
      }
    } catch (err) {
      console.error('[DARK ALISE] Mixer command failed:', err);
      report('fail', { message: String(err && err.message || err) });
    }
  });

  console.log('[DARK ALISE] SoundPad voice mixer v10.2 ready');
})();
