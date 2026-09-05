import time
import random

def pantau_rover():
    print("=== SISTEM MONITORING ROVER MARS OLEH PYTHON ===")
    print("Menghubungkan ke satelit...")
    time.sleep(1.5)
    print("Koneksi berhasil. Memulai penerimaan data...\n")
    
    # Simulasi pengecekan data selama 5 kali data masuk
    for i in range(1, 6):
        # Angka disimulasikan secara acak (seolah-olah data asli dari sensor)
        suhu_mesin = random.randint(50, 160)  # dalam derajat Celcius
        baterai = random.randint(10, 100)     # dalam persen
        
        print(f"[DATA MASUK #{i}]")
        print(f"-> Suhu Mesin: {suhu_mesin}°C")
        print(f"-> Daya Baterai: {baterai}%")
        
        # Logika Keamanan Sistem (Threshold Checking)
        if suhu_mesin > 140:
            print("🚨 PERINGATAN: Suhu mesin terlalu panas! Mengaktifkan sistem pendingin cadangan.")
        if baterai < 20:
            print("⚠️ PERINGATAN: Baterai kritis! Mematikan instrumen non-esensial.")
            
        print("-" * 40)
        time.sleep(2) # Menunggu 2 detik sebelum data berikutnya masuk

if __name__ == "__main__":
    try:
        pantau_rover()
    except KeyboardInterrupt:
        print("\nSistem monitoring dimatikan.")