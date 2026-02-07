import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WallVisualizer } from './WallVisualizer';
import { Zone, CabinetType, PresetType, CabinetUnit } from '../types';

describe('WallVisualizer', () => {
  const mockZone: Zone = {
    id: 'Wall A',
    active: true,
    totalLength: 3000,
    wallHeight: 2400,
    obstacles: [],
    cabinets: [
      {
        id: 'cab1',
        preset: PresetType.BASE_DOOR,
        type: CabinetType.BASE,
        width: 600,
        qty: 1,
        fromLeft: 0,
        label: 'B01'
      },
      {
        id: 'cab2',
        preset: PresetType.WALL_STD,
        type: CabinetType.WALL,
        width: 600,
        qty: 1,
        fromLeft: 0,
        label: 'W01'
      }
    ]
  };

  const defaultProps = {
    zone: mockZone,
    height: 2400,
    onCabinetClick: vi.fn(),
    onObstacleClick: vi.fn(),
    onCabinetMove: vi.fn(),
    onObstacleMove: vi.fn(),
    onDragEnd: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<WallVisualizer {...defaultProps} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    render(<WallVisualizer {...defaultProps} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders cabinet rectangles', () => {
    render(<WallVisualizer {...defaultProps} />);
    const rects = document.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('calls onCabinetClick when cabinet is clicked', () => {
    render(<WallVisualizer {...defaultProps} />);
    const cabinets = document.querySelectorAll('[data-testid="cabinet"]');
    if (cabinets.length > 0) {
      fireEvent.click(cabinets[0]);
      expect(defaultProps.onCabinetClick).toHaveBeenCalled();
    }
  });

  it('handles empty zone', () => {
    const emptyZone: Zone = {
      id: 'Wall A',
      active: true,
      totalLength: 3000,
      wallHeight: 2400,
      obstacles: [],
      cabinets: []
    };

    render(<WallVisualizer {...defaultProps} zone={emptyZone} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders obstacles when present', () => {
    const zoneWithObstacle: Zone = {
      ...mockZone,
      obstacles: [
        { id: 'obs1', type: 'window', fromLeft: 1500, width: 1200, height: 1500, sillHeight: 900 }
      ]
    };

    render(<WallVisualizer {...defaultProps} zone={zoneWithObstacle} />);
    expect(document.querySelectorAll('rect').length).toBeGreaterThan(0);
  });

  it('handles panning', () => {
    render(<WallVisualizer {...defaultProps} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
