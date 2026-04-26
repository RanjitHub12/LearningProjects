import streamlit as st

# ==========================================
# PAGE CONFIG — MUST BE THE FIRST COMMAND!
# ==========================================
st.set_page_config(
    page_title="SafeRoute Evac System",
    page_icon="🔥",
    layout="wide",
    initial_sidebar_state="collapsed"
)

import matplotlib
matplotlib.use('Agg') # CRUCIAL: Uses a faster, headless backend optimized for web rendering
import matplotlib.pyplot as plt
import numpy as np
import time
import io
from simulation import Simulation
from sensors import NavigationFeedback
from layout import LayoutManager

st.markdown("""
<style>
    /* --- HIDE SIDEBAR TOGGLE & REDUCE CHROME --- */
    [data-testid="collapsedControl"] { display: none; }
    .stApp { background-color: #0d1117; color: #e6edf3; }
    header[data-testid="stHeader"] { background-color: #0d1117; display: none; }
    .block-container { padding-top: 1rem; padding-bottom: 0; max-width: 100%; }

    /* --- AGGRESSIVELY KILL THE DIMMING / RUNNING OVERLAY --- */
    div[data-testid="stStatusWidget"] { display: none !important; }
    div[data-testid="stSkeleton"] { display: none !important; }
    
    /* Target all Streamlit layout containers to prevent opacity changes */
    [data-testid="stAppViewBlockContainer"], 
    .element-container, 
    div[class*="st-emotion-cache-"] { 
        opacity: 1 !important; 
        filter: none !important;
        transition: none !important; 
        animation: none !important; 
    }
    
    div.stMarkdown, div.stPlotlyChart, div[data-testid="stImage"], div[data-testid="stMetric"] { 
        opacity: 1 !important; 
    }

    /* --- METRIC --- */
    div[data-testid="stMetricValue"] { font-size: 1.8rem; color: #58a6ff; font-family: 'JetBrains Mono', monospace; }
    div[data-testid="stMetricLabel"] { color: #8b949e; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }

    /* --- DIRECTION CARD --- */
    .dir-card {
        background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
        border: 1px solid #30363d;
        padding: 18px 12px;
        border-radius: 10px;
        text-align: center;
        margin-bottom: 8px;
    }
    .dir-card .arrow { font-size: 52px; line-height: 1; }
    .dir-card .heading { font-size: 16px; font-weight: 700; color: #e6edf3; letter-spacing: 2px; margin-top: 2px; }
    .dir-card .sub { font-size: 11px; color: #8b949e; margin-top: 2px; }

    /* --- NEXT STEP --- */
    .next-step {
        background: #1c1f26;
        border-left: 3px solid #d29922;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 0.85rem;
        color: #d29922;
        margin-bottom: 6px;
    }

    /* --- EVAC BANNER --- */
    .evac-banner {
        background: linear-gradient(90deg, #b62324, #da3633);
        color: #fff; text-align: center; padding: 7px;
        border-radius: 6px; font-weight: 700; letter-spacing: 3px; font-size: 12px;
        margin-bottom: 6px;
    }

    /* --- STATUS PILL --- */
    .pill { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; letter-spacing:1px; }
    .pill-ok { background:#238636; color:#fff; }
    .pill-alert { background:#da3633; color:#fff; }

    /* --- INFO ROW --- */
    .info-row {
        display: flex; justify-content: space-between; gap: 6px;
        margin-bottom: 6px;
    }
    .info-box {
        flex: 1; text-align: center;
        background: #161b22; border: 1px solid #30363d; border-radius: 6px;
        padding: 6px 4px;
    }
    .info-box .v { font-size: 15px; font-weight: 700; color: #58a6ff; }
    .info-box .l { font-size: 8px; color: #8b949e; text-transform: uppercase; letter-spacing: 1px; }

    /* --- COMPACT CONTROLS PANEL --- */
    .ctrl-panel {
        background: #161b22; border: 1px solid #30363d;
        border-radius: 8px; padding: 10px 12px; margin-bottom: 6px;
    }
    .ctrl-title { font-size: 11px; font-weight: 700; color: #8b949e; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }

    /* --- BRAND --- */
    .brand-bar {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #30363d;
    }
    .brand-bar .name { font-size: 18px; font-weight: 900; color: #da3633; letter-spacing: 3px; }
    .brand-bar .tag { font-size: 9px; color: #8b949e; letter-spacing: 1px; }
</style>
""", unsafe_allow_html=True)

