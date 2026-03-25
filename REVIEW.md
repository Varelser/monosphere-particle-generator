# Monosphere Particle Generator — Full Codebase Review

> 2026-03-25 時点のソースに基づく包括的精査レポート

---

## 総合評価

| カテゴリ | スコア (10点満点) | 備考 |
|---------|:-:|------|
| **アーキテクチャ設計** | 7.5 | 層分離・型システム・hook合成は秀逸。prop drilling・状態爆発が足を引く |
| **シェーダー品質** | 8.0 | 88モーションタイプ・SDF・Volumetric・GhostTrail等は高水準。マジックナンバーと分岐最適化に課題 |
| **パフォーマンス** | 6.0 | 毎フレーム60+uniform全更新、computeBoundingSphere毎フレーム、WebGPU readback無制御が重い |
| **リソース管理** | 5.5 | Audio二重停止リーク、GPU mapAsync無タイムアウト、render loop内メモリ確保 |
| **型安全性** | 7.0 | 型定義は網羅的だがCONFIG_ARRAY_KEYS手動管理、層間の型重複、ジェネリック化不足 |
| **UI/UX設計** | 7.0 | 機能は充実。70+propsのprop drilling、memo化不足による無駄な再レンダリング |
| **エクスポート機能** | 7.5 | Video/Frame/ZIP対応は良い。大容量フレームのメモリ管理、タイムアウト制御に課題 |
| **コード保守性** | 6.5 | sceneGpgpuSystem.tsx 2000行、App.tsx 11000行。ファイル分割の余地大 |
| **エラーハンドリング** | 4.5 | シェーダーコンパイル・GPU device loss・Worker失敗の無処理が散在 |
| **テスト/検証** | 6.0 | 12のverifyスクリプトは良いが、自動テスト・CIパイプラインなし |
| **総合** | **6.6** | 機能密度は極めて高い。品質の底上げで8.0+到達可能 |

---

## 1. 重大な問題 (Critical)

### 1.1 レンダーループ内メモリ確保
**場所**: `sceneGpgpuSystem.tsx:1818-1819`

texSizeが変化するたびにuseFrame内で`new Float32Array`が生成される。毎フレーム発生する可能性があり、GC圧力の原因。

**修正方針**: 事前確保バッファをRefで保持し、サイズ変更時のみ再生成。

### 1.2 useMemo依存性欠落
**場所**: `sceneParticleSystem.tsx:250付近`

uniformsオブジェクトのuseMemo依存が`[config.opacity, config.contrast, config.particleSoftness, config.particleGlow, isAux]`の5つのみ。実際には60+フィールドがuniformに渡されるため、config変更時にstale uniformが使用される。

**修正方針**: uniformsはRef管理に切り替え、useFrame内でのみ更新する設計へ（現状のuseFrame内更新パターンと組み合わせれば影響は限定的だが、初回マウント時の値がstaleになるリスクは排除すべき）。

### 1.3 WebGPU mapAsync無タイムアウト
**場所**: `lib/webgpuCompute.ts:68`

`await stagingBuf.mapAsync(GPUMapMode.READ)`がGPUビジー時に無期限ハングする可能性。

**修正方針**: `Promise.race`でタイムアウト（例: 100ms）を設け、失敗時は前フレームのデータを再利用。

### 1.4 computeBoundingSphere毎フレーム呼び出し
**場所**: `sceneGpgpuSmoothTube.tsx:157`, `sceneMetaballSystem.tsx:84`

N個のパーティクルジオメトリに対して毎フレームAABB計算。O(N)の不要な計算。

**修正方針**: `frustumCulled = false`を既に設定済みなので、`computeBoundingSphere()`呼び出しを完全に削除可能。

---

## 2. 高優先度の問題 (High)

### 2.1 Audioリソースリーク
**場所**: `lib/useAudioController.ts:82-99`

