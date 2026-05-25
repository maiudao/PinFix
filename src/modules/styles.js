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

#pinfix-root button,
#pinfix-root input,
#pinfix-root textarea {
  font: inherit;
}

#pinfix-root button:focus-visible,
#pinfix-root input:focus-visible,
#pinfix-root textarea:focus-visible {
  outline: 3px solid rgba(45, 212, 191, 0.46);
  outline-offset: 2px;
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

#pinfix-root[data-launcher-position="custom"] .pinfix-chrome {
  transform: none;
}

#pinfix-root[data-launcher-position="right-center"] .pinfix-chrome {
  left: auto;
  right: 12px;
}

#pinfix-root[data-launcher-position="right-bottom"] .pinfix-chrome {
  left: auto;
  right: 14px;
  top: auto;
  bottom: max(18px, env(safe-area-inset-bottom));
  transform: none;
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
  border: 1px solid rgba(15, 118, 110, 0.14);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 251, 249, 0.96));
  color: #0f766e;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
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
  --pinfix-toolbar-padding: 9px;
  --pinfix-toolbar-gap: 8px;
  --pinfix-toolbar-button-size: 44px;
  --pinfix-toolbar-header-height: 28px;
  --pinfix-toolbar-close-size: 28px;
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, var(--pinfix-toolbar-button-size)));
  gap: var(--pinfix-toolbar-gap);
  width: calc(var(--pinfix-toolbar-padding) * 2 + var(--pinfix-toolbar-button-size) * 2 + var(--pinfix-toolbar-gap));
  padding: var(--pinfix-toolbar-padding);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 118, 110, 0.18);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-toolbar-header {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--pinfix-toolbar-close-size);
  gap: var(--pinfix-toolbar-gap);
  align-items: stretch;
}

.pinfix-toolbar-grip {
  min-width: 0;
  height: var(--pinfix-toolbar-header-height);
  padding: 0 10px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  background: linear-gradient(180deg, rgba(248, 252, 251, 0.98), rgba(238, 249, 246, 0.94));
  color: #0f766e;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.56);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  cursor: grab;
  touch-action: none;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.pinfix-toolbar-grip:active,
.pinfix-chrome.is-dragging .pinfix-toolbar-grip {
  cursor: grabbing;
}

.pinfix-toolbar-grip-mark {
  display: grid;
  grid-template-columns: repeat(3, 4px);
  grid-auto-rows: 4px;
  gap: 5px 6px;
}

.pinfix-toolbar-grip-mark span {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.48;
}

.pinfix-toolbar-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, var(--pinfix-toolbar-button-size)));
  gap: var(--pinfix-toolbar-gap);
}

.pinfix-tool-button {
  width: var(--pinfix-toolbar-button-size);
  height: var(--pinfix-toolbar-button-size);
  border-radius: 16px;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 18px;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.pinfix-toolbar-close {
  width: var(--pinfix-toolbar-close-size);
  height: var(--pinfix-toolbar-header-height);
  padding: 0;
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 251, 249, 0.96));
  color: #0f766e;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
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

.pinfix-launcher:hover::before {
  background: rgba(222, 247, 244, 0.96);
}

