#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use crate::types::*;

#[contract]
pub struct ReminderContract;

#[contractimpl]
impl ReminderContract {
    /// Create (or overwrite) the escrow record for a split with its participants.
    pub fn create_escrow(env: Env, split_id: String, participants: Vec<EscrowParticipant>) {
        let escrow = Escrow {
            split_id: split_id.clone(),
            participants,
        };
        storage::set_escrow(&env, &split_id, &escrow);
    }

    /// Flag that a participant who still owes money should be reminded to pay.
    pub fn request_reminder(env: Env, split_id: String, participant: Address) {
        participant.require_auth();

        let mut escrow = storage::get_escrow(&env, &split_id).expect("Escrow not found");

        let mut found = false;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant && p.amount_paid < p.amount_owed {
                p.reminder_requested = true;
                events::emit_reminder_requested(&env, participant.clone(), &split_id);
                found = true;
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found or already paid");
        }

        escrow.participants = updated_participants;
        storage::set_escrow(&env, &split_id, &escrow);
    }

    /// Clear a previously requested reminder for a participant.
    pub fn cancel_reminder(env: Env, split_id: String, participant: Address) {
        participant.require_auth();

        let mut escrow = storage::get_escrow(&env, &split_id).expect("Escrow not found");

        let mut found = false;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                p.reminder_requested = false;
                events::emit_reminder_cancelled(&env, participant.clone(), &split_id);
                found = true;
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found");
        }

        escrow.participants = updated_participants;
        storage::set_escrow(&env, &split_id, &escrow);
    }

    /// Whether a reminder is currently requested for a participant.
    pub fn get_reminder_requested(env: Env, split_id: String, participant: Address) -> bool {
        let escrow = storage::get_escrow(&env, &split_id).expect("Escrow not found");

        for i in 0..escrow.participants.len() {
            let p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                return p.reminder_requested;
            }
        }

        false
    }
}
