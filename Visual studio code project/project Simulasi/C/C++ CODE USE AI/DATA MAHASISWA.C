#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_MAHASISWA 200
#define FILENAME "mahasiswa.txt"

typedef struct {
    int nim;
    char nama[50];
    char jurusan[50];
    float ipk;
} Mahasiswa;

Mahasiswa data[MAX_MAHASISWA];
int jumlah_data = 0;

// Fungsi untuk menampilkan menu
void tampil_menu() {
    printf("\n========== SISTEM MANAJEMEN MAHASISWA ==========\n");
    printf("1. Tambah Data Mahasiswa\n");
    printf("2. Lihat Semua Data Mahasiswa\n");
    printf("3. Cari Mahasiswa (Berdasarkan NIM)\n");
    printf("4. Update Data Mahasiswa\n");
    printf("5. Hapus Data Mahasiswa\n");
    printf("6. Simpan Data ke File\n");
    printf("7. Baca Data dari File\n");
    printf("8. Keluar\n");
    printf("===============================================\n");
    printf("Pilih Menu (1-8): ");
}

// Fungsi untuk menambah data mahasiswa
void tambah_mahasiswa() {
    if (jumlah_data >= MAX_MAHASISWA) {
        printf("\n⚠️  Kapasitas data penuh!\n");
        return;
    }

    printf("\n--- TAMBAH DATA MAHASISWA ---\n");
    printf("NIM: ");
    scanf("%d", &data[jumlah_data].nim);
    getchar();

    printf("Nama: ");
    fgets(data[jumlah_data].nama, sizeof(data[jumlah_data].nama), stdin);
    data[jumlah_data].nama[strcspn(data[jumlah_data].nama, "\n")] = 0;

    printf("Jurusan: ");
    fgets(data[jumlah_data].jurusan, sizeof(data[jumlah_data].jurusan), stdin);
    data[jumlah_data].jurusan[strcspn(data[jumlah_data].jurusan, "\n")] = 0;

    printf("IPK: ");
    scanf("%f", &data[jumlah_data].ipk);

    jumlah_data++;
    printf("\n✅ Data berhasil ditambahkan!\n");
}

// Fungsi untuk menampilkan semua data
void lihat_semua_mahasiswa() {
    if (jumlah_data == 0) {
        printf("\n❌ Tidak ada data mahasiswa!\n");
        return;
    }

    printf("\n========== DATA MAHASISWA ==========\n");
    printf("%-6s %-20s %-20s %-6s\n", "NIM", "Nama", "Jurusan", "IPK");
    printf("====================================\n");

    for (int i = 0; i < jumlah_data; i++) {
        printf("%-6d %-20s %-20s %.2f\n",
               data[i].nim,
               data[i].nama,
               data[i].jurusan,
               data[i].ipk);
    }
    printf("====================================\n");
}

// Fungsi untuk mencari mahasiswa
void cari_mahasiswa() {
    if (jumlah_data == 0) {
        printf("\n❌ Tidak ada data mahasiswa!\n");
        return;
    }

    int cari_nim;
    printf("\nMasukkan NIM yang dicari: ");
    scanf("%d", &cari_nim);

    printf("\n========== HASIL PENCARIAN ==========\n");
    int ditemukan = 0;

    for (int i = 0; i < jumlah_data; i++) {
        if (data[i].nim == cari_nim) {
            printf("NIM     : %d\n", data[i].nim);
            printf("Nama    : %s\n", data[i].nama);
            printf("Jurusan : %s\n", data[i].jurusan);
            printf("IPK     : %.2f\n", data[i].ipk);
            ditemukan = 1;
            break;
        }
    }

    if (!ditemukan) {
        printf("❌ Data dengan NIM %d tidak ditemukan!\n", cari_nim);
    }
}

