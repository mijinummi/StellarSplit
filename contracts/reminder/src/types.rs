use soroban_sdk::{contracttype, Address, String, Vec};

/// A single participant in a split escrow.
#[contracttype]
#[derive(Clone, Debug)]
pub struct EscrowParticipant {
    pub address: Address,
    pub amount_owed: i128,
    pub amount_paid: i128,
    pub paid_at: Option<u64>,
    /// Whether a payment reminder has been requested for this participant.
    pub reminder_requested: bool,
}

impl EscrowParticipant {
    pub fn new(address: Address, amount_owed: i128) -> Self {
        Self {
            address,
            amount_owed,
            amount_paid: 0,
            paid_at: None,
            reminder_requested: false,
        }
    }
}

/// Escrow record for a split, holding all of its participants.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub split_id: String,
    pub participants: Vec<EscrowParticipant>,
}

/// Persistent storage keys for the reminder contract.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Escrow record keyed by split id.
    Escrow(String),
}