# ==========================================
# SESSION STATE
# ==========================================
if 'sim' not in st.session_state:
    layout_mgr = LayoutManager()
    st.session_state.sim = Simulation(size=60, layout_mgr=layout_mgr)
    st.session_state.step_count = 0
    st.session_state.evac_steps = 0  # <--- NEW: Tracks steps only during active fire
    st.session_state.feedback = NavigationFeedback()

sim = st.session_state.sim
feedback = st.session_state.feedback
view_mode = "Architect View (Simulation)"


# ==========================================
# LAYOUT: LEFT (controls) | CENTER (map) | RIGHT (telemetry)
# ==========================================

st.markdown("""
<div class='brand-bar'>
    <div><span class='name'>🔥 SAFEROUTE</span></div>
    <div class='tag'>Real-Time Evacuation Simulation</div>
</div>
""", unsafe_allow_html=True)

col_left, col_map, col_right = st.columns([1.1, 3.2, 1.1])

# ==========================================
# LEFT COLUMN — CONTROLS
# ==========================================
with col_left:
    st.markdown("<div class='ctrl-title'>📍 Place Agent</div>", unsafe_allow_html=True)
    px_col, py_col = st.columns(2)
    with px_col:
        player_x = st.number_input("X", min_value=0, max_value=59, value=sim.start_node.x, key="px", label_visibility="collapsed")
    with py_col:
        player_y = st.number_input("Y", min_value=0, max_value=59, value=sim.start_node.y, key="py", label_visibility="collapsed")

    if st.button("📍 PLACE", use_container_width=True):
        target = sim.grid.get((player_x, player_y))
        if target and target.type != 'WALL':
            sim.start_node = target
            sim.solver.start = target
            sim.solver.km = 0
            sim.solver.initialize()
            sim.pdr.est_x = player_x
            sim.pdr.est_y = player_y
            sim.pdr.heading = 0.0
            if hasattr(sim.pdr, 'heading_drift'):
                sim.pdr.heading_drift = 0.0
            sim.pdr_trace = []
            sim.escaped = False
            sim.trapped = False
            sim.instruction = "READY"
            
            # ---> Reset Timers here <---
            st.session_state.step_count = 0 
            st.session_state.evac_steps = 0  
            
            st.toast(f"Placed at ({player_x}, {player_y})", icon="📍")
            st.rerun()
        else:
            st.toast("Invalid (wall)", icon="❌")

    st.markdown("---")

    # ---- SIMULATION ----
    st.markdown("<div class='ctrl-title'>⚙️ Simulation</div>", unsafe_allow_html=True)
    sim_speed = st.slider("Render Delay (sec)", min_value=0.0, max_value=0.5, value=0.0, step=0.01, label_visibility="collapsed")
    steps_per_frame = st.slider("Simulation Speed Multiplier", min_value=1, max_value=10, value=1, help="Higher = faster simulation, but choppier animation")
    run_auto = st.checkbox("Auto-Pilot", value=False)
    enable_fire_gen = st.checkbox("Random Fire", value=False)
    st.markdown("---")

    st.markdown("<div class='ctrl-title'>🔥 Ignite Fire</div>", unsafe_allow_html=True)
    fx_col, fy_col = st.columns(2)
    with fx_col:
        tgt_x = st.number_input("FX", min_value=0, max_value=59, value=30, key="fx", label_visibility="collapsed")
    with fy_col:
        tgt_y = st.number_input("FY", min_value=0, max_value=59, value=30, key="fy", label_visibility="collapsed")

    if st.button("🔥 IGNITE", use_container_width=True):
        success = sim.toggle_fire(target_pos=(tgt_x, tgt_y))
        st.toast(f"Fire at ({tgt_x},{tgt_y})" if success else "Invalid", icon="🔥" if success else "❌")

    c_rand, c_reset = st.columns(2)
    with c_rand:
        if st.button("🎲", use_container_width=True, help="Random fire"):
            sim.toggle_fire()
            st.toast("Random Fire", icon="🔥")
    with c_reset:
        if st.button("🔄", use_container_width=True, help="Restart simulation"):
            st.session_state.sim = Simulation(size=60, layout_mgr=LayoutManager())
            # ---> Reset Timers here <---
            st.session_state.step_count = 0 
            st.session_state.evac_steps = 0  
            st.rerun()


