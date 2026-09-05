import time
from collections import defaultdict

# 1. DATABASE/SYSTEM MOCK (Simulasi Sistem Keamanan)
IP_BLOCKLIST = set()
LOG_ATTEMPTS = defaultdict(list)

# Batasan Keamanan (Rule)
MAX_FAILED_ATTEMPTS = 3
TIME_WINDOW = 10 # dalam detik

def block_ip(ip_address):
    """Fungsi SOAR: Memblokir IP secara otomatis jika terdeteksi menyerang"""
    if ip_address not in IP_BLOCKLIST:
        IP_BLOCKLIST.add(ip_address)
        print(f"==> [SOAR ACTION] 🛡️ IP {ip_address} TELAH DIBLOKIR PADA FIREWALL!")

def analisis_log(ip_address, status_login):
    """Fungsi SIEM: Menganalisis aktivitas dan mendeteksi anomali/serangan"""
    waktu_sekarang = time.time()
    
    # Jika IP sudah diblokir, langsung tolak
    if ip_address in IP_BLOCKLIST:
        print(f"[LOG] Koneksi dari {ip_address} ditolak (IP Terblokir).")
        return

    print(f"[LOG] IP {ip_address} mencoba login. Status: {status_login}")

    if status_login == "GAGAL":
        # Catat waktu kegagalan
        LOG_ATTEMPTS[ip_address].append(waktu_sekarang)
        
        # Bersihkan catatan kegagalan yang sudah lama (di luar TIME_WINDOW)
        LOG_ATTEMPTS[ip_address] = [t for t in LOG_ATTEMPTS[ip_address] if waktu_sekarang - t <= TIME_WINDOW]
        
        # Cek apakah jumlah kegagalan melebihi batas aman
        if len(LOG_ATTEMPTS[ip_address]) >= MAX_FAILED_ATTEMPTS:
            print(f"\n [SIEM ALERT] Terdeteksi Serangan Brute Force dari IP: {ip_address}!")
            print(f" Detail: {len(LOG_ATTEMPTS[ip_address])} kali gagal dalam {TIME_WINDOW} detik.")
            # Panggil fungsi mitigasi otomatis
            block_ip(ip_address)
            print("-" * 60)

# ==========================================
# SIMULASI SERANGAN & AKTIVITAS NORMAL
# ==========================================
if __name__ == "__main__":
    print("=== SISTEM KEAMANAN SIEM/SOAR AKTIF ===\n")
    
    # Kejadian 1: Pengguna normal mencoba login dan sukses
    analisis_log("192.168.1.50", "SUKSES")
    time.sleep(1)
    
    # Kejadian 2: Hacker (IP 10.0.0.99) mencoba menembak password berturut-turut
    print("\n--- Simulasi Serangan Masuk ---")
    analisis_log("10.0.0.99", "GAGAL")
    time.sleep(1)
    analisis_log("10.0.0.99", "GAGAL")
    time.sleep(1)
    analisis_log("10.0.0.99", "GAGAL") # Ini adalah percobaan ke-3, SIEM harusnya mendeteksi ini
    
    time.sleep(1)
    # Kejadian 3: Hacker mencoba menyerang lagi setelah diblokir
    analisis_log("10.0.0.99", "GAGAL")
    
    # Kejadian 4: Pengguna normal lain salah password sekali (tidak diblokir)
    print("\n--- Simulasi Pengguna Normal Lupa Password ---")
    analisis_log("192.168.1.75", "GAGAL")