.pinfix-tool-button:hover {
  background: linear-gradient(180deg, rgba(236, 252, 249, 0.99), rgba(223, 247, 243, 0.97));
  border-color: rgba(15, 118, 110, 0.24);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

.pinfix-toolbar-grip:hover,
.pinfix-toolbar-close:hover {
  background: linear-gradient(180deg, rgba(236, 252, 249, 0.99), rgba(223, 247, 243, 0.97));
  border-color: rgba(15, 118, 110, 0.24);
}

.pinfix-toolbar-grip:hover .pinfix-toolbar-grip-mark span,
.pinfix-chrome.is-dragging .pinfix-toolbar-grip .pinfix-toolbar-grip-mark span {
  opacity: 0.72;
}

.pinfix-tool-button.is-active {
  background: linear-gradient(180deg, #0f766e, #0b5f59);
  border-color: rgba(15, 118, 110, 0.92);
  color: #ffffff;
  box-shadow: 0 14px 30px rgba(15, 118, 110, 0.28);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-launcher::before {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(94, 234, 212, 0.34);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.32);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-launcher::after {
  background: #5eead4;
  box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.16);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-launcher:hover::before {
  background: rgba(30, 41, 59, 0.94);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-toolbar {
  background: rgba(17, 24, 39, 0.96);
  border-color: rgba(148, 163, 184, 0.28);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.32);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-tool-button {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.96));
  border-color: rgba(148, 163, 184, 0.28);
  color: #ccfbf1;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.24);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-tool-button:hover {
  background: linear-gradient(180deg, rgba(51, 65, 85, 0.98), rgba(30, 41, 59, 0.96));
  border-color: rgba(94, 234, 212, 0.5);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-tool-button.is-active {
  background: linear-gradient(180deg, #5eead4, #2dd4bf);
  border-color: rgba(153, 246, 228, 0.92);
  color: #042f2e;
  box-shadow: 0 14px 30px rgba(45, 212, 191, 0.22);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-toolbar-grip,
#pinfix-root[data-tool-tone="dark"] .pinfix-toolbar-close {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.92));
  border-color: rgba(148, 163, 184, 0.24);
  color: #ccfbf1;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}

#pinfix-root[data-tool-tone="dark"] .pinfix-toolbar-grip:hover,
#pinfix-root[data-tool-tone="dark"] .pinfix-toolbar-close:hover {
  background: linear-gradient(180deg, rgba(51, 65, 85, 0.98), rgba(30, 41, 59, 0.96));
  border-color: rgba(94, 234, 212, 0.5);
}

.pinfix-popover {
  position: fixed;
  width: 248px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
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

.pinfix-popover[data-panel="more"] {
  width: 320px;
}

.pinfix-sidecar {
  position: fixed;
  z-index: 55;
  width: min(300px, calc(100vw - 24px));
  max-height: calc(100vh - 24px);
  overflow: auto;
  box-sizing: border-box;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.97);
  color: #102a2a;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(14px);
  padding: 12px;
  pointer-events: auto;
}

.pinfix-sidecar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  color: #0f3f3b;
  font-size: 13px;
  font-weight: 800;
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

.pinfix-list button {
  flex: 1 1 calc(50% - 4px);
}

.pinfix-list-stack button {
  flex-basis: 100%;
  text-align: left;
}

.pinfix-annotation-sidecar-trigger {
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(15, 118, 110, 0.24);
  border-radius: 12px;
  background: rgba(240, 253, 250, 0.9);
  color: #0f766e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.pinfix-sidecar-list {
  display: grid;
  gap: 8px;
}

.pinfix-sidecar-item {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.94);
  color: #102a2a;
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 10px;
  padding: 9px;
  text-align: left;
  cursor: pointer;
}

.pinfix-sidecar-item.is-missing {
  border-color: rgba(225, 29, 46, 0.22);
  background: rgba(255, 241, 242, 0.72);
}

.pinfix-sidecar-number {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #e11d2e;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 800;
}

.pinfix-sidecar-body {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.pinfix-sidecar-body strong {
  color: #102a2a;
  font-size: 12px;
  line-height: 1.35;
  word-break: break-word;
}

.pinfix-sidecar-body small,
.pinfix-sidecar-empty {
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.pinfix-list button.pinfix-danger-action {
  flex-basis: 100%;
  border-color: rgba(15, 118, 110, 0.24);
  background: rgba(248, 250, 252, 0.92);
  color: #0f766e;
  font-weight: 700;
}

.pinfix-list button.pinfix-danger-action:hover {
  border-color: rgba(15, 118, 110, 0.38);
  background: rgba(222, 247, 244, 0.96);
}

.pinfix-danger-hint {
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(225, 29, 46, 0.18);
  border-radius: 10px;
  color: #9f1239;
  background: rgba(255, 241, 242, 0.72);
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
  left: 0;
  top: 0;
  display: flex;
  gap: 3px;
  pointer-events: auto;
  z-index: 8;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.88);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}

.pinfix-annotation-box {
  position: absolute;
  z-index: 2;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  pointer-events: none;
}

.pinfix-annotation-box.is-interactive {
  pointer-events: auto;
}

.pinfix-annotation-box.is-resizing {
  pointer-events: auto;
  opacity: 0.36;
}

.pinfix-annotation-resize-preview {
  position: absolute;
  z-index: 7;
  border-radius: 14px;
  background: rgba(225, 29, 46, 0.08);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.78) inset, 0 14px 32px rgba(225, 29, 46, 0.22);
  pointer-events: none;
  will-change: left, top, width, height;
}

.pinfix-annotation-resize-edge {
  position: absolute;
  display: block;
  pointer-events: auto;
  touch-action: none;
  opacity: 0;
}

.pinfix-annotation-resize-edge.is-top,
.pinfix-annotation-resize-edge.is-bottom {
  left: 0;
  width: 100%;
  height: 12px;
  cursor: ns-resize;
}

.pinfix-annotation-resize-edge.is-top {
  top: -6px;
}

.pinfix-annotation-resize-edge.is-bottom {
  bottom: -6px;
}

.pinfix-annotation-resize-edge.is-left,
.pinfix-annotation-resize-edge.is-right {
  top: 0;
  width: 12px;
  height: 100%;
  cursor: ew-resize;
}

.pinfix-annotation-resize-edge.is-left {
  left: -6px;
}

.pinfix-annotation-resize-edge.is-right {
  right: -6px;
}

.pinfix-annotation-box.is-active {
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.62), 0 0 22px rgba(15, 118, 110, 0.28);
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
  transition: transform 140ms ease, box-shadow 140ms ease;
}

.pinfix-label.is-interactive {
  cursor: pointer;
  pointer-events: auto;
}

.pinfix-label.is-focused,
.pinfix-label.is-active {
  transform: scale(1.08);
}

.pinfix-label.is-inside {
  border-width: 2px !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.52) inset;
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.32);
}

