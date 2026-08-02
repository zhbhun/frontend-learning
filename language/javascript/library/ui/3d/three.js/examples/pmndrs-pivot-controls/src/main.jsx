import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, PivotControls } from '@react-three/drei';
import { useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { REVISION, Vector3 } from 'three';
import './styles.css';

const DEFAULT_SETTINGS = {
  annotations: true,
  fixed: false,
  viewportAware: true,
  anchor: 'center',
  activeAxes: [true, true, true],
  scale: 1.5,
  lineWidth: 4
};

const ANCHOR_OPTIONS = [
  { id: 'center', label: '中心', value: [0, 0, 0] },
  { id: 'left-bottom', label: '左下角', value: [-1, -1, 0] },
  { id: 'right-bottom', label: '右下角', value: [1, -1, 0] },
  { id: 'left-top', label: '左上角', value: [-1, 1, 0] },
  { id: 'right-top', label: '右上角', value: [1, 1, 0] }
];

const AXES = [
  { id: 'x', label: 'X', color: '#ff477e' },
  { id: 'y', label: 'Y', color: '#5be584' },
  { id: 'z', label: 'Z', color: '#5e8dff' }
];

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [dragStatus, setDragStatus] = useState('ready');
  const [dragCount, setDragCount] = useState(0);
  const [lastDragSamples, setLastDragSamples] = useState(0);
  const dragSamples = useRef(0);

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const handleDragStart = useCallback(() => {
    dragSamples.current = 0;
    setDragStatus('dragging');
  }, []);

  const handleDrag = useCallback((_localMatrix, _deltaLocalMatrix, _worldMatrix, _deltaWorldMatrix) => {
    dragSamples.current += 1;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragCount((current) => current + 1);
    setLastDragSamples(dragSamples.current);
    setDragStatus('ready');
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS, activeAxes: [...DEFAULT_SETTINGS.activeAxes] });
    setDragStatus('ready');
  }, []);

  return (
    <div className="app-shell">
      <ControlPanel
        settings={settings}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
        dragStatus={dragStatus}
        dragCount={dragCount}
        dragSamples={lastDragSamples}
      />

      <main className="stage-panel" aria-label="PivotControls 交互视口">
        <div className="stage-header">
          <div>
            <span className="stage-kicker">LIVE SCENE</span>
            <strong>拖动 gizmo，观察 pivot 如何改变物体变换</strong>
          </div>
          <span className="runtime-chip">R3F + Drei</span>
        </div>

        <div className="canvas-shell">
          <Canvas
            camera={{ position: [5.4, 3.8, 6.4], fov: 42 }}
            dpr={[1, 2]}
            shadows
            fallback={<div className="canvas-fallback">当前浏览器不支持 WebGL</div>}
          >
            <PivotScene
              settings={settings}
              onDragStart={handleDragStart}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
            />
          </Canvas>
        </div>

        <p className="stage-hint">
          <span className="hint-key">左键</span> 拖动 gizmo&nbsp;&nbsp;·&nbsp;&nbsp;
          <span className="hint-key">右键 / 中键</span> 旋转和缩放视角
        </p>
      </main>
    </div>
  );
}

