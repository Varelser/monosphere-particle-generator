import React from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ParticleConfig } from '../types';
import { getConfigPerformanceScore } from '../lib/performanceHints';
import { getBurstDriveEnergy } from './sceneBurstDrive';
import { ParticleSystem, SceneGroup, ScreenOverlay, ScreenshotManager } from './scenePrimitives';
import { GpgpuSystem } from './sceneGpgpuSystem';

extend({
  InstancedMesh: THREE.InstancedMesh,
  ShaderMaterial: THREE.ShaderMaterial,
  Group: THREE.Group,
  LineSegments: THREE.LineSegments,
  PlaneGeometry: THREE.PlaneGeometry,
  BufferGeometry: THREE.BufferGeometry,
});

type AppSceneProps = {
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number }>;
  config: ParticleConfig;
  interLayerContactAmount: number;
  isPlaying: boolean;
  isSequencePlaying: boolean;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  saveTrigger: number;
  sequenceStepProgress: number;
};

function getQualityDprRange(quality: ParticleConfig['renderQuality']) {
  if (quality === 'draft') return [1, 1.25] as [number, number];
  if (quality === 'cinematic') return [1, 2] as [number, number];
  return [1, 1.5] as [number, number];
}

function getAdaptiveDprRange(config: ParticleConfig) {
  const [minDpr, maxDpr] = getQualityDprRange(config.renderQuality);
  const score = getConfigPerformanceScore(config);
  if (score >= 10) return [1, Math.min(1.1, maxDpr)] as [number, number];
  if (score >= 7) return [1, Math.min(1.25, maxDpr)] as [number, number];
  if (score >= 5) return [minDpr, Math.min(1.35, maxDpr)] as [number, number];
  return [minDpr, maxDpr] as [number, number];
}

function shouldUseAntialias(config: ParticleConfig) {
  return config.renderQuality !== 'draft' && getConfigPerformanceScore(config) < 7.5;
}

function getDefaultCameraPosition(config: ParticleConfig) {
  if (config.viewMode === 'orthographic') {
    return new THREE.Vector3(0, 0, 500);
  }
  return new THREE.Vector3(0, 0, config.cameraDistance + 200);
}

const SceneBackgroundSync: React.FC<{ backgroundColor: ParticleConfig['backgroundColor'] }> = ({ backgroundColor }) => {
  const { gl, scene } = useThree();

  React.useEffect(() => {
    const color = new THREE.Color(backgroundColor);
    gl.setClearColor(color, 1);
    scene.background = color;
  }, [backgroundColor, gl, scene]);

  return null;
};

