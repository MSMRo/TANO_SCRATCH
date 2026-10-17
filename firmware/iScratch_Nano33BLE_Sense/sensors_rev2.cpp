#include "sensors_interface.h"
#include <Arduino_BMI270_BMM150.h>
#include <Arduino_HS300x.h>

static bool imu2Available = false;
static bool hsAvailable = false;

bool initRev2Sensors(bool& imuOk, bool& tempHumOk) {
  imu2Available = false;
  hsAvailable = false;

  if (IMU_BMI270_BMM150.begin()) {
    imu2Available = true;
  }
  if (HS300x.begin()) {
    hsAvailable = true;
  }

  imuOk = imu2Available;
  tempHumOk = hsAvailable;
  return imu2Available || hsAvailable;
}

bool readImuRev2(float& ax, float& ay, float& az, float& gx, float& gy, float& gz, float& mx, float& my, float& mz) {
  if (!imu2Available) return false;
  if (IMU_BMI270_BMM150.accelerationAvailable()) {
    IMU_BMI270_BMM150.readAcceleration(ax, ay, az);
  }
  if (IMU_BMI270_BMM150.gyroscopeAvailable()) {
    IMU_BMI270_BMM150.readGyroscope(gx, gy, gz);
  }
  if (IMU_BMI270_BMM150.magneticFieldAvailable()) {
    IMU_BMI270_BMM150.readMagneticField(mx, my, mz);
  }
  return true;
}

bool readTempHumRev2(float& temp, float& hum) {
  if (!hsAvailable) return false;
  temp = HS300x.readTemperature();
  hum = HS300x.readHumidity();
  return true;
}
