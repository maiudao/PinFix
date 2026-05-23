const PINFIX_VERSION = '1.0.0';
const PINFIX_STORAGE_VERSION = 1;
const PINFIX_Z_INDEX = 2147483000;

const PINFIX_COLOR_PRESETS = {
  red: { key: 'red', color: '#E11D2E' },
  orange: { key: 'orange', color: '#EA580C' },
  amber: { key: 'amber', color: '#D97706' },
  blue: { key: 'blue', color: '#2563EB' },
  teal: { key: 'teal', color: '#0F766E' },
  green: { key: 'green', color: '#16A34A' },
  neutral: { key: 'neutral', color: '#111827' }
};

const PINFIX_LINE_WIDTHS = {
  thin: 2,
  medium: 4,
  thick: 6
};

const PINFIX_LABEL_SIZES = {
  small: 34,
  medium: 40,
  large: 46
};

const PINFIX_LABEL_STYLES = {
  solid: 'solid',
  ring: 'ring'
};

const PINFIX_BOX_PADDING_OPTIONS = {
  tight: 0,
  compact: 4,
  normal: 8,
  wide: 12
};

const PINFIX_MIN_TOOL_TARGET_WIDTH = 132;
const PINFIX_MIN_TOOL_TARGET_HEIGHT = 54;

const PINFIX_DEFAULT_SETTINGS = {
  language: 'auto',
  colorPreset: 'red',
  lineWidth: 'medium',
  labelSize: 'medium',
  labelStyle: 'solid',
  boxPadding: 'normal',
  contrastMode: 'auto',
  countdown: 5,
  notesVisible: true,
  toolTheme: 'auto',
  launcherPosition: 'left-center',
  launcherCustomPosition: null,
  lastTool: 'select'
};
