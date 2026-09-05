import hashlib
class Enkripsi:
    def __init__(self, teks):
        self.teks = teks

    def enkripsi_teks(self):
        hash_object = hashlib.sha256(self.teks.encode())
        hasil_hash = hash_object.hexdigest()
        return hasil_hash
def enkripsi_teks(teks):
   
    hash_object = hashlib.sha256(teks.encode())
    
    bukan_password_biasa = hash_object.hexdigest()
    return bukan_password_biasa


password_kamu = ""
hasil_hash = enkripsi_teks(password_kamu)

print(f"Password Asli : {password_kamu}")
print(f"Hasil SHA-256 : {hasil_hash}")