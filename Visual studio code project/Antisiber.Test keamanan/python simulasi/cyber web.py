from http.server import SimpleHTTPRequestHandler, HTTPServer

# Menentukan alamat IP dan Port server
# 'localhost' berarti server hanya bisa diakses dari komputermu sendiri
HOST = "localhost"
PORT = 8080

class MyServerHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Memberitahu browser bahwa permintaan berhasil (Status 200 OK)
        self.send_response(200)
        # Memberitahu browser bahwa kita akan mengirim file HTML
        self.send_header("Content-type", "text/html")
        self.end_headers()
        
        # Isi halaman web yang dikirim ke browser
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Server Python Saya</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
                h1 { color: #333; }
                p { color: #666; }
            </style>
        </head>
        <body>
            <h1>Halo dari Server Python!</h1>
            <p>Server ini dibuat menggunakan library bawaan Python tanpa framework tambahan.</p>
        </body>
        </html>
        """
        # Mengirim data HTML ke browser (wajib diubah ke bentuk bytes)
        self.wfile.write(bytes(html_content, "utf-8"))

# Menjalankan server
if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), MyServerHandler)
    print(f"Server berjalan di http://{HOST}:{PORT}")
    print("Tekan Ctrl+C untuk menghentikan server.")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
        server.server_close()