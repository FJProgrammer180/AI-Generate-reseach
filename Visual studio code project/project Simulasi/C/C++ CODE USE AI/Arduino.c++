#include <iostream>
#include <iomanip>
#include <thread>
#include <chrono>

using namespace std;

int main() {
    // Kondisi Awal Ekosistem
    int domba = 100;
    int serigala = 10;
    int hari = 1;
    const int maks_hari = 25; // Simulasi berjalan selama 25 hari

    cout << "=== SIMULASI EKOSISTEM (DOMBA & SERIGALA) ===" << endl;
    cout << "Hari | Populasi Domba | Populasi Serigala" << endl;
    cout << "-----------------------------------------" << endl;

    // Looping simulasi harian
    while (hari <= maks_hari && domba > 0 && serigala > 0) {
        // Menampilkan status populasi hari ini
        cout << setw(4) << hari << " | " 
             << setw(14) << domba << " | " 
             << setw(17) << serigala << endl;

        // --- ATURAN SIMULASI ---
        
        // 1. Domba berkembang biak (bertambah 15% dari populasi saat ini)
        int kelahiran_domba = domba * 0.15;
        
        // 2. Serigala memakan domba (Asumsi: 1 serigala butuh makan 2 domba per hari)
        int domba_dimakan = serigala * 2;
        
        // Cegah serigala memakan domba lebih dari jumlah domba yang ada
        if (domba_dimakan > domba) {
            domba_dimakan = domba; 
        }
        
        // 3. Serigala berkembang biak atau mati kelaparan
        int perubahan_serigala = 0;
        if (domba_dimakan >= serigala) {
            // Jika makanan cukup, serigala bertambah 10%
            perubahan_serigala = serigala * 0.10; 
        } else {
            // Jika kelaparan, populasi serigala berkurang 20%
            perubahan_serigala = -(serigala * 0.20); 
        }

        // --- UPDATE POPULASI ---
        domba = domba + kelahiran_domba - domba_dimakan;
        serigala = serigala + perubahan_serigala;

        hari++;
        
        // Memberikan jeda 0.5 detik (500 milidetik) agar terlihat efek animasinya
        this_thread::sleep_for(chrono::milliseconds(500));
    }

    // --- HASIL AKHIR ---
    cout << "-----------------------------------------" << endl;
    cout << "Simulasi Berhenti di Hari ke-" << hari - 1 << endl;
    
    if (domba <= 0) {
        cout << "Kesimpulan: Domba punah! Serigala akan segera mati kelaparan." << endl;
    } else if (serigala <= 0) {
        cout << "Kesimpulan: Serigala punah! Domba akan overpopulasi." << endl;
    } else {
        cout << "Kesimpulan: Ekosistem seimbang bertahan hingga akhir periode simulasi." << endl;
    }

    return 0;
}