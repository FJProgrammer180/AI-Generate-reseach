import numpy as np
from scipy.integrate import odeint
import matplotlib.pyplot as plt

# --- 1. PENGATURAN PARAMETER SIMULASI ---
N = 1000000000000              # Total populasi (10.000 orang)
I0, R0 = 100, 0          # Kondisi awal: 1 terinfeksi, 0 sembuh
S0 = N - I0 - R0       # Sisanya adalah orang sehat (Susceptible)

# Beta: Tingkat kontak/penularan (contoh: 0.3 orang per hari)
# Gamma: Tingkat pemulihan (contoh: 0.1, artinya butuh ~10 hari untuk sembuh)
beta, gamma = 0.3, 0.1 

# Waktu simulasi (dalam hari), dari hari ke-0 sampai hari ke-50
t = np.linspace(0, 50, 160)

# --- 2. SISTEM PERSAMAAN DIFERENSIAL ---
def deriv(y, t, N, beta, gamma):
    S, I, R = y
    dSdt = -beta * S * I / N
    dIdt = beta * S * I / N - gamma * I
    dRdt = gamma * I
    return dSdt, dIdt, dRdt

# Vektor kondisi awal
y0 = S0, I0, R0

# --- 3. KALKULASI MATEMATIKA ---
# Mengintegrasikan persamaan diferensial menggunakan scipy
ret = odeint(deriv, y0, t, args=(N, beta, gamma))
S, I, R = ret.T

# --- 4. VISUALISASI DATA (GRAFIK) ---
fig = plt.figure(facecolor='w', figsize=(10, 6))
ax = fig.add_subplot(111, facecolor='#dddddd', axisbelow=True)

# Memasukkan data ke dalam grafik
ax.plot(t, S/1000, 'b', alpha=0.5, lw=2, label='Rentan (Susceptible)')
ax.plot(t, I/1000, 'r', alpha=0.5, lw=2, label='Terinfeksi (Infected)')
ax.plot(t, R/1000, 'g', alpha=0.5, lw=2, label='Sembuh (Recovered)')

# Pengaturan tampilan grafik
ax.set_xlabel('Waktu (Hari)')
ax.set_ylabel('Jumlah Populasi (Ribuan)')
ax.set_title('Simulasi Penyebaran Virus (Model SIR)')
ax.yaxis.set_tick_params(length=0)
ax.xaxis.set_tick_params(length=0)
ax.grid(visible=True, which='major', c='w', lw=2, ls='-')
legend = ax.legend()
legend.get_frame().set_alpha(0.5)

# Menampilkan grafik ke layar
plt.show()