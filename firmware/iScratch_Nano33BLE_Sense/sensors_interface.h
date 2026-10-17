#pragma once
#include <Arduino.h>

// Initialize Rev 1 (LSM9DS1 IMU & HTS221 Temp/Hum)
bool initRev1Sensors(bool& imuOk, bool& tempHumOk);

// Initialize Rev 2 (BMI270/BMM150 IMU & HS3003 Temp/Hum)
bool initRev2Sensors(bool& imuOk, bool& tempHumOk);

// Read IMU from Rev 1
bool readImuRev1(float& ax, float& ay, float& az, float& gx, float& gy, float& gz, float& mx, float& my, float& mz);

// Read IMU from Rev 2
bool readImuRev2(float& ax, float& ay, float& az, float& gx, float& gy, float& gz, float& mx, float& my, float& mz);

// Read Temperature (°C) and Humidity (%) from Rev 1 (HTS221)
bool readTempHumRev1(float& temp, float& hum);

// Read Temperature (°C) and Humidity (%) from Rev 2 (HS3003 / HS300x)
bool readTempHumRev2(float& temp, float& hum);
