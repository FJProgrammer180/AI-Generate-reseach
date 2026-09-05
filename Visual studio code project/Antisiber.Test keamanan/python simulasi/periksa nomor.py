import socket

def cek_port(target_host, target_port):
    # Membuat objek socket
    # AF_INET = menggunakan IPv4, SOCK_STREAM = menggunakan protokol TCP
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    # Mengatur timeout agar program tidak menunggu terlalu lama (1 detik)
    s.settimeout(1.0)
    
    # Mencoba menghubungi target dan port
    hasil = s.connect_ex((target_host, target_port))
    
    # Jika hasil bernilai 0, artinya koneksi berhasil (port terbuka)
    if hasil == 0:
        print(f" Port {target_port} di {target_host} TERBUKA.")
    else:
        print(f" Port {target_port} di {target_host} tertutup atau tidak merespon.")
    
    # Menutup koneksi socket
    s.close()

# Uji coba memeriksa port 443 (port standar untuk HTTPS/web aman)
# Kita gunakan alamat IP lokal server sendiri atau localhost untuk latihan aman
target = "localhost" 
port_tujuan = 443

print(f"Memulai pemindaian pada {target}...")
cek_port(target, port_tujuan)