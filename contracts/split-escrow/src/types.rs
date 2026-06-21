use soroban_sdk::{contracttype, Address, Map, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SplitStatus {
    Pending,
    Ready,
    /// Funds refunded to participants (e.g. dispute upheld).
    Cancelled,
    Released,
}

/// Escrow split state. `participants.len()` is the current distinct participant count.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Split {
    pub split_id: u64,
    pub creator: Address,
    pub description: String,
    pub metadata: Map<String, String>,
    pub total_amount: i128,
    pub deposited_amount: i128,
    pub status: SplitStatus,
    /// Maximum distinct participants allowed (default 50 at creation if not specified).
    pub max_participants: u32,
    /// Distinct addresses that have deposited; length is the current participant count.
    pub participants: Vec<Address>,
    /// Per-participant deposited balances so we can refund on dispute outcomes.
    pub balances: Map<Address, i128>,
    /// Per-participant expected contribution.
    pub obligations: Map<Address, i128>,
    /// Short on-chain context (max 128 bytes at creation/update); empty if unset.
    pub note: String,
    /// Optional single payee for all participant distributions on `release_funds`.
    /// `None` means each participant's share is sent to `creator` (single-payee
    /// mode, preserving the original lump-sum-to-creator behavior).
    pub payee: Option<Address>,
}

/// Canonical parameter contract for `create_escrow`.
///
/// This module defines the single unambiguous input type accepted by
/// `SplitEscrowContract::create_escrow`, eliminating the conflicting duplicate
/// `metadata` parameters and the ignored `whitelist_enabled` flag that existed
/// in the previous signature.
///
/// ## Design decisions
///
/// * `metadata` is a plain `Map<String, String>` — always present, empty by
///   default.  An `Option` wrapper is unnecessary because an empty map is
///   already a valid "no metadata" state.
///
/// * `note` remains `Option<String>` because `None` and an empty string have
///   the same storage representation and callers should be explicit.
///
/// * `whitelist_enabled` is removed from the create call.  Whitelist state is
///   managed after creation via `toggle_whitelist` / `add_to_whitelist` /
///   `remove_from_whitelist`.  Initialising it at creation time was confusing
///   because the flag was immediately overwritten with `false` in the old code.
///
/// * `max_participants` stays as `Option<u32>`; `None` means "use the
///   contract-level default of 50".
///
/// * `payee` is `Option<Address>`. `None` keeps single-payee mode pointed at
///   `creator` (the historical behavior); `Some(addr)` redirects every
///   participant's released share to `addr` instead.
#[contracttype]
#[derive(Clone, Debug)]
pub struct CreateEscrowParams {
    /// Address that will own and be able to finalise the escrow.
    pub creator: Address,

    /// Human-readable description stored on-chain.
    pub description: String,

    /// Exact total that must be deposited before the escrow can be released.
    /// Must be positive and equal to the sum of all obligation values.
    pub total_amount: i128,

    /// Per-participant expected contribution amounts.
    /// `sum(obligations.values()) == total_amount` is enforced on creation.
    pub obligations: Map<Address, i128>,

    /// Optional upper bound on distinct depositing participants.
    /// Defaults to the contract constant `DEFAULT_MAX_PARTICIPANTS` (50) when
    /// `None`.
    pub max_participants: Option<u32>,

    /// Arbitrary key/value pairs attached to the escrow (max 32 entries, each
    /// key and value ≤ 128 bytes).  Pass an empty map when no metadata is
    /// needed.
    pub metadata: Map<String, String>,

    /// Short on-chain context string (≤ 128 bytes).  `None` stores an empty
    /// string; callers should use `set_note` to update it after creation.
    pub note: Option<String>,

    /// Optional single payee for all participant distributions on release.
    /// `None` means each participant's share goes to `creator`.
    pub payee: Option<Address>,
}