.pinfix-label.has-missing-note::after {
  content: "";
  position: absolute;
  right: -1px;
  top: -1px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #ef233c;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 7px rgba(15, 23, 42, 0.24);
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
  z-index: 6;
  display: flex;
  gap: 3px;
  pointer-events: auto;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248, 250, 252, 0.88);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}

.pinfix-candidate-tools button,
.pinfix-inline-tools button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.82);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 11px;
  line-height: 1;
  transition: background 120ms ease, box-shadow 120ms ease;
}

.pinfix-candidate-tools button {
  background: rgba(30, 41, 59, 0.84);
}

.pinfix-annotation-tools {
  z-index: 7;
  opacity: 0;
  visibility: hidden;
  transform: scale(0.96);
  transition: opacity 140ms ease, transform 140ms ease, visibility 140ms ease;
  transform-origin: center top;
}

.pinfix-annotation-tools.is-above {
  transform-origin: center bottom;
}

.pinfix-annotation-tools::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: var(--pinfix-tool-bridge, 12px);
}

.pinfix-annotation-tools.is-above::before {
  bottom: calc(-1 * var(--pinfix-tool-bridge, 12px));
}

.pinfix-annotation-tools.is-below::before {
  top: calc(-1 * var(--pinfix-tool-bridge, 12px));
}

.pinfix-annotation-box:hover + .pinfix-annotation-tools,
.pinfix-annotation-tools:hover,
.pinfix-annotation-tools.is-active {
  opacity: 1;
  visibility: visible;
  transform: scale(1);
}

.pinfix-candidate-tools .pinfix-icon,
.pinfix-inline-tools .pinfix-icon {
  width: 12px;
  height: 12px;
}

.pinfix-candidate-tools button:hover,
.pinfix-inline-tools button:hover {
  background: #0f766e;
  box-shadow: 0 6px 12px rgba(15, 118, 110, 0.22);
}

.pinfix-candidate-tools button:active,
.pinfix-inline-tools button:active {
  background: #115e59;
}

.pinfix-inline-tools button[data-action="delete-annotation"],
.pinfix-inline-tools button[data-action="delete-mask"] {
  background: rgba(71, 85, 105, 0.82);
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
.pinfix-toast {
  position: fixed;
  pointer-events: auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(14px);
}

.pinfix-tooltip {
  position: fixed;
  z-index: 80;
  max-width: min(220px, calc(100vw - 24px));
  padding: 7px 9px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
  pointer-events: none;
  white-space: nowrap;
}

.pinfix-area-capture-active .pinfix-chrome,
.pinfix-area-capture-active .pinfix-popover,
.pinfix-area-capture-active .pinfix-sidecar,
.pinfix-area-capture-active .pinfix-note-card,
.pinfix-area-capture-active .pinfix-global-strip,
.pinfix-area-capture-active .pinfix-global-panel,
.pinfix-area-capture-active .pinfix-candidate,
.pinfix-area-capture-active .pinfix-toast,
.pinfix-area-capture-active .pinfix-tooltip,
.pinfix-area-capture-active .pinfix-inline-tools {
  display: none !important;
}

.pinfix-area-capture-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: auto;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
  background:
    linear-gradient(rgba(15, 23, 42, 0.34), rgba(15, 23, 42, 0.34)),
    radial-gradient(circle at 50% 45%, rgba(45, 212, 191, 0.18), rgba(15, 23, 42, 0) 42%);
}

