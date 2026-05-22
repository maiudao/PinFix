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

.pinfix-tool-danger {
  color: #b91c1c;
  border-color: rgba(225, 29, 46, 0.18);
  background: rgba(255, 241, 242, 0.94);
}

.pinfix-tool-danger:hover {
  background: rgba(254, 226, 226, 0.96);
}

.pinfix-tool-button.is-active {
  background: #0f766e;
  color: #ffffff;
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
  border-color: rgba(225, 29, 46, 0.28);
  background: rgba(225, 29, 46, 0.07);
  color: #b91c1c;
  font-weight: 700;
}

.pinfix-list button.pinfix-danger-action:hover {
  border-color: rgba(225, 29, 46, 0.42);
  background: rgba(225, 29, 46, 0.11);
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
  cursor: pointer;
  pointer-events: auto;
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
  transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
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
  transform: translateY(-0.5px);
}

.pinfix-candidate-tools button:active,
.pinfix-inline-tools button:active {
  transform: translateY(0) scale(0.97);
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
.pinfix-countdown,
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
  min-height: min(500px, calc(100vh - 32px));
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
  flex: 1;
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 3px 2px 8px;
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
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.pinfix-global-template-add {
  width: 44px;
  min-width: 44px;
  min-height: 44px;
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
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  overflow-x: hidden;
  padding: 2px 2px 0;
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
  padding-right: 2px;
  overscroll-behavior: contain;
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
  flex: 1;
}

.pinfix-global-picker {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.pinfix-global-field-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.pinfix-global-input {
  min-height: 160px;
}

.pinfix-global-note-input {
  flex: 1;
  min-height: 180px;
}

.pinfix-global-template-title {
  min-height: 40px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 12px;
  padding: 9px 12px;
  background: rgba(248, 250, 252, 0.82);
  font-size: 13px;
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
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
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
}

.pinfix-global-template-danger {
  min-height: 40px;
  border-radius: 999px;
  padding: 0 14px;
  cursor: pointer;
  color: #b91c1c;
  white-space: nowrap;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
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
.pinfix-hidden-for-capture .pinfix-sidecar,
.pinfix-hidden-for-capture .pinfix-note-card,
.pinfix-hidden-for-capture .pinfix-global-strip,
.pinfix-hidden-for-capture .pinfix-global-panel,
.pinfix-hidden-for-capture .pinfix-candidate,
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
