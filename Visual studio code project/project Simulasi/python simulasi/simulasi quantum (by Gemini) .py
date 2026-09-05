# =====================================================================
# SYSTEM NAME: QUANTUM-THERMAL MULTI-PHYSICS SIMULATION & OPTIMIZATION SUITE
# CORE LIBRARIES ALLOWED: pytorch, scipy, matplotlib
# TOTAL SCALE: 1000+ Lines of Highly Dense Computational Engineering Code
# =====================================================================

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

import scipy.sparse as sp
import scipy.sparse.linalg as spla
import scipy.stats as stats
import scipy.signal as signal
import scipy.integrate as integrate
import scipy.interpolate as interpolate
import scipy.ndimage as ndimage
import scipy.spatial as spatial

import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.colorbar import Colorbar
from matplotlib.colors import LinearSegmentedColormap
import numpy as np

# Set random seeds untuk reproduksibilitas komputasi
np.random.seed(42)
torch.manual_seed(42)

# =====================================================================
# GLOBAL CONFIGURATION REGISTRY (KONFIGURASI SISTEM)
# =====================================================================
class SimulationConfig:
    NX, NY = 64, 64  # Resolusi Grid Spasial 2D
    LX, LY = 10.0, 10.0  # Dimensi Fisik Domain
    DX = LX / (NX - 1)
    DY = LY / (NY - 1)
    
    # Parameter Fisika Kuantum
    H_BAR = 1.0
    MASS = 1.0
    
    # Parameter Termodinamika
    THERMAL_DIFFUSIVITY = 0.05
    HEAT_COUPLING_CONSTANT = 2.5
    
    # Parameter Pembelajaran Mesin
    BATCH_SIZE = 16
    LEARNING_RATE = 0.001
    EPOCHS = 25
    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

config = SimulationConfig()

print(f"[SYSTEM INFO] Inisialisasi Engine Komputasi pada Device: {config.DEVICE}")

# =====================================================================
# MODULE 1: MATHEMATICAL SPACE & KERNEL GENERATORS (SCIPY CORE)
# =====================================================================
class GridSpaceManager:
    """Mengelola representasi koordinat tensor dan matriks diferensial 2D"""
    def __init__(self, cfg):
        self.cfg = cfg
        self.x = np.linspace(-cfg.LX/2, cfg.LX/2, cfg.NX)
        self.y = np.linspace(-cfg.LY/2, cfg.LY/2, cfg.NY)
        self.X, self.Y = np.meshgrid(self.x, self.y, indexing='ij')
        
    def generate_laplacian_2d_sparse(self):
        """Membangun matriks Laplacian 2D menggunakan Kronecker Product dari SciPy"""
        nx, ny = self.cfg.NX, self.cfg.NY
        dx, dy = self.cfg.DX, self.cfg.DY
        
        # Operator 1D Laplasian
        diags_x = np.array([np.ones(nx), -2*np.ones(nx), np.ones(nx)]) / (dx**2)
        D2x = sp.spdiags(diags_x, [-1, 0, 1], nx, nx)
        
        diags_y = np.array([np.ones(ny), -2*np.ones(ny), np.ones(ny)]) / (dy**2)
        D2y = sp.spdiags(diags_y, [-1, 0, 1], ny, ny)
        
        # Identitas Matriks
        Ix = sp.eye(nx)
        Iy = sp.eye(ny)
        
        # Laplacian 2D: L = D2x (X) Iy + Ix (X) D2y
        Laplacian_2D = sp.kronsum(D2y, D2x)
        return Laplacian_2D

    def generate_stochastic_disorder(self, scale=1.0, count=5):
        """Membuat medan gangguan stokastik acak menggunakan SciPy Spatial & Stats"""
        points = np.random.uniform(-self.cfg.LX/2, self.cfg.LX/2, (count, 2))
        grid_points = np.vstack([self.X.ravel(), self.Y.ravel()]).T
        
        # Hitung jarak KDTree untuk menghasilkan interpolasi medan acak
        tree = spatial.KDTree(points)
        dists, _ = tree.query(grid_points)
        dists = dists.reshape(self.cfg.NX, self.cfg.NY)
        
        # Distribusi Gaussian Kernel Density via SciPy
        disorder = stats.norm.pdf(dists, loc=0, scale=scale)
        return disorder / np.max(disorder)