.pinfix-area-capture-hint {
  position: fixed;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  display: grid;
  gap: 4px;
  width: min(420px, calc(100vw - 32px));
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(153, 246, 228, 0.46);
  background: rgba(15, 23, 42, 0.86);
  color: #f8fafc;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(14px);
  text-align: center;
}

.pinfix-area-capture-hint strong {
  font-size: 14px;
}

.pinfix-area-capture-hint span {
  color: rgba(226, 232, 240, 0.86);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.pinfix-area-capture-selection {
  position: fixed;
  border: 2px solid #5eead4;
  border-radius: 10px;
  background: rgba(240, 253, 250, 0.16);
  box-shadow:
    0 0 0 9999px rgba(15, 23, 42, 0.28),
    0 0 0 1px rgba(15, 118, 110, 0.5) inset;
}

.pinfix-note-card {
  position: absolute;
  z-index: 25;
  width: min(320px, calc(100vw - 24px));
  min-height: 104px;
  border-radius: 16px;
  padding: 9px;
  border-top-width: 2px;
}

.pinfix-note-card.is-focused {
  box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.22), 0 14px 30px rgba(15, 23, 42, 0.14);
}

.pinfix-note-card.is-dark,
.pinfix-global-panel.is-dark,
.pinfix-global-strip.is-dark,
.pinfix-toast.is-dark {
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
  border-color: rgba(148, 163, 184, 0.28);
}

.pinfix-note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  margin-bottom: 6px;
}

.pinfix-note-badge {
  min-width: 24px;
  height: 24px;
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
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: inherit;
  opacity: 0.74;
}

.pinfix-note-delete {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  padding: 0;
  display: grid;
  place-items: center;
  line-height: 1;
  border-radius: 999px;
  opacity: 0.82;
  transition: background 140ms ease, opacity 140ms ease, transform 140ms ease;
}

.pinfix-note-delete:hover {
  background: rgba(15, 23, 42, 0.08);
  opacity: 1;
}

.pinfix-note-card.is-dark .pinfix-note-delete:hover {
  background: rgba(255, 255, 255, 0.12);
}

.pinfix-note-delete:active {
  transform: scale(0.94);
}

.pinfix-note-input,
.pinfix-global-input,
.pinfix-global-template-title {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 1.45;
}

.pinfix-note-input,
.pinfix-global-input {
  resize: none;
}

.pinfix-note-input {
  min-height: 68px;
  max-height: 190px;
}

