"""
==============================================
  SIMULASI BLACK HOLE - Python + Matplotlib
==============================================
Fisika yang disimulasikan:
  - Gravitasi Newtonian + koreksi relativistik (potensial Schwarzschild)
  - Frame dragging (efek Kerr untuk black hole berputar)
  - Cakram akresi dengan gradien warna suhu
  - Relativistic jets
  - Gravitational lensing visual
  - Penangkapan partikel oleh event horizon

Requirements:
    pip install matplotlib numpy

Jalankan:
    python black_hole_simulation.py
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import matplotlib.patches as patches
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyArrowPatch
import warnings
warnings.filterwarnings("ignore")

# ─── KONSTANTA & PARAMETER ───────────────────────────────────────────────────

G_CONST    = 500.0    # Konstanta gravitasi simulasi
BH_MASS    = 80.0     # Massa black hole (satuan simulasi)
BH_SPIN    = 0.7      # Parameter spin Kerr (0 = Schwarzschild, 1 = Kerr maksimal)
N_PARTICLES = 220     # Jumlah partikel awal
DT         = 0.05     # Time step
TRAIL_LEN  = 20       # Panjang jejak partikel

# Schwarzschild radius: r_s = 2GM/c² (dalam satuan simulasi)
RS = 2.0 * G_CONST * BH_MASS / (3e4)

# Batas simulasi
XLIM = (-12, 12)
YLIM = (-9, 9)

print(f"[INFO] Schwarzschild radius: {RS:.2f} unit")
print(f"[INFO] Jumlah partikel: {N_PARTICLES}")
print(f"[INFO] Spin parameter: {BH_SPIN}")


# ─── KELAS PARTIKEL ──────────────────────────────────────────────────────────

class Particle:
    """Merepresentasikan partikel gas/debu dalam medan gravitasi black hole."""

    def __init__(self):
        self.respawn()

    def respawn(self):
        # Spawn di lingkaran luar dengan orbit acak
        angle  = np.random.uniform(0, 2 * np.pi)
        dist   = np.random.uniform(RS * 3.5, RS * 9)
        self.x = dist * np.cos(angle)
        self.y = dist * np.sin(angle)

        # Kecepatan orbital + sedikit radial (jatuh ke dalam)
        v_orb   = np.sqrt(G_CONST * BH_MASS / dist) * np.random.uniform(0.75, 1.05)
        v_angle = angle + np.pi / 2 + np.random.uniform(-0.25, 0.25)
        self.vx = v_orb * np.cos(v_angle) * (1 if np.random.random() > 0.15 else -1)
        self.vy = v_orb * np.sin(v_angle) * (1 if np.random.random() > 0.15 else -1)

        # Warna berdasarkan suhu (dekat = lebih panas = lebih putih/biru)
        self.base_hue = np.random.uniform(0.0, 0.25)   # 0=merah, 0.25=kuning
        self.size     = np.random.uniform(0.8, 2.5)
        self.alive    = True
        self.trail_x  = []
        self.trail_y  = []

    def update(self, dt, bh_spin):
        """Update posisi & kecepatan dengan persamaan gerak Kerr–Schild."""
        r   = np.sqrt(self.x**2 + self.y**2)
        eps = 1e-9

        # ── Gaya gravitasi (potensial Schwarzschild + koreksi GR) ──
        f_grav = G_CONST * BH_MASS / max(r**2, eps)
        fx = -f_grav * self.x / max(r, eps)
        fy = -f_grav * self.y / max(r, eps)

        # ── Frame dragging (efek Kerr): gaya Coriolis dari rotasi ruang-waktu ──
        # a_fd = (2 * J / r³) × v × r̂  (approx.)
        J = bh_spin * G_CONST * BH_MASS * RS
        fd_mag = 2 * J / max(r**3, eps)
        fx += fd_mag * (-self.vy)
        fy += fd_mag * self.vx

        # ── Koreksi relativistik: redshift gravitasi memperlambat waktu ──
        # Time dilation factor: sqrt(1 - rs/r)
        factor = max(0.1, np.sqrt(abs(1.0 - RS / max(r, RS * 0.5))))

        # Update kecepatan
        self.vx += fx * dt * factor
        self.vy += fy * dt * factor

        # Batasi kecepatan (c = 1 dalam satuan simulasi)
        v = np.sqrt(self.vx**2 + self.vy**2)
        v_max = 15.0
        if v > v_max:
            self.vx *= v_max / v
            self.vy *= v_max / v

        # Update posisi
        self.trail_x.append(self.x)
        self.trail_y.append(self.y)
        if len(self.trail_x) > TRAIL_LEN:
            self.trail_x.pop(0)
            self.trail_y.pop(0)

        self.x += self.vx * dt
        self.y += self.vy * dt

        # Cek event horizon: partikel terserap
        r_new = np.sqrt(self.x**2 + self.y**2)
        if r_new < RS * 1.05:
            self.alive = False

        # Cek batas layar
        if abs(self.x) > 14 or abs(self.y) > 11:
            self.alive = False

    def temperature_color(self):
        """Warna partikel: makin dekat black hole = makin panas = putih/biru."""
        r = np.sqrt(self.x**2 + self.y**2)
        proximity = max(0, 1 - r / (RS * 7))
        # Gradien: oranye (0.05) → kuning (0.15) → putih panas (proximity tinggi)
        hue = self.base_hue + proximity * 0.15
        brightness = 0.5 + proximity * 0.5
        # Konversi ke warna matplotlib (HSV-like manual)
        r_c = min(1, hue * 6)
        g_c = min(1, max(0, 0.6 + proximity * 0.4))
        b_c = proximity * 0.8
        alpha = 0.4 + proximity * 0.55
        return (min(1,r_c), min(1,g_c), min(1,b_c), alpha)


# ─── INISIALISASI MATPLOTLIB ─────────────────────────────────────────────────

fig, ax = plt.subplots(figsize=(12, 9), facecolor='#020408')
ax.set_facecolor('#020408')
ax.set_xlim(XLIM)
ax.set_ylim(YLIM)
ax.set_aspect('equal')
ax.axis('off')
ax.set_title(
    "SIMULASI BLACK HOLE  |  Schwarzschild + Frame Dragging (Kerr)",
    color='#88aacc', fontsize=12, pad=10, fontfamily='monospace'
)

# ─── BINTANG LATAR BELAKANG ───────────────────────────────────────────────────
np.random.seed(42)
star_x = np.random.uniform(*XLIM, 350)
star_y = np.random.uniform(*YLIM, 350)
star_s = np.random.uniform(0.2, 2.5, 350)
star_a = np.random.uniform(0.2, 0.8, 350)
ax.scatter(star_x, star_y, s=star_s, c='white', alpha=star_a, zorder=0)

# ─── GRAVITATIONAL LENSING RINGS ─────────────────────────────────────────────
for i, ring_r in enumerate(np.linspace(RS * 1.8, RS * 5.5, 7)):
    alpha = 0.04 * (8 - i)
    lw    = 0.4 + i * 0.1
    ring  = plt.Circle((0, 0), ring_r, fill=False,
                        edgecolor='#3366aa', linewidth=lw, alpha=alpha, zorder=1)
    ax.add_patch(ring)

# ─── CAKRAM AKRESI ───────────────────────────────────────────────────────────
# Dibuat sebagai ellipse tipis (tampak miring dari samping)
accretion_artists = []
for i, frac in enumerate(np.linspace(0, 1, 40)):
    r_inner = RS * 1.6
    r_outer = RS * 5.2
    r_ring  = r_inner + (r_outer - r_inner) * frac
    hue_val = 0.05 + frac * 0.12          # oranye → kuning
    alpha   = max(0.02, 0.25 - frac * 0.22)
    lw      = max(0.3, 2.0 - frac * 1.7)
    # Warna hangat berdasarkan frac
    r_c = 1.0
    g_c = 0.3 + frac * 0.55
    b_c = frac * 0.2
    ring_artist = patches.Ellipse(
        (0, 0), width=r_ring * 2, height=r_ring * 0.38,
        fill=False, edgecolor=(r_c, g_c, b_c, alpha),
        linewidth=lw, zorder=2
    )
    ax.add_patch(ring_artist)
    accretion_artists.append(ring_artist)

# ─── RELATIVISTIC JETS ───────────────────────────────────────────────────────
jet_cmap = LinearSegmentedColormap.from_list(
    'jet_cmap', [(0,0,0,0), (0.2,0.5,1.0,0.35), (0.1,0.3,1.0,0.0)]
)
for direction in [-1, 1]:
    jet_height = YLIM[1] * 0.9
    jet_y = np.linspace(0, direction * jet_height, 80)
    jet_width = np.linspace(RS * 0.3, RS * 1.0, 80)
    for i in range(len(jet_y) - 1):
        frac  = i / len(jet_y)
        alpha = 0.18 * (1 - frac)**1.5
        ax.fill_betweenx(
            [jet_y[i], jet_y[i+1]],
            [-jet_width[i], -jet_width[i+1]],
            [jet_width[i],  jet_width[i+1]],
            color=(0.3, 0.6, 1.0), alpha=alpha, zorder=1
        )

# ─── EVENT HORIZON & BLACK HOLE ──────────────────────────────────────────────
# Shadow (area gelap lebih besar untuk efek lensing)
shadow = plt.Circle((0, 0), RS * 2.8, color='#020408', zorder=4)
ax.add_patch(shadow)

# Photon sphere (cincin cahaya)
photon_ring = plt.Circle((0, 0), RS * 1.5, fill=False,
                          edgecolor='#ffcc44', linewidth=1.8, alpha=0.9, zorder=5)
ax.add_patch(photon_ring)

# Event horizon
event_horizon = plt.Circle((0, 0), RS, color='black', zorder=6)
ax.add_patch(event_horizon)
event_edge = plt.Circle((0, 0), RS, fill=False,
                         edgecolor='#ff6622', linewidth=1.0, alpha=0.6, zorder=7)
ax.add_patch(event_edge)

# ─── PARTIKEL ────────────────────────────────────────────────────────────────
particles = [Particle() for _ in range(N_PARTICLES)]

# Scatter untuk partikel aktif
scat = ax.scatter([], [], s=[], c=[], zorder=8)
# Line collection untuk jejak (dirender manual per-frame)
trail_lines = []

# ─── INFO PANEL ──────────────────────────────────────────────────────────────
info_text = ax.text(
    XLIM[0] + 0.3, YLIM[1] - 0.5, '',
    color='#6699bb', fontsize=9, fontfamily='monospace',
    verticalalignment='top', zorder=10
)
rs_text = ax.text(
    XLIM[0] + 0.3, YLIM[0] + 0.5,
    f"r_s = {RS:.2f}  |  M = {BH_MASS}  |  a = {BH_SPIN} (Kerr spin)",
    color='#445566', fontsize=8, fontfamily='monospace', zorder=10
)

# ─── FUNGSI ANIMASI ──────────────────────────────────────────────────────────

frame_count = [0]
absorbed_count = [0]

# Hapus trail lines lama sebelum frame baru
trail_collection = []

def animate(frame):
    global trail_collection

    # Hapus trail lama
    for line in trail_collection:
        line.remove()
    trail_collection = []

    # Update semua partikel
    alive_after = []
    for p in particles:
        if p.alive:
            p.update(DT, BH_SPIN)
        if not p.alive:
            absorbed_count[0] += 1
            p.respawn()
        alive_after.append(p)

    particles[:] = alive_after

    # Kumpulkan data untuk scatter
    xs, ys, ss, cs = [], [], [], []
    for p in particles:
        if p.alive:
            r = np.sqrt(p.x**2 + p.y**2)
            proximity = max(0, 1 - r / (RS * 6))
            size = p.size * (1 + proximity * 2)
            color = p.temperature_color()
            xs.append(p.x)
            ys.append(p.y)
            ss.append(size * 4)
            cs.append(color)

            # Gambar trail
            if len(p.trail_x) > 1:
                for i in range(len(p.trail_x) - 1):
                    fade = (i / len(p.trail_x))
                    a_trail = fade * 0.3 * (1 + proximity)
                    if a_trail > 0.02:
                        line, = ax.plot(
                            [p.trail_x[i], p.trail_x[i+1]],
                            [p.trail_y[i], p.trail_y[i+1]],
                            color=(color[0], color[1], color[2], a_trail),
                            linewidth=0.4 + proximity * 0.8,
                            zorder=7
                        )
                        trail_collection.append(line)

    # Update scatter
    if xs:
        scat.set_offsets(np.column_stack([xs, ys]))
        scat.set_sizes(ss)
        scat.set_color(cs)

    # Rotasi cakram akresi (visual)
    rot_angle = frame * 1.8  # derajat per frame
    for i, ring in enumerate(accretion_artists):
        ring.angle = rot_angle * (1 + i * 0.015)

    # Flicker photon ring
    flicker = 0.7 + 0.3 * np.sin(frame * 0.18)
    photon_ring.set_alpha(flicker)

    # Update info
    frame_count[0] += 1
    n_alive = sum(1 for p in particles if p.alive)
    info_text.set_text(
        f"Frame    : {frame_count[0]:05d}\n"
        f"Partikel : {n_alive}/{N_PARTICLES}\n"
        f"Terserap : {absorbed_count[0]}"
    )

    return [scat, info_text, photon_ring] + accretion_artists + trail_collection


# ─── JALANKAN ANIMASI ────────────────────────────────────────────────────────

print("[INFO] Memulai simulasi... Tutup jendela untuk berhenti.")
ani = animation.FuncAnimation(
    fig, animate,
    frames=None,        # loop selamanya
    interval=30,        # ~33 FPS
    blit=False,
    cache_frame_data=False
)

plt.tight_layout()
plt.show()
