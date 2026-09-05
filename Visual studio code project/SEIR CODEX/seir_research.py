"""
================================================================================
SIMULASI MODEL EPIDEMI SEIR UNTUK PENELITIAN
================================================================================
Script ini mengimplementasikan model epidemiologi SEIR (Susceptible -
Exposed - Infectious - Recovered) yang umum digunakan dalam penelitian
kesehatan masyarakat untuk memodelkan penyebaran penyakit menular.

Fitur:
1. Simulasi dinamika SEIR menggunakan persamaan diferensial (ODE)
2. Analisis sensitivitas parameter (R0, masa inkubasi, masa infeksi)
3. Simulasi Monte Carlo untuk ketidakpastian parameter
4. Perhitungan metrik epidemiologi penting (peak infection, durasi, dll)
5. Visualisasi hasil (kurva epidemi, heatmap sensitivitas, distribusi MC)

Author: Generated for research purposes
================================================================================
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.integrate import odeint
from dataclasses import dataclass

sns.set_style("whitegrid")
np.random.seed(42)


# ------------------------------------------------------------------
# 1. DEFINISI MODEL SEIR
# ------------------------------------------------------------------
@dataclass
class SEIRParams:
    """Parameter model SEIR."""
    beta: float   # tingkat transmisi (kontak efektif per hari)
    sigma: float  # 1 / masa inkubasi (E -> I)
    gamma: float  # 1 / masa infeksi (I -> R)
    N: int        # total populasi

    @property
    def R0(self):
        """Basic reproduction number."""
        return self.beta / self.gamma


def seir_model(y, t, params: SEIRParams):
    """Sistem persamaan diferensial untuk model SEIR."""
    S, E, I, R = y
    N = params.N
    dSdt = -params.beta * S * I / N
    dEdt = params.beta * S * I / N - params.sigma * E
    dIdt = params.sigma * E - params.gamma * I
    dRdt = params.gamma * I
    return [dSdt, dEdt, dIdt, dRdt]


def run_simulation(params: SEIRParams, days: int = 160, E0: int = 1, I0: int = 0):
    """Menjalankan simulasi SEIR dan mengembalikan DataFrame hasil."""
    S0 = params.N - E0 - I0
    y0 = [S0, E0, I0, 0]
    t = np.linspace(0, days, days + 1)

    result = odeint(seir_model, y0, t, args=(params,))
    df = pd.DataFrame(result, columns=["S", "E", "I", "R"])
    df["t"] = t
    return df


# ------------------------------------------------------------------
# 2. METRIK EPIDEMIOLOGI
# ------------------------------------------------------------------
def epidemic_metrics(df: pd.DataFrame, N: int) -> dict:
    """Menghitung metrik penting dari hasil simulasi."""
    peak_idx = df["I"].idxmax()
    return {
        "peak_infected": df["I"].max(),
        "peak_day": df["t"].iloc[peak_idx],
        "total_attack_rate": (df["R"].iloc[-1] / N) * 100,  # %
        "final_susceptible_pct": (df["S"].iloc[-1] / N) * 100,
    }


# ------------------------------------------------------------------
# 3. ANALISIS SENSITIVITAS PARAMETER
# ------------------------------------------------------------------
def sensitivity_analysis(N=100_000, days=160):
    """
    Menganalisis bagaimana R0 dan masa infeksi mempengaruhi
    puncak jumlah kasus aktif (peak infected).
    """
    R0_values = np.linspace(1.0, 4.0, 13)        # rentang R0
    infectious_periods = np.linspace(3, 14, 12)  # rentang masa infeksi (hari)

    heatmap = np.zeros((len(infectious_periods), len(R0_values)))

    for i, inf_period in enumerate(infectious_periods):
        gamma = 1 / inf_period
        for j, R0 in enumerate(R0_values):
            beta = R0 * gamma
            sigma = 1 / 5  # masa inkubasi diasumsikan 5 hari (tetap)
            params = SEIRParams(beta=beta, sigma=sigma, gamma=gamma, N=N)
            df = run_simulation(params, days=days)
            metrics = epidemic_metrics(df, N)
            heatmap[i, j] = metrics["peak_infected"] / N * 100  # % populasi

    return R0_values, infectious_periods, heatmap


# ------------------------------------------------------------------
# 4. SIMULASI MONTE CARLO (KETIDAKPASTIAN PARAMETER)
# ------------------------------------------------------------------
def monte_carlo_simulation(n_runs=500, N=100_000, days=160):
    """
    Menjalankan banyak simulasi dengan parameter acak (sesuai distribusi
    yang masuk akal secara epidemiologis) untuk mengukur ketidakpastian
    hasil prediksi.
    """
    results = []

    for _ in range(n_runs):
        # R0 ~ Normal(2.5, 0.4), dibatasi agar tetap realistis
        R0 = np.clip(np.random.normal(2.5, 0.4), 1.0, 5.0)
        # masa infeksi ~ Normal(7, 1.5) hari
        infectious_period = np.clip(np.random.normal(7, 1.5), 3, 14)
        # masa inkubasi ~ Normal(5, 1) hari
        incubation_period = np.clip(np.random.normal(5, 1), 2, 10)

        gamma = 1 / infectious_period
        sigma = 1 / incubation_period
        beta = R0 * gamma

        params = SEIRParams(beta=beta, sigma=sigma, gamma=gamma, N=N)
        df = run_simulation(params, days=days)
        metrics = epidemic_metrics(df, N)
        metrics["R0"] = R0
        results.append(metrics)

    return pd.DataFrame(results)


# ------------------------------------------------------------------
# 5. VISUALISASI
# ------------------------------------------------------------------
def ensure_output_dir(output_dir="outputs"):
    """Membuat folder output jika belum ada."""
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    return output_dir


def plot_all(baseline_df, baseline_params, R0_vals, inf_periods, heatmap, mc_df, N, output_dir="outputs"):
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # --- Plot 1: Kurva epidemi baseline ---
    ax = axes[0, 0]
    ax.plot(baseline_df["t"], baseline_df["S"] / N * 100, label="Susceptible", color="#3b82f6")
    ax.plot(baseline_df["t"], baseline_df["E"] / N * 100, label="Exposed", color="#f59e0b")
    ax.plot(baseline_df["t"], baseline_df["I"] / N * 100, label="Infectious", color="#ef4444")
    ax.plot(baseline_df["t"], baseline_df["R"] / N * 100, label="Recovered", color="#10b981")
    ax.set_title(f"Kurva Epidemi SEIR (R0 = {baseline_params.R0:.2f})")
    ax.set_xlabel("Hari")
    ax.set_ylabel("Persentase Populasi (%)")
    ax.legend()

    # --- Plot 2: Heatmap sensitivitas ---
    ax = axes[0, 1]
    sns.heatmap(
        heatmap,
        xticklabels=[f"{r:.1f}" for r in R0_vals],
        yticklabels=[f"{p:.0f}" for p in inf_periods],
        cmap="rocket_r",
        ax=ax,
        cbar_kws={"label": "Puncak Infeksi (% populasi)"},
    )
    ax.set_xlabel("R0 (Basic Reproduction Number)")
    ax.set_ylabel("Masa Infeksi (hari)")
    ax.set_title("Analisis Sensitivitas: Puncak Kasus Aktif")

    # --- Plot 3: Distribusi puncak infeksi (Monte Carlo) ---
    ax = axes[1, 0]
    sns.histplot(mc_df["peak_infected"] / N * 100, bins=30, kde=True, ax=ax, color="#ef4444")
    ax.set_title(f"Distribusi Puncak Kasus Aktif (Monte Carlo, n={len(mc_df)})")
    ax.set_xlabel("Puncak Kasus Aktif (% populasi)")
    ax.set_ylabel("Frekuensi")

    # --- Plot 4: Hubungan R0 vs Attack Rate (Monte Carlo) ---
    ax = axes[1, 1]
    sns.scatterplot(data=mc_df, x="R0", y="total_attack_rate", alpha=0.5, ax=ax, color="#3b82f6")
    sns.regplot(data=mc_df, x="R0", y="total_attack_rate", ax=ax, scatter=False, color="#1d4ed8")
    ax.set_title("Hubungan R0 vs Total Attack Rate")
    ax.set_xlabel("R0")
    ax.set_ylabel("Total Attack Rate (% populasi terinfeksi)")

    plt.tight_layout()
    output_path = os.path.join(output_dir, "seir_research_plots.png")
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


# ------------------------------------------------------------------
# 6. PROGRAM UTAMA
# ------------------------------------------------------------------
def main():
    N = 100_000  # ukuran populasi

    print("=" * 60)
    print("SIMULASI PENELITIAN MODEL EPIDEMI SEIR")
    print("=" * 60)

    # --- Simulasi baseline ---
    baseline_params = SEIRParams(beta=0.35, sigma=1 / 5, gamma=1 / 7, N=N)
    baseline_df = run_simulation(baseline_params, days=160)
    baseline_metrics = epidemic_metrics(baseline_df, N)

    print("\n[1] Simulasi Baseline")
    print(f"    R0                : {baseline_params.R0:.2f}")
    print(f"    Puncak infeksi    : {baseline_metrics['peak_infected']:,.0f} kasus "
          f"({baseline_metrics['peak_infected']/N*100:.2f}% populasi)")
    print(f"    Hari puncak       : hari ke-{baseline_metrics['peak_day']:.0f}")
    print(f"    Total attack rate : {baseline_metrics['total_attack_rate']:.2f}%")

    # --- Analisis sensitivitas ---
    print("\n[2] Menjalankan analisis sensitivitas parameter...")
    R0_vals, inf_periods, heatmap = sensitivity_analysis(N=N)
    print("    Selesai. Rentang R0: 1.0 - 4.0, masa infeksi: 3 - 14 hari")

    # --- Monte Carlo ---
    print("\n[3] Menjalankan simulasi Monte Carlo (500 iterasi)...")
    mc_df = monte_carlo_simulation(n_runs=500, N=N)
    print("    Selesai.")
    print("\n    Ringkasan statistik (Monte Carlo):")
    print(mc_df[["R0", "peak_infected", "total_attack_rate"]].describe().round(2))

    # --- Simpan hasil mentah ke CSV ---
    output_dir = ensure_output_dir()
    mc_df.to_csv(os.path.join(output_dir, "monte_carlo_results.csv"), index=False)
    baseline_df.to_csv(os.path.join(output_dir, "baseline_simulation.csv"), index=False)

    # --- Visualisasi ---
    print("\n[4] Membuat visualisasi...")
    plot_all(baseline_df, baseline_params, R0_vals, inf_periods, heatmap, mc_df, N, output_dir)
    print(f"    Disimpan ke '{output_dir}/seir_research_plots.png'")

    print("\n" + "=" * 60)
    print("SELESAI. Lihat folder output untuk hasil CSV dan grafik.")
    print("=" * 60)


if __name__ == "__main__":
    main()