# ==========================================
# CENTER COLUMN — MAP
# ==========================================
with col_map:
    # Adding tight_layout helps optimize matplotlib rendering speed slightly
    fig, ax = plt.subplots(figsize=(9, 9), facecolor='#0d1117', layout='tight')
    ax.set_facecolor('#0d1117')

    grid_colors = np.zeros((sim.size, sim.size, 3))

    C_WALL   = [0.15, 0.17, 0.20]
    C_FLOOR  = [0.85, 0.88, 0.92]
    C_FIRE   = [0.85, 0.21, 0.20]
    C_EXIT   = [0.13, 0.53, 0.21]
    C_WINDOW = [0.20, 0.52, 0.85]
    C_CROWD  = [0.82, 0.60, 0.13]
    C_SMOKE  = [0.42, 0.44, 0.47]

    for y in range(sim.size):
        for x in range(sim.size):
            node = sim.grid[(x,y)]
            if   node.type == 'WALL':   grid_colors[y, x] = C_WALL
            elif node.type == 'FIRE':   grid_colors[y, x] = C_FIRE
            elif node.type == 'SMOKE':  grid_colors[y, x] = C_SMOKE
            elif node.type == 'CROWD':  grid_colors[y, x] = C_CROWD
            elif node.type == 'WINDOW': grid_colors[y, x] = C_WINDOW
            elif node in sim.goals:     grid_colors[y, x] = C_EXIT
            else:                       grid_colors[y, x] = C_FLOOR

            if not node.visited:
                grid_colors[y, x] = [c * 0.35 for c in grid_colors[y, x]]

    ax.imshow(grid_colors, origin='lower')

    # Draw older "ghost" paths
    if hasattr(sim, 'ghost_paths'):
        for i, g_path in enumerate(sim.ghost_paths):
            if g_path:
                gpx = [p[0] for p in g_path]
                gpy = [p[1] for p in g_path]
                ax.plot(gpx, gpy, color='#bc8cff', linewidth=1.2, linestyle=':', alpha=0.15 + i*0.08, label="Old Route" if i==0 else None)

    # NEW: Draw dynamic alternative paths dynamically computed
    if hasattr(sim, 'get_alternative_routes'):
        alt_paths = sim.get_alternative_routes()
        for i, alt_path in enumerate(alt_paths):
            apx = [p[0] for p in alt_path]
            apy = [p[1] for p in alt_path]
            ax.plot(apx, apy, color='#d29922', linewidth=1.5, linestyle='-.', alpha=0.85, label="Alt Route" if i==0 else None)

    # Optimal path
    if hasattr(sim.solver, 'get_whole_path'):
        full_path = sim.solver.get_whole_path()
        if full_path:
            px = [n.x for n in full_path]
            py = [n.y for n in full_path]
            ax.plot(px, py, color='#58a6ff', linewidth=2.5, linestyle='--', label="Optimal Path")

    ax.set_xticks(np.arange(0, sim.size, 10))
    ax.set_yticks(np.arange(0, sim.size, 10))
    ax.tick_params(axis='both', colors='#484f58', labelsize=7)
    ax.grid(color='#30363d', linestyle='-', linewidth=0.3, alpha=0.4)
    for spine in ax.spines.values():
        spine.set_color('#30363d')

    if hasattr(sim, 'sensors'):
        sensor_x = [s.x for s in sim.sensors]
        sensor_y = [s.y for s in sim.sensors]
        ax.scatter(sensor_x, sensor_y, c='#d29922', s=8, marker='.', alpha=0.4, label="Sensors")

    ax.scatter(sim.start_node.x, sim.start_node.y, c='#58a6ff', s=160, edgecolors='white', linewidth=1.5, zorder=10, label="Agent")

    if sim.pdr_trace:
        pdx, pdy = sim.pdr_trace[-1]
        ax.scatter(pdx, pdy, c='#f85149', marker='x', s=100, linewidth=2.5, zorder=11, label="PDR")

    ax.set_title(f"Step {st.session_state.step_count}", color='#e6edf3', fontsize=11, fontweight='bold', pad=10)
    
    handles, labels = ax.get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    ax.legend(by_label.values(), by_label.keys(), loc='upper right', fontsize='x-small', framealpha=0.85, facecolor='#161b22', edgecolor='#30363d', labelcolor='#e6edf3')

    # Fast rendering through memory buffer
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight', dpi=100, facecolor='#0d1117')
    buf.seek(0)
    st.image(buf, use_container_width=True)
    
    plt.close(fig) 


