# Security Enhancements - Library Management System

## Overview
Comprehensive security improvements to prevent unauthorized API access, token theft, and Postman/API tool bypass attacks.

## Implemented Security Features

### 1. **Token Fingerprinting**
- **What**: Each token is bound to the device/browser that created it
- **How**: Combines IP address + User-Agent into a SHA-256 hash stored in the token
- **Protection**: If someone steals a token and tries to use it from a different device/IP/browser, it will be rejected
- **Error Message**: "Security validation failed. Please login again from your original device."

### 2. **Database User Verification**
- **What**: Every API request verifies the user still exists and has the correct role in the database
- **How**: Queries the database on each authenticated request to validate user
- **Protection**: Prevents using tokens for deleted users or users whose roles have changed
- **Scenarios Blocked**:
  - User account deleted but token still valid
  - User role changed (student → admin) but old token claims admin
  - Database tampering or manual user modifications

### 3. **Token Revocation (Blacklist)**
- **What**: Logout endpoint blacklists token IDs to prevent reuse
- **How**: In-memory blacklist stores revoked token IDs (jti claim)
- **Protection**: Logged out tokens cannot be reused, even if not expired
- **Auto-cleanup**: Tokens auto-removed from blacklist after 24 hours

### 4. **Unique Token IDs (jti)**
- **What**: Each token gets a unique random ID
- **How**: 16-byte random hex string generated per token
- **Protection**: Enables precise token revocation and tracking

### 5. **Enhanced Token Payload**
```json
{
  "userId": 123,
  "role": "student",
  "iat": 1234567890,
  "exp": 1234571490,
  "fp": "a3f2b1c4...",  // Fingerprint hash
  "jti": "d4e5f6a7..."  // Unique token ID
}
```

## Attack Scenarios Now Blocked

### ❌ Scenario 1: Token Theft via Postman
**Attack**: User copies token from browser DevTools, uses in Postman from different machine
**Protection**: Fingerprint mismatch detected (different IP/User-Agent)
**Result**: `401 Unauthorized - Security validation failed`

### ❌ Scenario 2: Token Decoding & Manipulation
**Attack**: Attacker decodes JWT, changes role from "student" to "admin", re-signs
**Protection**: 
1. HMAC signature validation fails (secret key unknown)
2. Even if signature bypassed, database verification checks actual role
**Result**: `401 Unauthorized - Invalid token signature` or `401 Unauthorized - User role has changed`

### ❌ Scenario 3: Deleted User Token Reuse
**Attack**: Admin deletes user account, but user still has valid unexpired token
**Protection**: Database verification fails (user not found)
**Result**: `401 Unauthorized - User account not found or has been deleted`

### ❌ Scenario 4: Logout Token Reuse
**Attack**: User logs out but tries to reuse the same token
**Protection**: Token ID in blacklist
**Result**: `401 Unauthorized - Token has been revoked`

### ❌ Scenario 5: Role Privilege Escalation
**Attack**: User's role changed in database (admin → student), tries to use old token claiming admin
**Protection**: Database verification checks current role vs token role
**Result**: `401 Unauthorized - User role has changed. Please login again.`

### ❌ Scenario 6: Postman API Bypass
**Attack**: User creates valid account, gets token, uses Postman to access protected endpoints
**Protection**: Fingerprint validation fails (Postman has different User-Agent/IP)
**Result**: `401 Unauthorized - Security validation failed`

## Security Best Practices Implemented

✅ **Defense in Depth**: Multiple layers of security (signature, fingerprint, database, blacklist)
✅ **Timing-Safe Comparisons**: Prevents timing attacks on signature verification
✅ **HMAC-SHA256 Signatures**: Cryptographically secure token signing
✅ **Secure Random Generation**: Crypto-grade random for token IDs
✅ **Principle of Least Privilege**: Role-based access control enforced on every request
✅ **Session Binding**: Tokens bound to original session context
✅ **Audit Trail**: Token IDs enable tracking and revocation
✅ **Graceful Degradation**: Clear error messages without exposing security details