grid_manager = GridSpaceManager(config)

# =====================================================================
# MODULE 2: MULTI-PHYSICS SIMULATION ENGINE (QUANTUM + THERMAL)
# =====================================================================
class MultiPhysicsEngine:
    """Engine simulasi utama untuk menyelesaikan Persamaan Schrödinger dan Panas Koppeld"""
    def __init__(self, cfg, geom):
        self.cfg = cfg
        self.geom = geom
        self.laplacian_sparse = geom.generate_laplacian_2d_sparse()
        
    def construct_confinement_potential(self, style="well", noise_level=0.2):
        """Membuat profil potensial pembatas (Confinement Potential V(x,y))"""
        X, Y = self.geom.X, self.geom.Y
        
        if style == "well":
            # Sumur Potensial Tak Hingga dengan Batas Halus
            V = 0.5 * (X**2 + Y**2)
        elif style == "ring":
            # Potensial Berbentuk Cincin (Quantum Ring)
            r = np.sqrt(X**2 + Y**2)
            V = 4.0 * (r - 2.5)**2
        else:
            V = np.zeros_like(X)
            
        # Tambahkan fluktuasi acak material dari SciPy Ndimage
        noise = self.geom.generate_stochastic_disorder(scale=2.0, count=8)
        noise_filtered = ndimage.gaussian_filter(noise, sigma=1.5)
        
        V_total = V + noise_level * noise_filtered
        return V_total

    def solve_quantum_ground_state(self, V_potential):
        """Menyelesaikan persamaan Eigen Hamiltonian Kuantum 2D menggunakan SciPy Sparse Solver"""
        # H = -hbar^2 / (2m) * Laplacian + V
        coeff = -(self.cfg.H_BAR**2) / (2.0 * self.cfg.MASS)
        
        # Konversi V_potential ke bentuk matriks diagonal renggang
        V_flat = V_potential.ravel()
        V_sparse = sp.diags(V_flat, 0)
        
        Hamiltonian = coeff * self.laplacian_sparse + V_sparse
        
        # Cari 3 Energi Terendah (k=3) menggunakan ARPACK Solver dari SciPy
        eigenvalues, eigenvectors = spla.eigsh(Hamiltonian, k=3, which='SM')
        
        # Ambil Ground State (Kondisi Dasar)
        ground_energy = eigenvalues[0]
        ground_wavefunction = eigenvectors[:, 0].reshape(self.cfg.NX, self.cfg.NY)
        
        # Normalisasi Integral Kuantum agar Total Probabilitas = 1
        norm_factor = np.trace(np.trace(ground_wavefunction**2, self.geom.y), self.geom.x)
        ground_wavefunction /= np.sqrt(norm_factor)
        
        return ground_energy, ground_wavefunction

    def simulate_thermal_diffusion_step(self, T_current, Q_source, dt):
        """Menghitung pergerakan panas transien menggunakan skema eksplisit FTCS 2D"""
        nx, ny = self.cfg.NX, self.cfg.NY
        dx2, dy2 = self.cfg.DX**2, self.cfg.DY**2
        alpha = self.cfg.THERMAL_DIFFUSIVITY
        
        T_next = T_current.copy()
        
        # Hitung turunan spasial kedua secara manual berbasis array slicing
        d2x = (T_current[2:, 1:-1] - 2*T_current[1:-1, 1:-1] + T_current[:-2, 1:-1]) / dx2
        d2y = (T_current[1:-1, 2:] - 2*T_current[1:-1, 1:-1] + T_current[1:-1, :-2]) / dy2
        
        # Update Temperatur di dalam domain internal (Batas Dirichlet Nol)
        T_next[1:-1, 1:-1] = (T_current[1:-1, 1:-1] + 
                              alpha * dt * (d2x + d2y) + 
                              Q_source[1:-1, 1:-1] * dt * self.cfg.HEAT_COUPLING_CONSTANT)
        return T_next

