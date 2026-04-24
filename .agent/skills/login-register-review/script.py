import os
os.makedirs('/home/user/output', exist_ok=True)

content = '''# Skill.md — Login & Register Page Expert Review

> **Purpose:** A comprehensive skill checklist for expert Full Stack Developers and UI specialists to audit, validate, and improve Login and Register pages across three dimensions: **UI/UX Design**, **Functionality**, and **Security**.

---

## 1. UI / UX Design

### 1.1 Layout & Visual Hierarchy

- [ ] Form is centered and visually isolated from background (card/panel layout)
- [ ] Single clear primary action per page (Login button OR Register button — never both competing)
- [ ] Logical visual flow: Logo → Heading → Inputs → CTA → Secondary links
- [ ] Adequate whitespace between fields (minimum 16px gap)
- [ ] Form width constrained to `320px–480px` for readability (`--content-narrow`)
- [ ] Page background is distinct from form surface (surface layering)
- [ ] No more than 2 non-neutral accent colors visible at once

### 1.2 Typography

- [ ] Heading (`h1`) uses display font at `--text-xl` minimum (24px+)
- [ ] Body text and labels use `--text-base` (16px) — never below `--text-sm` (14px)
- [ ] Error/hint text uses `--text-xs` (12px minimum floor — never smaller)
- [ ] Font weight contrast used for hierarchy (bold heading, regular labels, medium CTA)
- [ ] Placeholder text is NOT used as a substitute for visible labels

### 1.3 Form Field Design

- [ ] Every input has a visible, persistent `<label>` above the field
- [ ] Inputs have clear border and focus ring (`:focus-visible` with `2px solid --color-primary`)
- [ ] Placeholder text is muted/faint — not the same color as user input
- [ ] Input height is minimum `44px` (touch target compliance)
- [ ] Fields have consistent border-radius matching the design system (`--radius-md`)
- [ ] Active/filled state is visually distinct from empty state
- [ ] Disabled state is clearly styled (muted color, cursor `not-allowed`)

### 1.4 Buttons & CTAs

- [ ] Primary CTA button is full-width within the form
- [ ] Button minimum height `44px` (mobile touch target)
- [ ] Button text is `--text-sm` (14–16px), semibold
- [ ] Loading state: spinner or text change ("Signing in…") on submit — no double-click risk
- [ ] Button is disabled while request is pending
- [ ] Hover and active states are visually distinct
- [ ] Secondary actions (Forgot Password, Go to Register) are styled as text links — NOT secondary buttons

### 1.5 Password Field UX

- [ ] Show/hide password toggle (eye icon) on password field
- [ ] Toggle has `aria-label` ("Show password" / "Hide password")
- [ ] Password field type toggles between `password` and `text`
- [ ] On Register: password strength indicator (weak / medium / strong)
- [ ] On Register: "Confirm Password" field present
- [ ] Confirm Password mismatch error shown inline, immediately on blur

### 1.6 Responsive Design

- [ ] Form is fully usable at `375px` (iPhone SE) — no horizontal scroll
- [ ] Input font size is `16px` minimum on mobile (prevents iOS auto-zoom on focus)
- [ ] Touch targets are `44×44px` minimum for all interactive elements
- [ ] No hover-only UI patterns on mobile
- [ ] Keyboard does not cover the active input field (use `scroll-into-view` or `scrollIntoViewIfNeeded`)

### 1.7 Empty, Error & Loading States

- [ ] Inline validation errors appear next to the relevant field (not just a toast)
- [ ] Error text uses `--color-error` and an error icon for color-blind accessibility
- [ ] Success state (after registration) shows a clear confirmation message
- [ ] Loading skeleton or spinner shown while page/auth state is resolving
- [ ] "No account found" / "Wrong password" errors are shown inline in the form — not just the console
- [ ] Generic error fallback: "Something went wrong. Please try again." for network failures

### 1.8 Dark Mode & Accessibility

- [ ] Light and dark mode both work correctly (`prefers-color-scheme` + manual toggle)
- [ ] All text meets WCAG AA contrast: 4.5:1 for body, 3:1 for large text
- [ ] Error states use both color AND icon/text (not color alone)
- [ ] All inputs and buttons are keyboard-navigable (Tab order is logical)
- [ ] Screen reader announces errors via `aria-live="polite"` or `role="alert"`
- [ ] Form has a `<main>` landmark and a skip-to-content link

---

## 2. Functionality

### 2.1 Login Page — Core Behavior

- [ ] Accepts email/username + password inputs
- [ ] Trims whitespace from email/username before validation
- [ ] Email format validated client-side before submission
- [ ] Empty field validation with helpful messages ("Email is required")
- [ ] On success: redirects to intended destination (respect `?next=` or `redirect_to` param)
- [ ] On failure: displays specific error (wrong credentials vs. account not found) — OR generic message for security
- [ ] "Remember me" checkbox works (sets persistent session/cookie vs. session-only)
- [ ] "Forgot Password" link navigates to password reset flow
- [ ] OAuth / Social Login buttons (Google, GitHub) work and handle errors gracefully

### 2.2 Register Page — Core Behavior

- [ ] Required fields: Full Name, Email, Password, Confirm Password (minimum)
- [ ] Email uniqueness checked — clear error if already registered
- [ ] Password meets minimum requirements (length, complexity) — defined and shown to user
- [ ] Confirm Password must match — validated on blur AND on submit
- [ ] Terms of Service / Privacy Policy checkbox is present and required
- [ ] On success: redirect to onboarding or login with success message
- [ ] Verification email sent (if email verification is required)
- [ ] No duplicate account creation on double-submit (idempotent submit)

### 2.3 Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Email | Valid format (RFC 5322), required | "Enter a valid email address" |
| Password (Login) | Required, non-empty | "Password is required" |
| Password (Register) | Min 8 chars, 1 uppercase, 1 number, 1 special char | "Password must be at least 8 characters" |
| Confirm Password | Must match Password | "Passwords do not match" |
| Name | Required, min 2 chars, letters/spaces only | "Enter your full name" |
| Phone (if present) | Valid format, optional or required | "Enter a valid phone number" |

### 2.4 Form Submission Flow

- [ ] Client-side validation runs before any API call
- [ ] Submit button disabled during pending request (prevents duplicate submissions)
- [ ] API errors caught and displayed in UI — no silent failures
- [ ] Network timeout handled with user-friendly message
- [ ] Form does NOT reset on error (user keeps entered data, except password)
- [ ] After successful login: `Authorization` token stored (httpOnly cookie preferred over localStorage)
- [ ] After logout: token invalidated server-side, client state cleared

### 2.5 "Forgot Password" Flow

- [ ] Link present and visible on Login page
- [ ] Requests email only — does not confirm if email exists (prevent user enumeration)
- [ ] Reset email sent with a time-limited, single-use token link
- [ ] Reset link expires (e.g., 15–60 minutes)
- [ ] New password form validates same rules as registration
- [ ] Token invalidated after use or expiry

### 2.6 Session & State Management

- [ ] Authenticated users redirected away from login/register pages (no re-login loop)
- [ ] Auth state persists across page reloads (if "Remember me" selected)
- [ ] Logout clears all auth tokens and redirects to login
- [ ] Multi-tab session sync: logout in one tab reflects in others

---

## 3. Security

### 3.1 Input Sanitization & Injection Prevention

- [ ] All user inputs sanitized server-side before processing
- [ ] Email and name fields stripped of HTML/script tags
- [ ] SQL Injection prevented via parameterized queries / ORM — never string concatenation
- [ ] NoSQL Injection prevented (MongoDB: use `$eq`, avoid direct object injection)
- [ ] XSS prevented: never render raw user input as HTML (`innerHTML`); use `textContent`
- [ ] CRSF token required for all form submissions (for session-based auth)
- [ ] HTTP headers set: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`

### 3.2 Password Security

- [ ] Passwords NEVER stored in plain text
- [ ] Password hashed using `bcrypt` (cost ≥12), `argon2id`, or `scrypt` — NOT MD5/SHA1
- [ ] Password never logged, never returned in API responses
- [ ] Password field autocomplete set to `current-password` (login) or `new-password` (register)
- [ ] Minimum entropy enforced server-side — not just client-side
- [ ] Common/breached passwords blocked (HaveIBeenPwned API or local dictionary)

### 3.3 Authentication Tokens

- [ ] JWT signed with `HS256`/`RS256` — secret key is strong and rotated
- [ ] JWT has short expiry (15–60 minutes access token) + refresh token pattern
- [ ] Refresh tokens are httpOnly, Secure, SameSite=Strict cookies — NOT localStorage
- [ ] Access tokens stored in memory (JS variable) — NOT localStorage or sessionStorage
- [ ] Token revocation mechanism exists (blocklist or version counter in DB)
- [ ] Token payload contains minimal data — no sensitive PII in JWT body

### 3.4 Rate Limiting & Brute Force Protection

- [ ] Login endpoint rate-limited (e.g., 5 attempts per minute per IP)
- [ ] Register endpoint rate-limited (e.g., 3 registrations per hour per IP)
- [ ] Account lockout after N failed attempts (e.g., lock for 15 min after 10 failures)
- [ ] Lockout notification sent to account email
- [ ] IP-based rate limiting via middleware (e.g., `express-rate-limit`, Nginx `limit_req`)
- [ ] CAPTCHA (hCaptcha / reCAPTCHA v3) triggered after suspicious activity — not on first load

### 3.5 User Enumeration Prevention

- [ ] "Forgot Password" always returns the same response regardless of whether email exists
- [ ] Login error message is generic: "Invalid email or password" — NOT "Email not found" vs. "Wrong password"
- [ ] Register page does NOT immediately confirm if email is taken (use: "If this email is new, you'll receive a verification link")
- [ ] Response time is consistent regardless of whether user exists (use timing-safe comparison)

### 3.6 HTTPS & Transport Security

- [ ] All login/register traffic over HTTPS only — no HTTP fallback
- [ ] `Strict-Transport-Security` (HSTS) header set with `max-age=31536000; includeSubDomains`
- [ ] Cookies have `Secure` flag set
- [ ] Cookies have `SameSite=Strict` or `SameSite=Lax` (prevent CSRF via cookies)
- [ ] Form `action` URL uses `https://` — never `http://`

### 3.7 OAuth / Social Login Security

- [ ] OAuth `state` parameter used to prevent CSRF attacks on OAuth flow
- [ ] Redirect URIs are whitelisted and strictly validated — no open redirectors
- [ ] Access tokens from OAuth provider not stored longer than needed
- [ ] PKCE (Proof Key for Code Exchange) used for public clients

### 3.8 Logging & Monitoring

- [ ] Failed login attempts logged with timestamp, IP, and user agent — NOT the password
- [ ] Successful logins logged with timestamp and IP
- [ ] Account creation events logged
- [ ] Password reset requests logged
- [ ] Logs are stored securely, not accessible to front-end
- [ ] Alerting on abnormal patterns (e.g., >50 failed logins/minute from single IP)

### 3.9 Account Verification

- [ ] Email verification required before full account access (register flow)
- [ ] Verification token is cryptographically random (not sequential or guessable)
- [ ] Verification link expires (e.g., 24 hours)
- [ ] Verified status stored server-side — not trusted from client
- [ ] Resend verification email option available with cooldown (prevent spam)

### 3.10 Additional Hardening

- [ ] Multi-Factor Authentication (MFA/2FA) option available (TOTP / SMS / Email OTP)
- [ ] Device/browser fingerprinting to flag new login locations (optional but recommended)
- [ ] "Login from new device" email notification sent
- [ ] Active session list visible in user settings with ability to revoke
- [ ] Sensitive actions (password change, email change) require password re-confirmation

---

## 4. Quick-Reference: What Must Be Present

### Login Page Must Have

| Element | Required | Notes |
|---------|----------|-------|
| Email / Username input | ✅ | With visible label |
| Password input | ✅ | With show/hide toggle |
| Login button | ✅ | Full-width, loading state |
| Forgot Password link | ✅ | Below password field |
| Link to Register | ✅ | "Don\'t have an account?" |
| Error message area | ✅ | Inline, not just toast |
| Remember me checkbox | Recommended | Session vs. persistent |
| OAuth buttons | Optional | If supported |
| CAPTCHA | Conditional | After failed attempts |

### Register Page Must Have

| Element | Required | Notes |
|---------|----------|-------|
| Full Name input | ✅ | With visible label |
| Email input | ✅ | With format validation |
| Password input | ✅ | With strength indicator |
| Confirm Password input | ✅ | With match validation |
| Terms of Service checkbox | ✅ | Link to ToS/Privacy Policy |
| Register button | ✅ | Full-width, loading state |
| Link to Login | ✅ | "Already have an account?" |
| Inline validation errors | ✅ | Per field, on blur |
| Password requirements hint | ✅ | Visible before typing |

---

## 5. Things That Are Commonly Missing

These are frequently overlooked but critically important:

1. **Password field autocomplete attributes** — browsers cannot help users without `autocomplete="new-password"` or `autocomplete="current-password"`
2. **`aria-live` error announcements** — screen readers miss dynamically injected errors without this
3. **Timing-safe user enumeration prevention** — even with generic messages, response time can leak existence
4. **Refresh token rotation** — issuing the same refresh token repeatedly is a security flaw
5. **Server-side password policy enforcement** — client-side validation is bypassable
6. **CSRF protection on API routes** — even if using JWT, state-changing endpoints need CSRF headers
7. **Email verification expiry** — tokens that never expire are a security risk
8. **Active session management** — users should be able to see and revoke sessions
9. **MFA availability** — at minimum, offer TOTP for security-conscious users
10. **"Remember me" granularity** — many apps implement it wrong (session cookie vs. 30-day persistent cookie)

---

## 6. Tech Stack Reference

### Backend Recommendations

| Concern | Node.js / Express | Python / FastAPI | Notes |
|---------|-------------------|------------------|-------|
| Password hashing | `bcryptjs` (cost 12) | `passlib[bcrypt]` | Never MD5/SHA1 |
| JWT | `jsonwebtoken` | `python-jose` | Short expiry |
| Rate limiting | `express-rate-limit` | `slowapi` | Per IP + per user |
| Input validation | `zod` / `joi` | `pydantic` | Server-side always |
| CSRF | `csurf` / double-submit cookie | `fastapi-csrf-protect` | Required for cookie auth |
| Session store | `connect-pg-simple` (PostgreSQL) | `sqlalchemy` session | Never in-memory for prod |

### Frontend Recommendations

| Concern | Implementation |
|---------|---------------|
| Form state | React Hook Form / native `FormData` |
| Validation | `zod` schema shared with backend |
| Token storage | Memory variable (access) + httpOnly cookie (refresh) |
| Redirect after login | `?next=` param or stored route |
| Password visibility | Toggle `input.type` between `password`/`text` |
| Error display | Inline below field with `role="alert"` |

---

## 7. Audit Checklist Summary

Run this before shipping:

```
UI/UX
 [ ] Labels visible on all fields
 [ ] Show/hide password toggle works
 [ ] Password strength meter shown on register
 [ ] Loading state on submit
 [ ] Inline errors on validation fail
 [ ] Mobile: no horizontal scroll, 16px+ inputs
 [ ] Dark mode tested
 [ ] WCAG AA contrast verified

FUNCTIONALITY
 [ ] Email format validated client + server
 [ ] Confirm password mismatch caught
 [ ] Duplicate email on register: handled
 [ ] Auth token stored correctly (not localStorage)
 [ ] Redirect after login works
 [ ] Forgot password flow works end-to-end
 [ ] Logout clears session

SECURITY
 [ ] Password hashed (bcrypt cost ≥12 or argon2id)
 [ ] No plain-text password in logs/DB/responses
 [ ] Rate limiting active on login + register endpoints
 [ ] Generic error messages (no user enumeration)
 [ ] HTTPS enforced, HSTS header set
 [ ] CSRF protection in place
 [ ] JWT expiry is short (access: 15–60 min)
 [ ] Refresh token in httpOnly Secure cookie
 [ ] XSS: no innerHTML with user data
 [ ] SQL/NoSQL injection: parameterized queries only
 [ ] Email verification token expires
 [ ] Input sanitized server-side
```

---

*Skill.md authored for expert Full Stack Developer & UI review of Authentication pages.*
*Covers: UI/UX Design · Functionality · Security · Audit Checklist*
'''

with open('/home/user/output/Skill.md', 'w') as f:
    f.write(content)

print("Skill.md written successfully.")
print(f"File size: {os.path.getsize('/home/user/output/Skill.md')} bytes")