# Sentinel Security Journal

## 2025-05-14 - Fix User Enumeration in Authentication
**Vulnerability:** User enumeration in login and forgot password flows. The application explicitly informed the user if an account did not exist for a given email address.
**Learning:** Mapping backend "user not found" errors directly to user-facing messages allows attackers to harvest registered email addresses.
**Prevention:** Always return generic error messages for authentication failures and ensure success states are indistinguishable from failures when a user does not exist in sensitive flows like "Forgot Password".
