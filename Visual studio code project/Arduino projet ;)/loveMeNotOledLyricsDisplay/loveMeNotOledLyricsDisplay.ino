/*
 * Project: "Love Me Not" by Ravyn Lenae - OLED Lyrics Display
 * Author: smartengineerslab
 * 
 * Description:
 * A highly dynamic 0.96-inch OLED music visualizer and lyrics display
 * featuring the song "Love Me Not" by Ravyn Lenae.
   * Features include:
 * - 3D Wireframe Tunnel: Concentric rings and radiating lines simulating a wormhole.
 * - Audio EQ Bars: Jumping frequency visualizer at the bottom.
 * - Shockwaves: Circular blast animations triggered by impactful lyrics.
 * 
 * Compatibility: Arduino Uno, ESP8266, ESP32
 * 
 * Wiring Guide (I2C SSD1306 OLED):
 * --------------------------------
 * Board          | SDA Pin    | SCL Pin
 * ---------------|------------|------------
 * Arduino Uno    | A4         | A5
 * ESP8266        | D2 (GPIO4) | D1 (GPIO5)
 * ESP32          | GPIO 21    | GPIO 22
 * --------------------------------
 * VCC -> 3.3V or 5V (Verify your display module's logic level)
 * GND -> GND
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1  
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- Background System Variables ---
// 1. Tunnel
#define NUM_CIRCLES 7
float circleRadii[NUM_CIRCLES];

// 2. Audio Visualizer EQ
#define NUM_BARS 16
int barHeights[NUM_BARS];
int targetHeights[NUM_BARS];

// 3. Shockwave
struct Shockwave {
  float radius;
  bool active;
} wave;

int lastLyricIdx = -1; // To detect when a NEW lyric appears

// --- Lyric Effects Enum ---
enum Effect {
  EFFECT_NONE = 0,
  EFFECT_POP,     // Briefly enlarges word
  EFFECT_SHAKE,   // Earth-quake shake effect
  EFFECT_INVERT,  // Inverts the whole screen for impact
  EFFECT_GLITCH,  // Adds random lines and jitters
  EFFECT_ZOOM_IN, // Starts small and zooms to large
  EFFECT_FLOAT,   // Calming floating effect
  EFFECT_PULSE,   // Heartbeat size pulse
  EFFECT_SLOW_ZOOM // Creeps up and gets larger
};

// --- Lyric Data Structure ---
struct Lyric {
  unsigned long delayBeforeMs;        
  unsigned long durationMs;           
  char word[16];                   
  Effect effect;                      
  uint8_t size;                       
  unsigned long dummy;  
};

// =========================================================================
// THE LYRICS TIMELINE
// =========================================================================
const Lyric lyrics[] PROGMEM = {
  // Wake up in the morning, everything's alright
  { 0, 300, "Wake", EFFECT_NONE, 2, 0 },
  { 0, 300, "up", EFFECT_POP, 2, 0 },
  { 0, 200, "in", EFFECT_NONE, 2, 0 },
  { 0, 200, "the", EFFECT_NONE, 2, 0 },
  { 0, 800, "morning", EFFECT_NONE, 2, 0 },
  { 200, 400, "everything's", EFFECT_POP, 2, 0 },
  { 0, 1200, "alright", EFFECT_INVERT, 2, 0 },

  // At the end of the story, you're holdin' me tight
  { 600, 200, "At", EFFECT_NONE, 2, 0 },
  { 0, 200, "the", EFFECT_NONE, 2, 0 },
  { 0, 300, "end", EFFECT_NONE, 2, 0 },
  { 0, 200, "of", EFFECT_NONE, 2, 0 },
  { 0, 200, "the", EFFECT_NONE, 2, 0 },
  { 0, 800, "story", EFFECT_NONE, 2, 0 },
  { 200, 500, "you're", EFFECT_POP, 2, 0 },
  { 0, 400, "holdin", EFFECT_NONE, 2, 0 },
  { 0, 200, "me", EFFECT_NONE, 2, 0 },
  { 0, 800, "tight", EFFECT_SHAKE, 2, 0 },

  // I don't need to worry, am I out of my mind?
  { 400, 200, "I", EFFECT_NONE, 2, 0 },
  { 0, 300, "don't", EFFECT_NONE, 2, 0 },
  { 0, 300, "need", EFFECT_POP, 2, 0 },
  { 0, 200, "to", EFFECT_NONE, 2, 0 },
  { 0, 800, "worry", EFFECT_NONE, 2, 0 },
  { 0, 200, "am", EFFECT_NONE, 2, 0 },
  { 0, 200, "I", EFFECT_NONE, 2, 0 },
  { 0, 300, "out", EFFECT_POP, 2, 0 },
  { 0, 200, "of", EFFECT_NONE, 2, 0 },
  { 0, 200, "my", EFFECT_NONE, 2, 0 },
  { 0, 200, "mind?", EFFECT_GLITCH, 2, 0 },

  // And, oh, it's hard to see you, but I wish you were right here
  { 0, 300, "And", EFFECT_NONE, 2, 0 },
  { 0, 300, "oh", EFFECT_POP, 2, 0 },
  { 0, 200, "it's", EFFECT_NONE, 2, 0 },
  { 0, 300, "hard", EFFECT_NONE, 2, 0 },
  { 0, 200, "to", EFFECT_NONE, 2, 0 },
  { 0, 300, "see", EFFECT_NONE, 2, 0 },
  { 0, 400, "you", EFFECT_NONE, 2, 0 },
  { 200, 200, "but", EFFECT_NONE, 2, 0 },
  { 0, 200, "I", EFFECT_NONE, 2, 0 },
  { 0, 300, "wish", EFFECT_POP, 2, 0 },
  { 0, 200, "you", EFFECT_NONE, 2, 0 },
  { 0, 200, "were", EFFECT_NONE, 2, 0 },
  { 0, 300, "right", EFFECT_NONE, 2, 0 },
  { 0, 400, "here", EFFECT_INVERT, 3, 0 },

  // Oh, it's hard to leave you when I get you everywhere
  { 200, 300, "Oh", EFFECT_SHAKE, 2, 0 },
  { 0, 200, "it's", EFFECT_NONE, 2, 0 },
  { 0, 300, "hard", EFFECT_NONE, 2, 0 },
  { 0, 200, "to", EFFECT_NONE, 2, 0 },
  { 0, 300, "leave", EFFECT_POP, 2, 0 },
  { 0, 400, "you", EFFECT_NONE, 2, 0 },
  { 200, 200, "when", EFFECT_NONE, 2, 0 },
  { 0, 200, "I", EFFECT_NONE, 2, 0 },
  { 0, 300, "get", EFFECT_NONE, 2, 0 },
  { 0, 400, "you", EFFECT_NONE, 2, 0 },
  { 0, 1000, "everywhere", EFFECT_ZOOM_IN, 2, 0 }
};
const int numLyrics = sizeof(lyrics) / sizeof(Lyric);
unsigned long calculatedStartTimes[sizeof(lyrics) / sizeof(Lyric)];

unsigned long startTime = 0;
bool isPlaying = true;
unsigned long TOTAL_LOOP_TIME = 0;  

void setup() {
  Serial.begin(115200);

  // Initialize I2C communication
  Wire.begin();

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    for (;;);
  }

  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextWrap(false);

  // Init Tunnel
  for(int i=0; i<NUM_CIRCLES; i++) {
    circleRadii[i] = i * (100.0 / NUM_CIRCLES);
  }

  // Init EQ
  for(int i=0; i<NUM_BARS; i++) {
    barHeights[i] = 0;
    targetHeights[i] = 0;
  }
  wave.active = false;

  unsigned long runningTime = 0;
  for (int i = 0; i < numLyrics; i++) {
    Lyric l;
    memcpy_P(&l, &lyrics[i], sizeof(Lyric));
    runningTime += l.delayBeforeMs;
    calculatedStartTimes[i] = runningTime;
    runningTime += l.durationMs;
  }
  TOTAL_LOOP_TIME = runningTime + 3000;

  startTime = millis();
}

void loop() {
  if (!isPlaying) return;

  unsigned long now = millis() - startTime;
  if (now > TOTAL_LOOP_TIME) {
    startTime = millis();
    now = 0;
    lastLyricIdx = -1;
  }

  display.clearDisplay();

  int currentLyricIdx = -1;
  for (int i = 0; i < numLyrics; i++) {
    Lyric l;
    memcpy_P(&l, &lyrics[i], sizeof(Lyric));
    if (now >= calculatedStartTimes[i] && now <= (calculatedStartTimes[i] + l.durationMs)) {
      currentLyricIdx = i;
      break;
    }
  }

  Effect currentEffect = EFFECT_NONE;
  bool lyricActive = false;
  float progress = 0.0;
  bool invertScreen = false;

  // Track state
  if (currentLyricIdx != -1) {
    lyricActive = true;
    Lyric l;
    memcpy_P(&l, &lyrics[currentLyricIdx], sizeof(Lyric));
    currentEffect = l.effect;
    float elapsedLyric = now - calculatedStartTimes[currentLyricIdx];
    progress = elapsedLyric / (float)l.durationMs;

    // Check for NEW word to trigger shockwave
    if (currentLyricIdx != lastLyricIdx) {
      if (l.effect == EFFECT_POP || l.effect == EFFECT_INVERT || l.effect == EFFECT_ZOOM_IN || l.effect == EFFECT_SHAKE) {
        wave.active = true;
        wave.radius = 5.0;
      }
      lastLyricIdx = currentLyricIdx;
    }
  } else {
    lastLyricIdx = -1; // reset when empty space
  }

  // 1. DRAW BACKGROUND TUNNEL & EQ FIRST
  drawTunnel(currentEffect, lyricActive);
  drawShockwave();
  drawEQ(currentEffect, lyricActive);

  // 2. DRAW LYRICS ON TOP
  if (currentLyricIdx != -1) {
    Lyric l;
    memcpy_P(&l, &lyrics[currentLyricIdx], sizeof(Lyric));
    
    int textSize = l.size;
    int offsetX = 0;
    int offsetY = 0;

    // Apply Effects
    if (l.effect == EFFECT_POP) {
      if (progress < 0.15) textSize = l.size + 1;
    } else if (l.effect == EFFECT_SHAKE) {
      offsetX = random(-1, 2); // Reduced from (-3, 4) for a calmer shake
      offsetY = random(-1, 2); // Reduced from (-3, 4) for a calmer shake
    } else if (l.effect == EFFECT_INVERT) {
      invertScreen = true;
      if (random(10) > 5) { offsetX = random(-2, 3); offsetY = random(-2, 3); }
    } else if (l.effect == EFFECT_GLITCH) {
      if (random(10) > 6) {
        offsetX = random(-6, 6);
        // Draw glitch static over background
        display.fillRect(0, random(SCREEN_HEIGHT), SCREEN_WIDTH, random(2, 8), WHITE);
      }
      if (random(10) > 8) invertScreen = true;
    } else if (l.effect == EFFECT_ZOOM_IN) {
      if (progress < 0.05) textSize = l.size > 1 ? l.size - 1 : 1;
      else if (progress < 0.1) textSize = l.size;
      else textSize = l.size + 1;

      if (progress > 0.4) {
        offsetX = random(-4, 5);
        offsetY = random(-4, 5);
      }
      if (progress > 0.3 && random(10) > 7) invertScreen = true;
    } else if (l.effect == EFFECT_FLOAT) {
      // Gentle sine wave bob with a slight shake
      offsetY = -sin(progress * 3.14159) * 6 + random(-1, 2); 
      offsetX = random(-1, 2);
    } else if (l.effect == EFFECT_PULSE) {
      // Heartbeat pulse with a slight shake
      if ((progress > 0.1 && progress < 0.25) || (progress > 0.6 && progress < 0.75)) {
        textSize = l.size + 1;
      }
      offsetX = random(-1, 2);
      offsetY = random(-1, 2);
    } else if (l.effect == EFFECT_SLOW_ZOOM) {
      // Slow creep with a slight shake
      offsetY = -(progress * 5) + random(-1, 2); 
      offsetX = random(-1, 2);
      if (progress > 0.5) textSize = l.size + 1;
    }

    display.setTextSize(textSize);
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(l.word, 0, 0, &x1, &y1, &w, &h);
    
    // Safety fallback: if text somehow is too large, progressively shrink it
    if (w > SCREEN_WIDTH) {
        if (textSize > 2) {
            textSize = 2;
            display.setTextSize(textSize);
            display.getTextBounds(l.word, 0, 0, &x1, &y1, &w, &h);
        }
        if (w > SCREEN_WIDTH) {
            textSize = 1;
            display.setTextSize(textSize);
            display.getTextBounds(l.word, 0, 0, &x1, &y1, &w, &h);
        }
    }

    int drawX = (SCREEN_WIDTH - w) / 2 + offsetX;
    int drawY = (SCREEN_HEIGHT - h) / 2 + offsetY - 5; // Shifted up slightly to avoid EQ bars

    // Calculate box dimensions and constrain to screen width so rounded edges aren't cut off
    int boxX = drawX - 6;
    int boxY = drawY - 5;
    int boxW = w + 12;
    int boxH = h + 10;
    
    if (boxX < 0) {
        boxW += boxX; 
        boxX = 0;
    }
    if (boxX + boxW > SCREEN_WIDTH) {
        boxW = SCREEN_WIDTH - boxX;
    }

    // Draw a sleek text box behind the text to make it extremely readable
    display.fillRoundRect(boxX, boxY, boxW, boxH, 3, BLACK);
    display.drawRoundRect(boxX, boxY, boxW, boxH, 3, WHITE);

    if (l.effect == EFFECT_GLITCH && random(10) > 8) {
      display.setTextColor(BLACK, WHITE);
      display.fillRoundRect(drawX - 4, drawY - 3, w + 8, h + 6, 2, WHITE); // White background glitch
    } else {
      display.setTextColor(WHITE);
    }

    display.setCursor(drawX, drawY);
    display.print(l.word);
  }

  display.invertDisplay(invertScreen);
  display.display();
}

// ----------------------------------------------------
// Abstract Theme Functions
// ----------------------------------------------------

void drawTunnel(Effect currentEffect, bool lyricActive) {
  float speed = 1.0;
  if (currentEffect == EFFECT_ZOOM_IN) speed = 8.0; // Hyper speed tunnel
  else if (currentEffect == EFFECT_SHAKE || currentEffect == EFFECT_GLITCH) speed = 4.0;
  else if (!lyricActive) speed = 0.5; // Idle
  
  int centerX = SCREEN_WIDTH/2;
  int centerY = SCREEN_HEIGHT/2;
  
  if (currentEffect == EFFECT_SHAKE || currentEffect == EFFECT_ZOOM_IN) {
    centerX += random(-3, 4);
    centerY += random(-3, 4);
  }

  // Draw Radiating Lines (Tunnel Walls)
  for (float angle = 0; angle < 2 * PI; angle += PI / 4) {
    int x1 = centerX + cos(angle) * 5; 
    int y1 = centerY + sin(angle) * 5;
    int x2 = centerX + cos(angle) * 120;
    int y2 = centerY + sin(angle) * 120;
    display.drawLine(x1, y1, x2, y2, WHITE);
  }

  // Draw Concentric Circles moving outward
  for(int i=0; i<NUM_CIRCLES; i++) {
    circleRadii[i] += speed;
    if (circleRadii[i] > 120) circleRadii[i] = 1; // Reset at center
    
    if (circleRadii[i] > 2) {
      display.drawCircle(centerX, centerY, circleRadii[i], WHITE);
    }
  }
}

void drawEQ(Effect currentEffect, bool lyricActive) {
  int barWidth = SCREEN_WIDTH / NUM_BARS;
  
  for (int i = 0; i < NUM_BARS; i++) {
    // Update target heights based on music intensity
    if (random(10) > 4) { 
      if (lyricActive) {
        if (currentEffect == EFFECT_ZOOM_IN) {
          targetHeights[i] = random(15, 35); // Massive EQ spikes during drop
        } else if (currentEffect == EFFECT_SHAKE) {
          targetHeights[i] = random(10, 25);
        } else {
          targetHeights[i] = random(5, 15);
        }
      } else {
        targetHeights[i] = random(1, 6); // Very low when idle
      }
    }
    
    // Smooth interpolation
    if (barHeights[i] < targetHeights[i]) barHeights[i] += 4;
    else if (barHeights[i] > targetHeights[i]) barHeights[i] -= 3;
    
    // Keep in bounds
    if (barHeights[i] < 1) barHeights[i] = 1;
    
    // Draw bar at the very bottom
    display.fillRect(i * barWidth + 1, SCREEN_HEIGHT - barHeights[i], barWidth - 1, barHeights[i], WHITE);
  }
}

void drawShockwave() {
  if (wave.active) {
    display.drawCircle(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, wave.radius, WHITE);
    // Draw a slightly smaller circle to make the shockwave thicker
    display.drawCircle(SCREEN_WIDTH/2, SCREEN_HEIGHT/2, wave.radius - 1, WHITE);
    
    wave.radius += 8.0; // Fast expand
    if (wave.radius > 140) wave.active = false;
  }
}