.pinfix-note-summary {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 2px 0 4px;
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
  width: min(820px, calc(100vw - 32px));
  min-height: min(360px, calc(100vh - 32px));
  max-height: calc(100vh - 32px);
  border-radius: 18px;
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.pinfix-global-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pinfix-global-template-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pinfix-global-template-scroll {
  flex: 0 1 auto;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  min-width: 0;
  max-width: calc(100% - 50px);
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 4px;
  scrollbar-width: none;
}

.pinfix-global-template-scroll::-webkit-scrollbar {
  display: none;
}

.pinfix-global-template-chip,
.pinfix-global-template-add,
.pinfix-global-template-option,
.pinfix-global-template-danger {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(248, 250, 252, 0.92);
  color: inherit;
}

.pinfix-global-template-chip,
.pinfix-global-template-add {
  flex: 0 0 auto;
  min-height: 40px;
  border-radius: 999px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.pinfix-global-template-add {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
  padding: 0;
  display: grid;
  place-items: center;
  font-size: 18px;
  line-height: 1;
}

.pinfix-global-template-chip.is-active,
.pinfix-global-template-add.is-active {
  border-color: rgba(15, 118, 110, 0.38);
  background: rgba(222, 247, 244, 0.96);
  color: #0f766e;
}

.pinfix-global-content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: auto;
  overflow: hidden;
  overflow-x: hidden;
  padding: 0 2px;
  overscroll-behavior: contain;
}

.pinfix-global-note-body,
.pinfix-global-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pinfix-global-note-body,
.pinfix-global-editor {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px 10px 8px 4px;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.pinfix-global-editor-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pinfix-global-helper {
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  flex: 0 0 auto;
}

.pinfix-global-editor-top .pinfix-global-helper {
  flex: 1;
}

.pinfix-global-picker {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  gap: 8px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.pinfix-global-field-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.pinfix-global-input {
  min-height: 120px;
}

.pinfix-global-note-input {
  flex: 1 1 auto;
  min-height: 128px;
}

.pinfix-global-template-title {
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  padding: 9px 12px;
  background: rgba(248, 250, 252, 0.82);
  font-size: 13px;
}

#pinfix-root .pinfix-global-panel .pinfix-global-template-title:focus-visible,
#pinfix-root .pinfix-global-panel .pinfix-global-template-content:focus-visible,
#pinfix-root .pinfix-global-panel .pinfix-global-note-input:focus-visible {
  outline: none;
  border-color: rgba(45, 212, 191, 0.58);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.22);
}

.pinfix-global-template-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  max-height: 92px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  overscroll-behavior: contain;
}

.pinfix-global-template-option {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border-radius: 999px;
  padding: 7px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  text-align: left;
  transition: background 160ms ease, border-color 160ms ease;
}

.pinfix-global-template-option.is-selected {
  border-color: rgba(15, 118, 110, 0.4);
  background: rgba(222, 247, 244, 0.92);
}

.pinfix-global-template-option-check {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  flex: 0 0 auto;
}

.pinfix-global-template-option.is-selected .pinfix-global-template-option-check {
  border-color: rgba(15, 118, 110, 0.46);
  background: #0f766e;
  color: #ffffff;
}

