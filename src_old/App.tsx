import React, { useState, useEffect } from 'react';
import { Home, PlusSquare, Calculator, Settings, ArrowLeft, Trash2, Copy, Save, Flashlight, Ruler, Maximize, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Screen, CabinetType } from './types';
import { CabinetInput, calculateBOM, BOMResult } from './utils/calculator';

// --- MAIN APP ---

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.HOME);
  const [cabinetInput, setCabinetInput] = useState<CabinetInput>({
    type: CabinetType.BASE,
    width: 600,
    height: 720,
    depth: 560,
    thickness: 18,
    shelfCount: 1,
    hasBack: true
  });
  const [bomResult, setBomResult] = useState<BOMResult | null>(null);

  const navigate = (s: Screen) => setScreen(s);

  const handleCalculate = () => {
    const result = calculateBOM(cabinetInput);
    setBomResult(result);
    setScreen(Screen.BOM_SUMMARY);
  };

  const renderScreen = () => {
    switch (screen) {
      case Screen.HOME:
        return <ScreenHome navigate={navigate} />;
      case Screen.NEW_CABINET:
        return <ScreenNewCabinet input={cabinetInput} setInput={setCabinetInput} onCalculate={handleCalculate} />;
      case Screen.BOM_SUMMARY:
        return <ScreenBOMSummary result={bomResult} onBack={() => navigate(Screen.NEW_CABINET)} />;
      case Screen.AREA_CALC:
        return <ScreenAreaCalc onBack={() => navigate(Screen.HOME)} />;
      case Screen.PARTS_ESTIMATOR:
        return <ScreenPartsEstimator onBack={() => navigate(Screen.HOME)} />;
      case Screen.UTILITIES:
        return <ScreenUtilities onBack={() => navigate(Screen.HOME)} />;
      default:
        return <ScreenHome navigate={navigate} />;
    }
  };

  return (
    <div id="root">
      <main className="flex-1">
        {renderScreen()}
      </main>

      {screen !== Screen.HOME && (
        <nav className="bottom-nav">
          <button className={`nav-item ${screen === Screen.HOME ? 'active' : ''}`} onClick={() => navigate(Screen.HOME)}>
            <Home size={24} />
            <span>HOME</span>
          </button>
          <button className={`nav-item ${screen === Screen.NEW_CABINET ? 'active' : ''}`} onClick={() => navigate(Screen.NEW_CABINET)}>
            <PlusSquare size={24} />
            <span>NEW</span>
          </button>
          <button className={`nav-item ${[Screen.AREA_CALC, Screen.PARTS_ESTIMATOR].includes(screen) ? 'active' : ''}`} onClick={() => navigate(Screen.UTILITIES)}>
            <Calculator size={24} />
            <span>TOOLS</span>
          </button>
          <button className={`nav-item ${screen === Screen.UTILITIES ? 'active' : ''}`} onClick={() => navigate(Screen.UTILITIES)}>
            <Settings size={24} />
            <span>JOBS</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// --- SCREEN COMPONENTS ---

function ScreenHome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="p-lg stack">
      <h1 style={{ textAlign: 'center', marginBottom: '40px', marginTop: '40px' }}>
        CAB<span style={{ color: 'var(--accent)' }}>ENGINE</span>
      </h1>

      <button className="btn btn-primary btn-large stack" onClick={() => navigate(Screen.NEW_CABINET)}>
        <PlusSquare size={40} />
        <span>➕ NEW CABINET</span>
      </button>

      <div className="grid-2">
        <button className="btn btn-secondary stack" onClick={() => navigate(Screen.AREA_CALC)}>
          <Maximize size={24} />
          <span>AREA</span>
        </button>
        <button className="btn btn-secondary stack" onClick={() => navigate(Screen.PARTS_ESTIMATOR)}>
          <Ruler size={24} />
          <span>PARTS</span>
        </button>
        <button className="btn btn-secondary stack" onClick={() => navigate(Screen.UTILITIES)}>
          <Calculator size={24} />
          <span>CONVERT</span>
        </button>
        <button className="btn btn-secondary stack" onClick={() => {/* Toggle Flashlight */ }}>
          <Flashlight size={24} />
          <span>LIGHT</span>
        </button>
      </div>

      <div className="stack" style={{ marginTop: 'auto' }}>
        <h2 className="stat-label">Recent Jobs</h2>
        <div className="card" onClick={() => navigate(Screen.NEW_CABINET)}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>600 Base Cabinet</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>2m ago</span>
          </div>
        </div>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>900 Wall Unit</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>1h ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenNewCabinet({ input, setInput, onCalculate }: {
  input: CabinetInput,
  setInput: React.Dispatch<React.SetStateAction<CabinetInput>>,
  onCalculate: () => void
}) {
  const [showOptions, setShowOptions] = useState(false);

  const updateInput = (key: keyof CabinetInput, value: any) => {
    setInput(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex-1 p-lg stack animate-up">
      <div className="row">
        <button className="btn btn-ghost" style={{ padding: '0 12px' }} onClick={() => onCalculate()}>
          <ArrowLeft size={24} />
        </button>
        <h1>NEW CABINET</h1>
      </div>

      <div className="input-group">
        <span className="input-label">Cabinet Type</span>
        <div className="grid-2" style={{ gap: '8px' }}>
          {[CabinetType.BASE, CabinetType.WALL, CabinetType.TALL].map(t => (
            <button
              key={t}
              className={`btn ${input.type === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0 8px', fontSize: '14px' }}
              onClick={() => updateInput('type', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <Stepper label="WIDTH" value={input.width} onChange={v => updateInput('width', v)} step={50} />
        <Stepper label="HEIGHT" value={input.height} onChange={v => updateInput('height', v)} step={50} />
        <Stepper label="DEPTH" value={input.depth} onChange={v => updateInput('depth', v)} step={50} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'space-between', border: 'none' }}
          onClick={() => setShowOptions(!showOptions)}
        >
          <span>OPTIONS</span>
          {showOptions ? <ChevronUp /> : <ChevronDown />}
        </button>

        {showOptions && (
          <div className="stack p-lg" style={{ borderTop: '1px solid var(--bg-tertiary)' }}>
            <div className="input-group">
              <span className="input-label">Board Thickness (mm)</span>
              <div className="row">
                {[16, 18, 19].map(t => (
                  <button
                    key={t}
                    className={`btn ${input.thickness === t ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => updateInput('thickness', t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="input-label">Include Back</span>
              <button
                className={`btn ${input.hasBack ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateInput('hasBack', !input.hasBack)}
              >
                {input.hasBack ? 'YES' : 'NO'}
              </button>
            </div>
            <Stepper label="SHELVES" value={input.shelfCount} onChange={v => updateInput('shelfCount', v)} step={1} min={0} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', marginBottom: '80px' }}>
        <button className="btn btn-primary btn-large" style={{ width: '100%' }} onClick={onCalculate}>
          CALCULATE BOM
        </button>
      </div>
    </div>
  );
}

function ScreenBOMSummary({ result, onBack }: { result: BOMResult | null, onBack: () => void }) {
  if (!result) return null;

  return (
    <div className="flex-1 p-lg stack animate-up">
      <div className="row">
        <button className="btn btn-ghost" style={{ padding: '0 12px' }} onClick={onBack}>
          <Trash2 size={24} />
        </button>
        <h1>BOM SUMMARY</h1>
      </div>

      <div className="row" style={{ gap: '8px' }}>
        <div className="card stat-card">
          <div className="stat-value">{result.panels.length}</div>
          <div className="stat-label">Panels</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{result.totalArea}</div>
          <div className="stat-label">m² Area</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{(result.edgebandLength / 1000).toFixed(1)}</div>
          <div className="stat-label">Tape (m)</div>
        </div>
      </div>

      <div className="stack flex-1">
        <h2 className="stat-label">Panel List</h2>
        {result.panels.map((p, i) => (
          <div key={i} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="stack" style={{ gap: '2px' }}>
                <span style={{ fontWeight: 800 }}>{p.name}</span>
                <span className="num-large" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                  {p.dim1} × {p.dim2}
                </span>
              </div>
              <div className="num-large" style={{ fontSize: '24px', color: 'var(--accent)' }}>
                x{p.qty}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '80px' }}>
        <button className="btn btn-secondary" style={{ width: '100%' }}>
          <Copy size={20} />
          <span>COPY</span>
        </button>
        <button className="btn btn-primary" style={{ width: '100%' }}>
          <Save size={20} />
          <span>SAVE</span>
        </button>
      </div>
    </div>
  );
}

function ScreenAreaCalc({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-lg stack animate-up">
      <div className="row">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft /></button>
        <h1>AREA CALCULATOR</h1>
      </div>
      <div className="card p-lg">
        <p style={{ color: 'var(--text-secondary)' }}>Instant mental relief coming soon...</p>
      </div>
    </div>
  );
}

function ScreenPartsEstimator({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-lg stack animate-up">
      <div className="row">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft /></button>
        <h1>PARTS ESTIMATOR</h1>
      </div>
      <div className="card p-lg">
        <p style={{ color: 'var(--text-secondary)' }}>High value estimator coming soon...</p>
      </div>
    </div>
  );
}

function ScreenUtilities({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-lg stack animate-up">
      <div className="row">
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft /></button>
        <h1>UTILITIES</h1>
      </div>
      <div className="card p-lg">
        <p style={{ color: 'var(--text-secondary)' }}>Daily habits coming soon...</p>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Stepper({ label, value, onChange, step, min = 0 }: {
  label: string,
  value: number,
  onChange: (v: number) => void,
  step: number,
  min?: number
}) {
  return (
    <div className="input-group">
      <span className="input-label">{label}</span>
      <div className="stepper">
        <button className="stepper-btn" onClick={() => onChange(Math.max(min, value - step))}>
          <Minus size={20} />
        </button>
        <span className="stepper-value">{value}</span>
        <button className="stepper-btn" onClick={() => onChange(value + step)}>
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
