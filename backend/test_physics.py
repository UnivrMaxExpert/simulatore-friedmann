"""
Unit tests for the Friedmann equation physics engine.
"""

import unittest
from friedmann import simulate_universe, compute_cosmic_age_at_a


class TestFriedmannPhysics(unittest.TestCase):
    
    def test_planck_lcdm_age(self):
        """Standard Lambda-CDM (Planck 2018) should give age ~ 13.8 Gyr."""
        res = simulate_universe(
            H0=67.4,
            Omega_m=0.315,
            Omega_Lambda=0.685,
            Omega_r=0.00009,
            w=-1.0,
            num_time_points=100,
            num_galaxies=50
        )
        age = res["metadata"]["current_age_Gyr"]
        print(f"Calculated Planck Age: {age} Gyr (Target: ~13.8 Gyr)")
        self.assertAlmostEqual(age, 13.79, delta=0.2)
        self.assertEqual(res["metadata"]["spatial_curvature_type"], "flat")
        self.assertEqual(res["metadata"]["fate"], "accelerated_expansion")
        
    def test_einstein_de_sitter(self):
        """Einstein-de Sitter (Omega_m = 1.0, Omega_Lambda = 0.0) age = 2 / (3 * H0)."""
        H0 = 70.0
        # 1/H0 in Gyr = 977.8 / 70 = 13.97 Gyr. Age = 2/3 * 13.97 = 9.31 Gyr.
        res = simulate_universe(
            H0=H0,
            Omega_m=1.0,
            Omega_Lambda=0.0,
            Omega_r=0.0,
            w=-1.0,
            num_time_points=100,
            num_galaxies=50
        )
        age = res["metadata"]["current_age_Gyr"]
        print(f"Calculated Einstein-de Sitter Age: {age} Gyr (Target: ~9.31 Gyr)")
        self.assertAlmostEqual(age, 9.31, delta=0.15)
        self.assertEqual(res["metadata"]["fate"], "decelerated_expansion")
        
    def test_big_crunch(self):
        """Overdense closed universe (Omega_m = 3.0, Omega_Lambda = 0.0) must recollapse."""
        res = simulate_universe(
            H0=70.0,
            Omega_m=3.0,
            Omega_Lambda=0.0,
            Omega_r=0.0,
            w=-1.0,
            num_time_points=100,
            num_galaxies=50
        )
        self.assertEqual(res["metadata"]["spatial_curvature_type"], "closed")
        self.assertEqual(res["metadata"]["fate"], "big_crunch")
        self.assertIsNotNone(res["metadata"]["crunch_time_Gyr"])
        print(f"Big crunch detected at t = {res['metadata']['crunch_time_Gyr']} Gyr")


if __name__ == "__main__":
    unittest.main()