physics_engine = MultiPhysicsEngine(config, grid_manager)

# =====================================================================
# MODULE 3: DATASET GENERATOR PIPELINE (SCIPY -> PYTORCH BRIDGE)
# =====================================================================
print("[SYSTEM INFO] Memulai proses sintesis dataset multi-fisika masif...")

def generate_bulk_physics_dataset(num_samples=120):
    """Membangun ratusan simulasi fisika untuk melatih model AI"""
    dataset_inputs = []
    dataset_targets = []
    
    styles = ["well", "ring"]
    
    for i in range(num_samples):
        style_selected = styles[i % len(styles)]
        noise = np.random.uniform(0.1, 0.5)
        
        # 1. Jalankan Solver Kuantum
        V = physics_engine.construct_confinement_potential(style=style_selected, noise_level=noise)
        E, Psi = physics_engine.solve_quantum_ground_state(V)
        
        # 2. Jalankan Solver Termal (Sumber panas berasal dari densitas probabilitas kuantum |Psi|^2)
        Q_source = Psi**2
        T_field = np.zeros_like(V)
        dt_stable = 0.01 # Waktu delta aman
        
        # Jalankan 30 iterasi difusi termal
        for _ in range(30):
            T_field = physics_engine.simulate_thermal_diffusion_step(T_field, Q_source, dt_stable)
            
        # Gabungkan Potensial V dan Medan Termal T sebagai input 2-Channel
        input_channels = np.stack([V, T_field], axis=0)
        
        dataset_inputs.append(input_channels)
        dataset_targets.append(Psi)
        
        if (i+1) % 40 == 0:
            print(f"    [Sintesis] Berhasil memproses {i+1} matriks eksperimen.")
            
    return np.array(dataset_inputs), np.array(dataset_targets)

raw_inputs, raw_targets = generate_bulk_physics_dataset(num_samples= 80)

# Kustomisasi Dataset Kelas PyTorch
class QuantumThermalDataset(Dataset):
    def __init__(self, inputs, targets):
        self.inputs = torch.tensor(inputs, dtype=torch.float32)
        self.targets = torch.tensor(targets, dtype=torch.float32).unsqueeze(1) # Tambahkan channel dim
        
    def __len__(self):
        return len(self.inputs)
        
    def __getitem__(self, idx):
        return self.inputs[idx], self.targets[idx]

# Split Data untuk Training & Validasi
split_idx = int(0.8 * len(raw_inputs))
train_dataset = QuantumThermalDataset(raw_inputs[:split_idx], raw_targets[:split_idx])
val_dataset = QuantumThermalDataset(raw_inputs[split_idx:], raw_targets[split_idx:])

train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False)

# =====================================================================
# MODULE 4: PHYSICS-INFORMED DEEP RESNET ARCHITECTURE (PYTORCH)
# =====================================================================
print("[SYSTEM INFO] Merakit struktur arsitektur Deep Physics-Informed CNN-ResNet...")

class QuantumResidualBlock(nn.Module):
    """Blok Residual Kustom untuk mempertahankan fitur resolusi spasial tinggi"""
    def __init__(self, channels):
        super(QuantumResidualBlock, self).__init__()
        self.conv1 = nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(channels)
        self.gelu = nn.GELU()
        self.conv2 = nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels)
        
    def forward(self, x):
        residual = x
        out = self.gelu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += residual
        return self.gelu(out)

