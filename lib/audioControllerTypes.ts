export type Notice = { tone: 'success' | 'error'; message: string };
export type AudioLevels = { bass: number; treble: number; pulse: number; bandA: number; bandB: number };

export type AnalyzerLike = Pick<AnalyserNode, 'frequencyBinCount' | 'getByteFrequencyData'> & Partial<Pick<AnalyserNode, 'fftSize' | 'getByteTimeDomainData'>>;

export type SynthEngine = {
  context: AudioContext;
  analyser: AnalyserNode;
  mediaDestination: MediaStreamAudioDestinationNode;
  mainOsc: OscillatorNode;
  subOsc: OscillatorNode;
  filter: BiquadFilterNode;
  noteGain: GainNode;
  masterGain: GainNode;
  stepTimer: number | null;
  currentStep: number;
};

declare global {
  interface Window {
    __MONOSPHERE_FAKE_AUDIO_FACTORY__?: () => AnalyzerLike;
    __MONOSPHERE_FAKE_SHARED_STREAM_FACTORY__?: () => Promise<MediaStream> | MediaStream;
    __sharedAudioGain?: number;
    webkitAudioContext?: typeof AudioContext;
  }
}
