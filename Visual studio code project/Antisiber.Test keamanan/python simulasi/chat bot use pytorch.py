import torch
import torch.nn as nn
import torch.optim as optim

# 1. DATASET SEDERHANA (Data yang akan dipelajari AI)
# Kita petakan kata kunci menjadi angka (Vocabulary)
vocab = {"halo": 0, "hai": 1, "malam": 2, "pagi": 3, "sandi": 4, "password": 5, "aman": 6, "hacker": 7}
intents = {0: "Salam/Greetings", 1: "Pertanyaan Keamanan/Cybersecurity"}

# Data Latihan (X = teks dalam bentuk angka, Y = Kategori/Intent)
# [halo, hai, malam, pagi, sandi, password, aman, hacker]
X_train = torch.tensor([
    [1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], # "halo hai" = Salam
    [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0], # "malam pagi" = Salam
    [0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0], # "sandi password" = Keamanan
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0],  # "aman hacker" = Keamanan
], dtype=torch.float32)

Y_train = torch.tensor([0, 0, 1, 1], dtype=torch.long) # 0 = Salam, 1 = Keamanan


# 2. MEMBUAT ARSITEKTUR NEURAL NETWORK
class ChatbotModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes):
        super(ChatbotModel, self).__init__()
        # Lapisan 1 (Input ke Hidden layer)
        self.linear1 = nn.Linear(input_size, hidden_size)
        # Aktivasi fungsi untuk memberikan sifat "berpikir" non-linear
        self.relu = nn.ReLU()
        # Lapisan 2 (Hidden ke Output layer)
        self.linear2 = nn.Linear(hidden_size, num_classes)
        
    def forward(self, x):
        out = self.linear1(x)
        out = self.relu(out)
        out = self.linear2(out)
        return out


# 3. INISIALISASI DAN TRAINING MODEL
INPUT_SIZE = len(vocab) # 8 kata
HIDDEN_SIZE = 8
NUM_CLASSES = 2        # 2 kategori (Salam / Keamanan)

model = ChatbotModel(INPUT_SIZE, HIDDEN_SIZE, NUM_CLASSES)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

print("Proses Training AI Sedang Berjalan...")
for epoch in range(200): # memproses belajar sebanyak 200 kali
    # Forward pass
    outputs = model(X_train)
    loss = criterion(outputs, Y_train)
    
    # Backward pass dan optimasi
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

print("Training Selesai! AI sudah siap.\n")


# 4. MEMBACA INPUT BARU DAN MEMPROSESNYA (UJICUBA)
def proses_teks_ke_vektor(kalimat):
    # Mengubah kalimat baru menjadi angka seperti format dataset
    vektor = [0.0] * len(vocab)
    for kata in kalimat.lower().split():
        if kata in vocab:
            vektor[vocab[kata]] = 1.0
    return torch.tensor([vektor], dtype=torch.float32)

# Simulasi Chat
print("AI: Halo! Coba ketik sesuatu (contoh: 'pagi' atau 'password').")
while True:
    user_input = input("Kamu: ")
    if user_input.lower() == 'keluar':
        break
        
    # Proses input komputer beneran pake matriks matematika
    vektor_input = proses_teks_ke_vektor(user_input)
    
    with torch.no_grad(): # Matikan hitung gradien karena hanya prediksi
        prediksi = model(vektor_input)
        # Mengambil nilai tertinggi sebagai tebakan AI
        _, hasil_tebakan = torch.max(prediksi, dim=1)
        
    kategori_terpilih = intents[hasil_tebakan.item()]
    print(f"AI: (Saya mendeteksi ini termasuk dalam topik: **{kategori_terpilih}**)")
    print("-" * 40)