// Fungsi untuk update data mahasiswa
void update_mahasiswa() {
    if (jumlah_data == 0) {
        printf("\n❌ Tidak ada data mahasiswa!\n");
        return;
    }

    int cari_nim;
    printf("\nMasukkan NIM yang ingin diupdate: ");
    scanf("%d", &cari_nim);
    getchar();

    for (int i = 0; i < jumlah_data; i++) {
        if (data[i].nim == cari_nim) {
            printf("\n--- UPDATE DATA MAHASISWA ---\n");
            printf("Nama Baru: ");
            fgets(data[i].nama, sizeof(data[i].nama), stdin);
            data[i].nama[strcspn(data[i].nama, "\n")] = 0;

            printf("Jurusan Baru: ");
            fgets(data[i].jurusan, sizeof(data[i].jurusan), stdin);
            data[i].jurusan[strcspn(data[i].jurusan, "\n")] = 0;

            printf("IPK Baru: ");
            scanf("%f", &data[i].ipk);

            printf("\n✅ Data berhasil diupdate!\n");
            return;
        }
    }

    printf("\n❌ Data dengan NIM %d tidak ditemukan!\n", cari_nim);
}

// Fungsi untuk menghapus data mahasiswa
void hapus_mahasiswa() {
    if (jumlah_data == 0) {
        printf("\n❌ Tidak ada data mahasiswa!\n");
        return;
    }

    int cari_nim;
    printf("\nMasukkan NIM yang ingin dihapus: ");
    scanf("%d", &cari_nim);

    for (int i = 0; i < jumlah_data; i++) {
        if (data[i].nim == cari_nim) {
            for (int j = i; j < jumlah_data - 1; j++) {
                data[j] = data[j + 1];
            }
            jumlah_data--;
            printf("\n✅ Data berhasil dihapus!\n");
            return;
        }
    }

    printf("\n❌ Data dengan NIM %d tidak ditemukan!\n", cari_nim);
}

// Fungsi untuk simpan data ke file
void simpan_ke_file() {
    FILE *file = fopen(FILENAME, "w");

    if (file == NULL) {
        printf("\n❌ Gagal membuka file!\n");
        return;
    }

    fprintf(file, "%d\n", jumlah_data);

    for (int i = 0; i < jumlah_data; i++) {
        fprintf(file, "%d|%s|%s|%.2f\n",
                data[i].nim,
                data[i].nama,
                data[i].jurusan,
                data[i].ipk);
    }

    fclose(file);
    printf("\n✅ Data berhasil disimpan ke file '%s'!\n", FILENAME);
}

// Fungsi untuk baca data dari file
void baca_dari_file() {
    FILE *file = fopen(FILENAME, "r");

    if (file == NULL) {
        printf("\n❌ File tidak ditemukan!\n");
        return;
    }

    fscanf(file, "%d\n", &jumlah_data);

    for (int i = 0; i < jumlah_data; i++) {
        fscanf(file, "%d|%49[^|]|%49[^|]|%f\n",
               &data[i].nim,
               data[i].nama,
               data[i].jurusan,
               &data[i].ipk);
    }

    fclose(file);
    printf("\n✅ Data berhasil dibaca dari file '%s'!\n", FILENAME);
    printf("   Total data: %d\n", jumlah_data);
}

// Fungsi main
int main() {
    int pilihan;

    printf("╔════════════════════════════════════════╗\n");
    printf("║  SELAMAT DATANG DI SISTEM MANAJEMEN   ║\n");
    printf("║           MAHASISWA v1.0              ║\n");
    printf("╚════════════════════════════════════════╝\n");

    while (1) {
        tampil_menu();
        scanf("%d", &pilihan);

        switch (pilihan) {
            case 1:
                tambah_mahasiswa();
                break;
            case 2:
                lihat_semua_mahasiswa();
                break;
            case 3:
                cari_mahasiswa();
                break;
            case 4:
                update_mahasiswa();
                break;
            case 5:
                hapus_mahasiswa();
                break;
            case 6:
                simpan_ke_file();
                break;
            case 7:
                baca_dari_file();
                break;
            case 8:
                printf("\n👋 Terima kasih telah menggunakan sistem ini!\n");
                return 0;
            default:
                printf("\n❌ Pilihan tidak valid! Silakan coba lagi.\n");
        }
    }

    return 0;