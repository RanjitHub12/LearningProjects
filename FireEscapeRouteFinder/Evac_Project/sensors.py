import math
import random

class PDRSystem:
    def __init__(self, start_x, start_y, step_len=1.0):
        self.est_x = start_x
        self.est_y = start_y
        self.heading = 0.0 # 0 = East
        self.step_length = step_len
        
        # Sensor Noise Parameters
        self.gyro_bias = 0.02 
        self.accel_noise = 0.1

    def simulate_hardware_reading(self, true_curr, true_next):
        """Generates noisy sensor data based on actual movement."""
        dx = true_next.x - true_curr.x
        dy = true_next.y - true_curr.y
        
        # Ideal Heading
        target_angle = math.atan2(dy, dx)
        
        # Simulate Gyro: Change in angle + Noise
        gyro_z = (target_angle - self.heading) + random.gauss(0, self.gyro_bias)
        
        # Simulate Accel: Spike if moving, Gravity (0.98) if still
        is_moving = (dx != 0 or dy != 0)
        accel_mag = (1.5 if is_moving else 0.98) + random.gauss(0, self.accel_noise)
        
        return accel_mag, gyro_z

    def update_estimate(self, accel, gyro_z):
        """Integrates raw sensor data to get position."""
        # 1. Integrate Gyro to get Heading
        self.heading += gyro_z
        
        # 2. Threshold Accel to detect Step
        if accel > 1.2: # Step Threshold
            # Move in direction of heading
            self.est_x += self.step_length * math.cos(self.heading)
            self.est_y += self.step_length * math.sin(self.heading)
            
        return self.est_x, self.est_y

class NavigationFeedback:
    def __init__(self):
        self.last_instruction = None

    def trigger(self, instruction):
        """Simulates Haptic vibration and Audio cues."""
        if instruction == self.last_instruction:
            return ""
        self.last_instruction = instruction
        
        if instruction == "LEFT":
            return "📳 VIB: [Short-Short] (Left)"
        elif instruction == "RIGHT":
            return "📳 VIB: [Long] (Right)"
        elif instruction == "DOWN":
            return "📳 VIB: [Continuous] (Back)"
        elif instruction == "STOP!":
            return "🚨 HAPTIC: [INTENSE PULSE]"
        return ""