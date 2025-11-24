/*
 * LittleWatch - ESP32-C3 Firmware
 * IoT-based Infant Vital Signs Monitoring System
 * 
 * Sensors:
 * - MAX30102: Heart Rate & SpO2
 * - MAX30205: Body Temperature
 * - MPU6050: Movement Detection
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "MAX30205.h"
#include "MPU6050.h"

// ===== WiFi Configuration =====
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ===== Server Configuration =====
const char* SERVER_URL = "http://YOUR_SERVER_IP:3000/api/vitals/record";
const char* DEVICE_SERIAL = "LITTLEWATCH_001"; // Unique device identifier

// ===== Sensor Objects =====
MAX30105 particleSensor;
MAX30205 tempSensor;
MPU6050 mpu;

// ===== Heart Rate & SpO2 Variables =====
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;
int32_t spo2Value = 0;
int8_t validSPO2 = 0;

// ===== Temperature Variables =====
float bodyTemperature = 0.0;

// ===== Movement Variables =====
int16_t ax, ay, az;
int16_t gx, gy, gz;
float movementIntensity = 0.0;
String movementStatus = "Normal";
unsigned long lastMovementTime = 0;

// ===== Battery Monitoring =====
const int BATTERY_PIN = 0; // Adjust based on your circuit
int batteryLevel = 100;

// ===== Timing Variables =====
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 5000; // Send data every 5 seconds

// ===== Function Prototypes =====
void setupWiFi();
void setupSensors();
void readHeartRateAndSpO2();
void readTemperature();
void readMovement();
int readBatteryLevel();
void sendDataToServer();
String getMovementStatus(float intensity);

void setup() {
  Serial.begin(115200);
  Serial.println("LittleWatch - Initializing...");
  
  // Initialize I2C
  Wire.begin(6, 7);
  
  // Setup WiFi
  setupWiFi();
  
  // Setup Sensors
  setupSensors();
  
  Serial.println("✅ System Ready!");
}

void loop() {
  // Read sensors
  readHeartRateAndSpO2();
  readTemperature();
  readMovement();
  
  // Send data to server at intervals
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    batteryLevel = readBatteryLevel();
    sendDataToServer();
    lastSendTime = millis();
  }
  
  delay(100); // Small delay for stability
}

// ===== WiFi Setup =====
void setupWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi Connection Failed");
  }
}

// ===== Sensor Setup =====
void setupSensors() {
  // MAX30102 Setup (Heart Rate & SpO2)
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("❌ MAX30102 not found");
    while (1);
  }
  
  byte ledBrightness = 60; // Options: 0-255
  byte sampleAverage = 4;  // Options: 1, 2, 4, 8, 16, 32
  byte ledMode = 2;        // Options: 1=Red only, 2=Red+IR, 3=Red+IR+Green
  int sampleRate = 100;    // Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
  int pulseWidth = 411;    // Options: 69, 118, 215, 411
  int adcRange = 4096;     // Options: 2048, 4096, 8192, 16384
  
  particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
  
  Serial.println("✅ MAX30102 initialized");
  
  // MAX30205 Setup (Temperature)
  if (!tempSensor.begin()) {
    Serial.println("❌ MAX30205 not found");
  } else {
    Serial.println("✅ MAX30205 initialized");
  }
  
  // MPU6050 Setup (Movement)
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("❌ MPU6050 not found");
  } else {
    Serial.println("✅ MPU6050 initialized");
  }
}

// ===== Read Heart Rate and SpO2 =====
void readHeartRateAndSpO2() {
  long irValue = particleSensor.getIR();
  
  if (irValue > 50000) { // Finger is placed
    // Heart Rate Calculation
    if (checkForBeat(irValue) == true) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      
      beatsPerMinute = 60 / (delta / 1000.0);
      
      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
        
        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= RATE_SIZE;
      }
    }
    
    // SpO2 Calculation (simplified)
    long redValue = particleSensor.getRed();
    if (redValue > 10000 && irValue > 10000) {
      float ratio = (float)redValue / (float)irValue;
      // Simplified SpO2 calculation
      spo2Value = 110 - 25 * ratio;
      
      // Clamp values
      if (spo2Value > 100) spo2Value = 100;
      if (spo2Value < 70) spo2Value = 70;
    }
  } else {
    beatAvg = 0;
    spo2Value = 0;
    Serial.println("⚠️ No finger detected");
  }
}

// ===== Read Temperature =====
void readTemperature() {
  bodyTemperature = tempSensor.getTemperature();
  
  // Apply calibration if needed
  bodyTemperature = bodyTemperature - 0.2; // Adjust based on testing
  
  // Sanity check
  if (bodyTemperature < 30.0 || bodyTemperature > 45.0) {
    bodyTemperature = 36.5; // Default safe value
  }
}

// ===== Read Movement =====
void readMovement() {
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  
  // Calculate movement intensity
  movementIntensity = sqrt(ax*ax + ay*ay + az*az) / 16384.0;
  
  // Determine movement status
  movementStatus = getMovementStatus(movementIntensity);
  
  // Detect if movement stopped (potential concern)
  if (movementIntensity > 0.1) {
    lastMovementTime = millis();
  }
}

// ===== Get Movement Status =====
String getMovementStatus(float intensity) {
  if (intensity < 0.05) {
    return "Sleep";
  } else if (intensity < 0.15) {
    return "Resting";
  } else if (intensity < 0.30) {
    return "Normal";
  } else {
    return "Active";
  }
}

// ===== Read Battery Level =====
int readBatteryLevel() {
  // Read battery voltage (adjust based on your circuit)
  int rawValue = analogRead(BATTERY_PIN);
  float voltage = (rawValue / 4095.0) * 3.3 * 2; // Voltage divider adjustment
  
  // Convert to percentage (3.0V = 0%, 4.2V = 100%)
  int percentage = ((voltage - 3.0) / 1.2) * 100;
  
  // Clamp values
  if (percentage > 100) percentage = 100;
  if (percentage < 0) percentage = 0;
  
  return percentage;
}

// ===== Send Data to Server =====
void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected");
    return;
  }
  
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["deviceSerial"] = DEVICE_SERIAL;
  doc["heartRate"] = beatAvg;
  doc["temperature"] = round(bodyTemperature * 10) / 10.0;
  doc["oxygenSaturation"] = spo2Value;
  doc["movementStatus"] = movementStatus;
  doc["movementIntensity"] = round(movementIntensity * 100) / 100.0;
  doc["batteryLevel"] = batteryLevel;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Send HTTP POST request
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Data sent successfully");
    Serial.print("Response: ");
    Serial.println(response);
    
    // Print vital signs
    Serial.println("--- Vital Signs ---");
    Serial.print("Heart Rate: "); Serial.print(beatAvg); Serial.println(" BPM");
    Serial.print("SpO2: "); Serial.print(spo2Value); Serial.println("%");
    Serial.print("Temperature: "); Serial.print(bodyTemperature); Serial.println("°C");
    Serial.print("Movement: "); Serial.println(movementStatus);
    Serial.print("Battery: "); Serial.print(batteryLevel); Serial.println("%");
    Serial.println("------------------");
  } else {
    Serial.print("❌ Error sending data: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
