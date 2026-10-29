PY?=python3
# Prep integrity only. NOT a CI substitute for p3-m1-smoke once phase3-cli lands.
p3-m1-hooks: ; SALOMON_P3_M1_HOOKS_ONLY=1 $(PY) local_ask_smoke_gate.py
# Real gate: fails closed unless phase3-cli produced a report. REPORT=path/to/report.json
p3-m1-smoke: ; $(PY) local_ask_smoke_gate.py $(if $(REPORT),--report $(REPORT),)
