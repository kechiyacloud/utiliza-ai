# Login & Register Pages - Expert Review

Based on the criteria defined in your `SKILL.md` checklist, I have conducted an audit of both `Login.jsx` and `Register.jsx`. Below is the detailed review highlighting what passes, what fails, and actionable steps to resolve the gaps.

## 1. UI / UX Design

### ✅ What's Working:
- **Buttons & CTAs**: Buttons have loading states with spinners and are properly disabled during pending requests (preventing duplicate submissions).
- **Password Field UX**: The Show/hide password toggle (Eye/EyeOff icon) is implemented properly. The Register page includes a dynamic password strength indicator.
- **Form Submission Flow**: Errors and success states are displayed inline within the form container, avoiding reliance solely on generic toasts.

### ❌ Critical Gaps (To Fix):
- **Form Field Design (Missing Labels)**: Both pages rely exclusively on `placeholder` attributes for input identification (e.g., `<input placeholder="Email ID" />`). `SKILL.md` explicitly requires persistent `<label>` tags above fields.
- **Accessibility (`aria-labels` and `role="alert"`)**: 
  - The password toggle buttons are missing an `aria-label="Show password"`.
  - The error display elements lack `role="alert"` or `aria-live="polite"`, meaning screen readers will not announce the errors dynamically.
- **Landmarks**: Neither component utilizes a `<main>` landmark.

---

## 2. Functionality

### ✅ What's Working:
- **Register Validation**: You enforce strict, specific requirements for passwords (min 8 chars, 1 uppercase, etc.). Client-side validation triggers prior to the API call.
- **Login Redirect**: The Login page correctly redirects users to the intended dashboard (`/info`) upon a successful request.

### ❌ Critical Gaps (To Fix):

- **Remember Me Checkbox**: The Login component is entirely missing a "Remember Me" checkbox.
- **Confirm Password UX**: In `Register.jsx`, while you check for matching passwords, there is no inline error message that fires on blur for the "Confirm Password" field. You just disable the "Register" button silently until they happen to match.
- **Trim Whitespace**: User inputs are not being explicitly trimmed (`.trim()`) before being payloaded to the backend.

---

## 3. Security

### ✅ What's Working:
- **Password Autocomplete Attributes**: You correctly use `autoComplete="current-password"` for the login page and `autoComplete="new-password"` for the register page.
- **Double-submission Protection**: The submit buttons are disabled when the `loading` state is true.

### ❌ Critical Gaps (To Fix):
- **Token Storage (High Priority)**: `Login.jsx` stores both the access token and the refresh token in `sessionStorage` (`sessionStorage.setItem("token", response.data.token)`).
  - *SKILL.md Rule:* "Refresh tokens are httpOnly, Secure, SameSite=Strict cookies — NOT localStorage" [or sessionStorage]. Access tokens should ideally be kept in JS memory, while refresh tokens should be httpOnly cookies. XSS attacks can easily compromise tokens in `sessionStorage`.
- **Validation Fallbacks**: The frontend relies almost exclusively on HTML5 `required` attributes for empty states rather than explicit JS validation before submitting. This can lead to poor native browser popup UX or be easily bypassed.

---

## 🚀 Summary of Audit Checklist 

```
UI/UX
 [x] Show/hide password toggle works
 [x] Password strength meter shown on register
 [x] Loading state on submit
 [x] Inline errors on validation fail
 [ ] Labels visible on all fields (FAILED: Relies on placeholders)
 [ ] Accessibility attributes (FAILED: Missing role="alert" and aria-labels)

FUNCTIONALITY
 [x] Email format validated client + server
 [x] Redirect after login works
 [ ] Confirm password mismatch caught inline (FAILED: Button just stays disabled)
 [ ] Forgot password flow works end-to-end (FAILED: Dead text, no link)

SECURITY
 [x] Protected against double-submit
 [x] Uses correct autocomplete tags
 [ ] Auth token stored correctly (FAILED: Storing in sessionStorage)
```
