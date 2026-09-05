"""
╔══════════════════════════════════════════════════════════════════╗
║        SIMULASI PENYEBARAN VIRUS — PyTorch + Scikit-learn        ║
╠══════════════════════════════════════════════════════════════════╣
║  Model: SIR Agent-Based Simulation                               ║
║  PyTorch  : komputasi grid tensor (GPU-accelerated jika ada)     ║
║  Sklearn  : analisis kluster wabah + prediksi puncak epidemi     ║
║  Matplotlib: visualisasi real-time animasi + grafik              ║
╚══════════════════════════════════════════════════════════════════╝

Requirements:
    pip install torch matplotlib numpy scikit-learn

Jalankan:
    python virus_simulation.py

Kontrol:
    [SPACE]  pause / lanjut
    [R]      reset simulasi
    [Q]      keluar
    [1-4]    preset skenario (flu ringan / COVID / campak / terkendali)
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import matplotlib.gridspec as gridspec
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch
import torch
import torch.nn.functional as F
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
import warnings
warnings.filterwarnings("ignore")

# ─── DEVICE ─────────────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[INFO] Menggunakan device: {DEVICE}")

# ─── PARAMETER SIMULASI ──────────────────────────────────────────────────────
GRID_SIZE   = 80          # ukuran grid N×N
N_INITIAL   = 3           # jumlah individu terinfeksi awal

class SimParams:
    beta      = 0.30       # probabilitas transmisi per kontak
    gamma     = 0.05       # probabilitas sembuh per step
    mortality = 0.02       # probabilitas meninggal saat sembuh
    vacc_pct  = 0.10       # fraksi populasi yang sudah divaksin
    mobility  = 0.08       # probabilitas individu berpindah sel
    name      = "default"

# Preset skenario
PRESETS = {
    "1": dict(name="Flu Ringan",   beta=0.15, gamma=0.10, mortality=0.005, vacc_pct=0.20, mobility=0.12),
    "2": dict(name="COVID-like",   beta=0.28, gamma=0.05, mortality=0.020, vacc_pct=0.10, mobility=0.06),
    "3": dict(name="Campak",       beta=0.60, gamma=0.07, mortality=0.001, vacc_pct=0.05, mobility=0.15),
    "4": dict(name="Terkendali",   beta=0.12, gamma=0.08, mortality=0.005, vacc_pct=0.65, mobility=0.05),
}

# State encoding
S, I, R, D, V = 0, 1, 2, 3, 4
STATE_COLORS = ['#3B82F6', '#EF4444', '#22C55E', '#6B7280', '#A855F7']
STATE_LABELS = ['Rentan (S)', 'Terinfeksi (I)', 'Sembuh (R)', 'Meninggal (D)', 'Divaksin (V)']
CMAP = ListedColormap(STATE_COLORS)


# ─── KELAS SIMULASI UTAMA ────────────────────────────────────────────────────

class VirusSimulation:
    """
    Simulasi berbasis agen menggunakan PyTorch tensor.
    Grid N×N, setiap sel = satu individu.
    """

    def __init__(self, params: SimParams = None):
        self.p = params or SimParams()
        self.reset()

    def reset(self):
        N = GRID_SIZE
        self.step_count = 0
        self.history = {k: [] for k in ('S', 'I', 'R', 'D', 'V', 'new_cases')}

        # Inisialisasi grid sebagai PyTorch tensor (long = integer)
        self.grid = torch.zeros(N, N, dtype=torch.long, device=DEVICE)

        # Vaksinasi awal (acak)
        n_vacc = int(N * N * self.p.vacc_pct)
        flat = torch.randperm(N * N, device=DEVICE)[:n_vacc]
        self.grid.view(-1)[flat] = V

        # Seed infeksi awal di tengah
        self.grid[N//2, N//2] = I
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            self.grid[(N//2+dx)%N, (N//2+dy)%N] = I

        self._record_history()

    def _record_history(self):
        counts = self._counts()
        prev_i = self.history['I'][-1] if self.history['I'] else counts['I']
        new_c  = max(0, counts['I'] - prev_i + counts['R'] - (self.history['R'][-1] if self.history['R'] else 0))
        for k in ('S','I','R','D','V'):
            self.history[k].append(counts[k])
        self.history['new_cases'].append(new_c)

    def _counts(self):
        g = self.grid
        return {
            'S': int((g == S).sum()),
            'I': int((g == I).sum()),
            'R': int((g == R).sum()),
            'D': int((g == D).sum()),
            'V': int((g == V).sum()),
        }

    def _spread_infection(self):
        """
        Hitung penularan menggunakan konvolusi PyTorch.
        Setiap sel susceptible terinfeksi berdasarkan jumlah
        tetangga yang terinfeksi × probabilitas transmisi.
        """
        N = GRID_SIZE
        infected_mask = (self.grid == I).float().unsqueeze(0).unsqueeze(0)

        # Kernel konvolusi 3×3 (8 tetangga)
        kernel = torch.ones(1, 1, 3, 3, device=DEVICE)
        kernel[0, 0, 1, 1] = 0  # tidak hitung diri sendiri

        # Hitung jumlah tetangga terinfeksi (dengan padding circular)
        neighbor_infected = F.conv2d(
            infected_mask,
            kernel,
            padding=1
        ).squeeze()

        # Probabilitas infeksi = 1 - (1-beta)^n_infected_neighbors
        p_infect = 1.0 - (1.0 - self.p.beta) ** neighbor_infected
        rand_map  = torch.rand(N, N, device=DEVICE)

        susceptible = (self.grid == S)
        new_infected = susceptible & (rand_map < p_infect)
        return new_infected

    def _move_agents(self):
        """Mobilitas: partikel terinfeksi bisa berpindah sel (random walk)."""
        N = GRID_SIZE
        if self.p.mobility <= 0:
            return

        infected_pos = (self.grid == I).nonzero(as_tuple=False)
        if len(infected_pos) == 0:
            return

        move_mask = torch.rand(len(infected_pos), device=DEVICE) < self.p.mobility
        movers    = infected_pos[move_mask]

        if len(movers) == 0:
            return

        dirs = torch.randint(0, 4, (len(movers),), device=DEVICE)
        dr = torch.tensor([-1, 1, 0, 0], device=DEVICE)[dirs]
        dc = torch.tensor([0, 0, -1, 1], device=DEVICE)[dirs]

        nr = (movers[:, 0] + dr) % N
        nc = (movers[:, 1] + dc) % N

        for i in range(len(movers)):
            r0, c0 = movers[i, 0].item(), movers[i, 1].item()
            r1, c1 = nr[i].item(), nc[i].item()
            if self.grid[r1, c1] == S:
                self.grid[r1, c1] = I
                self.grid[r0, c0] = S   # bisa pindah balik

    def step(self):
        """Satu langkah waktu simulasi."""
        N = GRID_SIZE
        new_grid = self.grid.clone()

        # 1. Mobilitas agen
        self._move_agents()

        # 2. Penularan via konvolusi
        new_infected = self._spread_infection()
        new_grid[new_infected] = I

        # 3. Recovery / kematian individu terinfeksi
        infected = (self.grid == I)
        rand_recover = torch.rand(N, N, device=DEVICE)
        recovers = infected & (rand_recover < self.p.gamma)

        rand_die   = torch.rand(N, N, device=DEVICE)
        dies       = recovers & (rand_die < self.p.mortality)
        recovers_ok = recovers & ~dies

        new_grid[recovers_ok] = R
        new_grid[dies]        = D

        self.grid = new_grid
        self.step_count += 1
        self._record_history()

    def numpy_grid(self):
        return self.grid.cpu().numpy().astype(np.uint8)

    @property
    def r0(self):
        """Estimasi R₀ dari parameter."""
        return self.p.beta * 8 / self.p.gamma   # 8 tetangga

    @property
    def is_over(self):
        return int((self.grid == I).sum()) == 0


# ─── ANALISIS SCIKIT-LEARN ───────────────────────────────────────────────────

class EpidemicAnalyzer:
    """
    Analisis menggunakan scikit-learn:
    1. KMeans clustering lokasi wabah aktif
    2. Regresi linear prediksi puncak epidemi
    """

    def __init__(self, n_clusters=4):
        self.n_clusters = n_clusters
        self.kmeans     = KMeans(n_clusters=n_clusters, n_init=5, random_state=42)
        self.scaler     = StandardScaler()
        self.cluster_centers = None
        self.peak_day_pred   = None
        self.peak_val_pred   = None

    def update_clusters(self, grid_np):
        """Clustering posisi sel yang terinfeksi."""
        infected_pos = np.argwhere(grid_np == I)
        if len(infected_pos) < self.n_clusters * 2:
            self.cluster_centers = None
            return
        try:
            pos_scaled = self.scaler.fit_transform(infected_pos.astype(float))
            self.kmeans.fit(pos_scaled)
            self.cluster_centers = self.scaler.inverse_transform(self.kmeans.cluster_centers_)
        except Exception:
            self.cluster_centers = None

    def predict_peak(self, history_i):
        """
        Regresi polinomial sederhana untuk memprediksi puncak epidemi
        dari tren kasus aktif.
        """
        if len(history_i) < 10:
            return None, None
        try:
            y = np.array(history_i, dtype=float)
            x = np.arange(len(y)).reshape(-1, 1)

            # Gunakan LinearRegression pada fitur polinomial degree-2
            x_poly = np.hstack([x, x**2])
            reg = LinearRegression().fit(x_poly, y)

            # Prediksi 50 step ke depan
            future  = np.arange(len(y), len(y) + 50).reshape(-1, 1)
            f_poly  = np.hstack([future, future**2])
            y_pred  = reg.predict(f_poly)

            if y_pred.max() > y.max():
                peak_idx = int(np.argmax(y_pred))
                return len(y) + peak_idx, int(y_pred[peak_idx])
            else:
                return None, None
        except Exception:
            return None, None


# ─── VISUALISASI ─────────────────────────────────────────────────────────────

def run_simulation():
    params = SimParams()
    sim    = VirusSimulation(params)
    ana    = EpidemicAnalyzer(n_clusters=4)
    paused = [False]

    fig = plt.figure(figsize=(15, 9), facecolor='#0f1117')
    fig.canvas.manager.set_window_title("Simulasi Penyebaran Virus — PyTorch + Scikit-learn")

    gs = gridspec.GridSpec(
        3, 3,
        figure=fig,
        left=0.05, right=0.97,
        top=0.93, bottom=0.07,
        hspace=0.45, wspace=0.3
    )

    # ── Panel 1: Grid simulasi ──
    ax_grid = fig.add_subplot(gs[:, 0:2])
    ax_grid.set_facecolor('#0f1117')
    ax_grid.set_title("Grid Populasi", color='#94a3b8', fontsize=11, pad=8)
    im = ax_grid.imshow(
        sim.numpy_grid(), cmap=CMAP, vmin=0, vmax=4,
        interpolation='nearest', aspect='equal'
    )
    ax_grid.axis('off')

    # Overlay titik kluster (sklearn)
    cluster_scatter = ax_grid.scatter([], [], s=180, c='white',
                                       marker='x', linewidths=2, zorder=5,
                                       label='Pusat kluster wabah')
    ax_grid.legend(loc='upper right', fontsize=8, facecolor='#1e293b',
                   labelcolor='white', framealpha=0.7)

    legend_elements = [Patch(facecolor=c, label=l)
                       for c, l in zip(STATE_COLORS, STATE_LABELS)]
    ax_grid.legend(handles=legend_elements, loc='lower right', fontsize=7.5,
                   facecolor='#1e2533', labelcolor='white', framealpha=0.8)

    # ── Panel 2: Kurva SIR ──
    ax_sir = fig.add_subplot(gs[0, 2])
    ax_sir.set_facecolor('#0f1117')
    ax_sir.set_title("Kurva Epidemi (SIR)", color='#94a3b8', fontsize=10)
    ax_sir.tick_params(colors='#64748b', labelsize=8)
    for sp in ax_sir.spines.values():
        sp.set_color('#1e293b')
    line_s, = ax_sir.plot([], [], color='#3B82F6', lw=1.5, label='S')
    line_i, = ax_sir.plot([], [], color='#EF4444', lw=2.0, label='I')
    line_r, = ax_sir.plot([], [], color='#22C55E', lw=1.5, label='R')
    line_d, = ax_sir.plot([], [], color='#6B7280', lw=1.0, label='D')
    ax_sir.legend(fontsize=8, facecolor='#1e293b', labelcolor='white',
                  framealpha=0.7, loc='upper right')
    ax_sir.set_xlabel('Hari', color='#64748b', fontsize=8)
    ax_sir.set_ylabel('Individu', color='#64748b', fontsize=8)

    # ── Panel 3: Kasus baru per hari ──
    ax_new = fig.add_subplot(gs[1, 2])
    ax_new.set_facecolor('#0f1117')
    ax_new.set_title("Kasus Baru per Hari", color='#94a3b8', fontsize=10)
    ax_new.tick_params(colors='#64748b', labelsize=8)
    for sp in ax_new.spines.values():
        sp.set_color('#1e293b')
    bar_new = ax_new.bar([], [], color='#F97316', alpha=0.75, width=1.0)
    ax_new.set_xlabel('Hari', color='#64748b', fontsize=8)
    ax_new.set_ylabel('Kasus baru', color='#64748b', fontsize=8)

    # ── Panel 4: Info stats ──
    ax_info = fig.add_subplot(gs[2, 2])
    ax_info.set_facecolor('#131924')
    ax_info.axis('off')
    info_txt = ax_info.text(
        0.05, 0.97, '', transform=ax_info.transAxes,
        color='#94a3b8', fontsize=9, verticalalignment='top',
        fontfamily='monospace'
    )

    title_txt = fig.text(
        0.5, 0.97,
        f"Simulasi Penyebaran Virus — {sim.p.name}  |  Grid {GRID_SIZE}×{GRID_SIZE}  |  Device: {DEVICE}",
        ha='center', color='#cbd5e1', fontsize=12, fontweight='bold'
    )

    preset_hint = fig.text(
        0.5, 0.01,
        "[SPACE] pause  [R] reset  [1] Flu ringan  [2] COVID  [3] Campak  [4] Terkendali  [Q] keluar",
        ha='center', color='#475569', fontsize=8
    )

    def update(frame):
        if not paused[0] and not sim.is_over:
            # Update simulasi
            sim.step()

            # Sklearn: update kluster setiap 5 step
            if sim.step_count % 5 == 0:
                ana.update_clusters(sim.numpy_grid())

        # Render grid
        im.set_data(sim.numpy_grid())

        # Kluster overlay
        if ana.cluster_centers is not None:
            cluster_scatter.set_offsets(ana.cluster_centers[:, ::-1])
        else:
            cluster_scatter.set_offsets(np.empty((0, 2)))

        # Kurva SIR
        n = len(sim.history['S'])
        xs = list(range(n))
        total = GRID_SIZE * GRID_SIZE
        line_s.set_data(xs, sim.history['S'])
        line_i.set_data(xs, sim.history['I'])
        line_r.set_data(xs, sim.history['R'])
        line_d.set_data(xs, sim.history['D'])
        ax_sir.set_xlim(0, max(10, n))
        ax_sir.set_ylim(0, total * 1.05)

        # Kasus baru (bar)
        ax_new.cla()
        ax_new.set_facecolor('#0f1117')
        ax_new.set_title("Kasus Baru per Hari", color='#94a3b8', fontsize=10)
        ax_new.tick_params(colors='#64748b', labelsize=8)
        for sp in ax_new.spines.values():
            sp.set_color('#1e293b')
        nc = sim.history['new_cases']
        if nc:
            ax_new.bar(range(len(nc)), nc, color='#F97316', alpha=0.75, width=1.0)
            ax_new.set_xlim(0, max(10, len(nc)))
            ax_new.set_ylim(0, max(nc) * 1.2 if max(nc) > 0 else 10)
        ax_new.set_xlabel('Hari', color='#64748b', fontsize=8)
        ax_new.set_ylabel('Kasus baru', color='#64748b', fontsize=8)

        # Sklearn: prediksi puncak
        peak_day, peak_val = ana.predict_peak(sim.history['I'])

        # Info panel
        c = sim._counts()
        attack_rate = (c['R'] + c['D']) / total * 100
        cfr = (c['D'] / max(1, c['R'] + c['D'])) * 100
        r0_str = f"{sim.r0:.2f}"
        r0_color = '#EF4444' if sim.r0 > 1 else '#22C55E'

        cluster_str = (
            f"  {len(ana.cluster_centers)} pusat aktif"
            if ana.cluster_centers is not None else "  menghitung..."
        )
        peak_str = (
            f"  Hari ~{peak_day} ({peak_val:,} kasus)"
            if peak_day else "  —"
        )
        status = "MENYEBAR" if c['I'] > 0 else "SELESAI"

        info_txt.set_text(
            f"  Hari         : {sim.step_count}\n"
            f"  Status       : {status}\n"
            f"  R₀ estimasi  : {r0_str}\n"
            f"───────────────────\n"
            f"  Rentan (S)   : {c['S']:,}\n"
            f"  Terinfeksi   : {c['I']:,}\n"
            f"  Sembuh (R)   : {c['R']:,}\n"
            f"  Meninggal    : {c['D']:,}\n"
            f"  Divaksin (V) : {c['V']:,}\n"
            f"───────────────────\n"
            f"  Attack rate  : {attack_rate:.1f}%\n"
            f"  CFR          : {cfr:.1f}%\n"
            f"───────────────────\n"
            f"  [sklearn] Kluster wabah:\n{cluster_str}\n"
            f"  [sklearn] Prediksi puncak:\n{peak_str}\n"
        )

        return [im, cluster_scatter, line_s, line_i, line_r, line_d, info_txt]

    def on_key(event):
        if event.key == ' ':
            paused[0] = not paused[0]
        elif event.key == 'r':
            sim.reset()
            ana.cluster_centers = None
        elif event.key == 'q':
            plt.close('all')
        elif event.key in PRESETS:
            p = PRESETS[event.key]
            sim.p.__dict__.update(p)
            sim.reset()
            ana.cluster_centers = None
            title_txt.set_text(
                f"Simulasi Penyebaran Virus — {sim.p.name}  |  Grid {GRID_SIZE}×{GRID_SIZE}  |  Device: {DEVICE}"
            )

    fig.canvas.mpl_connect('key_press_event', on_key)

    ani = animation.FuncAnimation(
        fig, update,
        interval=60,
        blit=False,
        cache_frame_data=False
    )

    print("[INFO] Simulasi berjalan. Kontrol keyboard:")
    print("       [SPACE] pause/lanjut | [R] reset | [1-4] preset | [Q] keluar")
    plt.show()


# ─── ENTRY POINT ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_simulation()