.pinfix-global-template-option-name {
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 560px) {
  .pinfix-global-template-options {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .pinfix-global-template-option {
    min-height: 40px;
    padding: 6px;
  }

  .pinfix-global-template-option-check {
    display: none;
  }
}

.pinfix-global-template-content {
  min-height: 300px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(248, 250, 252, 0.82);
}

.pinfix-global-template-danger {
  min-height: 40px;
  border-radius: 999px;
  padding: 0 14px;
  cursor: pointer;
  color: inherit;
  white-space: nowrap;
  transition: background 160ms ease, border-color 160ms ease;
}

.pinfix-global-empty {
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 14px 12px;
  font-size: 12px;
  color: #64748b;
}

.pinfix-global-panel.is-dark .pinfix-global-field-label,
.pinfix-global-panel.is-dark .pinfix-global-empty,
.pinfix-global-panel.is-dark .pinfix-global-helper {
  color: rgba(226, 232, 240, 0.82);
}

.pinfix-global-panel.is-dark .pinfix-global-picker {
  border-top-color: rgba(148, 163, 184, 0.2);
}

.pinfix-global-panel.is-dark .pinfix-global-template-chip,
.pinfix-global-panel.is-dark .pinfix-global-template-add,
.pinfix-global-panel.is-dark .pinfix-global-template-option,
.pinfix-global-panel.is-dark .pinfix-global-template-title,
.pinfix-global-panel.is-dark .pinfix-global-template-content,
.pinfix-global-panel.is-dark .pinfix-global-template-danger {
  background: rgba(30, 41, 59, 0.78);
  border-color: rgba(148, 163, 184, 0.24);
  color: #f8fafc;
}

.pinfix-global-panel.is-dark .pinfix-global-template-chip.is-active,
.pinfix-global-panel.is-dark .pinfix-global-template-add.is-active,
.pinfix-global-panel.is-dark .pinfix-global-template-option.is-selected {
  background: rgba(15, 118, 110, 0.28);
  border-color: rgba(45, 212, 191, 0.42);
  color: #ccfbf1;
}

.pinfix-toast {
  z-index: 70;
  right: 16px;
  top: 16px;
  border-radius: 14px;
  padding: 12px 14px;
  max-width: min(360px, calc(100vw - 32px));
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.pinfix-toast.is-anchored {
  right: auto;
  top: auto;
}

.pinfix-toast.is-success {
  border-color: rgba(15, 118, 110, 0.26);
  background: rgba(240, 253, 250, 0.96);
  color: #0f3f3b;
}

.pinfix-toast button {
  border: 0;
  border-radius: 999px;
  background: #0f766e;
  color: #ffffff;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.pinfix-hidden {
  display: none !important;
}

.pinfix-hidden-for-capture .pinfix-chrome,
.pinfix-hidden-for-capture .pinfix-popover,
.pinfix-hidden-for-capture .pinfix-sidecar,
.pinfix-hidden-for-capture .pinfix-note-card,
.pinfix-hidden-for-capture .pinfix-global-strip,
.pinfix-hidden-for-capture .pinfix-global-panel,
.pinfix-hidden-for-capture .pinfix-candidate,
.pinfix-hidden-for-capture .pinfix-area-capture-layer,
.pinfix-hidden-for-capture .pinfix-toast,
.pinfix-hidden-for-capture .pinfix-tooltip,
.pinfix-hidden-for-capture .pinfix-inline-tools {
  display: none !important;
}

.pinfix-note-card textarea::placeholder,
.pinfix-global-panel textarea::placeholder,
.pinfix-global-panel input::placeholder {
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

@media (max-width: 640px) {
  .pinfix-chrome,
  #pinfix-root[data-launcher-position="right-center"] .pinfix-chrome,
  #pinfix-root[data-launcher-position="right-bottom"] .pinfix-chrome {
    left: 12px;
    right: 12px;
    top: auto;
    bottom: max(14px, env(safe-area-inset-bottom));
    transform: none;
    flex-direction: row;
    align-items: flex-end;
    justify-content: flex-start;
  }

  .pinfix-launcher {
    width: 48px;
    height: 48px;
  }

  .pinfix-launcher::before {
    width: 40px;
    height: 40px;
  }

  .pinfix-launcher::after {
    width: 14px;
    height: 14px;
  }

  .pinfix-toolbar {
    --pinfix-toolbar-padding: 10px;
    --pinfix-toolbar-gap: 8px;
    --pinfix-toolbar-button-size: 46px;
    --pinfix-toolbar-header-height: 32px;
    --pinfix-toolbar-close-size: 32px;
    margin: 0 auto;
    max-width: calc(100vw - 24px);
    border-radius: 20px;
  }

  .pinfix-toolbar-header {
    gap: var(--pinfix-toolbar-gap);
  }

  .pinfix-toolbar-grip,
  .pinfix-toolbar-close {
    height: var(--pinfix-toolbar-header-height);
  }

  .pinfix-tool-button {
    width: var(--pinfix-toolbar-button-size);
    height: var(--pinfix-toolbar-button-size);
  }

  .pinfix-toolbar-close {
    transform: none;
  }

  .pinfix-popover,
  .pinfix-sidecar {
    left: 12px !important;
    right: 12px;
    top: auto !important;
    bottom: calc(188px + env(safe-area-inset-bottom));
    width: auto;
    max-height: min(70vh, calc(100vh - 214px));
  }

  .pinfix-note-card {
    position: fixed;
    left: 12px !important;
    right: 12px;
    top: auto !important;
    bottom: calc(188px + env(safe-area-inset-bottom));
    width: auto !important;
    max-height: min(56vh, calc(100vh - 222px));
    overflow: auto;
  }

  .pinfix-global-panel {
    width: calc(100vw - 24px);
    min-height: min(460px, calc(100vh - 96px));
    max-height: calc(100vh - 96px);
    bottom: calc(74px + env(safe-area-inset-bottom));
    padding: 14px 12px 12px;
  }

  .pinfix-global-strip {
    bottom: calc(74px + env(safe-area-inset-bottom));
  }

  .pinfix-global-template-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 128px;
  }

  .pinfix-toast {
    left: 12px;
    right: 12px;
    top: 12px;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pinfix-launcher,
  .pinfix-tool-button,
  .pinfix-popover,
  .pinfix-sidecar,
  .pinfix-tooltip,
  .pinfix-note-card,
  .pinfix-global-panel,
  .pinfix-toast {
    transition: none !important;
  }
}
`;
}