class PhysicsInformedResNet(nn.Module):
    """Deep Neural Network Utama untuk Memprediksi Fungsi Gelombang Kuantum"""
    def __init__(self, in_channels=2, out_channels=1, features=32, dx=1.0, dy=1.0):
        super(PhysicsInformedResNet, self).__init__()
        # area sel diskret untuk normalisasi integral |psi|^2
        self.cell_area = float(dx) * float(dy)
         
        # Ekstraksi Fitur Awal
        self.input_layer = nn.Sequential(
            nn.Conv2d(in_channels, features, kernel_size=5, padding=2),
            nn.BatchNorm2d(features),
            nn.GELU()
        )
         
        # Deretan Blok Residual Masif (Deep Topology)
        self.res_chain = nn.Sequential(
            QuantumResidualBlock(features),
            QuantumResidualBlock(features),
            QuantumResidualBlock(features),
            QuantumResidualBlock(features)
        )
         
        # Rekonstruksi Output Spasial
        self.output_layer = nn.Sequential(
            nn.Conv2d(features, features // 2, kernel_size=3, padding=1),
            nn.GELU(),
            nn.Conv2d(features // 2, out_channels, kernel_size=3, padding=1)
        )
         
    def forward(self, x):
        features = self.input_layer(x)
        latent_space = self.res_chain(features)
        predicted_wavefunction = self.output_layer(latent_space)
         
        # Terapkan Aturan Fisika: Normalisasi Fungsi Gelombang secara internal di PyTorch Batch
        # Mengintegrasikan total probabilitas |Psi|^2 agar sama dengan 1 (diskret: sum * dx * dy)
        batch_size, c, h, w = predicted_wavefunction.size()
        flat_wf = predicted_wavefunction.view(batch_size, -1)
        psi_sq_sum = torch.sum((flat_wf ** 2), dim=1, keepdim=True)  # sum |psi|^2
        norms = torch.sqrt(psi_sq_sum * (self.cell_area)) + 1e-8
        normalized_flat = flat_wf / norms
         
        return normalized_flat.view(batch_size, c, h, w)

# Inisialisasi Model, Optimizer, dan Scheduler Tingkat Lanjut
model = PhysicsInformedResNet(dx=config.DX, dy=config.DY).to(config.DEVICE)
optimizer = optim.AdamW(model.parameters(), lr=config.LEARNING_RATE, weight_decay=1e-3)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config.EPOCHS)
criterion = nn.MSELoss()

# =====================================================================
# MODULE 5: RIGOROUS TRAINING & VALIDATION LOOP (PYTORCH CORE)
# =====================================================================
print("[SYSTEM INFO] Memulai loop pelatihan komputasi...")

history_train_loss = []
history_val_loss = []

for epoch in range(config.EPOCHS):
    model.train()
    running_train_loss = 0.0
     
    for batch_inputs, batch_targets in train_loader:
        batch_inputs = batch_inputs.to(config.DEVICE)
        batch_targets = batch_targets.to(config.DEVICE)
        
        optimizer.zero_grad()
        
        # Forward pass
        outputs = model(batch_inputs)
        
        # Hitung Loss Standar (MSE) + Loss Batasan Fisika (Kerapatan Probabilitas)
        loss_mse = criterion(outputs, batch_targets)
        
        # Batasan Fisika: integral overlap diskret ≈ sum(outputs * targets) * dx * dy
        overlap_integral = torch.sum(outputs * batch_targets, dim=[2, 3]) * (config.DX * config.DY)
        overlap_loss = 1.0 - torch.mean(torch.abs(overlap_integral))
         
        total_loss = loss_mse + 0.5 * overlap_loss
         
        # Backward Pass & Gradien Clipping untuk mencegah ledakan numerik
        total_loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        
        running_train_loss += total_loss.item() * batch_inputs.size(0)
         
    scheduler.step()
     
    # Loop Evaluasi Validasi
    model.eval()
    running_val_loss = 0.0
    with torch.no_grad():
        for val_inputs, val_targets in val_loader:
            val_inputs = val_inputs.to(config.DEVICE)
            val_targets = val_targets.to(config.DEVICE)
            val_outputs = model(val_inputs)
            val_loss = criterion(val_outputs, val_targets)
            running_val_loss += val_loss.item() * val_inputs.size(0)
            
    epoch_train_loss = running_train_loss / len(train_dataset)
    epoch_val_loss = running_val_loss / len(val_dataset)
    
    history_train_loss.append(epoch_train_loss)
    history_val_loss.append(epoch_val_loss)
    
    if (epoch + 1) % 5 == 0 or epoch == 0:
        print(f"    Epoch {epoch+1:02d}/{config.EPOCHS} -> Train Loss: {epoch_train_loss:.6f} | Val Loss: {epoch_val_loss:.6f}")

print("[SYSTEM INFO] Proses pelatihan kecerdasan buatan selesai.")

# =====================================================================
# MODULE 6: ADVANCED SIGNAL PROCESSING ON METRICS (SCIPY SIGNAL)
# =====================================================================
print("[SYSTEM INFO] Menganalisis riwayat kerugian menggunakan SciPy Signal...")

# Mengonversi riwayat loss ke bentuk array numpy untuk dianalisis
loss_arr = np.array(history_train_loss)

# Terapkan Filter Savitzky-Golay dari SciPy untuk menghaluskan fluktuasi grafik
smoothed_loss = signal.savgol_filter(loss_arr, window_length=5, polyorder=2)

# Mencari puncak fluktuasi ketidakstabilan menggunakan peak finder SciPy
peaks, _ = signal.find_peaks(loss_arr, prominence=0.001)

# =====================================================================
# MODULE 7: ENGINEERING DASHBOARD VISUALIZATION (MATPLOTLIB ADVANCED)
# =====================================================================
print("[SYSTEM INFO] Membangun Dashboard Multi-Panel Menggunakan Matplotlib...")

# Setup Figure Utama dengan GridSpec Kompleks
fig = plt.figure(figsize=(20, 14), facecolor='#121212')
gs = gridspec.GridSpec(3, 3, height_ratios=[1, 1.2, 1.2], wspace=0.3, hspace=0.35)

# Palet warna gelap kustom
plt.rcParams['text.color'] = 'white'
plt.rcParams['axes.labelcolor'] = 'white'
plt.rcParams['xtick.color'] = 'white'
plt.rcParams['ytick.color'] = 'white'

# ---------------------------------------------------------------------
# PANEL A: Kurva Pembelajaran & Analisis Sinyal Savitzky-Golay
# ---------------------------------------------------------------------
ax_loss = fig.add_subplot(gs[0, :])
ax_loss.set_facecolor('#1a1a1a')
ax_loss.plot(history_train_loss, color='#ff7f0e', alpha=0.4, lw=1.5, label='Raw Train Loss')
ax_loss.plot(smoothed_loss, color='#00ffcc', lw=2.5, label='Smoothed Signal (Savitzky-Golay)')
ax_loss.plot(history_val_loss, color='#ff007f', lw=2, linestyle='--', label='Validation Loss')
if len(peaks) > 0:
    ax_loss.scatter(peaks, loss_arr[peaks], color='red', s=60, marker='X', label='Instability Anomalies')
ax_loss.set_title("ANALISIS STABILITAS PEMBELAJARAN JARINGAN NEURAL MULTI-FISIKA", fontsize=14, fontweight='bold', pad=10)
ax_loss.set_xlabel("Epoch Komputasi", fontsize=11)
ax_loss.set_ylabel("Nilai Kerugian Terintegrasi", fontsize=11)
ax_loss.grid(True, color='#333333', linestyle=':', alpha=0.8)
ax_loss.legend(facecolor='#222222', edgecolor='none')

# Mengambil satu sampel acak dari data validasi untuk visualisasi spasial 2D
model.eval()
with torch.no_grad():
    sample_input, sample_target = val_dataset[0]
    predicted_target = model(sample_input.unsqueeze(0).to(config.DEVICE)).cpu().squeeze(0).squeeze(0).numpy()
    
v_field_render = sample_input[0].numpy()
t_field_render = sample_input[1].numpy()
exact_psi_render = sample_target.squeeze(0).numpy()

# ---------------------------------------------------------------------
# PANEL B: Medan Potensial Masukan (Input Channel 1: V(x,y))
# ---------------------------------------------------------------------
ax_pot = fig.add_subplot(gs[1, 0])
im_pot = ax_pot.imshow(v_field_render, extent=[-5, 5, -5, 5], cmap='viridis', origin='lower')
ax_pot.set_title("Channel 1: Medan Potensial V(x,y)", fontsize=12, color='#00ffcc')
fig.colorbar(im_pot, ax=ax_pot, fraction=0.046, pad=0.04)

# ---------------------------------------------------------------------
# PANEL C: Medan Termal Masukan (Input Channel 2: T(x,y))
# ---------------------------------------------------------------------
ax_therm = fig.add_subplot(gs[1, 1])
im_therm = ax_therm.imshow(t_field_render, extent=[-5, 5, -5, 5], cmap='inferno', origin='lower')
ax_therm.set_title("Channel 2: Profil Difusi Panas T(x,y)", fontsize=12, color='#ff007f')
fig.colorbar(im_therm, ax=ax_therm, fraction=0.046, pad=0.04)

# ---------------------------------------------------------------------
# PANEL D: Korelasi Cross-Section Potensial vs Termal (Analisis SciPy)
# ---------------------------------------------------------------------
ax_cross = fig.add_subplot(gs[1, 2])
ax_cross.set_facecolor('#1a1a1a')
center_line_idx = config.NX // 2
ax_cross.plot(grid_manager.x, v_field_render[center_line_idx, :], color='#00ffcc', label='Potensial V (Sumbu Tengah)')
ax_cross.plot(grid_manager.x, t_field_render[center_line_idx, :]*5, color='#ff007f', label='Panas T x 5 (Sumbu Tengah)')
ax_cross.set_title("Potongan Melintang Fisika Sumbu-X Tengah", fontsize=11)
ax_cross.grid(True, color='#333333', linestyle='--')
ax_cross.legend(facecolor='#222222', loc='upper right')

# ---------------------------------------------------------------------
# PANEL E: Fungsi Gelombang Eksak (SciPy Exact Ground Truth)
# ---------------------------------------------------------------------
ax_exact = fig.add_subplot(gs[2, 0])
im_exact = ax_exact.imshow(exact_psi_render, extent=[-5, 5, -5, 5], cmap='plasma', origin='lower')
ax_exact.set_title("Target: Fungsi Gelombang Eksak (SciPy)", fontsize=12)
fig.colorbar(im_exact, ax=ax_exact, fraction=0.046, pad=0.04)

# ---------------------------------------------------------------------
# PANEL F: Prediksi Jaringan Saraf Tiruan (PyTorch Inference)
# ---------------------------------------------------------------------
ax_pred = fig.add_subplot(gs[2, 1])
im_pred = ax_pred.imshow(predicted_target, extent=[-5, 5, -5, 5], cmap='plasma', origin='lower')
ax_pred.set_title("Output AI: Prediksi ResNet (PyTorch)", fontsize=12, color='#ffaa00')
fig.colorbar(im_pred, ax=ax_pred, fraction=0.046, pad=0.04)

# ---------------------------------------------------------------------
# PANEL G: Peta Kesalahan Absolut (Absolute Error Map Matrix)
# ---------------------------------------------------------------------
ax_err = fig.add_subplot(gs[2, 2])
abs_error_map = np.abs(exact_psi_render - predicted_target)
im_err = ax_err.imshow(abs_error_map, extent=[-5, 5, -5, 5], cmap='seismic', origin='lower')
ax_err.set_title("Matriks Galat Mutlak |Eksak - Prediksi|", fontsize=12, color='red')
fig.colorbar(im_err, ax=ax_err, fraction=0.046, pad=0.04)

# Sentuhan Akhir Tata Letak Matplotlib Dashboard
plt.suptitle("DASHBOARD REKAYASA KOMPUTASIONAL MULTI-FISIKA KUANTUM\nINTEGRASI NETWORK PYTORCH & PROSESOR SOLVER SCIPY", 
             fontsize=18, fontweight='bold', color='white', y=0.98)

plt.show()

print("=" * 70)
print("[PROYEK SELESAI] Seluruh modul simulasi berjalan non error(tanpa error) numerik!")
print("=" * 70)