import numpy as np
import matplotlib.pyplot as plt

def run_nuclear_monte_carlo(initial_neutrons, steps, p_fission, p_absorption):
    """
    Simulasi Monte Carlo Transport Neutron (Random Walk 2D).
    Model edukasi fisika dasar untuk memvisualisasikan reaksi berantai.
    """
    print("Memulai Simulasi Transport Neutron Monte Carlo...")
    
    # Validasi probabilitas
    p_scatter = 1.0 - (p_fission + p_absorption)
    if p_scatter < 0:
        raise ValueError("Total probabilitas fisi dan absorpsi tidak boleh melebihi 1.0")

    # Inisialisasi posisi awal (semua neutron dimulai dari pusat koordinat 0,0)
    # Format array: [[x1, y1], [x2, y2], ...]
    active_neutrons = np.zeros((initial_neutrons, 2))
    population_history = [initial_neutrons]
    
    # Setup visualisasi pergerakan
    plt.figure(figsize=(10, 8))
    plt.style.use('dark_background')
    
    # Batas populasi agar memori komputermu tidak crash jika superkritis
    MAX_NEUTRONS = 20000 
    
    for step in range(steps):
        if len(active_neutrons) == 0:
            print(f"Langkah {step}: Semua neutron telah diserap (Sistem Subkritis).")
            break
            
        # Plot jejak (scatter plot) dengan alpha rendah untuk efek lintasan
        plt.scatter(active_neutrons[:, 0], active_neutrons[:, 1], 
                    s=2, color='cyan', alpha=0.3)
        
        next_generation = []
        
        # Simulasikan setiap interaksi neutron
        for neutron in active_neutrons:
            # Pergerakan lintasan acak (Hamburan Isotropik)
            # Jarak diambil dari distribusi eksponensial (Jalan Bebas Rata-rata / Mean Free Path)
            angle = np.random.uniform(0, 2 * np.pi)
            distance = np.random.exponential(scale=1.0) 
            
            new_x = neutron[0] + distance * np.cos(angle)
            new_y = neutron[1] + distance * np.sin(angle)
            
            # Tentukan nasib neutron berdasarkan probabilitas menggunakan angka acak
            rand_val = np.random.random()
            
            if rand_val < p_absorption:
                # Kematian neutron (Diserap / Absorbed)
                continue 
                
            elif rand_val < (p_absorption + p_fission):
                # Terjadi Fisi: Inti membelah dan menghasilkan 2 neutron baru di lokasi ini
                next_generation.append([new_x, new_y])
                next_generation.append([new_x, new_y])
                
            else:
                # Hamburan (Scattering): Neutron sekadar berpindah posisi
                next_generation.append([new_x, new_y])
        
        # Perbarui status untuk generasi berikutnya
        active_neutrons = np.array(next_generation)
        current_population = len(active_neutrons)
        population_history.append(current_population)
        
        if current_population > MAX_NEUTRONS:
            print(f"Langkah {step}: Peringatan Superkritis! Populasi melebihi batas {MAX_NEUTRONS}.")
            break

    # Menampilkan plot pergerakan (Spatial Distribution)
    plt.title('Simulasi Jejak Transport Neutron dalam Medium', color='white')
    plt.xlabel('Posisi X')
    plt.ylabel('Posisi Y')
    plt.grid(color='gray', linestyle='--', linewidth=0.5, alpha=0.5)
    plt.show()

    # Menampilkan grafik dinamika populasi (Time vs Population)
    plt.figure(figsize=(8, 5))
    plt.plot(population_history, color='crimson', linewidth=2, marker='o', markersize=4)
    plt.title('Dinamika Populasi Neutron (Reaksi Berantai)')
    plt.xlabel('Generasi / Langkah Waktu')
    plt.ylabel('Jumlah Neutron Aktif')
    plt.grid(True)
    plt.show()

# --- EKSEKUSI KODE ---
# Mari kita uji dengan skenario yang mendekati Kritis (Critical)
# Cobalah ubah p_fission menjadi 0.35 (Superkritis) atau 0.25 (Subkritis)
run_nuclear_monte_carlo(
    initial_neutrons=300, 
    steps=40, 
    p_fission=0.33,    # Probabilitas memicu fisi (menghasilkan 2 neutron)
    p_absorption=0.33  # Probabilitas diserap (hilang)
)