## Configuration

### Environment Variables
```bash
# Token settings
AUTH_TOKEN_TTL=14400        # 4 hours in seconds
AUTH_TOKEN_SECRET=your-secret-key-min-32-chars  # CHANGE IN PRODUCTION!
```

### Production Recommendations
1. **Change TOKEN_SECRET**: Use a strong random 256-bit key
2. **Use Redis for Blacklist**: Replace in-memory Set with Redis for distributed systems
3. **Enable HTTPS**: Fingerprinting works best with HTTPS
4. **Rate Limiting**: Add request rate limiting per IP/user
5. **Token Rotation**: Implement refresh tokens for long-lived sessions
6. **Audit Logging**: Log all authentication events

## API Endpoints

### Login
```http
POST /api/login
Content-Type: application/json

{
  "username": "john.doe",
  "password": "password123",
  "role": "student"
}

Response:
{
  "token": "eyJhbGc...",
  "expiresIn": 14400,
  "user": { ... }
}
```

### Logout
```http
POST /api/logout
Authorization: Bearer eyJhbGc...

Response:
{
  "message": "Logged out successfully"
}
```

### Protected Endpoints
All protected endpoints require:
```http
Authorization: Bearer eyJhbGc...
```

## Security Headers
All responses include CORS headers configured in server.js:
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`

## Migration Notes

### Breaking Changes
⚠️ **Existing tokens will become invalid** after deploying these changes because:
1. Token structure changed (added `fp` and `jti` fields)
2. Fingerprint validation requires matching IP/User-Agent

### Migration Steps
1. Deploy backend changes
2. Users will see "Invalid token" on next request
3. Users must login again to get new tokens with fingerprints
4. Notify users of re-authentication requirement

## Testing Security

### Test Fingerprint Validation
```bash
# Login from Chrome
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Chrome/120.0" \
  -d '{"username":"test","password":"test","role":"student"}'

# Try using token from different User-Agent (will fail)
curl -X GET http://localhost:3000/api/assets/books \
  -H "Authorization: Bearer <token>" \
  -H "User-Agent: Postman/10.0"
```

### Test Logout/Blacklist
```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/login ... | jq -r .token)

# Use token (works)
curl -X GET http://localhost:3000/api/assets/books \
  -H "Authorization: Bearer $TOKEN"

# Logout
curl -X POST http://localhost:3000/api/logout \
  -H "Authorization: Bearer $TOKEN"

# Try using same token (fails)
curl -X GET http://localhost:3000/api/assets/books \
  -H "Authorization: Bearer $TOKEN"
```

## Limitations

1. **IP Changes**: Users on mobile networks may experience IP changes
   - Mitigation: Consider IP subnet matching for mobile users
   
2. **Browser Updates**: User-Agent changes on browser updates
   - Mitigation: Graceful error messages prompt re-login
   
3. **Proxy/VPN**: Corporate proxies may change IPs
   - Mitigation: Consider IP whitelisting for corporate users

4. **In-Memory Blacklist**: Not suitable for multi-server deployments
   - Mitigation: Use Redis or database-backed blacklist

## Future Enhancements

- [ ] Implement refresh tokens for long-lived sessions
- [ ] Add Redis-backed token blacklist
- [ ] Implement rate limiting per IP/user
- [ ] Add 2FA/MFA support
- [ ] Implement CAPTCHA for repeated failed logins
- [ ] Add session management dashboard for users
- [ ] Implement device fingerprinting (Canvas/WebGL)
- [ ] Add geographic login anomaly detection
- [ ] Implement password strength requirements
- [ ] Add account lockout after failed attempts

## Support

For security issues or questions, contact the development team immediately.

**DO NOT** share token secrets or expose them in logs, error messages, or client-side code.
