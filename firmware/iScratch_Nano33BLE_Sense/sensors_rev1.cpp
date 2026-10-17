#include "sensors_interface.h"
#include <Arduino_LSM9DS1.h>
#include <Arduino_HTS221.h>

static bool imu1Available = false;
static bool htsAvailable = false;

bool initRev1Sensors(bool& imuOk, bool& tempHumOk) {
  imu1Available = false;
  htsAvailable = false;

  if (IMU_LSM9DS1.begin()) {
    imu1Available = true;
  }
  if (HTS.begin()) {
    htsAvailable = true;
  }

  imuOk = imu1Available;
  tempHumOk = htsAvailable;
  return imu1Available || htsAvailable;
}

bool readImuRev1(float& ax, float& ay, float& az, float& gx, float& gy, float& gz, float& mx, float& my, float& mz) {
  if (!imu1Available) return false;
  if (IMU_LSM9DS1.accelerationAvailable()) {
    IMU_LSM9DS1.readAcceleration(ax, ay, az);
  }
  if (IMU_LSM9DS1.gyroscopeAvailable()) {
    IMU_LSM9DS1.readGyroscope(gx, gy, gz);
  }
  if (IMU_LSM9DS1.magneticFieldAvailable()) {
    IMU_LSM9DS1.readMagneticField(mx, my, mz);
  }
  return true;
}

bool readTempHumRev1(float& temp, float& hum) {
  if (!htsAvailable) return false;
  temp = HTS.readTemperature();
  hum = HTS.readHumidity();
  return true;
}