`stopAudio()`内で`stopStreamTracks()`と`stopAudioResources()`が同一ストリームに対して二重停止を実行する可能性。モードスイッチ（Microphone→Internal Synth等）時に前モードのストリームが残留するパターンが存在。

**修正方針**: `stopAudioResources`に冪等性を保証させ、状態遷移を厳密にシリアライズ。

### 2.2 カメラインパルスのダンピング欠落
**場所**: `AppScene.tsx:126-129`

```tsx
camera.position.x += Math.sin(t * speed) * strength * 28;
camera.position.y += Math.cos(t * speed * 0.83) * strength * 18;
```

オーディオ入力のクランプなし。音声スパイク時にカメラが極端にジャンプする。

**修正方針**: `strength`にclamp（例: `Math.min(strength, 2.0)`）を適用。

### 2.3 毎フレーム60+uniform全更新
**場所**: `sceneParticleSystem.tsx:401+`

有効/無効に関わらず全uniformを毎フレーム代入。GPUドライバへの不要なuniform転送コスト。

**修正方針**: 変更されたuniformのみ更新するダーティフラグ方式、またはUniformBufferObject(UBO)への移行。

### 2.4 Fluid Advectionのフレームレート依存
**場所**: `sceneGpgpuSystem.tsx (FLUID_ADVECT_FRAG)`

タイムステップが`1.0 / 64.0`にハードコード。FPS変動時に物理挙動が変化する。

**修正方針**: `uDeltaTime`をuniformとして渡し、フレームレート非依存にする。

---

## 3. 中優先度の問題 (Medium)

### 3.1 App.tsx 11,000行問題
`App.tsx`に70+のpropを集約し、全子コンポーネントへdrill。

**修正方針**: Zustandストアを活用し、各コンポーネントが必要なスライスのみをselectする設計へ。`useAppControlPanelProps`による集約を廃止。

### 3.2 シェーダー内マジックナンバー
**場所**: `scenePhysicsMotionChunk.ts`, `sceneShaderParticlePoint.ts`

```glsl
mod(aMotionType + 17.0 + floor(aVariant * 11.0), 90.0)  // 17, 11, 90の意味不明
fract((uTime * 60.0) / particleLife + ...)                // 60.0 = FPS仮定
```

**修正方針**: 定数に名前を付与（`#define MOTION_TYPE_COUNT 90`等）、FPS依存値はuniform化。

### 3.3 ControlPanel再レンダリング
**場所**: `components/ControlPanel.tsx`, `controlPanelTabs*.tsx`

`React.memo`が未適用の子コンポーネントが多数。任意のconfig変更で全タブが再レンダリング。

**修正方針**: 各タブコンポーネントを`React.memo`化し、`useCallback`でハンドラーを安定化。

### 3.4 CONFIG_ARRAY_KEYS手動管理
**場所**: `lib/appStateConfig.ts`

27個の配列キーを手動列挙。新フィールド追加時に同期漏れリスク。

**修正方針**: `satisfies`制約またはユーティリティ型で型レベル検証。

### 3.5 performanceHintsのスコア根拠不明
**場所**: `lib/performanceHints.ts:17-40`

Layer1=9000, Layer2=18000, Layer3=5000の予算配分の論理的根拠が不明。GPGPUシステムのスコアリングが完全に欠落。

**修正方針**: 実機ベンチマーク（AMD Radeon Pro 5500 XT）を実施し、GPGPUを含む包括的スコアリングに改修。

---

## 4. 低優先度の問題 (Low)

