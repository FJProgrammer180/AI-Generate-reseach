#include <WiFi.h>
#include <WebServer.h>

// Ganti dengan nama dan password WiFi mu
const char* ssid = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";

WebServer server(80);

// Pin motor driver
#define ENA 21  // PWM motor kiri
#define IN1 23
#define IN2 22
#define ENB 5   // PWM motor kanan
#define IN3 19
#define IN4 18

// Variabel kecepatan (0-255)
int speed = 200;

void setup() {
  Serial.begin(115200);
  
  // Set pin motor sebagai output
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  
  // Matikan motor awal
  motorStop();

  // Koneksi WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected! IP: " + WiFi.localIP().toString());

  // Setup routes
  server.on("/", handleRoot);
  server.on("/forward", []() { motorForward(); server.send(200, "text/plain", "Maju"); });
  server.on("/backward", []() { motorBackward(); server.send(200, "text/plain", "Mundur"); });
  server.on("/left", []() { motorLeft(); server.send(200, "text/plain", "Kiri"); });
  server.on("/right", []() { motorRight(); server.send(200, "text/plain", "Kanan"); });
  server.on("/stop", []() { motorStop(); server.send(200, "text/plain", "Stop"); });
  
  server.begin();
}

void loop() {
  server.handleClient();
}

// Fungsi Kontrol Motor
void motorForward() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, speed);
  analogWrite(ENB, speed);
}

void motorBackward() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, speed);
  analogWrite(ENB, speed);
}

void motorLeft() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, speed);
  analogWrite(ENB, speed);
}

void motorRight() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  analogWrite(ENA, speed);
  analogWrite(ENB, speed);
}

void motorStop() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
}

// Halaman Web Kontrol
void handleRoot() {
  String html = "<html>"
                "<head><title>Kontrol Mobil</title>"
                "<style>"
                "body { font-family: Arial; text-align: center; margin: 50px; }"
                "button { padding: 20px 40px; font-size: 24px; margin: 10px; border-radius: 10px; cursor: pointer; }"
                ".atas { background-color: #4CAF50; }"
                ".bawah { background-color: #f44336; }"
                ".kiri { background-color: #2196F3; }"
                ".kanan { background-color: #FF9800; }"
                ".stop { background-color: #9E9E9E; }"
                "</style></head>"
                "<body>"
                "<h1>Kontrol Mobil WiFi</h1>"
                "<button class='atas' onmousedown='location.href=\"/forward\"' onmouseup='location.href=\"/stop\"'>MAJU</button><br>"
                "<button class='kiri' onmousedown='location.href=\"/left\"' onmouseup='location.href=\"/stop\"'>KIRI</button>"
                "<button class='stop' onclick='location.href=\"/stop\"'>STOP</button>"
                "<button class='kanan' onmousedown='location.href=\"/right\"' onmouseup='location.href=\"/stop\"'>KANAN</button><br>"
                "<button class='bawah' onmousedown='location.href=\"/backward\"' onmouseup='location.href=\"/stop\"'>MUNDUR</button>"
                "</body></html>";
  server.send(200, "text/html", html);
}