# ==========================================
# RIGHT COLUMN — TELEMETRY
# ==========================================
with col_right:
    pill_cls = "pill-alert" if sim.panic_mode else "pill-ok"
    pill_txt = "EMERGENCY" if sim.panic_mode else "NORMAL"
    st.markdown(f"<div style='text-align:right;margin-bottom:4px'><span class='pill {pill_cls}'>{pill_txt}</span></div>", unsafe_allow_html=True)

    # ---> NEW: Split into two columns for Distance and Time <---
    m_col1, m_col2 = st.columns(2)
    
    dist = sim.solver.get_distance_to_exit() if not sim.escaped else 0
    m_col1.metric("Dist. to Exit", f"{dist:.0f}m")
    
    # Calculate Time Taken ONLY using evac_steps (starts when fire starts)
    sim_seconds = st.session_state.get('evac_steps', 0) * 1.2
    mins, secs = divmod(int(sim_seconds), 60)
    m_col2.metric("Time Taken", f"{mins:02d}:{secs:02d}")

    instruction = sim.instruction
    arrow_icon = {
        "UP": "⬆️", "DOWN": "⬇️", "LEFT": "⬅️", "RIGHT": "➡️",
        "WAIT": "🛑", "SAFE": "✅", "STOP!": "⚠️", "ESCAPED": "🏃", "READY": "🟢"
    }.get(instruction, "❓")

    st.markdown(f"""
    <div class='dir-card'>
        <div class='arrow'>{arrow_icon}</div>
        <div class='heading'>Go {instruction}</div>
        <div class='sub'>{sim.dist_to_turn}m straight</div>
    </div>
    """, unsafe_allow_html=True)

    if hasattr(sim, 'next_action') and sim.next_action != "Arrive" and instruction not in ["SAFE", "ESCAPED", "WAIT", "READY"]:
        st.markdown(f"<div class='next-step'>Then <b>{sim.next_action}</b> · {sim.next_dist}m</div>", unsafe_allow_html=True)

    if sim.panic_mode:
        st.markdown("<div class='evac-banner'>⚠ EVACUATE ⚠</div>", unsafe_allow_html=True)

    st.markdown(f"""
    <div class='info-row'>
        <div class='info-box'><div class='v'>{st.session_state.step_count}</div><div class='l'>Steps</div></div>
        <div class='info-box'><div class='v'>{sim.start_node.x},{sim.start_node.y}</div><div class='l'>Pos</div></div>
    </div>
    <div class='info-row'>
        <div class='info-box'><div class='v'>{len(sim.fire_front)}</div><div class='l'>Fires</div></div>
        <div class='info-box'><div class='v'>{sim.casualties}</div><div class='l'>Casualties</div></div>
    </div>
    """, unsafe_allow_html=True)


# ==========================================
# AUTO-RUN
# ==========================================
if run_auto and not sim.escaped:
    for _ in range(steps_per_frame):
        if not sim.escaped:
            sim.step(allow_fire=enable_fire_gen)
            st.session_state.step_count += 1
            
            # ---> NEW: Increment evac timer only if there is an active fire
            if len(sim.fire_front) > 0:
                st.session_state.evac_steps = st.session_state.get('evac_steps', 0) + 1
            
    if sim_speed > 0:
        time.sleep(sim_speed)
    st.rerun()