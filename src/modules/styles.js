function getPinFixStyles() {
  return `
#pinfix-root {
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  z-index: ${PINFIX_Z_INDEX};
  pointer-events: none;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #102a2a;
}

#pinfix-root * {
  box-sizing: border-box;
}

.pinfix-chrome {
  position: fixed;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 40;
  pointer-events: auto;
}

.pinfix-overlay-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.pinfix-note-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
}

.pinfix-tool-button {
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: rgba(255, 255, 255, 0.92);
  color: #0f766e;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-launcher {
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 999px;
  display: grid;
  place-items: center;
  cursor: pointer;
  position: relative;
  transition: transform 160ms ease;
}

.pinfix-launcher::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 118, 110, 0.16);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px);
}

.pinfix-launcher::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: #0f766e;
}

.pinfix-toolbar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 8px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 118, 110, 0.18);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-tool-button {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 18px;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease;
}

.pinfix-toolbar-close {
  position: absolute;
  right: -7px;
  top: -7px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 999px;
  background: #ffffff;
  color: #0f766e;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.92);
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
  z-index: 2;
}

.pinfix-icon {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pinfix-icon circle {
  fill: currentColor;
  stroke: none;
}

.pinfix-toolbar-close .pinfix-icon {
  width: 12px;
  height: 12px;
}

.pinfix-toolbar:hover .pinfix-toolbar-close,
.pinfix-toolbar:focus-within .pinfix-toolbar-close {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.pinfix-launcher:hover {
  transform: translateY(-1px);
}

.pinfix-launcher:hover::before {
  background: rgba(222, 247, 244, 0.96);
}

.pinfix-tool-button:hover {
  transform: translateY(-1px);
  background: rgba(222, 247, 244, 0.96);
}

.pinfix-tool-button.is-active {
  background: #0f766e;
  color: #ffffff;
}

.pinfix-popover {
  position: fixed;
  width: 248px;
  z-index: 50;
  max-height: calc(100vh - 24px);
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: rgba(255, 255, 255, 0.96);
  color: #102a2a;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(14px);
  padding: 14px;
  pointer-events: auto;
}

.pinfix-popover h3 {
  margin: 0 0 10px;
  font-size: 14px;
}

.pinfix-section {
  margin-top: 10px;
}

.pinfix-section-title {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.pinfix-section-toggle {
  width: 100%;
  min-height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.92);
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  cursor: pointer;
}

.pinfix-chip-row,
.pinfix-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pinfix-chip,
.pinfix-list button {
  min-height: 34px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: #ffffff;
  color: #102a2a;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12px;
}

.pinfix-chip.is-active,
.pinfix-list button.is-active {
  background: rgba(15, 118, 110, 0.12);
  border-color: rgba(15, 118, 110, 0.45);
  color: #0f766e;
}

.pinfix-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.18);
}

.pinfix-candidate {
  position: absolute;
  border: 2px dashed rgba(15, 118, 110, 0.95);
  border-radius: 12px;
  background: rgba(15, 118, 110, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  pointer-events: none;
}

.pinfix-candidate-tools {
  position: absolute;
  right: 8px;
  top: 8px;
  display: flex;
  gap: 4px;
  pointer-events: auto;
  z-index: 8;
}

.pinfix-annotation-box {
  position: absolute;
  z-index: 2;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  pointer-events: none;
}

.pinfix-annotation-box.is-focused {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.9), 0 0 22px rgba(245, 158, 11, 0.38);
}

.pinfix-label {
  position: absolute;
  z-index: 5;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.24);
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
  pointer-events: none;
}

.pinfix-label.is-focused {
  transform: scale(1.08);
}

.pinfix-mask {
  position: absolute;
  z-index: 2;
  border-radius: 12px;
  background:
    repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.06) 0 8px,
      rgba(255, 255, 255, 0.12) 8px 16px
    ),
    rgba(15, 23, 42, 0.94);
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
  pointer-events: none;
}

.pinfix-inline-tools {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 6;
  display: flex;
  gap: 4px;
  pointer-events: auto;
}

.pinfix-candidate-tools button,
.pinfix-inline-tools button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.76);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 13px;
  line-height: 1;
}

.pinfix-candidate-tools button {
  background: rgba(15, 23, 42, 0.82);
}

.pinfix-annotation-tools {
  right: auto;
  top: auto;
  z-index: 7;
}

.pinfix-candidate-tools .pinfix-icon,
.pinfix-inline-tools .pinfix-icon {
  width: 15px;
  height: 15px;
}

.pinfix-candidate-tools button:hover,
.pinfix-inline-tools button:hover {
  background: #0f766e;
}

.pinfix-mask-tools button {
  background: rgba(255, 255, 255, 0.18);
}

.pinfix-mask-label {
  position: absolute;
  left: 10px;
  top: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.pinfix-note-card,
.pinfix-global-panel,
.pinfix-global-strip,
.pinfix-countdown,
.pinfix-toast {
  position: fixed;
  pointer-events: auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-note-card {
  position: absolute;
  z-index: 25;
  width: min(360px, calc(100vw - 40px));
  border-radius: 12px;
  padding: 8px;
}

.pinfix-note-card.is-focused {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.78), 0 14px 32px rgba(15, 23, 42, 0.18);
}

.pinfix-note-card.is-dark,
.pinfix-global-panel.is-dark,
.pinfix-global-strip.is-dark,
.pinfix-countdown.is-dark,
.pinfix-toast.is-dark {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  border-color: rgba(148, 163, 184, 0.28);
}

.pinfix-note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.pinfix-note-badge {
  min-width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.pinfix-note-title {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: inherit;
  opacity: 0.72;
}

.pinfix-note-delete {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  padding: 0;
  display: grid;
  place-items: center;
  line-height: 1;
}

.pinfix-note-input,
.pinfix-global-input {
  width: 100%;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1.45;
}

.pinfix-note-input {
  min-height: 72px;
  max-height: 220px;
}

.pinfix-note-summary {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  font-size: 13px;
  line-height: 1.4;
  color: inherit;
  opacity: 0.88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
}

.pinfix-global-strip {
  z-index: 45;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: calc(100vw - 32px);
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
}

.pinfix-global-panel {
  z-index: 45;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  width: min(760px, calc(100vw - 32px));
  border-radius: 18px;
  padding: 14px;
}

.pinfix-global-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.pinfix-global-resize {
  height: 10px;
  margin-top: 10px;
  cursor: ns-resize;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(15, 118, 110, 0.18), rgba(15, 118, 110, 0.48));
}

.pinfix-global-input {
  min-height: 180px;
}

.pinfix-toast {
  z-index: 70;
  right: 16px;
  top: 16px;
  border-radius: 14px;
  padding: 12px 14px;
  max-width: min(360px, calc(100vw - 32px));
  font-size: 13px;
}

.pinfix-countdown {
  z-index: 65;
  right: 16px;
  bottom: 16px;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
}

.pinfix-countdown strong {
  font-size: 18px;
  margin-left: 8px;
}

.pinfix-hidden {
  display: none !important;
}

.pinfix-hidden-for-capture .pinfix-chrome,
.pinfix-hidden-for-capture .pinfix-popover,
.pinfix-hidden-for-capture .pinfix-note-card,
.pinfix-hidden-for-capture .pinfix-global-strip,
.pinfix-hidden-for-capture .pinfix-global-panel,
.pinfix-hidden-for-capture .pinfix-candidate,
.pinfix-hidden-for-capture .pinfix-toast,
.pinfix-hidden-for-capture .pinfix-inline-tools {
  display: none !important;
}

.pinfix-note-card textarea::placeholder,
.pinfix-global-panel textarea::placeholder {
  color: currentColor;
  opacity: 0.48;
}

.pinfix-divider {
  height: 1px;
  background: rgba(148, 163, 184, 0.25);
  margin: 10px 0;
}

.pinfix-meta-copy {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.45;
}

.pinfix-status-good {
  color: #15803d;
}

.pinfix-status-warn {
  color: #b45309;
}

@media (prefers-reduced-motion: reduce) {
  .pinfix-launcher,
  .pinfix-tool-button,
  .pinfix-popover,
  .pinfix-note-card,
  .pinfix-global-panel,
  .pinfix-toast {
    transition: none !important;
  }
}
`;
}
