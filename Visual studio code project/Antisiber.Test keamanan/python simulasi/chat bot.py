import time

def chatbot_sederhana():
    print("Bot: Halo! Saya CyberBot di buat oleh Fajriansyah. Ada yang bisa saya bantu hari ini?")
    print("(Ketik 'keluar' untuk menyudahi obrolan)\n")
    
    while True:
        # Mengambil input dari user dan mengubahnya menjadi huruf kecil semua
        pesan_user = input("Kamu: ").lower()
        
        # Kondisi untuk keluar dari program
        if pesan_user == "keluar":
            print("Bot: Sampai jumpa! semoga kamu sehat selalu :).")
            break
            
        # (kata kunci yang bisa masuk)Logika respons chatbot berdasarkan kata kunci
        if "halo" in pesan_user or "hai" in pesan_user:
            print("Bot: Halo juga! Bagaimana kabar Anda?")
            
        elif "password" in pesan_user or "sandi" in pesan_user:
            print("Bot: Tips Password Aman: Minimal 12 karakter, kombinasi huruf besar, kecil, angka, dan simbol!")
            
        elif "virus" in pesan_user or "malware" in pesan_user:
            print("Bot: Jangan sembarangan mengklik link asing dan pastikan antivirus Anda selalu aktif.")
        
        elif "siapa namamu" in pesan_user:
            print("Bot: Nama saya CyberBot di buat dengan cinta dan kasih sayang, asisten virtual berbasis Python. (by fajri)")
        elif "siapa yang buat" in pesan_user:
            print("di buat oleh fajrinasyah tuanku yang ganteng,pinter dan baik")    
        else:
            print("Bot: Maaf, saya belum paham maksud Anda. Coba tanya tentang 'password' atau 'virus'.")
            
        print("-" * 30)
        time.sleep(0.5) # Memberi jeda sedikit agar interaksi terasa alami

# Menjalankan chatbot
if __name__ == "__main__":
    chatbot_sederhana()