const CameraImpulseRig: React.FC<{
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number }>;
  config: ParticleConfig;
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  isInteractingRef: React.MutableRefObject<boolean>;
  isPlaying: boolean;
}> = ({ audioRef, config, controlsRef, isInteractingRef, isPlaying }) => {
  const { camera } = useThree();
  const basePositionRef = React.useRef(getDefaultCameraPosition(config));
  const baseTargetRef = React.useRef(new THREE.Vector3(0, 0, 0));
  const baseFovRef = React.useRef('fov' in camera ? camera.fov : 50);
  const baseZoomRef = React.useRef('zoom' in camera ? camera.zoom : 1);
  const baseModeRef = React.useRef(config.viewMode);
  const baseDistanceRef = React.useRef(config.cameraDistance);
  const initializedRef = React.useRef(false);

  useFrame(({ clock }) => {
    if (config.cameraControlMode === 'manual') {
      return;
    }
    const t = clock.getElapsedTime();
    const controls = controlsRef.current;
    const impulse = config.cameraImpulseStrength;
    const cameraAudioInput = config.audioEnabled
      ? (audioRef.current.bass * config.audioBeatScale + audioRef.current.pulse * config.audioBurstScale * 0.65) * config.audioCameraScale
      : 0;
    const burstEnergy = getBurstDriveEnergy(config, t, isPlaying, config.audioEnabled ? audioRef.current.pulse * config.audioBurstScale : 0);
    const needsSync =
      !initializedRef.current ||
      isInteractingRef.current ||
      baseModeRef.current !== config.viewMode ||
      Math.abs(baseDistanceRef.current - config.cameraDistance) > 0.001;
    if (needsSync) {
      initializedRef.current = true;
      basePositionRef.current.copy(
        config.cameraControlMode === 'auto'
          ? getDefaultCameraPosition(config)
          : camera.position,
      );
      baseTargetRef.current.copy(controls?.target ?? new THREE.Vector3(0, 0, 0));
      if ('fov' in camera) baseFovRef.current = camera.fov;
      if ('zoom' in camera) baseZoomRef.current = camera.zoom;
      baseModeRef.current = config.viewMode;
      baseDistanceRef.current = config.cameraDistance;
    }
    if (impulse <= 0 && config.cameraBurstBoost <= 0 || isInteractingRef.current) {
      return;
    }
    const audioBoost = cameraAudioInput;
    const strength = impulse * (1 + audioBoost * 0.65) + burstEnergy * config.cameraBurstBoost * 0.55;
    const speed = Math.max(0.05, config.cameraImpulseSpeed) * (isPlaying ? 1 : 0.25);
    const drift = config.cameraImpulseDrift;
    camera.position.copy(basePositionRef.current);
    camera.position.x += Math.sin(t * speed) * strength * 28;
    camera.position.y += Math.cos(t * speed * 0.83) * strength * 18;
    camera.position.z += Math.sin(t * speed * 0.47) * drift * 60;
    if (controls) {
      controls.target.copy(baseTargetRef.current);
      controls.update();
    } else {
      camera.lookAt(baseTargetRef.current);
    }
    if ('fov' in camera && config.viewMode !== 'orthographic') {
      camera.fov = baseFovRef.current + Math.sin(t * speed * 0.6) * strength * 0.8;
      camera.updateProjectionMatrix();
    } else if ('zoom' in camera && config.viewMode === 'orthographic') {
      camera.zoom = Math.max(1, baseZoomRef.current + Math.sin(t * speed * 0.6) * drift * 0.6);
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

export const AppScene: React.FC<AppSceneProps> = React.memo(({
  audioRef,
  config,
  interLayerContactAmount,
  isPlaying,
  isSequencePlaying,
  rendererRef,
  saveTrigger,
  sequenceStepProgress,
}) => {
  const controlsRef = React.useRef<OrbitControlsImpl | null>(null);
  const isInteractingRef = React.useRef(false);
  const adaptiveDpr = React.useMemo(() => getAdaptiveDprRange(config), [config]);
  const antialias = React.useMemo(() => shouldUseAntialias(config), [config]);

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: false, antialias, alpha: false, powerPreference: 'high-performance' }}
      dpr={adaptiveDpr}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(config.backgroundColor));
        rendererRef.current = gl;
      }}
    >
      <SceneBackgroundSync backgroundColor={config.backgroundColor} />
      <color attach="background" args={[config.backgroundColor]} />
      {config.depthFogEnabled && (
        <fog attach="fog" args={[config.backgroundColor, config.depthFogNear, config.depthFogFar]} />
      )}
      {config.viewMode === 'orthographic' ? (
        <OrthographicCamera
          key={`ortho-${config.cameraDistance}`}
          makeDefault
          position={[0, 0, 500]}
          zoom={Math.max(1, 1500 / Math.max(10, config.cameraDistance))}
          far={5000}
          near={0.1}
        />
      ) : (
        <PerspectiveCamera
          key={`cam-${config.cameraDistance}-${config.perspective}`}
          makeDefault
          position={[0, 0, config.cameraDistance + 200]}
          fov={config.perspective / 20}
          far={10000}
          near={0.1}
        />
      )}
      <CameraImpulseRig audioRef={audioRef} config={config} controlsRef={controlsRef} isInteractingRef={isInteractingRef} isPlaying={isPlaying} />
      <ScreenshotManager config={config} saveTrigger={saveTrigger} />
      <OrbitControls
        key={`controls-${config.cameraDistance}`}
        ref={controlsRef}
        enabled={config.cameraControlMode !== 'auto'}
        enablePan={config.cameraControlMode !== 'auto'}
        enableZoom={config.cameraControlMode !== 'auto'}
        enableRotate={config.cameraControlMode !== 'auto'}
        onStart={() => { isInteractingRef.current = true; }}
        onEnd={() => { isInteractingRef.current = false; }}
      />
      <SceneGroup config={config} isPlaying={isPlaying}>
        {config.layer1Enabled && (
          <ParticleSystem config={config} layerIndex={1} audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.layer2Enabled && (
          <ParticleSystem config={config} layerIndex={2} audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.layer2Enabled && config.layer2AuxEnabled && (
          <ParticleSystem config={config} layerIndex={2} isAux={true} audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.layer2Enabled && config.layer2SparkEnabled && (
          <ParticleSystem config={config} layerIndex={2} isAux={true} auxMode="spark" audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.layer3Enabled && (
          <ParticleSystem config={config} layerIndex={3} audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.layer3Enabled && config.layer3AuxEnabled && (
          <ParticleSystem config={config} layerIndex={3} isAux={true} audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.layer3Enabled && config.layer3SparkEnabled && (
          <ParticleSystem config={config} layerIndex={3} isAux={true} auxMode="spark" audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.ambientEnabled && (
          <ParticleSystem config={config} layerIndex={4} audioRef={audioRef} isPlaying={isPlaying} contactAmount={interLayerContactAmount} />
        )}
        {config.gpgpuEnabled && (
          <GpgpuSystem config={config} audioRef={audioRef} isPlaying={isPlaying} />
        )}
      </SceneGroup>
      <ScreenOverlay
        audioRef={audioRef}
        config={config}
        isPlaying={isPlaying}
        contactAmount={interLayerContactAmount}
        isSequencePlaying={isSequencePlaying}
        sequenceStepProgress={sequenceStepProgress}
      />
      {(config.postBloomEnabled || config.postChromaticAberrationEnabled || config.postDofEnabled) && (
        <EffectComposer>
          {config.postBloomEnabled ? (
            <Bloom
              intensity={config.postBloomIntensity}
              radius={config.postBloomRadius}
              luminanceThreshold={config.postBloomThreshold}
              luminanceSmoothing={0.1}
              mipmapBlur
            />
          ) : <></>}
          {config.postChromaticAberrationEnabled ? (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(config.postChromaticAberrationOffset, config.postChromaticAberrationOffset)}
              radialModulation={false}
              modulationOffset={0}
            />
          ) : <></>}
          {config.postDofEnabled ? (
            <DepthOfField
              focusDistance={config.postDofFocusDistance}
              focalLength={config.postDofFocalLength}
              bokehScale={config.postDofBokehScale}
            />
          ) : <></>}
        </EffectComposer>
      )}
    </Canvas>
  );
});
AppScene.displayName = 'AppScene';
