// The single source of truth for "have the legal documents changed since the
// user last saw them". Bump POLICY_VERSION whenever PrivacyPolicyView or
// TermsView change in a way users should be told about, and move
// POLICY_EFFECTIVE_DATE to the same date shown at the bottom of those pages.
//
// The notice always points at the documents, so a revision needs nothing here
// beyond these two values plus, optionally, a summary.

export const POLICY_VERSION = 2

// ISO date. Accounts created on or after this date signed up under the current
// documents, so they are never shown the update notice.
export const POLICY_EFFECTIVE_DATE = '2026-08-12'
