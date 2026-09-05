import numpy as np
import matplotlib.pyplot as plt

# --- 1. KONFIGURASI PARAMETER (BISA KAMU UBAH) ---
G = 1.0          # Konstanta gravitasi (diskalakan untuk simulasi)
dt = 0.01        # Langkah waktu (time step) setiap frame

# MASSA BINTANG (Coba ubah nilainya untuk melihat perbedaan orbit!)
M1 = 1000.0      # Massa Bintang 1 (Bintang Biru Besar)
M2 = 200.0       # Massa Bintang 2 (Bintang Katai Merah Kecil)

# Posisi awal [x, y]
r1 = np.array([-2.0, 0.0])
r2 = np.array([10.0, 0.0])

# Kecepatan awal [vx, vy] agar orbitnya stabil (tidak saling tabrakan/lepas)
v1 = np.array([0.0, -1.5])
v2 = np.array([0.0, 7.5])

# --- 2. MENYIAPKAN GRAFIK ANIMASI ---
plt.ion() # Mengaktifkan mode interaktif matplotlib
fig, ax = plt.subplots(figsize=(8, 8), facecolor='#0B0D17')
ax.set_facecolor('#0B0D17')

# Membuat objek visual bintang dan jalurnya (buntut orbit)
star1_plot, = ax.plot([], [], 'o', color='#4A90E2', markersize=14, label=f'Bintang 1 (M={M1})')
star2_plot, = ax.plot([], [], 'o', color='#E24A4A', markersize=8, label=f'Bintang 2 (M={M2})')
barycenter_plot, = ax.plot([0], [0], '+', color='white', markersize=10, label='Pusat Massa')

# Menyimpan riwayat posisi untuk menggambar garis orbit
x1_hist, y1_hist = [], []
x2_hist, y2_hist = [], []
trail1_plot, = ax.plot([], [], '-', color='#4A90E2', alpha=0.3, lw=1.5)
trail2_plot, = ax.plot([], [], '-', color='#E24A4A', alpha=0.3, lw=1.5)

# Pengaturan batas koordinat dan estetika grafik
ax.set_xlim(-15, 15)
ax.set_ylim(-15, 15)
ax.set_title("Simulasi Gravitasi: Sistem Bintang Ganda", color='white', fontsize=14, pad=15)
ax.legend(loc='upper right', facecolor='#161925', edgecolor='none', labelcolor='white')
ax.grid(True, color='#2C3043', linestyle='--', alpha=0.5)

# --- 3. LOOP SIMULASI UTAMA ---
print("Simulasi berjalan... Tutup jendela grafik untuk menghentikan.")

try:
    while True:
        # Vektor jarak antara Bintang 1 dan Bintang 2
        r_vector = r2 - r1
        distance = np.linalg.norm(r_vector)
        
        # Mencegah pembagian dengan nol jika bintang terlalu dekat (tabrakan)
        if distance < 0.5:
            print("💥 KEDUA BINTANG BERTABRAKAN!")
            break
            
        # Hitung arah gaya (vektor satuan)
        direction = r_vector / distance
        
        # Hitung besar percepatan masing-masing bintang (F / m)
        a1 = (G * M2 / (distance**2)) * direction
        a2 = -(G * M1 / (distance**2)) * direction
        
        # Update kecepatan (Euler-Cromer Integration)
        v1 += a1 * dt
        v2 += a2 * dt
        
        # Update posisi
        r1 += v1 * dt
        r2 += v2 * dt
        
        # Simpan riwayat posisi untuk efek ekor (maksimal 200 data terakhir)
        x1_hist.append(r1[0])
        y1_hist.append(r1[1])
        x2_hist.append(r2[0])
        y2_hist.append(r2[1])
        if len(x1_hist) > 200:
            x1_hist.pop(0); y1_hist.pop(0)
            x2_hist.pop(0); y2_hist.pop(0)
            
        # Update data pada grafik animasi
        star1_plot.set_data([r1[0]], [r1[1]])
        star2_plot.set_data([r2[0]], [r2[1]])
        trail1_plot.set_data(x1_hist, y1_hist)
        trail2_plot.set_data(x2_hist, y2_hist)
        
        # Render ulang grafik
        plt.draw()
        plt.pause(0.001)
        
except plt.NullHandler:
    pass