| 問題 | 場所 | 内容 |
|------|------|------|
| SDF lighting欠落 | sceneShaderParticlePoint.ts:399 | ring/star/hexagonでPhongライティング未実装（sphereのみ） |
| ChromaticAberration固定offset | AppScene.tsx:270 | ビューポートサイズに無関係。解像度変更時に見た目が変化 |
| WebGPU command bufferリーク | webgpuCompute.ts:245 | submit失敗時にencoderが累積する可能性 |
| 型重複 | types/configLayer2.ts, configLayer3.ts | Enabled/Color/Count/Size等の共通パターンがジェネリック化されていない |
| Ghost Trail常時レンダリング | sceneParticleSystem.tsx | ghostCount=0でも8個の`<instancedMesh>`がDOMに存在 |
| StandaloneSynthWindow | StandaloneSynthWindow.tsx:50-55 | 親ウィンドウ閉鎖時にrAFループが残留 |
| Vector3毎フレーム生成 | appStateCollision.ts | `getConfiguredSourceOffset()`で毎回`new THREE.Vector3` |

---

## 5. 実装すべき機能

### 5.1 高インパクト

| 機能 | 説明 | 難易度 | 推定効果 |
|------|------|:------:|:--------:|
| **WebGPU Compute本格移行** | 現在WebGL FBO + 部分WebGPU。全パーティクル物理をWebGPU computeに統一 | 高 | パフォーマンス2-3x |
| **プリセットサムネイル自動生成** | プリセット保存時にCanvasスナップショットをBase64で埋め込み | 中 | UX大幅向上 |
| **Undo/Redo** | configの差分スタック管理。Ctrl+Z/Yで巻き戻し | 中 | 編集体験の根本改善 |
| **リアルタイムFPS/GPU負荷表示** | `gl.info.render`からdraw call数、三角形数、FPSを常時表示 | 低 | パフォーマンスチューニングの可視化 |

### 5.2 中インパクト

| 機能 | 説明 | 難易度 | 推定効果 |
|------|------|:------:|:--------:|
| **Audio FFTスペクトラム可視化** | ControlPanel内にリアルタイム周波数バー表示 | 低 | Audio設定のフィードバック改善 |
| **カスタムカラーパレット** | 層ごとのグラデーション定義（2-4色のカラーストップ） | 中 | ビジュアル表現の幅拡大 |
| **モーションパスエディタ** | ベジエ曲線でパーティクル軌道を視覚的に編集 | 高 | クリエイティブコントロール拡張 |
| **プリセット共有URL** | Base64エンコードしたconfigをURLパラメータに埋め込み | 低 | プリセット共有の簡便化 |
| **キーボードショートカット** | Space=再生/停止, 1-4=レイヤー切替, S=スクリーンショット等 | 低 | 操作効率向上 |

### 5.3 探索的

| 機能 | 説明 | 難易度 | 推定効果 |
|------|------|:------:|:--------:|
| **AI駆動プリセット生成** | テキスト記述からパラメータを推論（"穏やかな波" → パラメータセット） | 高 | 創作の新パラダイム |
| **VR/XR対応** | WebXR Device APIで没入型ビューイング | 高 | 展示・体験の拡張 |
| **MIDI入力対応** | Web MIDI APIでコントローラーからリアルタイムパラメータ制御 | 中 | ライブパフォーマンス用途 |
| **Instanced Mesh LOD** | カメラ距離に応じてパーティクル密度を動的調整 | 中 | 大規模シーンのパフォーマンス |
| **Normal Map付きSDF** | SDFシェイプにノーマルマップを適用し質感を追加 | 中 | ビジュアルリアリティ向上 |

---

## 6. アーキテクチャ改善提案

### 6.1 状態管理の再構築

```
現状:
  App.tsx (11,000行) → 70+ props → ControlPanel → 各タブ

提案:
  Zustand Store (スライス分割)
  ├── configSlice     → 各コンポーネントがuseSelector
  ├── audioSlice      → AudioController/SynthWindow
  ├── sequenceSlice   → SequencePlayback/Editor
  ├── exportSlice     → VideoExport/FrameExport
  └── uiSlice         → ControlPanel state
```

### 6.2 シェーダーモジュール化