function ControlPanel({ settings, updateSetting, resetSettings, dragStatus, dragCount, dragSamples }) {
  const statusCopy = dragStatus === 'dragging' ? '拖拽中' : '就绪';
  const statusTone = dragStatus === 'dragging' ? 'is-dragging' : '';

  return (
    <aside className="control-panel">
      <header className="panel-header">
        <div className="eyebrow">PMNDRS / GIZMOS</div>
        <h1>PivotControls</h1>
        <p>给任意 R3F 对象挂上一个可交互的平移、旋转、缩放控制器。</p>
      </header>

      <section className="status-card" aria-live="polite">
        <div className="status-topline">
          <span className={`status-dot ${statusTone}`} />
          <span>{statusCopy}</span>
          <span className="status-count">{dragCount} 次拖拽</span>
        </div>
        <div className="status-detail">
          {dragStatus === 'dragging'
            ? '正在读取 onDrag 回调…'
            : dragCount > 0
              ? `上一次拖拽采样 ${dragSamples} 帧`
              : '选择一个轴或圆环开始操作'}
        </div>
      </section>

      <div className="panel-section">
        <div className="section-heading">
          <span>GIZMO</span>
          <small>显示与尺寸</small>
        </div>

        <ToggleRow
          label="Annotations"
          description="拖拽时显示数值标注"
          checked={settings.annotations}
          onChange={(value) => updateSetting('annotations', value)}
        />
        <ToggleRow
          label="Fixed size"
          description="保持 gizmo 的屏幕尺寸"
          checked={settings.fixed}
          onChange={(value) => updateSetting('fixed', value)}
        />
        <ToggleRow
          label="Viewport aware"
          description="按相机前后位置翻转控制器布局"
          checked={settings.viewportAware}
          onChange={(value) => updateSetting('viewportAware', value)}
        />

        <RangeControl
          label="Gizmo scale"
          value={settings.scale}
          min={0.7}
          max={2.8}
          step={0.1}
          displayValue={settings.scale.toFixed(1)}
          onChange={(value) => updateSetting('scale', value)}
        />
        <RangeControl
          label="Line width"
          value={settings.lineWidth}
          min={1}
          max={8}
          step={0.5}
          displayValue={settings.lineWidth.toFixed(1)}
          onChange={(value) => updateSetting('lineWidth', value)}
        />
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <span>PIVOT</span>
          <small>旋转中心</small>
        </div>
        <label className="field-label" htmlFor="anchor-select">
          <span>Anchor</span>
          <select
            id="anchor-select"
            value={settings.anchor}
            onChange={(event) => updateSetting('anchor', event.target.value)}
          >
            {ANCHOR_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <p className="field-note">锚点位于模型包围盒的相对位置，切换后旋转轨迹会改变。</p>
      </div>

      <div className="panel-section">
        <div className="section-heading">
          <span>ACTIVE AXES</span>
          <small>允许操作的轴</small>
        </div>
        <div className="axis-grid">
          {AXES.map((axis, index) => (
            <label className="axis-toggle" key={axis.id}>
              <input
                type="checkbox"
                checked={settings.activeAxes[index]}
                onChange={() => {
                  const activeAxes = [...settings.activeAxes];
                  activeAxes[index] = !activeAxes[index];
                  updateSetting('activeAxes', activeAxes);
                }}
              />
              <span className="axis-swatch" style={{ backgroundColor: axis.color }} />
              <span>{axis.label} axis</span>
            </label>
          ))}
        </div>
      </div>

      <div className="panel-footer">
        <button className="reset-button" type="button" onClick={resetSettings}>
          重置参数
        </button>
        <a href="https://drei.docs.pmnd.rs/gizmos/pivot-controls" target="_blank" rel="noreferrer">
          阅读 Drei 文档 ↗
        </a>
        <div className="version-row">
          <span>three r{REVISION}</span>
          <span>autoTransform = true</span>
        </div>
      </div>
    </aside>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function RangeControl({ label, value, min, max, step, displayValue, onChange }) {
  return (
    <label className="range-control">
      <span className="range-label">
        <span>{label}</span>
        <output>{displayValue}</output>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function PivotScene({ settings, onDragStart, onDrag, onDragEnd }) {
  const pivotRef = useRef(null);
  const anchor = useMemo(
    () => ANCHOR_OPTIONS.find((option) => option.id === settings.anchor)?.value ?? [0, 0, 0],
    [settings.anchor]
  );

  return (
    <>
      <color attach="background" args={["#0b1322"]} />
      <fog attach="fog" args={["#0b1322", 8, 18]} />
      <ambientLight intensity={0.65} color="#dbeafe" />
      <directionalLight
        castShadow
        color="#ffffff"
        intensity={2.4}
        position={[4, 7, 5]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={20}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight color="#9b7cff" intensity={18} distance={8} position={[-3, 2, 3]} />

      <gridHelper args={[14, 14, '#3b5870', '#1c3144']} position={[0, -1.05, 0]} />
      <axesHelper args={[2.1]} position={[0, -1.04, 0]} />

      <PivotControls
        ref={pivotRef}
        activeAxes={settings.activeAxes}
        anchor={anchor}
        annotations={settings.annotations}
        axisColors={['#ff477e', '#5be584', '#5e8dff']}
        depthTest={false}
        fixed={settings.fixed}
        hoveredColor="#ffe27a"
        lineWidth={settings.lineWidth}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        scale={settings.scale}
      >
        <PivotObject />
        <ViewportAwareGizmo enabled={settings.viewportAware} pivotRef={pivotRef} />
      </PivotControls>

      <ContactShadows
        blur={2.2}
        color="#000000"
        far={5}
        opacity={0.42}
        position={[0, -1.02, 0]}
        scale={10}
        smooth
      />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={12} minDistance={3.5} />
    </>
  );
}

function ViewportAwareGizmo({ enabled, pivotRef }) {
  const cameraPosition = useRef(new Vector3());
  const localCameraPosition = useRef(new Vector3());

  useFrame(({ camera }) => {
    const pivot = pivotRef.current;
    const gizmo = pivot?.children[0];

    if (!pivot || !gizmo) return;

    if (!enabled) {
      gizmo.rotation.set(0, 0, 0);
      return;
    }

    pivot.updateWorldMatrix(true, false);
    camera.getWorldPosition(cameraPosition.current);
    localCameraPosition.current.copy(cameraPosition.current);
    pivot.worldToLocal(localCameraPosition.current);
    localCameraPosition.current.sub(gizmo.position);
    localCameraPosition.current.y = 0;

    if (localCameraPosition.current.lengthSq() < 1e-6) return;

    const yaw = Math.atan2(localCameraPosition.current.x, localCameraPosition.current.z);
    const layoutTurn = localCameraPosition.current.z < 0 ? Math.PI : 0;
    const renderedYaw = yaw + layoutTurn;
    gizmo.rotation.set(0, renderedYaw, 0);
  });

  return null;
}

function PivotObject() {
  return (
    <mesh castShadow receiveShadow rotation={[0.18, -0.35, 0.12]}>
      <boxGeometry args={[1.8, 1.8, 1.8]} />
      <meshStandardMaterial color="#51b7e8" metalness={0.3} roughness={0.28} />
    </mesh>
  );
}

createRoot(document.querySelector('#app')).render(<App />);
