"""
╔══════════════════════════════════════════════════════════╗
║       SIMULASI TABRAKAN MOBIL — Python + Matplotlib      ║
╠══════════════════════════════════════════════════════════╣
║  Fisika: Hukum kekekalan momentum + koefisien restitusi  ║
║  Fitur : animasi real-time, debris, grafik energi        ║
╚══════════════════════════════════════════════════════════╝

Requirements:
    pip install matplotlib numpy

Jalankan:
    python car_crash.py

Kontrol:
    [SPACE]  mulai / reset
    [1]      tumbukan elastis sempurna  (e=1.0)
    [2]      tumbukan inelastis sebagian (e=0.5)
    [3]      tumbukan plastis sempurna  (e=0.0)
    [Q]      keluar
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.animation as animation
from matplotlib.gridspec import GridSpec
import warnings
warnings.filterwarnings("ignore")

# ─── PARAMETER ───────────────────────────────────────────────────────────────

class CarParams:
    # Mobil 1 (kiri, biru)
    v1_kmh   =  80.0    # km/h (ke kanan, positif)
    m1_kg    = 1200.0   # kg
    color1   = '#3B82F6'

    # Mobil 2 (kanan, merah)
    v2_kmh   =  60.0    # km/h (ke kiri, negatif dalam simulasi)
    m2_kg    = 1500.0   # kg
    color2   = '#EF4444'

    # Koefisien restitusi: 0 = plastis total, 1 = elastis sempurna
    e        = 0.35

    # Dimensi visual
    CAR_W    = 2.0      # meter
    CAR_H    = 0.9      # meter
    WHEEL_R  = 0.28

    # Lebar arena
    ARENA_W  = 20.0     # meter

PRESETS = {
    '1': ('Elastis sempurna (e=1.0)',       1.00),
    '2': ('Semi-inelastis (e=0.5)',         0.50),
    '3': ('Plastis sempurna (e=0.0)',       0.00),
}

# ─── FISIKA ───────────────────────────────────────────────────────────────────

def compute_post_collision(m1, m2, u1, u2, e):
    """
    Hukum kekekalan momentum + koefisien restitusi.
    e = (v2 - v1) / (u1 - u2)   →   kecepatan relatif setelah/sebelum
    """
    v1 = (m1*u1 + m2*u2 - m2*e*(u1 - u2)) / (m1 + m2)
    v2 = (m1*u1 + m2*u2 + m1*e*(u1 - u2)) / (m1 + m2)
    return v1, v2

def kinetic_energy(m, v):
    return 0.5 * m * v**2

# ─── SIMULASI ────────────────────────────────────────────────────────────────

class CarCrashSim:
    def __init__(self, p: CarParams):
        self.p = p
        self.reset()

    def reset(self):
        p = self.p
        self.u1 = p.v1_kmh / 3.6           # m/s ke kanan
        self.u2 = -(p.v2_kmh / 3.6)        # m/s ke kiri
        self.x1 = 2.0                       # posisi tengah mobil 1
        self.x2 = p.ARENA_W - 2.0          # posisi tengah mobil 2
        self.v1 = self.u1
        self.v2 = self.u2
        self.crashed = False
        self.t = 0.0
        self.impact_x = None
        self.impact_t = None

        # Riwayat untuk grafik
        self.hist_t  = [0.0]
        self.hist_v1 = [self.v1 * 3.6]
        self.hist_v2 = [self.v2 * 3.6]
        self.hist_ek = [kinetic_energy(p.m1_kg, self.v1) + kinetic_energy(p.m2_kg, self.v2)]
        self.hist_x1 = [self.x1]
        self.hist_x2 = [self.x2]

        # Debris partikel
        self.debris = []
        self.deformation = 0.0     # 0–1: seberapa penyok

    def step(self, dt=1/60):
        p = self.p
        self.t += dt

        if not self.crashed:
            self.x1 += self.v1 * dt
            self.x2 += self.v2 * dt

            # Deteksi tabrakan: tepi kanan car1 menyentuh tepi kiri car2
            if self.x1 + p.CAR_W/2 >= self.x2 - p.CAR_W/2:
                self.impact_x = (self.x1 + self.x2) / 2
                self.impact_t = self.t
                self.crashed = True

                # Hitung kecepatan setelah tumbukan
                self.v1, self.v2 = compute_post_collision(
                    p.m1_kg, p.m2_kg, self.v1, self.v2, p.e
                )

                # Deformasi: proporsi energi yang hilang
                ek_before = kinetic_energy(p.m1_kg, self.u1) + kinetic_energy(p.m2_kg, self.u2)
                ek_after  = kinetic_energy(p.m1_kg, self.v1) + kinetic_energy(p.m2_kg, self.v2)
                self.deformation = min(1.0, (ek_before - ek_after) / max(ek_before, 1e-9))
                self.spawn_debris()
        else:
            self.x1 += self.v1 * dt
            self.x2 += self.v2 * dt
            self.update_debris(dt)

        # Rekam riwayat
        self.hist_t.append(self.t)
        self.hist_v1.append(self.v1 * 3.6)
        self.hist_v2.append(abs(self.v2) * 3.6)
        self.hist_ek.append(
            kinetic_energy(p.m1_kg, self.v1) + kinetic_energy(p.m2_kg, self.v2)
        )
        self.hist_x1.append(self.x1)
        self.hist_x2.append(self.x2)

    def spawn_debris(self):
        n = 30
        ix, iy = self.impact_x, self.p.CAR_H / 2 + self.p.WHEEL_R
        for _ in range(n):
            spd   = np.random.uniform(1, 8)
            ang   = np.random.uniform(0, np.pi)           # ke atas
            vx    = np.cos(ang) * spd * np.random.choice([-1,1])
            vy    = np.sin(ang) * spd
            size  = np.random.uniform(0.03, 0.15)
            color = np.random.choice(['#888', '#aaa', '#ccc', '#666'])
            self.debris.append({
                'x': ix + np.random.uniform(-0.3, 0.3),
                'y': iy + np.random.uniform(-0.2, 0.2),
                'vx': vx, 'vy': vy,
                'life': 1.0, 'size': size, 'color': color
            })

    def update_debris(self, dt):
        g = -9.8
        for d in self.debris:
            d['x']  += d['vx'] * dt
            d['y']  += d['vy'] * dt
            d['vy'] += g * dt
            d['life'] -= dt * 0.8
            if d['y'] < 0:
                d['y'] = 0
                d['vy'] = abs(d['vy']) * 0.3
        self.debris = [d for d in self.debris if d['life'] > 0]


# ─── MENGGAMBAR ──────────────────────────────────────────────────────────────

def draw_car(ax, cx, cy, width, height, wheel_r, color, flipped=False, dmg=0.0):
    """Gambar mobil sebagai patch matplotlib."""
    sign = -1 if flipped else 1
    deform_w = width * (1 + dmg * 0.2)

    # Bodi utama
    bx = cx - deform_w/2
    by = cy
    body = patches.FancyBboxPatch(
        (bx, by), deform_w, height,
        boxstyle="round,pad=0.05",
        facecolor=color, edgecolor='white', linewidth=0.8, zorder=3
    )
    ax.add_patch(body)

    # Penyok di sisi tabrakan
    if dmg > 0.05:
        dent_w = deform_w * 0.35 * dmg
        dent_x = (cx + deform_w/2 - dent_w) if not flipped else (cx - deform_w/2)
        dent = patches.Rectangle(
            (dent_x, by), dent_w, height,
            facecolor='#111', alpha=0.5, zorder=4
        )
        ax.add_patch(dent)

    # Kaca depan
    glass_x = cx + sign * width * 0.05
    if flipped: glass_x = cx - width*0.05 - width*0.35
    glass = patches.FancyBboxPatch(
        (glass_x, cy + height*0.15), width*0.35, height*0.55,
        boxstyle="round,pad=0.02",
        facecolor='#1a3a5c', edgecolor='white', linewidth=0.5, alpha=0.8, zorder=4
    )
    ax.add_patch(glass)

    # Roda
    wheel_positions = [cx - width*0.28, cx + width*0.28]
    for wx in wheel_positions:
        wy = cy
        outer = plt.Circle((wx, wy), wheel_r, color='#222', zorder=4)
        inner = plt.Circle((wx, wy), wheel_r*0.55, color='#555', zorder=5)
        ax.add_patch(outer)
        ax.add_patch(inner)

    # Lampu
    light_x = cx + sign * deform_w/2 - (sign * 0.08 if not flipped else 0)
    if flipped: light_x = cx - deform_w/2 + 0.02
    headlight = patches.Rectangle(
        (light_x, cy + height*0.1), 0.08, height*0.3,
        facecolor='#ffee88', edgecolor=None, zorder=5
    )
    ax.add_patch(headlight)


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def run():
    p = CarParams()
    sim = CarCrashSim(p)
    running = [False]
    preset_name = ['Default']

    fig = plt.figure(figsize=(14, 8), facecolor='#0d1117')
    fig.canvas.manager.set_window_title("Simulasi Tabrakan Mobil — Physics Engine")

    gs = GridSpec(2, 2, figure=fig,
                  left=0.06, right=0.97, top=0.92, bottom=0.08,
                  hspace=0.45, wspace=0.3)

    # ── Ax1: arena ──
    ax_arena = fig.add_subplot(gs[0, :])
    ax_arena.set_facecolor('#1a1f2e')
    ax_arena.set_xlim(0, p.ARENA_W)
    ax_arena.set_ylim(-0.5, 3.5)
    ax_arena.set_aspect('equal')
    ax_arena.axis('off')

    # Jalan
    road = patches.Rectangle((0, -0.3), p.ARENA_W, 0.3, color='#2a2f3e', zorder=0)
    ax_arena.add_patch(road)
    for x in np.arange(1, p.ARENA_W, 2.5):
        dash = patches.Rectangle((x, -0.18), 1.2, 0.06, color='#f5a623', zorder=1)
        ax_arena.add_patch(dash)

    title_txt = fig.suptitle(
        f"Simulasi Tabrakan Mobil  |  Tekan SPACE untuk mulai  |  [1] Elastis  [2] Semi  [3] Plastis  [Q] Keluar",
        color='#94a3b8', fontsize=11, y=0.97
    )

    info_txt = ax_arena.text(
        p.ARENA_W/2, 3.2, '',
        ha='center', va='top', fontsize=11,
        color='white', fontfamily='monospace',
        bbox=dict(facecolor='#0d1117', edgecolor='#333', pad=4, boxstyle='round')
    )

    # ── Ax2: kecepatan ──
    ax_vel = fig.add_subplot(gs[1, 0])
    ax_vel.set_facecolor('#0d1117')
    ax_vel.set_title("Kecepatan vs Waktu", color='#94a3b8', fontsize=10)
    ax_vel.tick_params(colors='#64748b', labelsize=8)
    for sp in ax_vel.spines.values(): sp.set_color('#1e293b')
    ax_vel.set_xlabel('Waktu (s)', color='#64748b', fontsize=8)
    ax_vel.set_ylabel('Kecepatan (km/h)', color='#64748b', fontsize=8)
    line_v1, = ax_vel.plot([], [], color=p.color1, lw=2, label='Mobil 1')
    line_v2, = ax_vel.plot([], [], color=p.color2, lw=2, label='Mobil 2 |v|')
    ax_vel.legend(fontsize=8, facecolor='#0d1117', labelcolor='white', framealpha=0.6)
    vline_v = ax_vel.axvline(x=-1, color='white', lw=1, ls='--', alpha=0.5)

    # ── Ax3: energi kinetik ──
    ax_ek = fig.add_subplot(gs[1, 1])
    ax_ek.set_facecolor('#0d1117')
    ax_ek.set_title("Energi Kinetik Total vs Waktu", color='#94a3b8', fontsize=10)
    ax_ek.tick_params(colors='#64748b', labelsize=8)
    for sp in ax_ek.spines.values(): sp.set_color('#1e293b')
    ax_ek.set_xlabel('Waktu (s)', color='#64748b', fontsize=8)
    ax_ek.set_ylabel('EK (kJ)', color='#64748b', fontsize=8)
    line_ek, = ax_ek.plot([], [], color='#22c55e', lw=2)
    vline_ek = ax_ek.axvline(x=-1, color='white', lw=1, ls='--', alpha=0.5)

    debris_patches = []
    frame_count = [0]

    def update(frame):
        nonlocal debris_patches

        if running[0]:
            sim.step(dt=1/60)

        # Bersihkan arena
        ax_arena.cla()
        ax_arena.set_facecolor('#1a1f2e')
        ax_arena.set_xlim(0, p.ARENA_W)
        ax_arena.set_ylim(-0.5, 3.5)
        ax_arena.set_aspect('equal')
        ax_arena.axis('off')

        # Jalan
        road2 = patches.Rectangle((0, -0.3), p.ARENA_W, 0.3, color='#2a2f3e', zorder=0)
        ax_arena.add_patch(road2)
        for x in np.arange(1, p.ARENA_W, 2.5):
            dash2 = patches.Rectangle((x, -0.18), 1.2, 0.06, color='#f5a623', zorder=1)
            ax_arena.add_patch(dash2)

        # Debris
        for d in sim.debris:
            alpha = max(0, d['life'])
            circ = plt.Circle((d['x'], d['y']), d['size'],
                               color=d['color'], alpha=alpha, zorder=6)
            ax_arena.add_patch(circ)

        # Mobil
        cy = p.WHEEL_R
        draw_car(ax_arena, sim.x1, cy, p.CAR_W, p.CAR_H, p.WHEEL_R,
                 p.color1, flipped=False, dmg=sim.deformation if sim.crashed else 0)
        draw_car(ax_arena, sim.x2, cy, p.CAR_W, p.CAR_H, p.WHEEL_R,
                 p.color2, flipped=True, dmg=sim.deformation if sim.crashed else 0)

        # Label kecepatan di atas mobil
        ax_arena.text(sim.x1, cy + p.CAR_H + 0.45,
                      f"{sim.v1*3.6:.0f} km/h",
                      ha='center', va='bottom', fontsize=9,
                      color=p.color1, fontweight='bold')
        ax_arena.text(sim.x2, cy + p.CAR_H + 0.45,
                      f"{abs(sim.v2)*3.6:.0f} km/h",
                      ha='center', va='bottom', fontsize=9,
                      color=p.color2, fontweight='bold')

        # Info teks
        ek_total = kinetic_energy(p.m1_kg, sim.v1) + kinetic_energy(p.m2_kg, sim.v2)
        ek_init  = kinetic_energy(p.m1_kg, sim.u1) + kinetic_energy(p.m2_kg, sim.u2)
        ek_loss  = ek_init - ek_total
        status   = "CRASH!" if sim.crashed else ("Berlari..." if running[0] else "Tekan SPACE untuk mulai")
        momentum = p.m1_kg * sim.v1 + p.m2_kg * sim.v2

        info_str = (
            f"t={sim.t:.2f}s  |  Status: {status}  |  "
            f"EK={ek_total/1000:.1f} kJ  |  "
            f"Hilang={ek_loss/1000:.1f} kJ  |  "
            f"p={momentum:.0f} kg·m/s  |  e={p.e}"
        )
        ax_arena.text(p.ARENA_W/2, 3.2, info_str,
                      ha='center', va='top', fontsize=9, color='white',
                      fontfamily='monospace',
                      bbox=dict(facecolor='#0d1117', edgecolor='#333', pad=3, boxstyle='round'))

        # Tandai titik tumbukan
        if sim.impact_x is not None:
            ax_arena.axvline(x=sim.impact_x, color='#ff0', lw=1, ls=':', alpha=0.4, zorder=2)

        # Update grafik kecepatan
        if len(sim.hist_t) > 1:
            line_v1.set_data(sim.hist_t, sim.hist_v1)
            line_v2.set_data(sim.hist_t, sim.hist_v2)
            ax_vel.set_xlim(0, max(0.1, sim.hist_t[-1]))
            all_v = sim.hist_v1 + sim.hist_v2
            ax_vel.set_ylim(0, max(all_v) * 1.15 if all_v else 100)
            if sim.impact_t:
                vline_v.set_xdata([sim.impact_t, sim.impact_t])

            # Update grafik energi
            ek_kj = [e/1000 for e in sim.hist_ek]
            line_ek.set_data(sim.hist_t, ek_kj)
            ax_ek.set_xlim(0, max(0.1, sim.hist_t[-1]))
            ax_ek.set_ylim(0, max(ek_kj) * 1.15 if ek_kj else 100)
            if sim.impact_t:
                vline_ek.set_xdata([sim.impact_t, sim.impact_t])

        return []

    def on_key(event):
        key = event.key
        if key == ' ':
            if sim.crashed and not sim.debris:
                sim.reset()
                running[0] = True
            elif not running[0]:
                running[0] = True
            else:
                sim.reset()
                running[0] = False
        elif key in PRESETS:
            name, e_val = PRESETS[key]
            p.e = e_val
            preset_name[0] = name
            sim.reset()
            running[0] = True
            print(f"[Preset] {name}")
        elif key == 'q':
            plt.close('all')

    fig.canvas.mpl_connect('key_press_event', on_key)

    ani = animation.FuncAnimation(
        fig, update,
        interval=16,
        blit=False,
        cache_frame_data=False
    )

    print("[INFO] Tekan SPACE untuk mulai tabrakan!")
    print("[INFO] [1] Elastis  [2] Semi-inelastis  [3] Plastis  [Q] Keluar")
    plt.show()


if __name__ == '__main__':
    run()