```
現状:
  scenePhysicsMotionChunk.ts (394行の単一GLSL文字列)

提案:
  shaders/
  ├── noise.glsl        → Perlin/Curl/Simplex
  ├── motion/
  │   ├── flow.glsl     → flow, turbulence, stream
  │   ├── chaos.glsl    → lorenz, rossler, newton
  │   ├── orbital.glsl  → orbit, spiral, helix
  │   └── geometric.glsl → lattice, crystal, petal
  ├── sdf.glsl          → 共通SDF関数
  └── lighting.glsl     → Phong/Lambert共通
```

Vite `?raw`インポートで結合可能。

### 6.3 GPU Pipeline統一

```
現状:
  WebGL FBO (sceneGpgpuSystem.tsx)
  + 部分WebGPU (webgpuCompute.ts)
  + CPU readback (sceneGpgpuSmoothTube.tsx)

提案:
  WebGPU Compute Pipeline (統一)
  ├── Position Sim   → Compute Shader
  ├── Velocity Sim   → Compute Shader
  ├── Trail History  → Storage Buffer
  ├── Sort (Bitonic) → Compute Shader
  └── Readback       → mapAsync (throttled, with timeout)

  WebGL Render Pipeline (表示のみ)
  ├── Point Sprites  → instanced draw
  ├── Ribbon/Tube    → indexed draw from storage buffer
  └── Metaball       → marching cubes (GPU)
```

---

## 7. ファイル規模と分割候補

| ファイル | 行数 | 推奨分割 |
|---------|-----:|---------|
| App.tsx | 11,012 | AppScene接続 / ControlPanel接続 / Audio接続 / Export接続 / Sequence接続 の5ファイル |
| sceneGpgpuSystem.tsx | 1,977 | シミュレーション / Trail / Ribbon / Tube / Volumetric / Draw の6ファイル |
| starterLibrary.ts | 907 | JSON化してimport（バンドルサイズ削減） |
| sceneParticleSystem.tsx | 810 | ParticleSystem本体 / GhostTrail / UniformSync の3ファイル |
| appStateConfig.ts | 642 | DEFAULT_CONFIG / normalizeConfig / arrayKeys の3ファイル |
| controlPanelGlobalDisplay.tsx | 743 | Camera / RenderQuality / PostProcessing / GPGPU の4ファイル |

---

## 8. セキュリティ/堅牢性

| 項目 | 状態 | 備考 |
|------|:----:|------|
| XSS防御 | OK | ユーザー入力をDOM直接挿入する箇所なし |
| localStorage容量管理 | 注意 | プリセット蓄積で5MB上限到達の可能性。容量チェック未実装 |
| WebWorker例外処理 | 不足 | Worker内例外がmain threadに伝搬しない |
| GPU device loss復旧 | 未実装 | タブ切替やGPUドライバクラッシュ時にシーンが壊れる |
| CSP対応 | 未検証 | inline shader文字列がCSPポリシーに抵触する可能性 |

---

## 9. まとめ

**強み**: 88モーションタイプ、Volumetric Ray Marching、Ghost Trail、SDF Per-Layer、GPGPU Ribbon/Tube、Audio Reactivity、Sequence Playback、Video/Frame Export — 個人プロジェクトとしては異常な機能密度。Three.js/R3Fの活用レベルが高く、シェーダー実装の数学的正確さは一貫している。

**最大の改善ポイント**: パフォーマンス（毎フレームの無駄な計算・確保）とリソース管理（Audio/GPU）。これらを修正すれば、機能追加なしでもユーザー体験が顕著に向上する。

**次の一手（優先順）**:
1. computeBoundingSphere削除 + Float32Array事前確保（即効性あり、低リスク）
2. WebGPU readbackタイムアウト追加（安定性の基盤）
3. プリセットサムネイル自動生成（UX上最大のリターン）
4. Undo/Redo（編集体験の根本改善）
5. App.tsx分割 + Zustandスライス化（長期保守性の基盤）
