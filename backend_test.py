#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class PurpeLeapAPITester:
    def __init__(self, base_url="https://leap-game-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            if expected_status and actual_status:
                print(f"   Expected status: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Status code mismatch", expected_status, response.status_code)
                try:
                    error_data = response.json()
                    print(f"   Response: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_auth_challenge(self):
        """Test authentication challenge creation"""
        # Use a valid Solana wallet address format (44 characters base58)
        test_wallet = "So11111111111111111111111111111111111111112"  # Valid Solana address
        
        success, response = self.run_test(
            "Create Auth Challenge",
            "POST",
            "auth/challenge",
            200,
            data={"wallet_address": test_wallet}
        )
        
        if success and 'challenge_key' in response:
            self.challenge_key = response['challenge_key']
            self.test_wallet = test_wallet
            return True
        return False

    def test_auth_verify(self):
        """Test authentication verification (mock)"""
        if not hasattr(self, 'challenge_key'):
            print("❌ Cannot test auth verify - no challenge key available")
            return False
            
        success, response = self.run_test(
            "Verify Auth Signature",
            "POST",
            "auth/verify",
            200,
            data={
                "challenge_key": self.challenge_key,
                "signature": "mock_signature_for_testing",
                "wallet_address": self.test_wallet
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_token_balance(self):
        """Test token balance endpoint"""
        if not hasattr(self, 'test_wallet'):
            self.test_wallet = "11111111111111111111111111111111111111111111"
            
        success, response = self.run_test(
            "Get Token Balance",
            "GET",
            f"token/balance/{self.test_wallet}",
            200
        )
        
        if success:
            expected_fields = ['wallet_address', 'balance', 'usd_value', 'has_minimum_balance']
            for field in expected_fields:
                if field not in response:
                    print(f"   Warning: Missing field '{field}' in response")
                    
        return success

    def test_reward_eligibility(self):
        """Test reward eligibility check (requires auth)"""
        if not self.token:
            print("❌ Cannot test reward eligibility - no auth token")
            return False
            
        success, response = self.run_test(
            "Check Reward Eligibility",
            "GET",
            "rewards/eligibility",
            200
        )
        return success

    def test_user_stats(self):
        """Test user stats endpoint (requires auth)"""
        if not self.token:
            print("❌ Cannot test user stats - no auth token")
            return False
            
        success, response = self.run_test(
            "Get User Stats",
            "GET",
            "user/stats",
            200
        )
        return success

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        success, response = self.run_test(
            "Get Leaderboard",
            "GET",
            "leaderboard",
            200
        )
        return success

    def test_game_start(self):
        """Test game session start (requires auth)"""
        if not self.token:
            print("❌ Cannot test game start - no auth token")
            return False
            
        success, response = self.run_test(
            "Start Game Session",
            "POST",
            "game/start",
            200
        )
        
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            return True
        return False

    def test_game_complete(self):
        """Test game session completion (requires auth and session)"""
        if not self.token:
            print("❌ Cannot test game complete - no auth token")
            return False
            
        if not hasattr(self, 'session_id'):
            print("❌ Cannot test game complete - no session ID")
            return False
            
        success, response = self.run_test(
            "Complete Game Session",
            "POST",
            "game/complete",
            200,
            data={
                "session_id": self.session_id,
                "score": 1500,
                "levels_completed": 2
            }
        )
        return success

    def test_reward_claim(self):
        """Test reward claiming (requires auth)"""
        if not self.token:
            print("❌ Cannot test reward claim - no auth token")
            return False
            
        success, response = self.run_test(
            "Claim Reward",
            "POST",
            "rewards/claim",
            200,
            data={"reward_type": "game_completion"}
        )
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Purpe's Leap API Tests")
        print("=" * 50)
        
        # Basic tests (no auth required)
        print("\n📋 Basic API Tests")
        self.test_health_check()
        self.test_leaderboard()
        
        # Token balance test (no auth required)
        print("\n💰 Token Balance Tests")
        self.test_token_balance()
        
        # Authentication flow
        print("\n🔐 Authentication Tests")
        if self.test_auth_challenge():
            self.test_auth_verify()
        
        # Authenticated tests
        if self.token:
            print("\n🎮 Game & Reward Tests (Authenticated)")
            self.test_reward_eligibility()
            self.test_user_stats()
            
            if self.test_game_start():
                # Wait a moment before completing game
                time.sleep(1)
                self.test_game_complete()
            
            # Test reward claiming
            self.test_reward_claim()
        else:
            print("\n❌ Skipping authenticated tests - no valid token")
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test_name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    print("🐸 Purpe's Leap Backend API Tester")
    print("Testing against: https://leap-game-1.preview.emergentagent.com")
    
    tester = PurpeLeapAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())