import { MutableRefObject } from 'react';
import type { ParticleConfig } from '../types';
import { createFakeSharedAudioAnalyzer } from './audioAnalysis';
import { attachStreamAnalyzer } from './audioSourceUtils';
import { AudioControllerRefs, AudioControllerSetters } from './audioSourceTypes';

export async function startMicrophoneAudioSource(
  refs: AudioControllerRefs,
  setters: AudioControllerSetters,
) {
  const fakeAnalyzer = window.__MONOSPHERE_FAKE_AUDIO_FACTORY__?.();
  if (fakeAnalyzer) {
    refs.analyzerRef.current = fakeAnalyzer;
    setters.setIsAudioActive(true);
    setters.setConfig((prev) => ({ ...prev, audioEnabled: true }));
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  await attachStreamAnalyzer(stream, refs.microphoneStreamRef, refs, setters);
}

export async function startSharedAudioSource(
  latestConfigRef: MutableRefObject<ParticleConfig>,
  refs: AudioControllerRefs,
  setters: AudioControllerSetters,
  stopAudio: () => void,
) {
  const fakeSharedStream = await window.__MONOSPHERE_FAKE_SHARED_STREAM_FACTORY__?.();
  if (fakeSharedStream) {
    if (typeof window.__sharedAudioGain === 'number') {
      refs.analyzerRef.current = createFakeSharedAudioAnalyzer();
      refs.sharedAudioStreamRef.current = fakeSharedStream;
      setters.setIsAudioActive(true);
      setters.setConfig((prev) => ({ ...prev, audioEnabled: true }));
    } else {
      await attachStreamAnalyzer(fakeSharedStream, refs.sharedAudioStreamRef, refs, setters);
    }
    setters.setAudioNotice({ tone: 'success', message: 'Shared audio connected.' });
    return;
  }

  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Display audio capture is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true,
  });

  const stopWhenShareEnds = () => {
    if (refs.sharedAudioStreamRef.current === stream) {
      setters.setAudioNotice({ tone: 'error', message: 'Shared audio ended. Start sharing again to keep the visuals reactive.' });
      stopAudio();
    }
  };

  stream.getTracks().forEach((track) => {
    track.addEventListener('ended', stopWhenShareEnds, { once: true });
  });

  await attachStreamAnalyzer(stream, refs.sharedAudioStreamRef, refs, setters);
  setters.setAudioNotice({ tone: 'success', message: 'Shared audio connected.' });
}
